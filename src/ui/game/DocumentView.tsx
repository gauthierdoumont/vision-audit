// Affiche un document comme une vraie pièce ; chaque ligne peut être épinglée au carnet.
import type { GameDocument } from '../../content/types';
import { documentClueId } from '../../game/clues';

type Props = { document: GameDocument; pins: string[]; onTogglePin: (clueId: string) => void };

export function DocumentView({ document, pins, onTogglePin }: Props) {
  return (
    <article className={`doc doc-${document.kind}`}>
      <h2>{document.title}</h2>
      {document.header && (
        <div className="doc-header">
          {document.header.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      <div className="doc-table-wrap">
        <table className="doc-table">
          {document.columns && (
            <thead>
              <tr>
                {document.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th aria-label="Épingler" />
              </tr>
            </thead>
          )}
          <tbody>
            {document.lines.map((line) => {
              const clueId = documentClueId(document.id, line.id);
              const pinned = pins.includes(clueId);
              return (
                <tr key={line.id} className={pinned ? 'pinned' : ''}>
                  {line.cells.map((cell, i) => (
                    <td key={i} className={/^[−+-]?[\d\s]+,\d{2}$/.test(cell) ? 'num' : ''}>
                      {cell}
                    </td>
                  ))}
                  <td className="pin-cell">
                    <button
                      type="button"
                      className="pin"
                      aria-pressed={pinned}
                      aria-label={pinned ? 'Retirer du carnet' : 'Épingler au carnet'}
                      onClick={() => onTogglePin(clueId)}
                    >
                      📌
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {document.footer?.map((line) => (
        <p key={line} className="doc-footer">{line}</p>
      ))}
    </article>
  );
}
