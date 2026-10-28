import type { Level } from '../../content/types';
import { describeClue } from '../../game/clues';
import type { GameState } from '../../game/state';
import type { Dispatch } from './GameScreen';

type Props = { level: Level; state: GameState; dispatch: Dispatch };

export function NotebookTab({ level, state, dispatch }: Props) {
  return (
    <section>
      <h2 className="tab-title">Carnet d'indices</h2>
      {state.pins.length === 0 ? (
        <p className="muted">Rien d'épinglé pour l'instant. Chaque constat devra s'appuyer sur au moins un indice.</p>
      ) : (
        <ul className="card-list">
          {state.pins.map((clueId) => {
            const clue = describeClue(level, clueId);
            if (!clue) return null;
            return (
              <li key={clueId} className="card static">
                <span className="clue-source">{clue.source}</span>
                <p>{clue.text}</p>
                <button type="button" className="link-button" onClick={() => dispatch({ type: 'toggle-pin', clueId })}>
                  Retirer
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
