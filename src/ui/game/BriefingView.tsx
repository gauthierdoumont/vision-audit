// Briefing d'Hélène, puis ses fiches pour les nouveautés du dossier. Audit Detective — Gauthier Doumont.
import { useState } from 'react';
import type { Tutorial } from '../../content/tutorials';
import type { Level } from '../../content/types';
import { formatEuro, formatHours } from '../format';

type Props = { level: Level; tutorials: Tutorial[]; onStart: (seen: string[]) => void };

export function BriefingView({ level, tutorials, onStart }: Props) {
  // -1 : le mail de briefing ; ensuite, une fiche à la fois.
  const [step, setStep] = useState(-1);
  const start = () => onStart(tutorials.map((t) => t.id));

  if (step >= 0) {
    const tutorial = tutorials[step]!;
    const last = step === tutorials.length - 1;
    return (
      <section className="screen briefing">
        <p className="eyebrow">
          Fiche d’Hélène · {step + 1} / {tutorials.length}
        </p>
        <article className="mail tutorial">
          <h2>{tutorial.title}</h2>
          {tutorial.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </article>
        <p className="muted">Tu pourras relire cette fiche dans les outils (🧮), onglet Fiches.</p>
        <div className="form-actions">
          {!last && (
            <button type="button" className="secondary" onClick={start}>
              Passer les fiches
            </button>
          )}
          <button type="button" className="primary" onClick={last ? start : () => setStep(step + 1)}>
            {last ? 'Compris, au dossier' : 'Compris'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen briefing">
      <p className="eyebrow">
        {level.grade ? `${level.grade} · ` : ''}
        {level.number > 0 ? `Niveau ${level.number} · ` : ''}
        {level.title}
      </p>
      <article className="mail">
        <div className="mail-head">
          <span>De : {level.briefing.from}</span>
          <span>Objet : {level.briefing.subject}</span>
        </div>
        {level.briefing.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
      {(level.firm?.ines || level.firm?.maximeBet) && (
        <div className="firm-notes">
          {level.firm.ines && <p>{level.firm.ines}</p>}
          {level.firm.maximeBet && <p>{level.firm.maximeBet.line}</p>}
        </div>
      )}
      <dl className="facts">
        <div><dt>Client</dt><dd>{level.client.name}, {level.client.city}</dd></div>
        <div><dt>Secteur</dt><dd>{level.client.sector}</dd></div>
        <div><dt>Seuil de signification</dt><dd>{formatEuro(level.materiality)}</dd></div>
        <div><dt>Budget</dt><dd>{formatHours(level.budgetHours)}</dd></div>
      </dl>
      {tutorials.length > 0 ? (
        <button type="button" className="primary" onClick={() => setStep(0)}>
          Lire {tutorials.length === 1 ? 'la fiche' : `les ${tutorials.length} fiches`} d’Hélène
        </button>
      ) : (
        <button type="button" className="primary" onClick={start}>
          Ouvrir le dossier
        </button>
      )}
    </section>
  );
}
