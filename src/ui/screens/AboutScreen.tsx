export function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <section className="screen about">
      <button type="button" className="link-button back" onClick={onBack}>
        ← Retour
      </button>
      <h1>À propos</h1>
      <p>
        <strong>Audit Detective</strong> est un jeu d'enquête pour s'exercer à l'audit et à la comptabilité belge
        (PCMN, TVA, CSA, normes ISA).
      </p>
      <p>
        Toutes les sociétés, personnes et cabinets du jeu sont fictifs. Les cas inspirés de faits réels sont anonymisés
        pendant la partie.
      </p>
      <p>Le jeu fonctionne entièrement hors ligne, sans publicité ni collecte de données.</p>
      <p className="version">Version {__APP_VERSION__}</p>
      <p className="credit">Créé par Gauthier Doumont</p>
    </section>
  );
}
