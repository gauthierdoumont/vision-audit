import { useState } from 'react';
import type { Level } from '../../content/types';
import { availableDocumentIds, type GameState } from '../../game/state';
import { DocumentView } from './DocumentView';
import type { Dispatch } from './GameScreen';

type Props = { level: Level; state: GameState; dispatch: Dispatch };

export function DossierTab({ level, state, dispatch }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const ids = availableDocumentIds(level, state);
  const open = level.documents.find((d) => d.id === openId);

  if (open) {
    return (
      <section>
        <button type="button" className="link-button back" onClick={() => setOpenId(null)}>
          ← Tous les documents
        </button>
        <DocumentView
          document={open}
          pins={state.pins}
          onTogglePin={(clueId) => dispatch({ type: 'toggle-pin', clueId })}
        />
      </section>
    );
  }

  return (
    <section>
      <h2 className="tab-title">Dossier</h2>
      <p className="muted">Ouvre un document et épingle 📌 les lignes qui te semblent suspectes.</p>
      <ul className="card-list">
        {ids.map((id) => {
          const doc = level.documents.find((d) => d.id === id)!;
          return (
            <li key={id}>
              <button type="button" className="card" onClick={() => setOpenId(id)}>
                <span className="card-title">{doc.title}</span>
                {!level.initialDocuments.includes(id) && <span className="badge">Nouveau</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
