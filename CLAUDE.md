# Audit Detective — Cahier des charges (CLAUDE.md)

> Ce fichier est la référence du projet. Relis-le au début de chaque session.
> En cas de doute entre ce fichier et une idée du moment, ce fichier gagne.

---

## 1. Vision

**Audit Detective** est un jeu d'enquête narratif pour s'exercer à l'audit et à la comptabilité belge de façon ludique.

- **Joueur** : Gauthier, étudiant en bac 3 Comptabilité (Belgique), stagiaire en cabinet de révisorat, futur réviseur d'entreprises.
- **Promesse** : chaque partie est une enquête. On lit un dossier comptable, on choisit des procédures d'audit, on interroge des personnages, on trouve les anomalies et on conclut comme un vrai réviseur.
- **Ton** : enquête narrative, un peu de suspense et d'humour. Le joueur fait déjà de l'audit « sérieux » toute la journée en stage, donc le jeu doit rester **fun**, tout en étant **techniquement exact**.
- **Rejouabilité** : 100 niveaux de campagne, un mode infini et un défi du jour, grâce à la **génération procédurale** (aucune IA).

---

## 2. Contraintes non négociables

1. **100 % hors ligne, sans IA ni API à l'exécution.** Aucun appel réseau dans l'app, sauf le service worker qui la met en cache. Pas d'analytics, pas de polices chargées depuis Internet.
2. **PWA installable** sur téléphone Android, tablette Android et PC Windows. Conception **mobile-first**, responsive jusqu'au grand écran.
3. **Tout en français** pour l'interface et le contenu. Le code, lui, est en anglais (noms de variables, fonctions, fichiers).
4. **Cadre belge** : PCMN, TVA belge, CSA, normes ISA appliquées en Belgique. Jamais de PCG français.
5. **Données fictives.** Les sociétés, personnes et cabinets sont inventés. Les cas réels (niveaux 81-100) sont **anonymisés** pendant la partie. L'affaire réelle n'est révélée qu'au débrief.
6. **Déterminisme** : même graine (seed) donne exactement le même cas. `Math.random` est interdit dans le moteur.
7. **Crédit discret** : l'écran « À propos » affiche « Créé par Gauthier Doumont ». Le champ `author` du `package.json` = `Gauthier Doumont`.

---

## 3. Stack technique

| Élément | Choix |
|---|---|
| Build | Vite |
| Langage | TypeScript (strict) |
| UI | React |
| PWA | vite-plugin-pwa (manifest + service worker, mode hors ligne complet) |
| Sauvegarde | IndexedDB (via `idb`) : progression, étoiles, stats, partie en cours |
| Tests | Vitest |
| Hébergement | GitHub Pages via GitHub Actions. Compte GitHub : `gauthierdoumont`. Dépôt : `vision-audit` (publié sur gauthierdoumont.github.io/vision-audit/) |

Règles :
- Le **moteur** (`src/engine`) est en fonctions pures, sans dépendance à React. Il doit être testable seul.
- Le **contenu** (niveaux, personnages, textes, catalogue d'anomalies) est séparé du code (`src/content`), pour pouvoir ajouter des niveaux sans toucher au moteur.
- Pas de grosse librairie inutile. Les fichiers restent courts et lisibles.

### Arborescence cible
```
src/
  engine/        # rng, génération d'entreprise, écritures, documents, anomalies, validateurs
  content/       # niveaux, personnages, dialogues, catalogue d'anomalies, cas réels, glossaire
  game/          # état de partie, procédures, budget d'heures, scoring, progression
  ui/            # écrans et composants
  storage/       # IndexedDB
tests/
scripts/         # validate-levels.ts, etc.
```

---

## 4. Boucle de jeu (une partie)

1. **Briefing narratif** : mail ou appel de la mentore. On découvre le client (secteur, taille, contexte), le seuil de signification et le **budget d'heures**.
2. **Dossier** : documents consultables, affichés comme de vrais documents (factures, relevés, etc.).
3. **Procédures d'audit** : chacune **coûte des heures** et révèle de nouvelles informations (voir §7). Le budget force à choisir, comme en vrai.
4. **Entretiens** : dialogues à choix avec les personnages du client. Ils peuvent mentir, et une contradiction avec un document constitue un indice. Les entretiens coûtent aussi des heures.
5. **Carnet d'indices** : le joueur **épingle** des lignes ou des documents. Chaque constat de la conclusion doit s'appuyer sur au moins un indice épinglé.
6. **Conclusion**, pour chaque anomalie trouvée :
   - le compte PCMN touché,
   - l'assertion (existence, exhaustivité, évaluation, séparation des exercices, droits et obligations, présentation),
   - le montant,
   - la qualification **erreur ou fraude**,
   - l'**écriture de correction** (comptes PCMN, débit/crédit, montants).

   Au niveau global, le joueur choisit aussi l'**opinion** : sans réserve, avec réserve, négative ou abstention. Il précise si un paragraphe d'observation sur la continuité s'impose.
7. **Débrief** : score, étoiles (1 à 3), explication du **pourquoi** de chaque anomalie, traces qui la révélaient, norme ISA liée et, pour les cas réels, révélation de l'affaire.

Une partie en cours est **sauvegardée automatiquement** et reprend là où on s'est arrêté.

**Bloqué ?** L'indice d'Hélène coûte des points. En dernier recours, « Voir la solution » arrête la partie à 0 étoile (le niveau suivant reste bloqué). Le débrief corrige quand même le travail : pour chaque critère, la réponse du joueur, la réponse attendue et le pourquoi de l'erreur.

**Tutoriel** : les « fiches d'Hélène » présentent chaque nouvelle mécanique la première fois qu'elle apparaît (déclenchées par ce que le joueur voit, jamais par les anomalies cachées), et chaque type d'anomalie par un mini-cours avant son niveau d'introduction (sinon au débrief). Relecture dans Outils › Fiches.

---

## 5. Narration

- **Le joueur** commence stagiaire au cabinet fictif **Vigie & Associés** (Namur), puis monte en grade au fil de la campagne.
- **Personnages récurrents** (fictifs) :
  - **Hélène Vasseur**, associée réviseure et mentore. Exigeante, pince-sans-rire. C'est elle qui donne les briefings et les indices payants.
  - **Maxime**, collègue senior, rival amical. Il fait des paris sur le résultat.
  - **Inès**, spécialiste data du cabinet. Elle débloque les outils d'analyse (Benford, analyses de masse).
- **Personnages clients**, générés à partir de prénoms et noms belges courants (listes fictives). Chacun a un rôle (gérant, comptable, magasinier, commercial, administrateur) et un **profil** : coopératif, nerveux, évasif, arrogant ou complice. Le profil influence les dialogues et la fiabilité des réponses.
- **Fil rouge** de la campagne : une mystérieuse société écran, « **Orion Trading** », apparaît discrètement dans les comptes de plusieurs clients au fil des chapitres. Le joueur la recoupe petit à petit. Le niveau 100 dénoue l'affaire.
- Les textes restent **courts** : 3 à 6 lignes par message ou réplique. Le joueur doit vite revenir au dossier.

---

## 6. Formats et difficulté

### Formats
| Format | Durée | Difficulté | Contenu typique |
|---|---|---|---|
| **Court** | 10-15 min | 1 à 4 | 4-8 documents, 1 anomalie, 3-5 procédures utiles, pas ou peu de fausses pistes |
| **Moyen** | 15-25 min | 4 à 6 | 8-15 documents, 1-2 anomalies, 1 fausse piste |
| **Long** | 30-60 min | 6 à 10 | 15-40 documents, 2-4 anomalies, fausses pistes, parties liées, choix d'opinion délicat |

### Paramètres pilotés par la difficulté (1 à 10)
- nombre d'anomalies et leur montant par rapport au seuil de signification,
- nombre de documents et de fausses pistes,
- budget d'heures (marge par rapport au chemin optimal : de ×2 en difficulté 1 à ×1,2 en difficulté 10),
- subtilité des traces (évidentes, puis à recouper entre 2-3 documents),
- présence de parties liées, de collusion et de personnages menteurs,
- complexité de l'opinion (continuité, limitation de l'étendue des travaux).

---

## 7. Procédures d'audit (outils du joueur)

Chaque procédure a un **coût en heures**, une liste de ce qu'elle **révèle**, et un **niveau de déblocage**.

| Procédure | Coût indicatif | Révèle typiquement |
|---|---|---|
| Revue analytique (ratios, variations N/N-1) | 1 h | marges anormales, postes qui explosent |
| Lecture des PV (AG, CA) | 1 h | décisions, litiges, parties liées |
| Revue des contrats | 2 h | engagements, conditions de livraison, clauses |
| Rapprochement bancaire | 2 h | écarts entre banque et compta |
| Confirmation bancaire | 3 h | comptes inexistants, soldes faux |
| Circularisation clients | 3 h | créances fictives, encaissements détournés |
| Circularisation fournisseurs | 3 h | dettes omises, fournisseurs fictifs |
| Test de cut-off (ventes/achats autour de la clôture) | 2 h | séparation des exercices |
| Observation de l'inventaire physique | 4 h | stocks gonflés, obsolètes |
| Sondage de factures (le joueur choisit l'échantillon) | 1 h / 5 pièces | doublons, montants, TVA |
| Recherche de dettes non comptabilisées (paiements après clôture) | 2 h | exhaustivité des dettes |
| Contrôle registre du personnel / paie | 2 h | employé fantôme |
| Recherche parties liées (registre BCE fictif) | 2 h | liens entre administrateurs et tiers |
| Analyse de Benford (débloquée avec Inès) | 1 h | manipulation de montants |
| Entretien avec un personnage | 0,5 h par sujet | contradictions, aveux |
| Indice de la mentore | 0 h, mais pénalité de score | piste |

Les coûts sont des valeurs de départ, à équilibrer en jouant.

---

## 8. Génération procédurale (moteur)

### Pipeline
`seed + paramètres du niveau` → **entreprise** → **plan comptable** (sous-ensemble PCMN) → **opérations de l'exercice** → **écritures** → **grand livre** → **balance** → **bilan et compte de résultats abrégés** → **documents** → **injection des anomalies** (avec leurs traces) → **fausses pistes** → **cas jouable**.

### Entreprise
- Secteurs : boulangerie-pâtisserie, garage, grossiste alimentaire, PME informatique, entreprise de construction, horeca, e-commerce, transport, cabinet médical (société), commerce de détail.
- Forme : SRL, SA ou SC. Taille : petite ou grande au sens du CSA. **Les seuils sont à vérifier** (marquer `À VÉRIFIER`).
- Saisonnalité réaliste selon le secteur, exercice comptable = année civile par défaut.

### Plan comptable (exemples de comptes PCMN à utiliser)
- Classe 1 : 100 Capital, 13 Réserves, 140 Bénéfice reporté, 16 Provisions pour risques et charges, 17 Dettes à plus d'un an.
- Classe 2 : 22 Terrains et constructions, 23 Installations, machines et outillage, 24 Mobilier et matériel roulant, 2x9 Amortissements actés.
- Classe 3 : 34 Marchandises, 349 Réductions de valeur actées.
- Classe 4 : 400 Clients, 407 Créances douteuses, 409 Réductions de valeur actées, 411 TVA à récupérer, 440 Fournisseurs, 451 TVA à payer, 453 Précomptes retenus, 454 ONSS, 455 Rémunérations, 490 à 493 Comptes de régularisation.
- Classe 5 : 550 Établissements de crédit, 570 Caisses.
- Classe 6 : 604 Achats de marchandises, 609 Variation des stocks, 61 Services et biens divers, 62 Rémunérations et charges sociales, 630 Dotations aux amortissements, 631/634 Réductions de valeur, 635/637 Provisions.
- Classe 7 : 700 Ventes, 74 Autres produits d'exploitation, 75 Produits financiers.

### TVA belge
- Taux : 21 %, 12 %, 6 %, 0 %.
- Règles utiles aux anomalies : TVA non déductible sur les frais de restaurant ; déduction limitée sur les voitures (maximum 50 % selon l'usage professionnel).
- Toute règle chiffrée non certaine est marquée `À VÉRIFIER` pour validation par Gauthier.

### Invariants (testés automatiquement)
- Chaque écriture respecte **débit = crédit**. La balance est équilibrée.
- La TVA est cohérente (base × taux), sauf anomalie injectée volontairement.
- Avant injection, le solde du compte 550 correspond au relevé bancaire, sauf anomalie.
- Chaque anomalie laisse **au moins 2 traces**, et elle est détectable par **au moins une procédure** dans le budget d'heures.
- Le **chemin optimal** (procédures minimales pour tout trouver) tient dans le budget avec la marge prévue en §6.
- Une fausse piste ne doit jamais ressembler à 100 % à une vraie anomalie : elle a une explication trouvable (document justificatif).
- Même seed : cas identique (test de déterminisme).

---

## 9. Catalogue d'anomalies

Chaque entrée du catalogue contient : `id`, nom, cycle, assertion(s), erreur ou fraude, difficulté minimale, mécanisme d'injection, traces laissées, procédures révélatrices, **écriture de correction**, norme ISA liée et explication pédagogique (le pourquoi).

### Erreurs simples (niveaux 1-20)
- Mauvais taux de TVA sur une facture
- Facture d'achat comptabilisée deux fois
- Erreur d'imputation de compte (ex. : investissement passé en charges)
- Amortissement oublié ou mauvaise durée
- Inversion débit/crédit
- TVA déduite sur des frais de restaurant

### Ventes et clients
- Vente fictive en fin d'exercice (cut-off)
- Chiffre d'affaires reconnu trop tôt (livraison après la clôture)
- Créance douteuse non dépréciée
- Détournement d'encaissements masqué par décalage (lapping)
- Remises ou notes de crédit non autorisées

### Achats et fournisseurs
- Fournisseur fictif (IBAN lié à un employé)
- Facture fournisseur non comptabilisée (dettes omises)
- Facture payée deux fois
- Dépense privée passée en société

### Stocks
- Quantités gonflées à l'inventaire
- Stock obsolète non déprécié
- Erreur de cut-off sur les stocks

### Immobilisations
- Charges activées à tort pour gonfler le résultat (inspiration WorldCom)
- Immobilisation fictive

### Trésorerie
- Compte bancaire inexistant ou solde falsifié (inspiration Parmalat, Wirecard)
- Rapprochement bancaire « arrangé »
- Virements vers un compte personnel

### Personnel
- Employé fantôme
- Heures supplémentaires gonflées

### Parties liées et montages
- Transactions avec la société d'un administrateur, non déclarées
- Ventes circulaires via des sociétés liées (inspiration Lernout & Hauspie)
- Remises fournisseurs surévaluées (inspiration Ahold / US Foodservice)

### Provisions et continuité
- Litige connu (PV, mails) non provisionné
- Dette fiscale ou sociale sous-estimée
- Difficultés de continuité masquées (ISA 570)

---

## 10. Scoring

- **Exactitude**, 60 % : chaque anomalie avec le bon compte, la bonne assertion, le bon montant (tolérance ±1 %), la bonne écriture de correction et la bonne qualification.
- **Efficience**, 20 % : heures utilisées par rapport au budget.
- **Justification**, 20 % : constats appuyés par des indices épinglés pertinents.
- **Pénalités** : faux positifs (accuser à tort), indices de la mentore, mauvaise opinion.
- **Étoiles** : 1 étoile = au moins une anomalie trouvée et opinion correcte ; 2 étoiles = tout trouvé ; 3 étoiles = tout trouvé, dans le budget, sans indice.

---

## 11. Progression et modes

### Campagne (120 niveaux + niveaux « bis »)
| Niveaux | Grade | Format | Contenu |
|---|---|---|---|
| 1-20 | Stagiaire | Court | Erreurs simples. Chaque type d'anomalie est introduit seul la première fois (mini-tutoriel) |
| 21-40 | Assistant | Court | Fraudes classiques isolées |
| 41-60 | Senior | Moyen | 1-2 anomalies, fausses pistes, entretiens importants |
| 61-80 | Superviseur | Long | Combinaisons, parties liées, petits groupes, opinions avec réserve |
| 81-100 | Réviseur | Long | Cas inspirés de faits réels et dénouement de l'affaire Orion Trading |
| 101-120 | Associé | Long | Les dossiers les plus épineux, toutes anomalies confondues |

- **Niveaux « bis »** (ex. : 7 bis) intercalés après un niveau, sans renuméroter : introduction de chaque nouvelle anomalie seule, marches de difficulté adoucies. Identifiant `level-NNN-bis`.

- Les niveaux de campagne sont définis dans `src/content/levels/campaign.ts` : `{ id, seed, difficulty, format, anomaliesImposées?, scénario, personnages }`.
- Déblocage séquentiel dans l'ordre de jeu ; il faut 1 étoile minimum pour passer au niveau suivant. Un niveau déjà réussi reste ouvert.

### Autres modes
- **Partie rapide** : format Court, difficulté au choix entre 1 et 4, seed aléatoire.
- **Grand dossier** : format Long, difficulté au choix entre 6 et 10, seed aléatoire.
- **Défi du jour** : seed = date du jour (AAAAMMJJ), un essai par jour, meilleur score conservé.
- **Mode infini** : enchaînement de cas générés, difficulté qui s'adapte aux résultats.

### Statistiques
- Taux de réussite par **cycle** (ventes, achats, stocks, trésorerie, personnel, immobilisations, parties liées) et par **assertion**.
- Écran « Points faibles » qui propose une partie rapide ciblée sur le cycle le plus raté.

---

## 12. Cas réels (niveaux 81-100)

- Inspirations : Lernout & Hauspie, Parmalat, Wirecard, Ahold (US Foodservice), Enron (entités ad hoc), WorldCom (charges activées), Satyam (trésorerie fictive).
- Pendant la partie, tout est **fictif et ramené à l'échelle d'une PME belge**, avec le même mécanisme de fraude.
- Au débrief, une fiche « **L'affaire réelle** » de 5 à 8 lignes présente : ce qui s'est passé, le mécanisme, comment ça a été découvert et la leçon pour l'auditeur.
- **Chaque fiche réelle est marquée `À VÉRIFIER`** jusqu'à validation des faits par Gauthier. Aucun fait inventé.

---

## 13. Interface (UX)

- Mobile-first, avec navigation par onglets : **Dossier · Procédures · Entretiens · Carnet · Conclusion**.
- Les documents ressemblent à de vrais documents (facture avec en-tête, relevé bancaire, PV), lisibles sur téléphone.
- Barre fixe avec le budget d'heures restant.
- Outils intégrés : calculatrice, **glossaire** (assertions, ISA, comptes PCMN) et aide-mémoire PCMN.
- Formulaire d'écriture de correction : sélection des comptes PCMN avec recherche, et vérification débit = crédit.
- Thème clair et sombre, taille de police réglable.
- Écran « À propos » avec la mention discrète « Créé par Gauthier Doumont ».

---

## 14. Feuille de route (jalons)

Avance **un jalon à la fois**. Un jalon n'est terminé que si **tous ses critères sont remplis**.

### J0 — Mise en place
- [x] Projet Vite + React + TypeScript strict, Vitest, vite-plugin-pwa
- [x] Déploiement GitHub Pages via GitHub Actions (dépôt `vision-audit` ; activer Pages : Settings → Pages → GitHub Actions)
- [x] Écran d'accueil + À propos ; fonctionne hors ligne (installation sur appareil réel : à tester par Gauthier)

### J1 — Niveau vertical jouable (fait main)
- [x] 1 niveau écrit à la main : briefing narratif, 6 documents, 3 procédures, 1 entretien, 1 anomalie (facture d'achat en double)
- [x] Carnet d'indices, conclusion avec écriture de correction, score, débrief
- [x] Sauvegarde de la partie en cours

### J2 — Moteur de génération
- [x] RNG avec seed, génération d'entreprise, écritures, grand livre, balance, documents
- [x] Les 6 erreurs simples du catalogue
- [x] Tests des invariants (§8) + script `npm run validate-levels`
- [x] Niveaux 1-20 générés et jouables

### J3 — Narration et entretiens
- [x] Système de dialogues avec profils de personnages et mensonges détectables
- [x] Personnages récurrents du cabinet, briefings
- [x] Fraudes classiques ventes / achats / trésorerie ; niveaux 21-40

### J4 — Format moyen et long
- [x] Fausses pistes, anomalies multiples, stocks, immobilisations, personnel
- [x] Choix de l'opinion ; niveaux 41-80
- [x] Parties liées et registre BCE fictif

### J5 — Cas réels et modes
- [x] Niveaux 81-100 et fil rouge Orion Trading
- [x] Partie rapide, Grand dossier, Défi du jour, Mode infini
- [x] Statistiques et écran « Points faibles »

### J6 — Finitions
- [x] Équilibrage des coûts et budgets
- [x] Accessibilité, performance, polish visuel
- [ ] Relecture du contenu par Gauthier (tous les `À VÉRIFIER` levés) — liste dans `PROGRESS.md`

### J7 — Apprendre et rejouer
- [x] Fiches d'Hélène (mécaniques) et mini-cours (anomalies), relisibles dans les outils
- [x] « Voir la solution » et explication des erreurs au débrief
- [x] Les 8 anomalies restantes du §9 ; 21 niveaux « bis » ; chapitre Associé (101-120)
- [ ] Relecture par Gauthier des nouveaux textes et des nouveaux `À VÉRIFIER`

---

## 15. Règles de travail pour Claude Code

1. **Début de session** : relis ce fichier et `PROGRESS.md`. Annonce le jalon en cours et propose un **plan court** (5 à 10 lignes) avant de coder.
2. **Petits pas** : une fonctionnalité à la fois, testée avant de passer à la suivante.
3. **Avant de dire « terminé »** : lance `npm test`, `npm run build` et, à partir de J2, `npm run validate-levels`. Tout doit passer.
4. **Exactitude comptable** : si une règle belge (taux, seuil, traitement) est incertaine, n'invente pas. Mets `À VÉRIFIER` dans le code ou le contenu et signale-le à Gauthier.
5. **Git** : Gauthier débute. Gère les commits toi-même avec des messages clairs en français, explique en une phrase ce que tu fais, et **demande avant chaque push**.
6. **Explications** : à la fin de chaque session, résume en langage simple ce qui a changé, comment le tester et la prochaine étape. Mets à jour `PROGRESS.md`.
7. **Interdits** : aucun appel réseau à l'exécution, aucune IA ou API, pas de `Math.random` dans le moteur, pas de PCG français, pas de faits réels inventés.

---

<sub>Projet créé par Gauthier Doumont.</sub>
