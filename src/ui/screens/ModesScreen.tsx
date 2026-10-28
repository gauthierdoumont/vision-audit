// Choix d'un mode hors campagne : partie rapide, grand dossier, défi du jour, mode infini.
import { useEffect, useState } from 'react';
import { dailyKey } from '../../engine/modes';
import { loadMeta } from '../../storage/db';

export type EndlessProgress = { difficulty: number; played: number };
export type DailyResult = { score: number; stars: number };

/** Graine aléatoire pour une nouvelle partie (l'interface peut tirer au hasard ; le moteur, jamais). */
export function randomSeed(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0]!.toString(36);
}

type Props = { onStart: (levelId: string) => void; onBack: () => void };

export function ModesScreen({ onStart, onBack }: Props) {
  const today = dailyKey(new Date());
  const [daily, setDaily] = useState<DailyResult | undefined>();
  const [endless, setEndless] = useState<EndlessProgress>({ difficulty: 2, played: 0 });

  useEffect(() => {
    loadMeta<DailyResult>(`daily-${today}`).then(setDaily).catch(() => undefined);
    loadMeta<EndlessProgress>('endless').then((e) => e && setEndless(e)).catch(() => undefined);
  }, [today]);

  const levels = (from: number, to: number, mode: string) => (
    <div className="difficulty-row" role="group" aria-label="Difficulté">
      {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((d) => (
        <button key={d} type="button" className="secondary" onClick={() => onStart(`${mode}:${d}:${randomSeed()}`)}>
          {d}
        </button>
      ))}
    </div>
  );

  return (
    <section className="screen">
      <button type="button" className="link-button back" onClick={onBack}>
        ← Retour
      </button>
      <h1>Autres modes</h1>

      <article className="card static">
        <h2>Partie rapide</h2>
        <p className="muted">Un dossier court, 10-15 minutes. Choisis la difficulté :</p>
        {levels(1, 4, 'quick')}
      </article>

      <article className="card static">
        <h2>Grand dossier</h2>
        <p className="muted">Une enquête longue : plusieurs anomalies, fausses pistes, opinion délicate.</p>
        {levels(6, 10, 'big')}
      </article>

      <article className="card static">
        <h2>Défi du jour</h2>
        <p className="muted">Le même dossier pour tout le monde aujourd’hui. Un seul essai.</p>
        {daily ? (
          <p>
            Déjà joué aujourd’hui : <strong>{daily.score} / 100</strong> {'★'.repeat(daily.stars)}. Reviens demain !
          </p>
        ) : (
          <button type="button" className="primary" onClick={() => onStart(`daily:${today}`)}>
            Relever le défi
          </button>
        )}
      </article>

      <article className="card static">
        <h2>Mode infini</h2>
        <p className="muted">
          Les dossiers s’enchaînent et la difficulté s’adapte à tes résultats. Difficulté actuelle : {endless.difficulty} · dossiers joués : {endless.played}.
        </p>
        <button type="button" className="primary" onClick={() => onStart(`endless:${endless.difficulty}:${endless.played + 1}`)}>
          Dossier suivant
        </button>
      </article>
    </section>
  );
}
