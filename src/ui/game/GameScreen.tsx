// Écran de partie : barre d'heures, onglets et briefing. Audit Detective — Gauthier Doumont.
import { useEffect, useReducer, useState } from 'react';
import type { Level } from '../../content/types';
import { briefingTutorials } from '../../game/tutorials';
import { gameReducer, hoursLeft, type GameAction, type GameState } from '../../game/state';
import { saveCurrentGame } from '../../storage/db';
import { formatHours } from '../format';
import { ToolsPanel } from '../ToolsPanel';
import { BriefingView } from './BriefingView';
import { ConclusionTab } from './ConclusionTab';
import { DossierTab } from './DossierTab';
import { InterviewsTab } from './InterviewsTab';
import { NotebookTab } from './NotebookTab';
import { ProceduresTab } from './ProceduresTab';

export type Dispatch = (action: GameAction) => void;

const TABS = [
  { id: 'dossier', label: 'Dossier' },
  { id: 'procedures', label: 'Procédures' },
  { id: 'entretiens', label: 'Entretiens' },
  { id: 'carnet', label: 'Carnet' },
  { id: 'conclusion', label: 'Conclusion' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type Props = {
  level: Level;
  initialState: GameState;
  /** Fiches d'Hélène déjà lues. */
  seenTutorials: readonly string[];
  onTutorialsSeen: (ids: string[]) => void;
  onSubmit: (level: Level, state: GameState) => void;
  onQuit: () => void;
};

export function GameScreen({ level, initialState, seenTutorials, onTutorialsSeen, onSubmit, onQuit }: Props) {
  const [state, dispatch] = useReducer((s: GameState, a: GameAction) => gameReducer(level, s, a), initialState);
  const [tab, setTab] = useState<TabId>('dossier');
  const [tools, setTools] = useState(false);

  // Sauvegarde automatique à chaque action ; l'écriture IndexedDB peut échouer sans bloquer le jeu.
  useEffect(() => {
    if (state.submitted) onSubmit(level, state);
    else saveCurrentGame(state).catch(() => undefined);
  }, [level, state, onSubmit]);

  if (!state.briefingRead) {
    return (
      <BriefingView
        level={level}
        tutorials={briefingTutorials(level, seenTutorials)}
        onStart={(seen) => {
          if (seen.length > 0) onTutorialsSeen(seen);
          dispatch({ type: 'read-briefing' });
        }}
      />
    );
  }

  const left = hoursLeft(level, state);

  return (
    <div className="game">
      <header className="game-bar">
        <button type="button" className="icon-button" onClick={onQuit} aria-label="Quitter (partie sauvegardée)">
          ←
        </button>
        <div className="game-title">
          <strong>{level.client.name}</strong>
          <span>Seuil : {level.materiality.toLocaleString('fr-BE')} €</span>
        </div>
        <button type="button" className="icon-button" onClick={() => setTools(true)} aria-label="Outils : calculatrice, glossaire, PCMN">
          🧮
        </button>
        <div className={`hours ${left < 0 ? 'over' : ''}`} role="status" aria-label={`Heures restantes : ${formatHours(left)} sur ${formatHours(level.budgetHours)}`}>
          {formatHours(left)}
          <span>/ {formatHours(level.budgetHours)}</span>
        </div>
      </header>

      <div className="game-body">
        {tab === 'dossier' && <DossierTab level={level} state={state} dispatch={dispatch} />}
        {tab === 'procedures' && <ProceduresTab level={level} state={state} dispatch={dispatch} />}
        {tab === 'entretiens' && <InterviewsTab level={level} state={state} dispatch={dispatch} />}
        {tab === 'carnet' && <NotebookTab level={level} state={state} dispatch={dispatch} />}
        {tab === 'conclusion' && <ConclusionTab level={level} state={state} dispatch={dispatch} />}
      </div>

      {tools && <ToolsPanel onClose={() => setTools(false)} />}

      <nav className="tabs" aria-label="Onglets du dossier">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'active' : ''}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'carnet' && state.pins.length > 0 && <span className="count">{state.pins.length}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
