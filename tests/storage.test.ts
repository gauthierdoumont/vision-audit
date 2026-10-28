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
