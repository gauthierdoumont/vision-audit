// Modes de jeu hors campagne : partie rapide, grand dossier, défi du jour, mode infini, partie ciblée.
// L'identifiant d'une partie contient tout ce qu'il faut pour la régénérer à l'identique.
// Audit Detective — créé par Gauthier Doumont.
import { SECTORS, SECTOR_IDS } from '../content/sectors';
import type { Level } from '../content/types';
import { ANOMALY_CATALOGUE, CYCLE_OF, MIN_DIFFICULTY, type AnomalyType } from './anomalies';
import { unlockLevelForDifficulty } from './documents';
import { generateLevel, type LevelSpec } from './generate';
import { createRng } from './rng';
import type { DecoyType } from './scenarios';
import { validateLevel } from './validate';

export type ModeId = 'quick' | 'big' | 'daily' | 'endless' | 'focus';

export const MODE_LABELS: Record<ModeId, string> = {
  quick: 'Partie rapide',
  big: 'Grand dossier',
  daily: 'Défi du jour',
  endless: 'Mode infini',
  focus: 'Points faibles',
};

const DECOYS: DecoyType[] = ['maintenance-contract', 'supplier-advance', 'late-hire', 'revenue-growth'];

/** Équivalent « niveau de campagne » pour les procédures disponibles (procédures de stock dès la difficulté 5). */
function unlockFor(difficulty: number): number {
  return difficulty >= 5 ? 100 : unlockLevelForDifficulty(difficulty);
}

function draftSpec(id: string, label: string, seed: string, difficulty: number, cycle?: string): LevelSpec {
  const rng = createRng(seed);
  const format: Level['format'] = difficulty <= 4 ? 'court' : difficulty <= 6 ? 'moyen' : 'long';
  const count = format === 'court' ? 1 : format === 'moyen' ? rng.int(1, 2) : rng.int(2, 3);
  const pool = ANOMALY_CATALOGUE.filter((a) => MIN_DIFFICULTY[a.type] <= difficulty && (!cycle || CYCLE_OF[a.type] === cycle));
  const sector = rng.pick(SECTOR_IDS.filter((s) => pool.some((a) => a.appliesTo(SECTORS[s]))));
  const applicable = rng.shuffle(pool.filter((a) => a.appliesTo(SECTORS[sector])).map((a) => a.type));
  // Une même famille (stock, immobilisation de l'année) ne se cumule pas dans un dossier.
  const anomalies: AnomalyType[] = [];
  for (const type of applicable) {
    if (anomalies.length >= count) break;
    if (anomalies.some((a) => CYCLE_OF[a] === CYCLE_OF[type] && (CYCLE_OF[a] === 'stocks' || CYCLE_OF[a] === 'immobilisations'))) continue;
    anomalies.push(type);
  }
  const hasStock = anomalies.some((a) => CYCLE_OF[a] === 'stocks');
  const scenario = format === 'long' ? rng.int(0, 5) : 0;
  return {
    id,
    number: 0,
    mode: label,
    seed,
    difficulty,
    sector,
    anomalies,
    format,
    unlockLevel: unlockFor(difficulty),
    decoys: format === 'court' ? [] : rng.shuffle(DECOYS).slice(0, format === 'moyen' ? 1 : 2),
    ...(scenario === 1 ? { goingConcern: rng.pick(['disclosed', 'hidden'] as const) } : {}),
    ...(scenario === 2 && !hasStock ? { limitation: 'inventory' as const } : {}),
    ...(scenario === 3 ? { limitation: 'representation-letter' as const } : {}),
  };
}

/** Génère un niveau jouable ; si le tirage échoue (cible manquante, budget), on réessaie avec une graine dérivée. */
function playable(id: string, label: string, seed: string, difficulty: number, cycle?: string): Level {
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const level = generateLevel(draftSpec(id, label, attempt === 0 ? seed : `${seed}~${attempt}`, difficulty, cycle));
      if (validateLevel(level).length === 0) return level;
    } catch {
      // tirage suivant
    }
  }
  throw new Error(`Impossible de générer le dossier ${id}`);
}

/** Identifiants : quick:3:graine · big:8:graine · daily:20261028 · endless:5:12 · focus:stocks:4:graine */
export function modeLevel(id: string): Level | undefined {
  const [mode, a, b, c] = id.split(':');
  switch (mode as ModeId) {
    case 'quick':
    case 'big':
      return playable(id, MODE_LABELS[mode as ModeId], `${mode}-${b}`, Number(a));
    case 'daily': {
      // Difficulté selon le jour de la semaine : du lundi (3) au dimanche (7).
      const weekday = (new Date(`${a!.slice(0, 4)}-${a!.slice(4, 6)}-${a!.slice(6, 8)}T00:00:00Z`).getUTCDay() + 6) % 7;
      return playable(id, MODE_LABELS.daily, `daily-${a}`, 3 + Math.round((weekday * 4) / 6));
    }
    case 'endless':
      return playable(id, MODE_LABELS.endless, `endless-${b}`, Number(a));
    case 'focus':
      return playable(id, `${MODE_LABELS.focus} — ${a}`, `focus-${a}-${c}`, Number(b), a);
    default:
      return undefined;
  }
}

/** Difficulté suivante du mode infini : on monte après 2 étoiles, on redescend après un échec. */
export function nextEndlessDifficulty(current: number, stars: number): number {
  if (stars >= 2) return Math.min(10, current + 1);
  if (stars === 0) return Math.max(1, current - 1);
  return current;
}

export function dailyKey(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

/** Cycles proposés pour les parties ciblées. */
export const CYCLES = [...new Set(Object.values(CYCLE_OF))];
