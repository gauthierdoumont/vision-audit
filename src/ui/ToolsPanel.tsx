// Outils du joueur : calculatrice, glossaire et aide-mémoire PCMN. Audit Detective — Gauthier Doumont.
import { useEffect, useRef, useState } from 'react';
import { ASSERTIONS_GLOSSARY, ISA_GLOSSARY, NOTIONS_GLOSSARY, type GlossaryEntry } from '../content/glossary';
import { PCMN } from '../content/pcmn';
import { evaluate, formatResult } from '../game/calculator';

type Tool = 'calculatrice' | 'glossaire' | 'pcmn';

export function ToolsPanel({ onClose }: { onClose: () => void }) {
  const [tool, setTool] = useState<Tool>('calculatrice');
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Le focus entre dans le panneau à l'ouverture ; Échap le ferme.
    panel.current?.querySelector<HTMLElement>('button, input')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="tools-overlay" role="dialog" aria-modal="true" aria-label="Outils" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tools-panel" ref={panel}>
        <div className="tools-head">
          <div className="segmented" role="tablist" aria-label="Choix de l’outil">
            {(['calculatrice', 'glossaire', 'pcmn'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tool === t} className={tool === t ? 'active' : ''} onClick={() => setTool(t)}>
                {t === 'pcmn' ? 'PCMN' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer les outils">
            ✕
          </button>
        </div>
        {tool === 'calculatrice' && <Calculator />}
        {tool === 'glossaire' && <Glossary />}
        {tool === 'pcmn' && <PcmnList />}
      </div>
    </div>
  );
}

function Calculator() {
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const result = expression ? evaluate(expression) : NaN;
  const append = (text: string) => setExpression((e) => e + text);
  const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', ',', '%', '+', '(', ')', '⌫', 'C'];
  const press = (key: string) => {
    if (key === 'C') setExpression('');
    else if (key === '⌫') setExpression((e) => e.slice(0, -1));
    else append(key);
  };
  const apply = (suffix: string) => setExpression((e) => (e ? `(${e}) ${suffix}` : e));
  return (
    <div className="calculator">
      <label className="calc-display">
        <span className="visually-hidden">Expression</span>
        <input
          value={expression}
          inputMode="decimal"
          onChange={(e) => setExpression(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && Number.isFinite(result)) {
              setHistory((h) => [`${expression} = ${formatResult(result)}`, ...h].slice(0, 5));
              setExpression(String(Math.round(result * 100) / 100).replace('.', ','));
            }
          }}
          placeholder="ex. : 3200 × 1,06"
        />
      </label>
      <p className="calc-result" aria-live="polite">= {expression ? formatResult(result) : '0'}</p>
      <div className="calc-shortcuts">
        {[['× 1,21', 'TVAC 21 %'], ['÷ 1,21', 'HTVA 21 %'], ['× 1,06', 'TVAC 6 %'], ['÷ 1,06', 'HTVA 6 %'], ['× 1,12', 'TVAC 12 %'], ['÷ 1,12', 'HTVA 12 %']].map(([op, label]) => (
          <button key={op} type="button" className="secondary" onClick={() => apply(op!)} title={label}>
            {op}
          </button>
        ))}
      </div>
      <div className="calc-keys">
        {keys.map((k) => (
          <button key={k} type="button" className="secondary" onClick={() => press(k)} aria-label={k === '⌫' ? 'Effacer le dernier caractère' : k === 'C' ? 'Tout effacer' : k}>
            {k}
          </button>
        ))}
      </div>
      {history.length > 0 && (
        <ul className="calc-history">
          {history.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({ title, entries, query }: { title: string; entries: GlossaryEntry[]; query: string }) {
  const q = query.toLowerCase();
  const visible = entries.filter((e) => !q || e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q));
  if (visible.length === 0) return null;
  return (
    <>
      <h3>{title}</h3>
      <dl className="glossary">
        {visible.map((e) => (
          <div key={e.term}>
            <dt>{e.term}</dt>
            <dd>{e.definition}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function Glossary() {
  const [query, setQuery] = useState('');
  return (
    <div className="tool-scroll">
      <input className="tool-search" type="search" placeholder="Rechercher (ex. : cut-off, ISA 505)" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher dans le glossaire" />
      <Section title="Assertions" entries={ASSERTIONS_GLOSSARY} query={query} />
      <Section title="Normes ISA" entries={ISA_GLOSSARY} query={query} />
      <Section title="Notions" entries={NOTIONS_GLOSSARY} query={query} />
    </div>
  );
}

function PcmnList() {
  const [query, setQuery] = useState('');
  const q = query.toLowerCase();
  const accounts = PCMN.filter((a) => !q || a.code.startsWith(q) || a.label.toLowerCase().includes(q));
  return (
    <div className="tool-scroll">
      <input className="tool-search" type="search" placeholder="Numéro ou libellé (ex. : 44, TVA)" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher un compte PCMN" />
      <table className="doc-table pcmn-table">
        <tbody>
          {accounts.map((a) => (
            <tr key={a.code}>
              <td className="pcmn-code">{a.code}</td>
              <td>{a.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">Sous-ensemble du PCMN utilisé dans le jeu. Les subdivisions du 61 sont libres.</p>
    </div>
  );
}
