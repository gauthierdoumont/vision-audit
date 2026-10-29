import { useCallback, useEffect, useRef, useState } from 'react';
import { getLevel } from '../content/levels';
import type { Tutorial } from '../content/tutorials';
import type { Level } from '../content/types';
import { scoreGame, type ScoreResult } from '../game/scoring';
import { nextEndlessDifficulty } from '../engine/modes';
import { statOutcomes } from '../game/progress';
import { createGame, restoreGame, type GameState } from '../game/state';
import { debriefNotions } from '../game/tutorials';
import {
  clearCurrentGame, loadCurrentGame, loadMeta, loadResults, loadSeenTutorials, markTutorialsSeen, recordResult, recordStats, saveMeta, type LevelResult,
} from '../storage/db';
import { GameScreen } from './game/GameScreen';
import { AboutScreen } from './screens/AboutScreen';
import { DebriefScreen } from './screens/DebriefScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ModesScreen, type EndlessProgress } from './screens/ModesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StatsScreen } from './screens/StatsScreen';
import { applySettings, loadSettings } from './settings';
import { ToolsPanel } from './ToolsPanel';

export type Screen = 'home' | 'about' | 'modes' | 'stats' | 'settings' | 'tools';

type View =
  | { name: Screen }
  | { name: 'game'; level: Level; state: GameState }
  | { name: 'debrief'; level: Level; state: GameState; result: ScoreResult; notions: Tutorial[] };

export function App() {
  const [view, setView] = useState<View>({ name: 'home' });
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [results, setResults] = useState<LevelResult[]>([]);
  // Fiches d'Hélène déjà lues ; une référence pour les lire depuis les rappels mémorisés.
  const [seenTutorials, setSeenTutorials] = useState<string[]>([]);
  const seenRef = useRef<string[]>([]);
  const updateSeen = useCallback((seen: string[]) => {
    seenRef.current = seen;
    setSeenTutorials(seen);
  }, []);
  const markSeen = useCallback(
    (ids: string[]) => {
      updateSeen([...new Set([...seenRef.current, ...ids])]);
      markTutorialsSeen(ids).catch(() => undefined);
    },
    [updateSeen],
  );

  // IndexedDB peut être indisponible (navigation privée) : le jeu reste jouable sans sauvegarde.
  const refresh = useCallback(() => {
    loadCurrentGame().then((s) => setSavedGame(s ?? null)).catch(() => setSavedGame(null));
    loadResults().then(setResults).catch(() => setResults([]));
    loadSeenTutorials().then(updateSeen).catch(() => undefined);
  }, [updateSeen]);

  useEffect(() => {
    if (view.name === 'home') refresh();
  }, [view.name, refresh]);

  useEffect(() => {
    loadSettings().then(applySettings);
  }, []);

  const startLevel = (levelId: string, resume: boolean) => {
    let level: Level | undefined;
    try {
      level = getLevel(levelId);
    } catch {
      return;
    }
    if (!level) return;
    const state = resume && savedGame?.levelId === levelId ? restoreGame(level, savedGame) : createGame(level);
    setView({ name: 'game', level, state });
  };

  const handleSubmit = useCallback((level: Level, state: GameState) => {
    const result = scoreGame(level, state);
    clearCurrentGame().catch(() => undefined);
    recordResult({ levelId: level.id, bestScore: result.total, stars: result.stars }).catch(() => undefined);
    recordStats(statOutcomes(result)).catch(() => undefined);
    const [mode, a] = level.id.split(':');
    if (mode === 'daily') saveMeta(`daily-${a}`, { score: result.total, stars: result.stars }).catch(() => undefined);
    if (mode === 'endless') {
      loadMeta<EndlessProgress>('endless')
        .then((e) => saveMeta('endless', { difficulty: nextEndlessDifficulty(Number(a), result.stars), played: (e?.played ?? 0) + 1 }))
        .catch(() => undefined);
    }
    const notions = debriefNotions(level, seenRef.current);
    if (notions.length > 0) markSeen(notions.map((n) => n.id));
    setView({ name: 'debrief', level, state, result, notions });
  }, [markSeen]);

  return (
    <main className="app">
      {view.name === 'home' && (
        <HomeScreen
          savedGame={savedGame}
          results={results}
          onStart={startLevel}
          onNavigate={(screen) => setView({ name: screen })}
        />
      )}
      {view.name === 'about' && <AboutScreen onBack={() => setView({ name: 'home' })} />}
      {view.name === 'modes' && <ModesScreen onStart={(id) => startLevel(id, false)} onBack={() => setView({ name: 'home' })} />}
      {view.name === 'settings' && <SettingsScreen onBack={() => setView({ name: 'home' })} />}
      {view.name === 'tools' && <ToolsPanel onClose={() => setView({ name: 'home' })} />}
      {view.name === 'stats' && <StatsScreen onStart={(id) => startLevel(id, false)} onBack={() => setView({ name: 'home' })} />}
      {view.name === 'game' && (
        <GameScreen
          key={view.level.id}
          level={view.level}
          initialState={view.state}
          seenTutorials={seenTutorials}
          onTutorialsSeen={markSeen}
          onSubmit={handleSubmit}
          onQuit={() => setView({ name: 'home' })}
        />
      )}
      {view.name === 'debrief' && (
        <DebriefScreen
          level={view.level}
          state={view.state}
          result={view.result}
          notions={view.notions}
          onReplay={() => setView({ name: 'game', level: view.level, state: createGame(view.level) })}
          onHome={() => setView({ name: 'home' })}
          {...(view.level.id.startsWith('endless:') ? { onNext: () => setView({ name: 'modes' }) } : {})}
        />
      )}
    </main>
  );
}
