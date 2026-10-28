// Modes de jeu hors campagne. Audit Detective — Gauthier Doumont.
import { getLevel } from '../src/content/levels';
import { SECTORS } from '../src/content/sectors';
import { ANOMALY_CATALOGUE, CYCLE_OF } from '../src/engine/anomalies';
import { generateCase } from '../src/engine/generate';
import { CYCLES, dailyKey, modeLevel, nextEndlessDifficulty } from '../src/engine/modes';
import { validateLevel } from '../src/engine/validate';

const ids = [
  ...[1, 2, 3, 4].flatMap((d) => ['a1', 'b2', 'c3'].map((s) => `quick:${d}:${s}`)),
  ...[6, 7, 8, 9, 10].flatMap((d) => ['x1', 'y2'].map((s) => `big:${d}:${s}`)),
  ...['20261026', '20261027', '20261028', '20261101'].map((day) => `daily:${day}`),
  ...[1, 5, 10].map((d) => `endless:${d}:${d * 7}`),
  ...CYCLES.map((cycle) => `focus:${cycle}:6:z9`),
];

describe('modes de jeu', () => {
  it.each(ids)('%s : dossier valide', (id) => {
    const level = modeLevel(id)!;
    expect(level.id).toBe(id);
    expect(validateLevel(level)).toEqual([]);
  });

  it('partie rapide : format court ; grand dossier : format long', () => {
    expect(modeLevel('quick:2:a1')!.format).toBe('court');
    expect(modeLevel('big:9:x1')!.format).toBe('long');
  });

  it('même identifiant : même dossier (une partie reprise se régénère à l’identique)', () => {
    expect(JSON.stringify(modeLevel('big:8:x1'))).toBe(JSON.stringify(modeLevel('big:8:x1')));
    expect(getLevel('quick:3:a1')!.client.name).toBe(modeLevel('quick:3:a1')!.client.name);
  });

  it('partie ciblée : toutes les anomalies du cycle demandé', () => {
    for (const cycle of CYCLES) for (const a of modeLevel(`focus:${cycle}:6:z9`)!.anomalies) expect(a.cycle).toBe(cycle);
  });

  it('défi du jour : graine = date AAAAMMJJ', () => {
    expect(dailyKey(new Date(2026, 9, 28))).toBe('20261028');
  });

  it('mode infini : la difficulté s’adapte', () => {
    expect(nextEndlessDifficulty(5, 3)).toBe(6);
    expect(nextEndlessDifficulty(5, 1)).toBe(5);
    expect(nextEndlessDifficulty(5, 0)).toBe(4);
    expect(nextEndlessDifficulty(10, 3)).toBe(10);
    expect(nextEndlessDifficulty(1, 0)).toBe(1);
  });

  it('le cycle déclaré de chaque anomalie correspond à son injection', () => {
    for (const def of ANOMALY_CATALOGUE) {
      const sector = Object.values(SECTORS).find((s) => def.appliesTo(s))!;
      const generated = generateCase({ number: 100, seed: `cycle-${def.type}`, difficulty: 6, sector: sector.id, anomalies: [def.type] });
      expect(generated.injections[0]!.cycle, def.type).toBe(CYCLE_OF[def.type]);
    }
  });
});
