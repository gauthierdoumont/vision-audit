# Audit Detective — Résumé du projet et des sessions

> À lire en début de session, après `CLAUDE.md` (le cahier des charges) et `PROGRESS.md` (l'avancement détaillé).
> Ce fichier dit **où en est le projet**, **comment il est construit** et **ce qui a été fait à chaque session**,
> pour reprendre le travail dans une nouvelle discussion sans tout redécouvrir.

---

## 1. En bref

- **Le jeu** : enquête d'audit narrative pour s'exercer à la comptabilité et à l'audit belges (PCMN, TVA belge, CSA, ISA). PWA 100 % hors ligne, en français, mobile-first.
- **Joueur** : Gauthier, étudiant en bac 3 Comptabilité, stagiaire en révisorat. Il débute en Git : commits en français, expliqués en une phrase, et **demander avant chaque push**.
- **En ligne** : https://gauthierdoumont.github.io/vision-audit/ (dépôt `gauthierdoumont/vision-audit`). Un push sur `main` lance les tests, le build et le déploiement (`.github/workflows/deploy.yml`).
- **État** : jalons J0 à J7 réalisés. Il reste la **relecture des `À VÉRIFIER` par Gauthier** (liste dans `PROGRESS.md`).
- **Chiffres** : 141 niveaux de campagne (120 + 21 « bis »), 33 types d'anomalies, 15 procédures, 5 modes de jeu, 1 138 tests.

## 2. Commandes

| Commande | Rôle |
|---|---|
| `npm ci` | Installer les dépendances (pas de `node_modules` dans un conteneur neuf) |
| `npm run dev` | Lancer le jeu en local |
| `npm test` | Tests Vitest, environ 25 s ; tous doivent passer |
| `npm run build` | Vérification TypeScript + build Vite (PWA) |
| `npm run validate-levels` | Génère les 141 niveaux et vérifie leurs invariants |

Avant de dire « terminé » : les trois dernières commandes doivent passer (règle de `CLAUDE.md` §15).

## 3. Architecture

```
src/
  engine/     Moteur pur (sans React), déterministe (graine → même cas ; Math.random interdit)
    rng.ts, company.ts, ledger.ts      entreprise et exercice complet (achats, ventes, paie, TVA, immobilisations, stock)
    anomalies/                         une définition par anomalie, rangées par cycle (errors, sales, purchases, treasury,
                                       stock, assets, payroll, provisions, cases) ; index.ts = catalogue, CYCLE_OF, MIN_DIFFICULTY
    documents/                         documents du dossier et procédures (PROCEDURES, unlockLevel)
    scenarios.ts                       fausses pistes, continuité, limitation, opinion attendue
    generate.ts                        pipeline graine → niveau jouable (budget, seuil, briefing, traces)
    validate.ts                        invariants (validateLevel, validateCase, validatePartyBalances)
    modes.ts                           partie rapide, grand dossier, défi du jour, mode infini, points faibles
  content/    Textes et données (séparés du code)
    levels/campaign.ts                 specs de la campagne : MAIN_SPECS, BIS_SPECS, PARTNER_SPECS
    levels/level-001.ts                niveau 1 écrit à la main
    anomaly-texts.ts                   titre, explication, indice, réplique d'entretien, ISA, par anomalie
    tutorials.ts                       fiches d'Hélène (mécaniques) et mini-cours (anomalies)
    firm.ts, orion.ts, real-cases.ts   cabinet, grades et promotions, fil rouge Orion, fiches des affaires réelles
    pcmn.ts, glossary.ts, sectors.ts   plan comptable, glossaire, 10 secteurs
  game/       Logique de partie (pure)
    state.ts                           état et actions (gameReducer) ; partie sauvegardée
    scoring.ts                         score /100, étoiles, tolérance de ±1 %
    feedback.ts                        explication des erreurs au débrief
    tutorials.ts                       quelles fiches montrer, et quand
    progress.ts                        statistiques, déblocage des niveaux (isUnlocked)
  ui/         React : App.tsx, écrans (screens/), partie (game/), ToolsPanel (calculatrice, glossaire, PCMN, fiches)
  storage/    IndexedDB (idb) : partie en cours, résultats, statistiques, réglages, fiches déjà lues
tests/        Vitest (moteur, partie, score, débrief, fiches, modes, stockage, interface)
scripts/      validate-levels.ts, generate-icons.mjs
```

## 4. Comment ça marche (à savoir avant de modifier)

- **Vérité et livres** : le moteur génère une comptabilité « vraie » (`truth`), puis copie les livres (`books`) et y injecte les anomalies. L'invariant central, testé pour chaque anomalie : **livres + écriture de correction = vérité, compte par compte**.
- **Une anomalie** (`engine/anomalies/*.ts`) renvoie : cycle, assertion, erreur ou fraude, comptes acceptés et montants, écriture de correction, **traces** (au moins 2, lignes de documents ou réplique d'entretien), personnage concerné, mensonge et preuves qui le contredisent (`contradictedBy`), paramètres des textes.
- **Ajouter une anomalie** :
  1. le type dans `anomalies/types.ts` ;
  2. la définition dans le fichier de son cycle ;
  3. l'entrée dans `CYCLE_OF` et `MIN_DIFFICULTY` (`anomalies/index.ts`) ;
  4. les textes dans `content/anomaly-texts.ts` ;
  5. le mini-cours dans `content/tutorials.ts`.

  Le typage `Record<AnomalyType, …>` refuse d'oublier une étape. Le test « tous secteurs × toutes anomalies » valide l'ensemble.
- **Traces** : identifiants `REF.*` dans `engine/ids.ts`. Une trace placée dans un document absent du dossier (procédure pas encore débloquée) est ignorée à la génération.
- **Banque** : le 550 des livres doit égaler celui du relevé, sauf écart volontaire déclaré (`bankGap`, rapprochement arrangé).
- **Niveaux** : `content/levels/campaign.ts`. `spec()` donne un niveau court à 1 anomalie ; `story()` donne un format moyen (≤ 60) ou long ; `bis()` donne un niveau intercalé (`level-NNN-bis`, affiché « N bis », même chapitre, pas de promotion). L'ordre de jeu suit le numéro, chaque « bis » juste après son niveau.
- **Déblocage** : 1 étoile au niveau précédent dans l'ordre de jeu. Un niveau déjà réussi reste ouvert, donc ajouter un « bis » ne reverrouille rien.
- **Fiches d'Hélène** : une fiche de mécanique se déclenche sur ce que le joueur voit déjà (procédures disponibles, format, consignes du briefing via `level.notices`), **jamais sur les anomalies cachées**. Le mini-cours d'une anomalie s'affiche avant la partie seulement en campagne et si l'anomalie est seule dans le dossier ; sinon au débrief. Les fiches lues sont gardées dans IndexedDB (`tutorials-seen`).
- **Tests garde-fous** :
  - un joueur parfait simulé fait 100/100 et 3 étoiles sur chaque niveau ;
  - chaque anomalie apparaît d'abord seule ;
  - au plus 5 fiches par niveau, aucune répétée ;
  - déterminisme ;
  - pas de `Math.random` dans le moteur.

## 5. Historique des sessions

### Session 1 — jalons J0 à J6 (PR #1)
Le jeu complet :
- projet Vite + React + TS strict et PWA ;
- niveau 1 fait main, puis moteur procédural (25 anomalies, documents, fausses pistes, scénarios) ;
- entretiens avec mensonges et confrontation, cabinet (Hélène, Maxime, Inès), fil rouge Orion Trading ;
- 100 niveaux en 5 chapitres, affaires réelles (81-100) ;
- modes de jeu, statistiques et points faibles ;
- outils (calculatrice, glossaire, PCMN), thèmes, accessibilité ;
- déploiement GitHub Pages.

### Session 2 — jalon J7 « Apprendre et rejouer » (PR #2, fusionnée le 29/10/2026)
- **Tutoriel** : 14 fiches de mécanique et 33 mini-cours d'anomalies (`content/tutorials.ts`, `game/tutorials.ts`), relisibles dans Outils › Fiches, à revoir via Réglages.
- **Voir la solution** (onglet Conclusion, avec confirmation) : action `view-solution`, 0 point et 0 étoile, niveau suivant non débloqué.
- **Explication des erreurs** (`game/feedback.ts`) : au débrief, pour chaque critère, ta réponse, l'attendu et le pourquoi. Le module détecte notamment un montant TVA comprise, le montant d'un autre compte et une écriture inversée ou incomplète, et rappelle l'assertion et l'intention. Pour une anomalie manquée, il indique où la chercher. Il commente aussi les faux positifs et l'opinion.
- **8 nouvelles anomalies** : `lapping`, `unauthorized-credit-note`, `double-payment`, `stock-cutoff`, `scrapped-asset`, `rigged-reconciliation`, `inflated-overtime`, `unrecorded-tax-debt`.
  - Nouveaux documents : relevé de pointage, heures sup. dans la paie, postes de rapprochement du client.
  - Nouveaux comptes PCMN : 444, 452, 640, 663.
- **21 niveaux « bis »**, dont 77 bis à 80 bis pour introduire seuls les montages des affaires réelles, et **chapitre Associé** (101-120).
- **Correctif** : le paiement « TVA — déclaration du 4e trimestre » (opérations de janvier) incluait à tort la déclaration du 3e trimestre (`afterClosingEvents`, `ledger.ts`).
- Préférences de Gauthier pour ces sessions :
  - poser toutes les questions utiles **avant** de commencer ;
  - créer un document seulement s'il le demande ;
  - mettre discrètement « créé par Gauthier Doumont » dans chaque fichier.

## 6. Ce qui reste à faire

1. **Relecture par Gauthier** des points `À VÉRIFIER` (`PROGRESS.md`) :
   - affaires réelles ;
   - TVA horeca ;
   - durées d'amortissement ;
   - créances douteuses ;
   - parties liées ;
   - seuil de signification ;
   - nouveautés J7 : bien mis au rebut, régularisation TVA, solde débiteur fournisseur, taux des heures sup., facture à recevoir hors TVA.
2. Relire les textes des fiches (`content/tutorials.ts`) et des nouvelles anomalies (`content/anomaly-texts.ts`).
3. Tester l'installation sur Android et Windows, et le mode avion.
4. Pistes possibles (non demandées) : équilibrage des budgets du chapitre Associé après quelques parties, nouvelles fausses pistes, épilogue narratif après le niveau 120.

<sub>Résumé tenu pour Gauthier Doumont, auteur du projet.</sub>
