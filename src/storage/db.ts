// Sauvegarde locale (IndexedDB) : partie en cours, meilleurs résultats, statistiques et réglages.
// Audit Detective — Gauthier Doumont.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GameState } from '../game/state';

export type LevelResult = { levelId: string; bestScore: number; stars: number };

/** Compteur de réussite : `cycle:ventes`, `assertion:existence`… */
export type StatRecord = { key: string; seen: number; success: number };

interface AuditDetectiveDB extends DBSchema {
  saves: { key: string; value: GameState };
  results: { key: string; value: LevelResult };
  stats: { key: string; value: StatRecord };
  meta: { key: string; value: unknown };
}

const CURRENT_GAME = 'current';
let dbPromise: Promise<IDBPDatabase<AuditDetectiveDB>> | null = null;

function db() {
  dbPromise ??= openDB<AuditDetectiveDB>('audit-detective', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore('saves');
        database.createObjectStore('results', { keyPath: 'levelId' });
      }
      if (oldVersion < 2) {
        database.createObjectStore('stats', { keyPath: 'key' });
        database.createObjectStore('meta');
      }
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

/** Ajoute les résultats d'une partie aux statistiques (`success` : nombre de réussites sur `seen`). */
export async function recordStats(outcomes: { key: string; success: boolean }[]): Promise<void> {
  const database = await db();
  const tx = database.transaction('stats', 'readwrite');
  for (const { key, success } of outcomes) {
    const previous = (await tx.store.get(key)) ?? { key, seen: 0, success: 0 };
    await tx.store.put({ key, seen: previous.seen + 1, success: previous.success + (success ? 1 : 0) });
  }
  await tx.done;
}

export async function loadStats(): Promise<StatRecord[]> {
  return (await db()).getAll('stats');
}

export async function loadMeta<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('meta', key)) as T | undefined;
}

export async function saveMeta(key: string, value: unknown): Promise<void> {
  await (await db()).put('meta', value, key);
}

const TUTORIALS_SEEN = 'tutorials-seen';

/** Fiches d'Hélène déjà lues (identifiants `m:…` pour les mécaniques, `a:…` pour les anomalies). */
export async function loadSeenTutorials(): Promise<string[]> {
  return (await loadMeta<string[]>(TUTORIALS_SEEN)) ?? [];
}

export async function markTutorialsSeen(ids: string[]): Promise<string[]> {
  const seen = [...new Set([...(await loadSeenTutorials()), ...ids])];
  await saveMeta(TUTORIALS_SEEN, seen);
  return seen;
}

export async function resetTutorials(): Promise<void> {
  await saveMeta(TUTORIALS_SEEN, []);
}
