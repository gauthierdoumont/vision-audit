// Quelles fiches d'Hélène montrer, et quand. Une fiche de mécanique se déclenche sur ce que le joueur voit déjà
// (procédures disponibles, format, consignes du briefing), jamais sur les anomalies cachées. Un mini-cours
// d'anomalie n'est montré avant la partie que si l'anomalie est seule dans le dossier (niveau d'introduction) ;
// sinon, il attend le débrief. Audit Detective — créé par Gauthier Doumont.
import { ANOMALY_NOTIONS, MECHANIC_TUTORIALS, type MechanicId, type Tutorial } from '../content/tutorials';
import type { Level } from '../content/types';
import type { AnomalyType } from '../engine/anomalies';

const has = (level: Level, procedureId: string) => level.procedures.some((p) => p.id === procedureId);

/** Ordre d'affichage et déclencheur de chaque fiche de mécanique. */
const TRIGGERS: [MechanicId, (level: Level) => boolean][] = [
  ['bienvenue', () => true],
  ['carnet', () => true],
  ['conclusion', () => true],
  ['sondage', (l) => l.procedures.some((p) => p.sampling)],
  ['pari', (l) => Boolean(l.firm?.maximeBet)],
  ['outils-assistant', (l) => has(l, 'controle-paie')],
  ['mensonges', (l) => has(l, 'controle-paie')],
  ['benford', (l) => has(l, 'benford')],
  ['refus', (l) => Boolean(l.notices?.includes('client-refuse'))],
  ['format-moyen', (l) => l.format !== 'court'],
  ['inventaire', (l) => has(l, 'inventaire') || has(l, 'contrats')],
  ['format-long', (l) => l.format === 'long'],
  ['limitation', (l) => Boolean(l.notices?.some((n) => n === 'limitation-inventaire' || n === 'lettre-refusee'))],
  ['cas-reel', (l) => Boolean(l.realCase)],
];

export const mechanicTutorial = (id: MechanicId): Tutorial => ({ id: `m:${id}`, ...MECHANIC_TUTORIALS[id] });

export function anomalyNotion(type: string): Tutorial | undefined {
  const notion = ANOMALY_NOTIONS[type as AnomalyType];
  return notion && { id: `a:${type}`, ...notion };
}

/** Toutes les fiches de mécanique, dans l'ordre de la campagne (relecture dans les outils). */
export const ALL_MECHANIC_TUTORIALS: Tutorial[] = TRIGGERS.map(([id]) => mechanicTutorial(id));

const typesOf = (level: Level) => [...new Set(level.anomalies.map((a) => a.type).filter((t): t is string => Boolean(t)))];

/** Fiches à lire avant d'ouvrir le dossier : mécaniques nouvelles, puis mini-cours du niveau d'introduction. */
export function briefingTutorials(level: Level, seen: readonly string[]): Tutorial[] {
  const mechanics = TRIGGERS.filter(([, applies]) => applies(level)).map(([id]) => mechanicTutorial(id));
  const types = typesOf(level);
  // Hors campagne (partie rapide…), le mini-cours attend le débrief : il dévoilerait l'anomalie.
  const notions = level.number > 0 && types.length === 1 && level.anomalies.length === 1 ? types.map(anomalyNotion) : [];
  return [...mechanics, ...notions].filter((t): t is Tutorial => Boolean(t) && !seen.includes(t!.id));
}

/** Mini-cours à montrer au débrief : anomalies rencontrées pour la première fois dans un dossier à plusieurs anomalies. */
export function debriefNotions(level: Level, seen: readonly string[]): Tutorial[] {
  return typesOf(level)
    .map(anomalyNotion)
    .filter((t): t is Tutorial => Boolean(t) && !seen.includes(t!.id));
}
