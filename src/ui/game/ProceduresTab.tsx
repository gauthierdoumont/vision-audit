import { useState } from 'react';
import type { Level } from '../../content/types';
import { hoursLeft, type GameState } from '../../game/state';
import { PENALTY_HINT } from '../../game/scoring';
import { formatHours } from '../format';
import type { Dispatch } from './GameScreen';
import { SamplingCard } from './SamplingCard';

type Props = { level: Level; state: GameState; dispatch: Dispatch };

export function ProceduresTab({ level, state, dispatch }: Props) {
  const [hintOpen, setHintOpen] = useState(state.hintsUsed > 0);
  const left = hoursLeft(level, state);

  return (
    <section>
      <h2 className="tab-title">Procédures d'audit</h2>
      <p className="muted">Chaque procédure coûte des heures et ajoute des documents au dossier.</p>
      <ul className="card-list">
        {level.procedures.map((p) => {
          if (p.sampling) return <SamplingCard key={p.id} level={level} procedure={p} state={state} dispatch={dispatch} />;
          const done = state.doneProcedures.includes(p.id);
          const overBudget = !done && p.hours > left;
          return (
            <li key={p.id} className="card static">
              <div className="card-row">
                <span className="card-title">{p.name}</span>
                <span className="cost">{formatHours(p.hours)}</span>
              </div>
              <p className="muted">{p.description}</p>
              {overBudget && <p className="warning">Budget dépassé : ces heures ne seront pas facturables.</p>}
              <button
                type="button"
                className={done ? 'secondary' : 'primary'}
                disabled={done}
                onClick={() => dispatch({ type: 'run-procedure', procedureId: p.id })}
              >
                {done ? 'Réalisée — voir le Dossier' : 'Réaliser'}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="card static hint">
        <div className="card-row">
          <span className="card-title">Demander un indice à Hélène</span>
          <span className="cost">0 h · −{PENALTY_HINT} pts</span>
        </div>
        {hintOpen ? (
          level.hint.map((line) => <p key={line} className="quote">{line}</p>)
        ) : (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              dispatch({ type: 'use-hint' });
              setHintOpen(true);
            }}
          >
            Appeler Hélène
          </button>
        )}
      </div>
    </section>
  );
}
