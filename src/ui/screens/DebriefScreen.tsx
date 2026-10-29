// Débrief : score, étoiles et explication de chaque anomalie. Audit Detective — Gauthier Doumont.
import { MAXIME_RESULTS } from '../../content/firm';
import type { Tutorial } from '../../content/tutorials';
import type { Level } from '../../content/types';
import { describeClue } from '../../game/clues';
import { criteriaFeedback, falsePositiveWhy, opinionFeedback, revealingLeads, type CriterionFeedback } from '../../game/feedback';
import type { ScoreResult } from '../../game/scoring';
import type { GameState } from '../../game/state';
import { formatEuro, formatHours } from '../format';

type Props = {
  level: Level;
  state: GameState;
  result: ScoreResult;
  /** Mini-cours des anomalies rencontrées pour la première fois. */
  notions?: Tutorial[];
  onReplay: () => void;
  onHome: () => void;
  onNext?: () => void;
};

const mark = (ok: boolean) => (ok ? '✔' : '✘');

/** Un critère : ✔/✘, ta réponse, la réponse attendue et, en cas d'erreur, le pourquoi. */
function Criteria({ items }: { items: CriterionFeedback[] }) {
  return (
    <ul className="checks">
      {items.map((c) => (
        <li key={c.label} className={c.ok ? 'ok' : 'ko'}>
          <span aria-hidden="true">{mark(c.ok)}</span> <strong>{c.label}</strong>
          <span className="visually-hidden">{c.ok ? ' : juste' : ' : à revoir'}</span>
          {c.ok ? (
            <span className="muted"> — {c.expected}</span>
          ) : (
            <div className="feedback">
              <p><span className="muted">Ta réponse :</span> {c.yours}</p>
              <p><span className="muted">Attendu :</span> {c.expected}</p>
              {c.why.map((w) => <p key={w} className="why">{w}</p>)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DebriefScreen({ level, state, result, notions = [], onReplay, onHome, onNext }: Props) {
  const verdict =
    state.solutionViewed
      ? 'On regarde la solution ensemble.'
      : result.stars === 3 ? 'Impeccable. Je signe.' : result.stars > 0 ? 'Correct. On peut faire mieux.' : 'Je ne signe pas ça.';

  return (
    <section className="screen debrief">
      <p className="eyebrow">Débrief · {level.number > 0 ? `Niveau ${level.label ?? level.number}` : level.grade}</p>
      <h1>{verdict}</h1>
      <p className="stars" aria-label={`${result.stars} étoile(s) sur 3`}>
        {'★'.repeat(result.stars)}
        <span className="off">{'★'.repeat(3 - result.stars)}</span>
      </p>
      <p className="score">{result.total} / 100</p>
      {state.solutionViewed && (
        <p className="card static solution-note">
          Solution consultée : la partie n’est pas notée et ne débloque pas le niveau suivant. Ton travail est quand même corrigé
          ci-dessous, pour que tu voies où tu en étais. Rejoue le dossier quand tu veux.
        </p>
      )}

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

      {notions.map((notion) => (
        <article key={notion.id} className="card static tutorial">
          <p className="eyebrow">Nouvelle notion · fiche d’Hélène</p>
          <h2>{notion.title.replace(/^Notion : /, '')}</h2>
          {notion.lines.map((line) => <p key={line}>{line}</p>)}
        </article>
      ))}

      {result.anomalies.map((r) => (
        <article key={r.anomaly.id} className="card static">
          <h2>{r.anomaly.title}</h2>
          {r.finding ? (
            <Criteria items={criteriaFeedback(r)} />
          ) : (
            <MissedAnomaly level={level} state={state} anomaly={r.anomaly} />
          )}
          <h3>Écriture attendue</h3>
          {r.anomaly.disclosureOnly && <p>Aucune écriture : l’information doit figurer dans l’annexe des comptes annuels.</p>}
          {!r.anomaly.disclosureOnly && <table className="doc-table">
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
          </table>}
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

      {(level.decoys ?? []).length > 0 && (
        <article className="card static">
          <h2>Fausses pistes</h2>
          {level.decoys!.map((decoy) => (
            <div key={decoy.title}>
              <h3>{decoy.title}</h3>
              {decoy.explanation.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p className="muted">Justification : {decoy.justification.map((c) => describeClue(level, c)?.text).join(' ; ')}</p>
            </div>
          ))}
        </article>
      )}

      {result.falsePositives.length > 0 && (
        <article className="card static">
          <h2>Accusations à tort</h2>
          <p>{result.falsePositives.length} constat(s) ne correspondent à aucune anomalie (−15 points chacun).</p>
          {result.falsePositives.map((f) => (
            <div key={f.id}>
              <h3>Compte {f.account} · {formatEuro(f.amount)}</h3>
              {falsePositiveWhy(level, f).map((p) => <p key={p}>{p}</p>)}
            </div>
          ))}
        </article>
      )}

      <article className="card static">
        <h2>Opinion {mark(result.opinionCorrect)}</h2>
        <Criteria items={opinionFeedback(level, state)} />
        <h3>Le raisonnement</h3>
        {level.expectedOpinion.explanation.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </article>

      {level.orion && (
        <article className="card static orion">
          <h2>Fil rouge — Orion Trading</h2>
          {level.orion.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </article>
      )}

      {level.realCase && (
        <article className="card static real-case">
          <h2>L’affaire réelle : {level.realCase.name}</h2>
          {!level.realCase.verified && <p className="badge-inline">À VÉRIFIER</p>}
          {level.realCase.lines.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className="muted">Sources :</p>
          <ul className="sources">
            {level.realCase.sources.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname.replace(/^www\./, '')}</a>
              </li>
            ))}
          </ul>
        </article>
      )}

      <div className="form-actions">
        <button type="button" className="secondary" onClick={onReplay}>Rejouer</button>
        <button type="button" className={onNext ? 'secondary' : 'primary'} onClick={onHome}>Accueil</button>
        {onNext && <button type="button" className="primary" onClick={onNext}>Dossier suivant</button>}
      </div>
    </section>
  );
}

/** Anomalie non trouvée : où elle se cachait, et ce que tu avais déjà fait pour la trouver. */
function MissedAnomaly({ level, state, anomaly }: { level: Level; state: GameState; anomaly: Level['anomalies'][number] }) {
  const { initial, procedures, interviews } = revealingLeads(level, state, anomaly);
  return (
    <div className="feedback">
      <p className="warning">Anomalie non trouvée.</p>
      <h3>Où la chercher</h3>
      <ul>
        {initial.map((title) => <li key={title}>Déjà dans le dossier de départ : {title}</li>)}
        {procedures.map((p) => (
          <li key={p.procedure}>
            {p.procedure} ({formatHours(p.hours)}) — {p.done ? 'tu l’as faite : relis-la attentivement' : 'pas réalisée'}
          </li>
        ))}
        {interviews.map((q) => <li key={q}>Entretien — {q}</li>)}
      </ul>
    </div>
  );
}
