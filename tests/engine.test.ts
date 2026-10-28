// Invariants du moteur de génération (cahier des charges §8). Audit Detective — Gauthier Doumont.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LEVEL_SUMMARIES, getLevel } from '../src/content/levels';
import { SECTOR_IDS } from '../src/content/sectors';
import { ANOMALY_CATALOGUE } from '../src/engine/anomalies';
import { SECTORS } from '../src/content/sectors';
import { generateCase, type LevelSpec } from '../src/engine/generate';
import { invoiceTotals } from '../src/engine/invoices';
import { formatAmount, vatOf } from '../src/engine/money';
import { createRng } from '../src/engine/rng';
import { validateCase, validateLevel, validatePartyBalances } from '../src/engine/validate';
import { scoreGame } from '../src/game/scoring';
import { createGame, gameReducer, type GameAction } from '../src/game/state';

describe('rng', () => {
  it('même graine, même suite ; graines différentes, suites différentes', () => {
    const draw = (seed: string) => Array.from({ length: 5 }, () => createRng(seed).next());
    const a = createRng('abc');
    const b = createRng('abc');
    expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)]);
    expect(draw('abc')).not.toEqual(draw('abd'));
  });

  it('int reste dans ses bornes et les atteint', () => {
    const rng = createRng('bornes');
    const values = new Set(Array.from({ length: 500 }, () => rng.int(1, 4)));
    expect([...values].sort()).toEqual([1, 2, 3, 4]);
  });

  it('fork ne dépend pas de l’usage du générateur parent', () => {
    const a = createRng('x');
    const b = createRng('x');
    b.next();
    expect(a.fork('y').next()).toBe(b.fork('y').next());
  });
});

describe('montants', () => {
  it('format belge et TVA arrondie au centime', () => {
    expect(formatAmount(339200)).toBe('3 392,00');
    expect(formatAmount(-5)).toBe('−0,05');
    expect(vatOf(320000, 6)).toBe(19200);
    expect(vatOf(1999, 21)).toBe(420);
  });

  it('TVA calculée par taux sur le total HTVA de ce taux', () => {
    const totals = invoiceTotals({ lines: [{ label: 'a', quantity: 3, unitPrice: 333, vatRate: 21 }, { label: 'b', quantity: 1, unitPrice: 1000, vatRate: 6 }] });
    expect(totals.byRate).toEqual([{ rate: 6, base: 1000, vat: 60 }, { rate: 21, base: 999, vat: 210 }]);
    expect(totals.total).toBe(2269);
  });
});

describe('Math.random interdit dans le moteur', () => {
  it('aucun fichier de src/engine ne l’utilise', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
    for (const file of walk(join(__dirname, '../src/engine'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/Math\.random\s*\(/);
    }
  });
});

describe('cas générés : tous secteurs × toutes anomalies', () => {
  const specs: LevelSpec[] = SECTOR_IDS.flatMap((sector, s) =>
    ANOMALY_CATALOGUE.filter((a) => a.appliesTo(SECTORS[sector])).flatMap((a, t) =>
      [1, 4, 8].map((difficulty, d) => ({ number: 100 + s * 100 + t * 10 + d, seed: `test-${sector}-${a.type}-${d}`, difficulty, sector, anomalies: [a.type] })),
    ),
  );

  it.each(specs.map((spec) => [`${spec.sector} / ${spec.anomalies[0]} / difficulté ${spec.difficulty}`, spec] as const))('%s', (_, spec) => {
    const generated = generateCase(spec);
    expect(validateLevel(generated.level)).toEqual([]);
    expect(validateCase(generated)).toEqual([]);
    expect(validatePartyBalances(generated)).toEqual([]);
  });

  it('même graine : cas identique (déterminisme)', () => {
    const spec = specs[7]!;
    expect(JSON.stringify(generateCase(spec))).toBe(JSON.stringify(generateCase(spec)));
  });

  it('graines différentes : entreprises différentes', () => {
    const names = new Set(specs.slice(0, 12).map((spec) => generateCase(spec).level.client.name));
    expect(names.size).toBeGreaterThan(6);
  });
});

describe('campagne', () => {
  it('niveaux numérotés sans trou à partir de 1', () => {
    expect(LEVEL_SUMMARIES.map((l) => l.number)).toEqual(Array.from({ length: LEVEL_SUMMARIES.length }, (_, i) => i + 1));
  });

  it('les résumés de l’accueil correspondent aux niveaux générés', () => {
    for (const summary of LEVEL_SUMMARIES) {
      const level = getLevel(summary.id)!;
      expect(level.title).toBe(summary.title);
      expect(level.client.name).toBe(summary.clientName);
    }
  });

  it.each(LEVEL_SUMMARIES.map((s) => [s.number, s.id] as const))('niveau %i : jouable parfaitement en 3 étoiles', (_, id) => {
    const level = getLevel(id)!;
    const actions: GameAction[] = [{ type: 'read-briefing' }];
    level.anomalies.forEach((anomaly, i) => {
      // Procédure la moins chère qui révèle une trace documentaire.
      const traceDocs = anomaly.traces.map((t) => t.split('#')[0]!);
      const options = level.procedures.flatMap((p) => {
        const pooled = p.sampling?.pool.find((d) => traceDocs.includes(d));
        if (pooled) return [{ hours: p.hours, action: { type: 'sample', procedureId: p.id, documentIds: [pooled] } as GameAction }];
        return p.reveals.some((d) => traceDocs.includes(d)) ? [{ hours: p.hours, action: { type: 'run-procedure', procedureId: p.id } as GameAction }] : [];
      });
      actions.push(options.sort((a, b) => a.hours - b.hours)[0]!.action);
      actions.push({ type: 'toggle-pin', clueId: anomaly.traces[0]! });
      actions.push({
        type: 'add-finding',
        finding: {
          id: `f${i}`,
          account: anomaly.accounts[0]!.account,
          amount: anomaly.accounts[0]!.amount,
          assertion: anomaly.assertion,
          qualification: anomaly.qualification,
          correction: anomaly.correction,
          clues: [anomaly.traces[0]!],
        },
      });
    });
    actions.push({ type: 'set-opinion', opinion: level.expectedOpinion.opinion }, { type: 'set-continuity', continuity: level.expectedOpinion.continuity });
    const state = actions.reduce((s, a) => gameReducer(level, s, a), createGame(level));
    const result = scoreGame(level, state);
    expect(result.stars).toBe(3);
    expect(result.total).toBe(100);
  });
});

describe('amortissement prorata temporis', () => {
  it('compte les jours d’utilisation la première année (exemple : 1er avril, 275 jours sur 365)', async () => {
    const { daysUsed, depreciationFor } = await import('../src/engine/ledger');
    expect(daysUsed('2025-04-01')).toBe(275);
    expect(daysUsed('2025-12-31')).toBe(1);
    const asset = { id: 'a', label: 'Machine', account: '2300', depreciationAccount: '2309', acquisitionDate: '2025-04-01', cost: 1_500_000, years: 10, priorDepreciation: 0 };
    expect(depreciationFor(asset, 2025)).toBe(Math.round((150_000 * 275) / 365));
    expect(depreciationFor(asset, 2026)).toBe(150_000);
  });
});
