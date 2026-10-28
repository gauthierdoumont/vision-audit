// Statistiques par cycle et par assertion, et partie ciblée sur le point faible.
import { useEffect, useState } from 'react';
import { CYCLE_OF, MIN_DIFFICULTY } from '../../engine/anomalies';
import { statLines, weakestCycle, type StatLine } from '../../game/progress';
import { loadStats, type StatRecord } from '../../storage/db';
import { randomSeed } from './ModesScreen';

type Props = { onStart: (levelId: string) => void; onBack: () => void };

const percent = (rate: number) => `${Math.round(rate * 100)} %`;

function StatTable({ title, lines }: { title: string; lines: StatLine[] }) {
  return (
    <article className="card static">
      <h2>{title}</h2>
      {lines.length === 0 ? (
        <p className="muted">Pas encore de données : termine quelques dossiers.</p>
      ) : (
        <table className="doc-table stats-table">
          <thead>
            <tr>
              <th>{title === 'Par cycle' ? 'Cycle' : 'Assertion'}</th>
              <th className="num">Rencontrées</th>
              <th className="num">Réussite</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.label}>
                <td>{l.label}</td>
                <td className="num">{l.seen}</td>
                <td className="num">
                  <span className="bar" style={{ ['--rate' as string]: l.rate }} />
                  {percent(l.rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}

export function StatsScreen({ onStart, onBack }: Props) {
  const [stats, setStats] = useState<StatRecord[]>([]);
  useEffect(() => {
    loadStats().then(setStats).catch(() => setStats([]));
  }, []);
  const weakest = weakestCycle(stats);
  // Difficulté juste suffisante pour que les anomalies de ce cycle existent.
  const difficulty = weakest
    ? Math.max(4, Math.min(...Object.entries(CYCLE_OF).filter(([, c]) => c === weakest).map(([t]) => MIN_DIFFICULTY[t as keyof typeof MIN_DIFFICULTY])))
    : 4;

  return (
    <section className="screen">
      <button type="button" className="link-button back" onClick={onBack}>
        ← Retour
      </button>
      <h1>Statistiques</h1>
      <StatTable title="Par cycle" lines={statLines(stats, 'cycle')} />
      <StatTable title="Par assertion" lines={statLines(stats, 'assertion')} />
      {weakest && (
        <article className="card static">
          <h2>Points faibles</h2>
          <p>
            Ton cycle le plus raté : <strong>{weakest}</strong>. Un dossier ciblé pour t’entraîner ?
          </p>
          <button type="button" className="primary" onClick={() => onStart(`focus:${weakest}:${difficulty}:${randomSeed()}`)}>
            Partie ciblée « {weakest} »
          </button>
        </article>
      )}
    </section>
  );
}
