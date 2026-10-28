import { GRADES } from '../../content/firm';
import { LEVEL_SUMMARIES } from '../../content/levels';
import type { GameState } from '../../game/state';
import type { LevelResult } from '../../storage/db';
import type { Screen } from '../App';

type Mode = { id: string; label: string; detail: string };

// Les autres modes arrivent aux jalons J5 ; ils sont affichés mais pas encore jouables.
const UPCOMING_MODES: Mode[] = [
  { id: 'quick', label: 'Partie rapide', detail: 'Un dossier court, 10-15 min' },
  { id: 'big', label: 'Grand dossier', detail: 'Une enquête longue et piégeuse' },
  { id: 'daily', label: 'Défi du jour', detail: 'Le même dossier pour tout le monde, un essai' },
  { id: 'endless', label: 'Mode infini', detail: "Les dossiers s'enchaînent" },
];

type Props = {
  savedGame: GameState | null;
  results: LevelResult[];
  onStart: (levelId: string, resume: boolean) => void;
  onNavigate: (screen: Screen) => void;
};

export function HomeScreen({ savedGame, results, onStart, onNavigate }: Props) {
  const savedLevel = savedGame && LEVEL_SUMMARIES.find((l) => l.id === savedGame.levelId);
  const starsOf = (id: string) => results.find((r) => r.levelId === id)?.stars;
  // Déblocage séquentiel : une étoile au niveau précédent suffit.
  const unlocked = (number: number) => number === 1 || (starsOf(LEVEL_SUMMARIES[number - 2]!.id) ?? 0) >= 1;

  return (
    <section className="screen home">
      <header className="home-header">
        <img className="logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={88} height={88} />
        <h1>Audit Detective</h1>
        <p className="tagline">Vigie &amp; Associés, Namur. Un dossier vous attend sur votre bureau.</p>
      </header>

      {savedLevel && (
        <button type="button" className="primary wide" onClick={() => onStart(savedLevel.id, true)}>
          Reprendre : niveau {savedLevel.number} — {savedLevel.clientName}
        </button>
      )}

      <h2 className="section-title">Campagne</h2>
      {GRADES.map((grade, g) => {
        const next = GRADES[g + 1]?.from ?? Infinity;
        const levels = LEVEL_SUMMARIES.filter((l) => l.number >= grade.from && l.number < next);
        if (levels.length === 0) return null;
        const stars = levels.reduce((s, l) => s + (starsOf(l.id) ?? 0), 0);
        const current = levels.some((l) => unlocked(l.number) && !starsOf(l.id));
        return (
          <details key={grade.label} className="chapter" open={current || undefined}>
            <summary>
              <span>{grade.label}</span>
              <span className="muted">
                Niveaux {levels[0]!.number}-{levels.at(-1)!.number} · {stars}/{levels.length * 3} ★
              </span>
            </summary>
            <nav className="menu" aria-label={`Niveaux ${grade.label}`}>
              {levels.map((level) => {
                const earned = starsOf(level.id) ?? 0;
                return (
                  <button key={level.id} type="button" className="menu-item" disabled={!unlocked(level.number)} onClick={() => onStart(level.id, false)}>
                    <span className="menu-label">
                      {level.number}. {level.title}
                    </span>
                    <span className="menu-detail">
                      {level.clientName} · difficulté {level.difficulty}
                    </span>
                    <span className="badge stars-badge" aria-label={`${earned} étoile(s)`}>
                      {'★'.repeat(earned)}
                      {'☆'.repeat(3 - earned)}
                    </span>
                  </button>
                );
              })}
            </nav>
          </details>
        );
      })}

      <h2 className="section-title">Bientôt</h2>
      <nav className="menu" aria-label="Autres modes de jeu">
        {UPCOMING_MODES.map((mode) => (
          <button key={mode.id} type="button" className="menu-item" disabled>
            <span className="menu-label">{mode.label}</span>
            <span className="menu-detail">{mode.detail}</span>
            <span className="badge">Bientôt</span>
          </button>
        ))}
      </nav>

      <button type="button" className="link-button" onClick={() => onNavigate('about')}>
        À propos
      </button>
    </section>
  );
}
