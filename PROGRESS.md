# Avancement — Audit Detective

## Jalon en cours : J3 → J6 en autonomie (validation de Gauthier à la fin)

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

### J2
- [x] RNG à graine (`src/engine/rng.ts`, mulberry32 + hachage cyrb53), sans `Math.random` (testé)
- [x] Génération d'entreprise et d'un exercice complet (`company.ts`, `ledger.ts`) : achats, notes de crédit, frais généraux, repas d'affaires, investissement, ventes (comptoir ou factures), salaires, TVA trimestrielle, inventaire, amortissements
- [x] Grand livre, balance (`balance.ts`) et documents (`documents.ts`) : balance générale, journal des achats T4, balance fournisseurs, factures, revue analytique N/N-1, relevés bancaires T4, confirmations fournisseurs, tableau des immobilisations
- [x] Les 6 erreurs simples (`anomalies.ts`) : facture en double, mauvais taux de TVA, TVA déduite sur restaurant, inversion débit/crédit (note de crédit), amortissement oublié ou mauvaise durée, investissement passé en charges
- [x] Sondage de factures : le joueur choisit son échantillon (1 h par lot de 5)
- [x] Invariants testés (`validate.ts`) : écritures et balance équilibrées, TVA cohérente, 550 = relevé, soldes par tiers, ≥ 2 traces, détectable dans le budget, chemin optimal × marge, déterminisme, et surtout « livres + correction = vérité »
- [x] `npm run validate-levels` : 20 niveaux valides
- [x] Niveaux 1-20 jouables (niveau 1 fait main, 2-20 générés) ; chaque niveau est résolu en 100/100 par un test automatique ; niveau 7 joué dans Chromium (100/100)
- 4 secteurs pour l'instant : boulangerie, garage, PME informatique, horeca

### J3
- [x] Moteur étendu : le « monde » du client (personnel et IBAN, registre BCE fictif, PV, courriers, livraisons, opérations de janvier-février N+1, stock détaillé, contrats)
- [x] 10 secteurs (ajout : grossiste alimentaire, construction, e-commerce, transport, cabinet médical exempté de TVA, commerce de détail)
- [x] Nouvelles procédures : circularisation clients, cut-off, dettes non comptabilisées, lecture des PV, contrôle de la paie, confirmation bancaire, recherche BCE, Benford (Inès, dès le niveau 25)
- [x] 8 fraudes et erreurs classiques : vente fictive, CA reconnu trop tôt, créance douteuse non dépréciée, fournisseur fictif (IBAN du comptable), facture non comptabilisée, dépense privée du gérant, compte bancaire fictif, virements vers le compte du gérant
- [x] Dialogues : profils (coopératif, nerveux, évasif, arrogant), le fraudeur ment, confrontation avec un indice du carnet → aveu épinglable
- [x] Cabinet : grades (Stagiaire → Réviseur), promotions annoncées par Hélène, paris de Maxime (résultat au débrief), Inès et son outil Benford
- [x] Niveaux 21-40 ; accueil en chapitres repliables ; niveau 21 joué dans Chromium avec confrontation (97/100)

### J4
- [x] 7 nouvelles anomalies : stock gonflé, stock obsolète, réparations activées (WorldCom), employé fantôme, cotisations patronales oubliées, litige non provisionné, parties liées non mentionnées (constat « annexe seulement »)
- [x] Observation de l'inventaire physique (4 h) : liste d'inventaire du client et feuille de comptage ; revue des contrats
- [x] Fausses pistes justifiées par un document (contrat d'entretien, acompte, embauche réelle, forte croissance), expliquées au débrief
- [x] Anomalies multiples (jusqu'à 4) sans collision ; formats moyen (41-60) et long (61-80)
- [x] Opinions : réserve, négative, abstention (lettre d'affirmation refusée), limitation (inventaire non observé), continuité (décrite ou masquée)
- [x] Niveaux 41-80 ; partie du niveau 47 jouée dans Chromium

### J5
- [x] 4 montages inspirés d'affaires réelles : ventes circulaires (Lernout & Hauspie), remises fournisseurs gonflées (Ahold), emprunt déguisé via une société de projet (Enron), fonds fiduciaires fictifs (Wirecard) ; Parmalat, WorldCom et Satyam réutilisent les mécanismes existants
- [x] Fiches « L'affaire réelle » (`src/content/real-cases.ts`), faits recoupés sur le web avec sources affichées au débrief, marquées À VÉRIFIER
- [x] Fil rouge Orion Trading (niveaux 33, 52, 66, 78, 85, 92, 96 ; dénouement au niveau 100)
- [x] Niveaux 81-100 : la campagne compte 100 niveaux, tous valides et résolus en 3 étoiles par le test automatique
- [x] Modes : partie rapide (difficulté 1-4), grand dossier (6-10), défi du jour (graine = date, un essai), mode infini (difficulté adaptative), partie ciblée sur un cycle ; l'identifiant de la partie suffit à la régénérer
- [x] Statistiques par cycle et par assertion, écran « Points faibles »
- [x] IndexedDB version 2 (statistiques et réglages), avec mise à niveau des sauvegardes existantes

### Décisions
- Dépôt `vision-audit` (et non `audit-detective`) : l'app est publiée sous `/vision-audit/`.
- Thème clair/sombre automatique selon le système. Le réglage manuel et la taille de police viendront avec les écrans de jeu.
- Icône : loupe sur un dossier, bleu nuit et ambre (`public/favicon.svg`, PNG générés par `npm run icons`).
- Toutes les anomalies générées sont placées au 4e trimestre : la TVA du T4 n'est pas encore déclarée au 31/12, donc corriger les livres suffit à retrouver la vérité (les déclarations T1-T3 déjà payées ne sont jamais touchées).
- Procédures ajoutées par rapport au §7 : « Revue des immobilisations » (1 h) et « Lecture des PV et du courrier » (inclut les courriers d'avocat ou de curateur).
- Fraudes avec sortie d'argent (fournisseur fictif, virements, dépense privée) : la « vérité » comptabilise une créance sur la personne (416).
- Questions d'entretien générales pour les fraudes (le joueur doit soupçonner), ciblées pour les erreurs du chapitre Stagiaire.
- Budget des niveaux générés : max(chemin optimal ; 2,5 h) × marge de difficulté (×2 → ×1,2), arrondi à la demi-heure.
- Seuil de signification : 0,5 à 1 % du chiffre d'affaires ; écarté de ±20 % du montant de l'anomalie pour éviter les cas ambigus.
- Opinion (`src/engine/scenarios.ts`) : refus de corriger → réserve si significatif ; négative si au moins 3 anomalies significatives ou total ≥ 10 × le seuil (règle simplifiée du jeu, le caractère diffus relève du jugement — ISA 705) ; abstention si la lettre d'affirmation est refusée (ISA 580) ; continuité décrite → paragraphe ; masquée → réserve + mention.
- Compte saisi accepté s'il est le compte attendu ou un compte parent d'au moins 2 chiffres (ex. 23 pour 2300).
- Assertions retenues : existence (double facture, inversion, TVA restaurant), évaluation (taux de TVA, amortissement), présentation (investissement en charges).
- Niveau 1 : réponse attendue = compte 440 (3 392 €, TVAC) ou 604 (3 200 €, HTVA) ; assertion existence ; erreur ; écriture D 440 3 392 / C 604 3 200 / C 411 192 ; opinion sans réserve (client qui corrige), pas de paragraphe continuité.
- Opinion intégrée dès J1 en version simple (nécessaire pour la 1re étoile).
- Score : efficience 20/20 jusqu'au chemin optimal, 10/20 au budget, 0 au-delà. Pénalités : faux positif −15, indice −10, mauvaise opinion −15. Valeurs à équilibrer en J6.
- Les heures peuvent dépasser le budget (barre rouge, efficience 0, pas de 3e étoile) plutôt que bloquer le joueur.

### Points `À VÉRIFIER`
- Taux horeca : 12 % sur les repas servis sur place, 21 % sur les boissons (`src/content/sectors.ts`).
- Durées d'amortissement « usuelles » par type de bien (`sectors.ts`) et prorata temporis au mois.
- Simplifications de paie (`ledger.ts`) : ONSS travailleur 13,07 %, cotisations patronales ~25 %, précompte forfaitaire 22 %.
- Seuil de signification à 0,5-1 % du chiffre d'affaires (`generate.ts`).
- Compte 110 « Apport disponible » pour le capital des SRL (CSA), 100 pour les SA (`pcmn.ts`, `ledger.ts`).
- Choix des assertions par anomalie (voir Décisions).
- Fiches des affaires réelles (Lernout & Hauspie, Parmalat, Wirecard, Ahold, Enron, WorldCom, Satyam) : faits et chiffres à relire avec les sources indiquées.
- Pas d'impôt des sociétés comptabilisé dans les cas générés (simplification).
- Créance douteuse : réduction de valeur sur le montant HTVA (TVA récupérable).
- Stock obsolète : valeur de réalisation estimée à 20 % du coût.
- Parties liées : mention en annexe des transactions hors conditions du marché (seuils et schéma à confirmer).
- Sonnette d'alarme SRL : art. 5:153 CSA.
- Règles déjà utilisées en J1 : TVA 6 % sur la farine, le sucre et le lait ; 21 % sur le nettoyage, les emballages, l'entretien ; TVA non déductible sur les frais de restaurant.

### Prochaine étape
J3 : système de dialogues (profils, mensonges détectables), personnages récurrents du cabinet, fraudes classiques ventes / achats / trésorerie, niveaux 21-40.

<sub>Projet créé par Gauthier Doumont.</sub>
