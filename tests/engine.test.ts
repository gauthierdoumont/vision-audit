// Invariants du moteur de génération (cahier des charges §8). Audit Detective — Gauthier Doumont.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEVEL_SUMMARIES, getLevel } from '../src/content/levels';
import { SECTOR_IDS } from '../src/content/sectors';
import { ANOMALY_TYPES } from '../src/engine/anomalies';
import { generateCase, type LevelSpec } from '../src/engine/generate';
import { invoiceTotals } from '../src/engine/invoices';
import { formatAmount, vatOf } from '../src/engine/money';
import { createRng } from '../src/engine/rng';
import { validateCase, validateLevel } from '../src/engine/validate';

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
    const dir = join(__dirname, '../src/engine');
    for (const file of readdirSync(dir)) {
      expect(readFileSync(join(dir, file), 'utf8'), file).not.toMatch(/Math\.random\s*\(/);
    }
  });
});

describe('cas générés : tous secteurs × toutes anomalies', () => {
  const specs: LevelSpec[] = SECTOR_IDS.flatMap((sector, s) =>
    ANOMALY_TYPES.flatMap((type, t) =>
      [1, 4, 8].map((difficulty, d) => ({ number: 100 + s * 100 + t * 10 + d, seed: `test-${sector}-${type}-${d}`, difficulty, sector, anomalies: [type] })),
    ),
  );

  it.each(specs.map((spec) => [`${spec.sector} / ${spec.anomalies[0]} / difficulté ${spec.difficulty}`, spec] as const))('%s', (_, spec) => {
    const generated = generateCase(spec);
    expect(validateLevel(generated.level)).toEqual([]);
    expect(validateCase(generated)).toEqual([]);
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
  it('20 niveaux, numérotés de 1 à 20', () => {
    expect(LEVEL_SUMMARIES.map((l) => l.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('les résumés de l’accueil correspondent aux niveaux générés', () => {
    for (const summary of LEVEL_SUMMARIES) {
      const level = getLevel(summary.id)!;
      expect(level.title).toBe(summary.title);
      expect(level.client.name).toBe(summary.clientName);
    }
  });
});
