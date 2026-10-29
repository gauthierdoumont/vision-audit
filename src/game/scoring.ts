// Score d'une partie (cahier des charges §10). Audit Detective — Gauthier Doumont.
import type { Anomaly, EntryLine, Level } from '../content/types';
import type { Finding, GameState } from './state';

export const AMOUNT_TOLERANCE = 0.01;
export const PENALTY_FALSE_POSITIVE = 15;
export const PENALTY_HINT = 10;
export const PENALTY_OPINION = 15;

export type AnomalyResult = {
  anomaly: Anomaly;
  finding: Finding | null;
  account: boolean;
  assertion: boolean;
  amount: boolean;
  qualification: boolean;
  correction: boolean;
  justified: boolean;
};

export type ScoreResult = {
  anomalies: AnomalyResult[];
  falsePositives: Finding[];
  opinionCorrect: boolean;
  accuracy: number;
  efficiency: number;
  justification: number;
  penalties: number;
  total: number;
  stars: number;
};

/** Le compte saisi correspond au compte attendu ou à l'un de ses comptes parents (au moins 2 chiffres). */
export function accountMatches(actual: string, expected: string): boolean {
  const code = actual.trim();
  return code === expected || (code.length >= 2 && expected.startsWith(code));
}

export function amountMatches(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= Math.abs(expected) * AMOUNT_TOLERANCE;
}

/** Même ensemble de comptes, même sens et montants à ±1 % (l'ordre des lignes est libre). */
export function correctionMatches(actual: EntryLine[], expected: EntryLine[]): boolean {
  const lines = actual.filter((l) => l.debit !== 0 || l.credit !== 0);
  if (lines.length !== expected.length) return false;
  const remaining = [...lines];
  return expected.every((exp) => {
    const index = remaining.findIndex(
      (l) => accountMatches(l.account, exp.account) && amountMatches(l.debit, exp.debit) && amountMatches(l.credit, exp.credit),
    );
    if (index === -1) return false;
    remaining.splice(index, 1);
    return true;
  });
}

export function isBalanced(lines: EntryLine[]): boolean {
  const debit = lines.reduce((sum, l) => sum + l.debit, 0);
  const credit = lines.reduce((sum, l) => sum + l.credit, 0);
  return Math.abs(debit - credit) < 0.005 && debit > 0;
}

export function relatesTo(finding: Finding, anomaly: Anomaly): boolean {
  return (
    anomaly.accounts.some((a) => accountMatches(finding.account, a.account)) || finding.clues.some((c) => anomaly.traces.includes(c))
  );
}

function evaluate(anomaly: Anomaly, finding: Finding | null): AnomalyResult {
  const expected = finding && anomaly.accounts.find((a) => accountMatches(finding.account, a.account));
  return {
    anomaly,
    finding,
    account: Boolean(expected),
    assertion: finding?.assertion === anomaly.assertion,
    amount: Boolean(expected && finding && amountMatches(finding.amount, expected.amount)),
    qualification: finding?.qualification === anomaly.qualification,
    correction: Boolean(finding && correctionMatches(finding.correction, anomaly.correction)),
    justified: Boolean(finding?.clues.some((c) => anomaly.traces.includes(c))),
  };
}

function efficiencyScore(level: Level, hoursUsed: number): number {
  if (hoursUsed > level.budgetHours) return 0;
  if (hoursUsed <= level.optimalHours) return 20;
  const overOptimal = (hoursUsed - level.optimalHours) / (level.budgetHours - level.optimalHours);
  return 20 * (1 - 0.5 * overOptimal);
}

export function scoreGame(level: Level, state: GameState): ScoreResult {
  const unused = [...state.findings];
  const anomalies = level.anomalies.map((anomaly) => {
    const index = unused.findIndex((f) => relatesTo(f, anomaly));
    const finding = index === -1 ? null : unused.splice(index, 1)[0]!;
    return evaluate(anomaly, finding);
  });
  const falsePositives = unused;

  const share = 1 / level.anomalies.length;
  const accuracy = anomalies.reduce((sum, r) => {
    const criteria = [r.account, r.assertion, r.amount, r.qualification, r.correction];
    return sum + 60 * share * (criteria.filter(Boolean).length / criteria.length);
  }, 0);
  const justification = anomalies.reduce((sum, r) => sum + (r.justified ? 20 * share : 0), 0);
  const efficiency = efficiencyScore(level, state.hoursUsed);

  const opinionCorrect =
    state.opinion === level.expectedOpinion.opinion && state.continuity === level.expectedOpinion.continuity;
  const penalties =
    falsePositives.length * PENALTY_FALSE_POSITIVE +
    state.hintsUsed * PENALTY_HINT +
    (opinionCorrect ? 0 : PENALTY_OPINION);

  // Solution consultée : le travail est corrigé, mais la partie ne rapporte ni points ni étoile.
  const total = state.solutionViewed ? 0 : Math.max(0, Math.round(accuracy + efficiency + justification - penalties));

  const found = anomalies.filter((r) => r.account && r.amount).length;
  let stars = 0;
  if (found >= 1 && opinionCorrect) stars = 1;
  if (stars === 1 && found === level.anomalies.length) stars = 2;
  if (stars === 2 && state.hoursUsed <= level.budgetHours && state.hintsUsed === 0) stars = 3;
  if (state.solutionViewed) stars = 0;

  return { anomalies, falsePositives, opinionCorrect, accuracy, efficiency, justification, penalties, total, stars };
}
