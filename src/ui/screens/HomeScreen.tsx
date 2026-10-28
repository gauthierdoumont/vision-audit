import type { Screen } from '../App';

type Mode = { id: string; label: string; detail: string };

// Les modes arrivent aux jalons J1 à J5 ; ils sont affichés mais pas encore jouables.
const MODES: Mode[] = [
  { id: 'campaign', label: 'Campagne', detail: '100 enquêtes, de stagiaire à réviseur' },
  { id: 'quick', label: 'Partie rapide', detail: 'Un dossier court, 10-15 min' },
  { id: 'big', label: 'Grand dossier', detail: 'Une enquête longue et piégeuse' },
  { id: 'daily', label: 'Défi du jour', detail: 'Le même dossier pour tout le monde, un essai' },
  { id: 'endless', label: 'Mode infini', detail: "Les dossiers s'enchaînent" },
];

export function HomeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <section className="screen home">
      <header className="home-header">
        <img className="logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={88} height={88} />
        <h1>Audit Detective</h1>
        <p className="tagline">Vigie &amp; Associés, Namur. Un dossier vous attend sur votre bureau.</p>
      </header>

      <nav className="menu" aria-label="Modes de jeu">
        {MODES.map((mode) => (
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
