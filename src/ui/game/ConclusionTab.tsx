import { useState } from 'react';
import { ASSERTION_LABELS, OPINION_LABELS, QUALIFICATION_LABELS } from '../../content/labels';
import type { Level, Opinion } from '../../content/types';
import type { GameState } from '../../game/state';
import { formatEuro } from '../format';
import { FindingForm } from './FindingForm';
import type { Dispatch } from './GameScreen';

type Props = { level: Level; state: GameState; dispatch: Dispatch };

export function ConclusionTab({ level, state, dispatch }: Props) {
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ready = state.opinion !== null && state.continuity !== null;

  return (
    <section>
      <h2 className="tab-title">Conclusion</h2>

      <h3>Constats</h3>
      {state.findings.length === 0 && !adding && <p className="muted">Aucun constat pour l'instant.</p>}
      <ul className="card-list">
        {state.findings.map((f) => (
          <li key={f.id} className="card static">
            <div className="card-row">
              <span className="card-title">
                Compte {f.account} · {formatEuro(f.amount)}
              </span>
              <button type="button" className="link-button" onClick={() => dispatch({ type: 'remove-finding', findingId: f.id })}>
                Supprimer
              </button>
            </div>
            <p className="muted">
              {ASSERTION_LABELS[f.assertion]} · {QUALIFICATION_LABELS[f.qualification]} · {f.clues.length} indice(s)
            </p>
            <p className="entry-summary">
              {f.correction.map((l) => `${l.account} ${l.debit ? `D ${formatEuro(l.debit)}` : `C ${formatEuro(l.credit)}`}`).join(' · ')}
            </p>
          </li>
        ))}
      </ul>
      {adding ? (
        <FindingForm
          level={level}
          pins={state.pins}
          onCancel={() => setAdding(false)}
          onAdd={(finding) => {
            dispatch({ type: 'add-finding', finding });
            setAdding(false);
          }}
        />
      ) : (
        <button type="button" className="secondary" onClick={() => setAdding(true)}>
          + Nouveau constat
        </button>
      )}

      <h3>Opinion du réviseur</h3>
      <p className="muted">On suppose que le client passe les corrections que tu proposes, s'il s'y est engagé.</p>
      <div className="choice-list">
        {(Object.keys(OPINION_LABELS) as Opinion[]).map((opinion) => (
          <label key={opinion} className="inline">
            <input
              type="radio"
              name="opinion"
              checked={state.opinion === opinion}
              onChange={() => dispatch({ type: 'set-opinion', opinion })}
            />
            {OPINION_LABELS[opinion]}
          </label>
        ))}
      </div>
      <p>Paragraphe d'observation sur la continuité ?</p>
      <div className="choice-list row">
        {[true, false].map((value) => (
          <label key={String(value)} className="inline">
            <input
              type="radio"
              name="continuity"
              checked={state.continuity === value}
              onChange={() => dispatch({ type: 'set-continuity', continuity: value })}
            />
            {value ? 'Oui' : 'Non'}
          </label>
        ))}
      </div>

      {confirming ? (
        <div className="card static confirm">
          <p>Rendre le rapport ? Tu ne pourras plus rien modifier.</p>
          <div className="form-actions">
            <button type="button" className="secondary" onClick={() => setConfirming(false)}>Pas encore</button>
            <button type="button" className="primary" onClick={() => dispatch({ type: 'submit' })}>Rendre le rapport</button>
          </div>
        </div>
      ) : (
        <button type="button" className="primary wide" disabled={!ready} onClick={() => setConfirming(true)}>
          {ready ? 'Rendre le rapport à Hélène' : 'Choisis une opinion pour conclure'}
        </button>
      )}
    </section>
  );
}
