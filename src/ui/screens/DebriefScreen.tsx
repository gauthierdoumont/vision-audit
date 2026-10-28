// Débrief : score, étoiles et explication de chaque anomalie. Audit Detective — Gauthier Doumont.
import { MAXIME_RESULTS } from '../../content/firm';
import { ASSERTION_LABELS, OPINION_LABELS, QUALIFICATION_LABELS } from '../../content/labels';
import type { Level } from '../../content/types';
import { describeClue } from '../../game/clues';
import type { ScoreResult } from '../../game/scoring';
import type { GameState } from '../../game/state';
import { formatEuro, formatHours } from '../format';

type Props = { level: Level; state: GameState; result: ScoreResult; onReplay: () => void; onHome: () => void };

const mark = (ok: boolean) => (ok ? '✔' : '✘');

export function DebriefScreen({ level, state, result, onReplay, onHome }: Props) {
  const verdict =
    result.stars === 3 ? 'Impeccable. Je signe.' : result.stars > 0 ? 'Correct. On peut faire mieux.' : 'Je ne signe pas ça.';

  return (
    <section className="screen debrief">
      <p className="eyebrow">Débrief · Niveau {level.number}</p>
      <h1>{verdict}</h1>
      <p className="stars" aria-label={`${result.stars} étoile(s) sur 3`}>
        {'★'.repeat(result.stars)}
        <span className="off">{'★'.repeat(3 - result.stars)}</span>
      </p>
      <p className="score">{result.total} / 100</p>

      <dl className="facts">
        <div><dt>Exactitude</dt><dd>{Math.round(result.accuracy)} / 60</dd></div>
        <div><dt>Efficience ({formatHours(state.hoursUsed)} / {formatHours(level.budgetHours)})</dt><dd>{Math.round(result.efficiency)} / 20</dd></div>
        <div><dt>Justification</dt><dd>{Math.round(result.justification)} / 20</dd></div>
        <div><dt>Pénalités</dt><dd>−{result.penalties}</dd></div>
      </dl>

      {level.firm?.maximeBet && (
        <p className="firm-notes">
          {result.anomalies.every((r) => r.account && r.amount) && state.hoursUsed <= level.firm.maximeBet.hours ? MAXIME_RESULTS.won : MAXIME_RESULTS.lost}
        </p>
      )}

      {result.anomalies.map((r) => (
        <article key={r.anomaly.id} className="card static">
          <h2>{r.anomaly.title}</h2>
          {r.finding ? (
            <ul className="checks">
              <li>{mark(r.account)} Compte ({r.anomaly.accounts.map((a) => `${a.account} : ${formatEuro(a.amount)}`).join(' ou ')})</li>
              <li>{mark(r.assertion)} Assertion : {ASSERTION_LABELS[r.anomaly.assertion]}</li>
              <li>{mark(r.amount)} Montant (±1 %)</li>
              <li>{mark(r.qualification)} Qualification : {QUALIFICATION_LABELS[r.anomaly.qualification]}</li>
              <li>{mark(r.correction)} Écriture de correction</li>
              <li>{mark(r.justified)} Appuyé par un indice pertinent</li>
            </ul>
          ) : (
            <p className="warning">Anomalie non trouvée.</p>
          )}
          <h3>Écriture attendue</h3>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Compte</th>
                <th className="num">Débit</th>
                <th className="num">Crédit</th>
              </tr>
            </thead>
            <tbody>
              {r.anomaly.correction.map((l) => (
                <tr key={l.account}>
                  <td>{l.account}</td>
                  <td className="num">{l.debit ? formatEuro(l.debit) : ''}</td>
                  <td className="num">{l.credit ? formatEuro(l.credit) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Pourquoi</h3>
          {r.anomaly.explanation.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <h3>Les traces qui la révélaient</h3>
          <ul>
            {r.anomaly.traces.map((t) => {
              const clue = describeClue(level, t);
              return clue && <li key={t}><strong>{clue.source}</strong> — {clue.text}</li>;
            })}
          </ul>
          <p className="muted">Normes : {r.anomaly.isa}</p>
        </article>
      ))}

      {result.falsePositives.length > 0 && (
        <article className="card static">
          <h2>Accusations à tort</h2>
          <p>
            {result.falsePositives.length} constat(s) ne correspondent à aucune anomalie (comptes{' '}
            {result.falsePositives.map((f) => f.account).join(', ')}).
          </p>
        </article>
      )}

      <article className="card static">
        <h2>Opinion {mark(result.opinionCorrect)}</h2>
        <p>
          Attendu : {OPINION_LABELS[level.expectedOpinion.opinion]}, {level.expectedOpinion.continuity ? 'avec' : 'sans'}{' '}
          paragraphe sur la continuité.
        </p>
        {level.expectedOpinion.explanation.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </article>

      <div className="form-actions">
        <button type="button" className="secondary" onClick={onReplay}>Rejouer</button>
        <button type="button" className="primary" onClick={onHome}>Accueil</button>
      </div>
    </section>
  );
}
