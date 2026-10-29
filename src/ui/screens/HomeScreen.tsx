import { GRADES } from '../../content/firm';
import { LEVEL_SUMMARIES } from '../../content/levels';
import { isUnlocked } from '../../game/progress';
import type { GameState } from '../../game/state';
import type { LevelResult } from '../../storage/db';
import type { Screen } from '../App';

type Props = {
  savedGame: GameState | null;
  results: LevelResult[];
  onStart: (levelId: string, resume: boolean) => void;
  onNavigate: (screen: Screen) => void;
};

export function HomeScreen({ savedGame, results, onStart, onNavigate }: Props) {
  const savedLevel = savedGame && LEVEL_SUMMARIES.find((l) => l.id === savedGame.levelId);
  const starsOf = (id: string) => results.find((r) => r.levelId === id)?.stars;
  const unlocked = (id: string) => isUnlocked(LEVEL_SUMMARIES, starsOf, id);

  return (
    <section className="screen home">
      <header className="home-header">
        <img className="logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={88} height={88} />
        <h1>Audit Detective</h1>
        <p className="tagline">Vigie &amp; Associés, Namur. Un dossier vous attend sur votre bureau.</p>
      </header>

      {savedLevel && (
        <button type="button" className="primary wide" onClick={() => onStart(savedLevel.id, true)}>
          Reprendre : niveau {savedLevel.label} — {savedLevel.clientName}
        </button>
      )}
      {savedGame && !savedLevel && (
        <button type="button" className="primary wide" onClick={() => onStart(savedGame.levelId, true)}>
          Reprendre la partie en cours
        </button>
      )}

      <h2 className="section-title">Campagne</h2>
      {GRADES.map((grade, g) => {
        const next = GRADES[g + 1]?.from ?? Infinity;
        const levels = LEVEL_SUMMARIES.filter((l) => l.number >= grade.from && l.number < next);
        if (levels.length === 0) return null;
        const stars = levels.reduce((s, l) => s + (starsOf(l.id) ?? 0), 0);
        const current = levels.some((l) => unlocked(l.id) && !starsOf(l.id));
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
                  <button key={level.id} type="button" className="menu-item" disabled={!unlocked(level.id)} onClick={() => onStart(level.id, false)}>
                    <span className="menu-label">
                      {level.label}. {level.title}
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

      <h2 className="section-title">Et aussi</h2>
      <nav className="menu" aria-label="Autres modes de jeu">
        <button type="button" className="menu-item" onClick={() => onNavigate('modes')}>
          <span className="menu-label">Autres modes</span>
          <span className="menu-detail">Partie rapide, grand dossier, défi du jour, mode infini</span>
        </button>
        <button type="button" className="menu-item" onClick={() => onNavigate('stats')}>
          <span className="menu-label">Statistiques et points faibles</span>
          <span className="menu-detail">Taux de réussite par cycle et par assertion</span>
        </button>
        <button type="button" className="menu-item" onClick={() => onNavigate('tools')}>
          <span className="menu-label">Outils</span>
          <span className="menu-detail">Calculatrice, glossaire, aide-mémoire PCMN</span>
        </button>
        <button type="button" className="menu-item" onClick={() => onNavigate('settings')}>
          <span className="menu-label">Réglages</span>
          <span className="menu-detail">Thème clair ou sombre, taille du texte</span>
        </button>
      </nav>

      <button type="button" className="link-button" onClick={() => onNavigate('about')}>
        À propos
      </button>
    </section>
  );
}
