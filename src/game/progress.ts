// Ce qu'une partie terminée change dans la progression (statistiques, modes). Fonctions pures.
// Audit Detective — créé par Gauthier Doumont.
import { ASSERTION_LABELS } from '../content/labels';
import type { Assertion } from '../content/types';
import type { ScoreResult } from './scoring';

/** Une anomalie est « trouvée » quand le compte et le montant sont justes ; l'assertion est notée à part. */
export function statOutcomes(result: ScoreResult): { key: string; success: boolean }[] {
  return result.anomalies.flatMap((r) => [
    { key: `cycle:${r.anomaly.cycle}`, success: r.account && r.amount },
    { key: `assertion:${r.anomaly.assertion}`, success: r.assertion },
  ]);
}

export type StatLine = { label: string; seen: number; rate: number };

export function statLines(stats: { key: string; seen: number; success: number }[], prefix: 'cycle' | 'assertion'): StatLine[] {
  return stats
    .filter((s) => s.key.startsWith(`${prefix}:`))
    .map((s) => {
      const name = s.key.slice(prefix.length + 1);
      return { label: prefix === 'assertion' ? (ASSERTION_LABELS[name as Assertion] ?? name) : name, seen: s.seen, rate: s.seen === 0 ? 0 : s.success / s.seen };
    })
    .sort((a, b) => a.rate - b.rate || b.seen - a.seen);
}

/** Cycle le plus raté (le moins réussi parmi ceux déjà rencontrés). */
export function weakestCycle(stats: { key: string; seen: number; success: number }[]): string | undefined {
  return statLines(stats, 'cycle')[0]?.label;
}

/**
 * Déblocage séquentiel dans l'ordre de jeu (niveaux « bis » compris) : une étoile au niveau précédent suffit.
 * Un niveau déjà réussi reste ouvert, même si un niveau « bis » a été intercalé avant lui depuis.
 */
export function isUnlocked(order: readonly { id: string }[], starsOf: (id: string) => number | undefined, id: string): boolean {
  const index = order.findIndex((l) => l.id === id);
  return index <= 0 || (starsOf(id) ?? 0) >= 1 || (starsOf(order[index - 1]!.id) ?? 0) >= 1;
}
