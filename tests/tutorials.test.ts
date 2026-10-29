// Fiches d'Hélène : déclenchement sans rien dévoiler, et parcours de la campagne. Audit Detective — Gauthier Doumont.
import { allLevels, getLevel } from '../src/content/levels';
import { level001 } from '../src/content/levels/level-001';
import { ANOMALY_TYPES } from '../src/engine/anomalies';
import { briefingTutorials, debriefNotions } from '../src/game/tutorials';

const ids = (list: { id: string }[]) => list.map((t) => t.id);

describe('fiches d’Hélène', () => {
  it('niveau 1 : les bases du jeu, puis le mini-cours de l’anomalie', () => {
    const list = ids(briefingTutorials(level001, []));
    expect(list).toEqual(['m:bienvenue', 'm:carnet', 'm:conclusion', 'a:duplicate-purchase']);
    expect(briefingTutorials(level001, list)).toEqual([]);
  });

  it('les fiches de mécanique ne dépendent jamais des anomalies cachées', () => {
    for (const id of ['level-021', 'level-047', 'level-066', 'level-081']) {
      const level = getLevel(id)!;
      const mechanics = (l: typeof level) => ids(briefingTutorials(l, [])).filter((t) => t.startsWith('m:'));
      expect(mechanics({ ...level, anomalies: [] })).toEqual(mechanics(level));
    }
  });

  it('dossier à plusieurs anomalies : pas de mini-cours avant la partie, mais au débrief', () => {
    const level = getLevel('level-048')!;
    expect(ids(briefingTutorials(level, [])).some((t) => t.startsWith('a:'))).toBe(false);
    expect(ids(debriefNotions(level, []))).toEqual(['a:fictitious-sale', 'a:unrecorded-invoice']);
  });

  it('hors campagne, le mini-cours attend le débrief', () => {
    const level = getLevel('quick:2:test')!;
    expect(ids(briefingTutorials(level, [])).some((t) => t.startsWith('a:'))).toBe(false);
  });

  it('chaque type d’anomalie a son mini-cours', () => {
    for (const type of ANOMALY_TYPES) expect(debriefNotions({ ...level001, anomalies: [{ ...level001.anomalies[0]!, type }] }, [])).toHaveLength(1);
  });

  it('campagne jouée dans l’ordre : chaque fiche une seule fois, jamais plus de 5 d’un coup', () => {
    const seen: string[] = [];
    for (const level of allLevels()) {
      const before = briefingTutorials(level, seen);
      expect(before.length, level.id).toBeLessThanOrEqual(5);
      seen.push(...ids(before));
      seen.push(...ids(debriefNotions(level, seen)));
    }
    expect(new Set(seen).size).toBe(seen.length);
    for (const type of new Set(allLevels().flatMap((l) => l.anomalies.map((a) => a.type)))) expect(seen).toContain(`a:${type}`);
  });
});
