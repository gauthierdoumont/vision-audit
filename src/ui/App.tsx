import { useCallback, useEffect, useState } from 'react';
import { getLevel } from '../content/levels';
import type { Level } from '../content/types';
import { scoreGame, type ScoreResult } from '../game/scoring';
import { createGame, type GameState } from '../game/state';
import { clearCurrentGame, loadCurrentGame, loadResults, recordResult, type LevelResult } from '../storage/db';
import { GameScreen } from './game/GameScreen';
import { AboutScreen } from './screens/AboutScreen';
import { DebriefScreen } from './screens/DebriefScreen';
import { HomeScreen } from './screens/HomeScreen';

export type Screen = 'home' | 'about';

type View =
  | { name: Screen }
  | { name: 'game'; level: Level; state: GameState }
  | { name: 'debrief'; level: Level; state: GameState; result: ScoreResult };

export function App() {
  const [view, setView] = useState<View>({ name: 'home' });
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [results, setResults] = useState<LevelResult[]>([]);

  // IndexedDB peut être indisponible (navigation privée) : le jeu reste jouable sans sauvegarde.
  const refresh = useCallback(() => {
    loadCurrentGame().then((s) => setSavedGame(s ?? null)).catch(() => setSavedGame(null));
    loadResults().then(setResults).catch(() => setResults([]));
  }, []);

  useEffect(() => {
    if (view.name === 'home') refresh();
  }, [view.name, refresh]);

  const startLevel = (levelId: string, resume: boolean) => {
    const level = getLevel(levelId);
    if (!level) return;
    const state = resume && savedGame?.levelId === levelId ? savedGame : createGame(level);
    setView({ name: 'game', level, state });
  };

  const handleSubmit = useCallback((level: Level, state: GameState) => {
    const result = scoreGame(level, state);
    clearCurrentGame().catch(() => undefined);
    recordResult({ levelId: level.id, bestScore: result.total, stars: result.stars }).catch(() => undefined);
    setView({ name: 'debrief', level, state, result });
  }, []);

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
      {view.name === 'game' && (
        <GameScreen
          key={view.level.id}
          level={view.level}
          initialState={view.state}
          onSubmit={handleSubmit}
          onQuit={() => setView({ name: 'home' })}
        />
      )}
      {view.name === 'debrief' && (
        <DebriefScreen
          level={view.level}
          state={view.state}
          result={view.result}
          onReplay={() => setView({ name: 'game', level: view.level, state: createGame(view.level) })}
          onHome={() => setView({ name: 'home' })}
        />
      )}
    </main>
  );
}
