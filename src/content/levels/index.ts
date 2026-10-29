import { generateLevel, levelClientName, levelId, levelTitle } from '../../engine/generate';
import { modeLevel } from '../../engine/modes';
import type { Level } from '../types';
import { CAMPAIGN_SPECS } from './campaign';
import { level001 } from './level-001';

export type LevelSummary = { id: string; number: number; label: string; title: string; clientName: string; format: Level['format']; difficulty: number };

const cache = new Map<string, Level>([[level001.id, level001]]);
const specById = new Map(CAMPAIGN_SPECS.map((s) => [levelId(s), s]));

export const LEVEL_IDS = [level001.id, ...specById.keys()];

/** Résumés pour l'écran d'accueil, sans générer la comptabilité complète. */
export const LEVEL_SUMMARIES: LevelSummary[] = [
  { id: level001.id, number: 1, label: '1', title: level001.title, clientName: level001.client.name, format: level001.format, difficulty: level001.difficulty },
  ...CAMPAIGN_SPECS.map((spec) => ({
    id: levelId(spec),
    number: spec.number,
    label: spec.bis ? `${spec.number} bis` : String(spec.number),
    title: levelTitle(spec),
    clientName: levelClientName(spec),
    format: spec.format ?? ('court' as const),
    difficulty: spec.difficulty,
  })),
];

/** Les niveaux générés le sont à la demande, puis gardés en mémoire. */
export function getLevel(id: string): Level | undefined {
  const cached = cache.get(id);
  if (cached) return cached;
  if (id.includes(':')) {
    const level = modeLevel(id);
    if (level) cache.set(id, level);
    return level;
  }
  const spec = specById.get(id);
  if (!spec) return undefined;
  const level = generateLevel(spec);
  cache.set(id, level);
  return level;
}

export function allLevels(): Level[] {
  return LEVEL_IDS.map((id) => getLevel(id)!);
}
