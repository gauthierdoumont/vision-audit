// Sauvegarde locale (IndexedDB) : partie en cours et meilleurs résultats. Audit Detective — Gauthier Doumont.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GameState } from '../game/state';

export type LevelResult = { levelId: string; bestScore: number; stars: number };

interface AuditDetectiveDB extends DBSchema {
  saves: { key: string; value: GameState };
  results: { key: string; value: LevelResult };
}

const CURRENT_GAME = 'current';
let dbPromise: Promise<IDBPDatabase<AuditDetectiveDB>> | null = null;

function db() {
  dbPromise ??= openDB<AuditDetectiveDB>('audit-detective', 1, {
    upgrade(database) {
      database.createObjectStore('saves');
      database.createObjectStore('results', { keyPath: 'levelId' });
    },
  });
  return dbPromise;
}

export async function loadCurrentGame(): Promise<GameState | undefined> {
  return (await db()).get('saves', CURRENT_GAME);
}

export async function saveCurrentGame(state: GameState): Promise<void> {
  await (await db()).put('saves', state, CURRENT_GAME);
}

export async function clearCurrentGame(): Promise<void> {
  await (await db()).delete('saves', CURRENT_GAME);
}

/** Enregistre un résultat en gardant le meilleur score et le meilleur nombre d'étoiles. */
export async function recordResult(result: LevelResult): Promise<LevelResult> {
  const database = await db();
  const previous = await database.get('results', result.levelId);
  const best: LevelResult = {
    levelId: result.levelId,
    bestScore: Math.max(result.bestScore, previous?.bestScore ?? 0),
    stars: Math.max(result.stars, previous?.stars ?? 0),
  };
  await database.put('results', best);
  return best;
}

export async function loadResults(): Promise<LevelResult[]> {
  return (await db()).getAll('results');
}
