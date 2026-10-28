import 'fake-indexeddb/auto';
import { level001 } from '../src/content/levels/level-001';
import { createGame } from '../src/game/state';
import { clearCurrentGame, loadCurrentGame, loadResults, recordResult, saveCurrentGame } from '../src/storage/db';

describe('sauvegarde', () => {
  it('enregistre, relit et efface la partie en cours', async () => {
    const state = { ...createGame(level001), hoursUsed: 2 };
    await saveCurrentGame(state);
    expect(await loadCurrentGame()).toEqual(state);
    await clearCurrentGame();
    expect(await loadCurrentGame()).toBeUndefined();
  });

  it('garde le meilleur résultat', async () => {
    await recordResult({ levelId: 'level-001', bestScore: 80, stars: 2 });
    await recordResult({ levelId: 'level-001', bestScore: 60, stars: 3 });
    expect(await loadResults()).toEqual([{ levelId: 'level-001', bestScore: 80, stars: 3 }]);
  });
});

describe('statistiques et réglages', () => {
  it('cumule les réussites par cycle et par assertion', async () => {
    const { recordStats, loadStats } = await import('../src/storage/db');
    await recordStats([{ key: 'cycle:ventes', success: true }, { key: 'assertion:existence', success: false }]);
    await recordStats([{ key: 'cycle:ventes', success: false }]);
    const stats = await loadStats();
    expect(stats.find((s) => s.key === 'cycle:ventes')).toEqual({ key: 'cycle:ventes', seen: 2, success: 1 });
    expect(stats.find((s) => s.key === 'assertion:existence')).toEqual({ key: 'assertion:existence', seen: 1, success: 0 });
  });

  it('enregistre des valeurs diverses (mode infini, défi du jour)', async () => {
    const { loadMeta, saveMeta } = await import('../src/storage/db');
    await saveMeta('endless', { difficulty: 4, played: 3 });
    expect(await loadMeta('endless')).toEqual({ difficulty: 4, played: 3 });
    expect(await loadMeta('absent')).toBeUndefined();
  });
});
