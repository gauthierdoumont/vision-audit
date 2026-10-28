import type { Level } from '../../content/types';
import { formatEuro, formatHours } from '../format';

export function BriefingView({ level, onStart }: { level: Level; onStart: () => void }) {
  return (
    <section className="screen briefing">
      <p className="eyebrow">
        {level.grade ? `${level.grade} · ` : ''}Niveau {level.number} · {level.title}
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
      <button type="button" className="primary" onClick={onStart}>
        Ouvrir le dossier
      </button>
    </section>
  );
}
