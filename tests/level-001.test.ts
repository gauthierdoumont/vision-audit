// Cohérence du niveau 1 (invariants du cahier des charges §8). Audit Detective — Gauthier Doumont.
import { level001 as level } from '../src/content/levels/level-001';
import { findAccount } from '../src/content/pcmn';
import { describeClue } from '../src/game/clues';
import { isBalanced } from '../src/game/scoring';
import { parseAmount } from '../src/ui/format';

const doc = (id: string) => level.documents.find((d) => d.id === id)!;
const cents = (n: number) => Math.round(n * 100);

describe('niveau 1 — cohérence comptable', () => {
  it('journal des achats : TVA = base × taux belge et TVAC = HTVA + TVA', () => {
    for (const line of doc('journal-achats').lines) {
      const [base, vat, total] = line.cells.slice(4).map(parseAmount) as [number, number, number];
      const rate = [0.06, 0.21].find((r) => cents(base * r) === cents(vat));
      expect(rate, line.id).toBeDefined();
      expect(cents(base + vat), line.id).toBe(cents(total));
    }
  });

  it('facture : lignes, total HTVA, TVA 6 % et total TVAC concordent', () => {
    const lines = doc('facture-1187').lines;
    const items = lines.filter((l) => l.cells[1] !== '');
    for (const item of items) {
      expect(cents(parseAmount(item.cells[1]!) * parseAmount(item.cells[2]!))).toBe(cents(parseAmount(item.cells[3]!)));
    }
    const subtotal = items.reduce((s, l) => s + parseAmount(l.cells[3]!), 0);
    const amount = (id: string) => parseAmount(lines.find((l) => l.id === id)!.cells[3]!);
    expect(cents(subtotal)).toBe(cents(amount('fht')));
    expect(cents(amount('fht') * 0.06)).toBe(cents(amount('ftva')));
    expect(cents(amount('fht') + amount('ftva'))).toBe(cents(amount('fttc')));
  });

  it('relevé bancaire : solde initial + mouvements = solde final = solde du 550', () => {
    const lines = doc('releve-bancaire').lines.map((l) => parseAmount(l.cells[2]!));
    const movements = lines.slice(1, -1).reduce((s, n) => s + n, 0);
    expect(cents(lines[0]! + movements)).toBe(cents(lines.at(-1)!));
    const ledger550 = doc('balance').lines.find((l) => l.id === 'l550')!.cells[2]!;
    expect(cents(parseAmount(ledger550))).toBe(cents(lines.at(-1)!));
  });

  it('écriture de correction équilibrée, comptes PCMN existants', () => {
    for (const anomaly of level.anomalies) {
      expect(isBalanced(anomaly.correction)).toBe(true);
      for (const line of anomaly.correction) expect(findAccount(line.account), line.account).toBeDefined();
      for (const a of anomaly.accounts) expect(findAccount(a.account), a.account).toBeDefined();
    }
  });
});

describe('niveau 1 — jouabilité', () => {
  it('chaque anomalie laisse au moins 2 traces existantes', () => {
    for (const anomaly of level.anomalies) {
      expect(anomaly.traces.length).toBeGreaterThanOrEqual(2);
      for (const trace of anomaly.traces) expect(describeClue(level, trace), trace).toBeDefined();
    }
  });

  it('chaque document est visible au départ ou révélé par une procédure', () => {
    const reachable = new Set([...level.initialDocuments, ...level.procedures.flatMap((p) => p.reveals)]);
    for (const d of level.documents) expect(reachable.has(d.id), d.id).toBe(true);
  });

  it('chaque anomalie est détectable par une procédure dans le budget', () => {
    for (const anomaly of level.anomalies) {
      const viaProcedure = level.procedures.some(
        (p) => p.hours <= level.budgetHours && p.reveals.some((id) => anomaly.traces.some((t) => t.startsWith(`${id}#`))),
      );
      expect(viaProcedure).toBe(true);
    }
  });

  it('budget = chemin optimal × 2 en difficulté 1', () => {
    expect(level.budgetHours).toBeGreaterThanOrEqual(level.optimalHours * 2);
  });

  it('textes courts : 3 à 6 lignes par message ou réplique', () => {
    expect(level.briefing.body.length).toBeLessThanOrEqual(6);
    for (const topic of level.characters.flatMap((c) => c.topics)) {
      expect(topic.answer.length).toBeGreaterThanOrEqual(1);
      expect(topic.answer.length).toBeLessThanOrEqual(6);
    }
  });
});
