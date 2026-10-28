# Audit Detective

Jeu d'enquête pour s'exercer à l'audit et à la comptabilité belge (PCMN, TVA, CSA, ISA).
Application web installable (PWA), 100 % hors ligne.

- Jouer : https://gauthierdoumont.github.io/vision-audit/
- Cahier des charges : [`CLAUDE.md`](CLAUDE.md) · Avancement : [`PROGRESS.md`](PROGRESS.md)

## Commandes

| Commande | Rôle |
|---|---|
| `npm install` | Installe les dépendances |
| `npm run dev` | Lance l'app en local (http://localhost:5173/vision-audit/) |
| `npm test` | Lance les tests |
| `npm run build` | Vérifie les types et construit l'app dans `dist/` |
| `npm run validate-levels` | Génère les niveaux de la campagne et vérifie leurs invariants |
| `npm run preview` | Sert la version construite (pour tester le hors ligne) |
| `npm run icons` | Régénère les icônes PNG depuis `public/favicon.svg` (nécessite Playwright) |

Chaque push sur `main` déploie automatiquement sur GitHub Pages.
À faire une seule fois : sur GitHub, *Settings → Pages → Source* = **GitHub Actions**.

<sub>Créé par Gauthier Doumont.</sub>
