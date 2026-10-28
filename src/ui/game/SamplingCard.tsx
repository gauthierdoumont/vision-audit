// Sondage de factures : le joueur choisit son échantillon dans le journal des achats.
import { useState } from 'react';
import type { Level, Procedure } from '../../content/types';
import { samplingCost, type GameState } from '../../game/state';
import { formatHours } from '../format';
import type { Dispatch } from './GameScreen';

type Props = { level: Level; procedure: Procedure; state: GameState; dispatch: Dispatch };

export function SamplingCard({ level, procedure, state, dispatch }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const pool = procedure.sampling?.pool ?? [];
  const remaining = pool.filter((id) => !state.sampledDocuments.includes(id));
  const cost = samplingCost(procedure, selected.length);

  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <li className="card static">
      <div className="card-row">
        <span className="card-title">{procedure.name}</span>
        <span className="cost">{formatHours(procedure.hours)} / {procedure.sampling?.batchSize} pièces</span>
      </div>
      <p className="muted">{procedure.description}</p>
      {state.sampledDocuments.length > 0 && (
        <p className="muted">{state.sampledDocuments.length} pièce(s) déjà examinée(s) : voir le Dossier.</p>
      )}
      {!open ? (
        <button type="button" className="primary" disabled={remaining.length === 0} onClick={() => setOpen(true)}>
          Choisir l’échantillon
        </button>
      ) : (
        <>
          <ul className="sample-list">
            {remaining.map((id) => {
              const doc = level.documents.find((d) => d.id === id)!;
              return (
                <li key={id}>
                  <label className="inline">
                    <input type="checkbox" checked={selected.includes(id)} onChange={() => toggle(id)} />
                    {doc.title}
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="form-actions">
            <button type="button" className="secondary" onClick={() => setOpen(false)}>Fermer</button>
            <button
              type="button"
              className="primary"
              disabled={selected.length === 0}
              onClick={() => {
                dispatch({ type: 'sample', procedureId: procedure.id, documentIds: selected });
                setSelected([]);
                setOpen(false);
              }}
            >
              Examiner {selected.length} pièce(s) — {formatHours(cost)}
            </button>
          </div>
        </>
      )}
    </li>
  );
}
