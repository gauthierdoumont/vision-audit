# Avancement — Audit Detective

## Jalon en cours : J0 — Mise en place (terminé, en attente de validation par Gauthier)

### J0
- [x] Projet Vite + React + TypeScript strict, Vitest, vite-plugin-pwa
- [x] Workflow GitHub Actions de déploiement (`.github/workflows/deploy.yml`)
- [ ] Activer GitHub Pages dans le dépôt (réglage manuel, voir README) et vérifier le premier déploiement
- [x] Écran d'accueil + À propos (« Créé par Gauthier Doumont »)
- [x] Hors ligne vérifié dans Chromium (rechargement réseau coupé, aucune requête externe)
- [ ] Installation testée sur un vrai téléphone Android et sur PC Windows

### Décisions
- Dépôt `vision-audit` (et non `audit-detective`) : l'app est publiée sous `/vision-audit/`.
- Thème clair/sombre automatique selon le système. Le réglage manuel et la taille de police viendront avec les écrans de jeu.
- Icône : loupe sur un dossier, bleu nuit et ambre (`public/favicon.svg`, PNG générés par `npm run icons`).
- Les dossiers `engine`, `content`, `game` et `storage` seront créés quand ils auront du code (J1-J2).

### Points `À VÉRIFIER`
- Aucun pour l'instant.

### Prochaine étape
J1 : un niveau vertical jouable fait main (facture d'achat en double).

<sub>Projet créé par Gauthier Doumont.</sub>
