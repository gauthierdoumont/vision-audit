# Avancement — Audit Detective

## Jalon en cours : J1 — Niveau vertical jouable (terminé, en attente de validation par Gauthier)

### J0
- [x] Projet Vite + React + TypeScript strict, Vitest, vite-plugin-pwa
- [x] Workflow GitHub Actions de déploiement (`.github/workflows/deploy.yml`)
- [ ] Activer GitHub Pages dans le dépôt (réglage manuel, voir README) et vérifier le premier déploiement
- [x] Écran d'accueil + À propos (« Créé par Gauthier Doumont »)
- [x] Hors ligne vérifié dans Chromium (rechargement réseau coupé, aucune requête externe)
- [ ] Installation testée sur un vrai téléphone Android et sur PC Windows

### J1
- [x] Niveau 1 fait main (`src/content/levels/level-001.ts`) : Boulangerie Lemaire SRL, briefing d'Hélène, 6 documents, 3 procédures, 1 entretien (Julien Dethier, nerveux mais honnête), 1 anomalie (facture F-2025-1187 encodée deux fois, payée une fois)
- [x] Carnet d'indices (lignes de documents et réponses d'entretien épinglables)
- [x] Conclusion : compte PCMN, assertion, montant, erreur/fraude, écriture de correction (contrôle débit = crédit), indices à l'appui, opinion + continuité
- [x] Score (§10), étoiles, débrief (pourquoi, traces, ISA, opinion attendue)
- [x] Sauvegarde automatique de la partie en cours et du meilleur résultat (IndexedDB)
- [x] Partie complète jouée dans Chromium (390 px, clair et sombre) : reprise après fermeture OK, 98/100 et 3 étoiles, aucune erreur console

### Décisions
- Dépôt `vision-audit` (et non `audit-detective`) : l'app est publiée sous `/vision-audit/`.
- Thème clair/sombre automatique selon le système. Le réglage manuel et la taille de police viendront avec les écrans de jeu.
- Icône : loupe sur un dossier, bleu nuit et ambre (`public/favicon.svg`, PNG générés par `npm run icons`).
- Le dossier `engine` sera créé en J2 (génération procédurale).
- Niveau 1 : réponse attendue = compte 440 (3 392 €, TVAC) ou 604 (3 200 €, HTVA) ; assertion existence ; erreur ; écriture D 440 3 392 / C 604 3 200 / C 411 192 ; opinion sans réserve (client qui corrige), pas de paragraphe continuité.
- Opinion intégrée dès J1 en version simple (nécessaire pour la 1re étoile).
- Score : efficience 20/20 jusqu'au chemin optimal, 10/20 au budget, 0 au-delà. Pénalités : faux positif −15, indice −10, mauvaise opinion −15. Valeurs à équilibrer en J6.
- Les heures peuvent dépasser le budget (barre rouge, efficience 0, pas de 3e étoile) plutôt que bloquer le joueur.

### Points `À VÉRIFIER`
- Aucun. Règles utilisées : TVA 6 % sur la farine, le sucre et le lait (denrées alimentaires), 21 % sur le nettoyage, les emballages et l'entretien du four. Gauthier peut les valider.

### Prochaine étape
J2 : moteur de génération (RNG avec seed, entreprise, écritures, grand livre, balance, documents), les 6 erreurs simples, tests d'invariants + `npm run validate-levels`, niveaux 1-20.

<sub>Projet créé par Gauthier Doumont.</sub>
