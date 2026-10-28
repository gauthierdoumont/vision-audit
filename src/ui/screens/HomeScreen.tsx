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
      <nav className="menu" aria-label="Niveaux de la campagne">
        {LEVEL_SUMMARIES.map((level, index) => {
          const result = results.find((r) => r.levelId === level.id);
          const previous = LEVEL_SUMMARIES[index - 1];
          const unlocked = !previous || (results.find((r) => r.levelId === previous.id)?.stars ?? 0) >= 1;
          return (
            <button key={level.id} type="button" className="menu-item" disabled={!unlocked} onClick={() => onStart(level.id, false)}>
              <span className="menu-label">
                {level.number}. {level.title}
              </span>
              <span className="menu-detail">
                {level.clientName} · difficulté {level.difficulty}
              </span>
              <span className="badge stars-badge" aria-label={`${result?.stars ?? 0} étoile(s)`}>
                {'★'.repeat(result?.stars ?? 0)}
                {'☆'.repeat(3 - (result?.stars ?? 0))}
              </span>
            </button>
          );
        })}
      </nav>

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
