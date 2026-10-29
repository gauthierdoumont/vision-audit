# Avancement — Audit Detective

## État : jalons J0 à J7 réalisés — reste la relecture du contenu par Gauthier

Tout est testé (`npm test` : 1138 tests), construit (`npm run build`) et validé (`npm run validate-levels` : 141 niveaux).

### Nouveautés J7 (apprendre et rejouer)
- **Fiches d'Hélène** : une fiche par mécanique (14), affichée au briefing la première fois ; un **mini-cours** par type d'anomalie (33) avant son niveau d'introduction. Relecture dans Outils › Fiches ; « Revoir toutes les fiches » dans les Réglages.
- **Voir la solution** (onglet Conclusion, avec confirmation) : partie arrêtée à 0 étoile, niveau suivant non débloqué.
- **Explication des erreurs** au débrief : pour chaque critère, ta réponse, l'attendu et le pourquoi (TVA comprise, montant d'un autre compte, écriture inversée ou incomplète, assertion, erreur/fraude) ; anomalie manquée : où la chercher ; faux positifs et opinion commentés.
- **8 nouvelles anomalies** : lapping, note de crédit non autorisée, facture payée deux fois, cut-off sur les stocks, bien mis au rebut resté à l'actif, rapprochement bancaire arrangé, heures supplémentaires gonflées, régularisation TVA non comptabilisée.
- **21 niveaux « bis »** (7 bis, 9 bis… 96 bis) et **chapitre Associé** (101-120). Ta progression est conservée : un niveau déjà réussi reste ouvert.
- **Correctif** : le paiement « TVA — déclaration du 4e trimestre » (opérations de janvier) incluait à tort la déclaration du 3e trimestre.

### Ce que contient le jeu
- **Campagne de 120 niveaux + 21 niveaux « bis »** en 6 chapitres : Stagiaire (erreurs simples), Assistant (fraudes classiques, mensonges), Senior (format moyen, fausses pistes), Superviseur (format long, opinions délicates), Réviseur (affaires réelles et dénouement Orion Trading), Associé (dossiers les plus épineux). Le niveau 1 est écrit à la main ; les autres sont générés à partir d’une graine.
- **Moteur** (`src/engine`) : 10 secteurs, exercice complet (achats, ventes, paie, TVA, immobilisations, stock), 33 types d’anomalies avec écriture de correction et traces, fausses pistes, scénarios (limitation, continuité), documents réalistes, opinion attendue calculée.
- **Partie** : 15 procédures d'audit (dont sondage au choix, inventaire, BCE, Benford), entretiens à profils avec mensonges et confrontation, carnet d'indices, conclusion (compte, assertion, montant, erreur/fraude, écriture ou mention en annexe, opinion, continuité), score et débrief pédagogique.
- **Cabinet** : Hélène (briefings, indices), Maxime (paris), Inès (Benford) ; grades et promotions ; fil rouge Orion Trading.
- **Modes** : partie rapide, grand dossier, défi du jour, mode infini, partie ciblée « Points faibles » ; statistiques par cycle et par assertion.
- **Outils** : calculatrice (raccourcis TVA), glossaire (assertions, ISA, notions), aide-mémoire PCMN. **Réglages** : thème clair/sombre/système, taille du texte.
- **Qualité** : hors ligne (PWA), sauvegarde automatique (IndexedDB), audit d'accessibilité axe-core sans violation WCAG A/AA (clair et sombre).

### Garanties testées automatiquement
- Écritures et balance équilibrées ; TVA cohérente ; compte 550 = relevé ; soldes par tiers cohérents.
- **Livres + écriture de correction = comptabilité vraie**, compte par compte, pour chaque anomalie.
- Chaque anomalie : ≥ 2 traces existantes, révélée par une procédure dans le budget ; chaque mensonge contredit par un indice réel ; chaque fausse piste justifiée par un document.
- Déterminisme (même graine = même dossier) ; pas de `Math.random` dans le moteur.
- Chacun des 100 niveaux est résolu en 100/100 et 3 étoiles par un joueur parfait simulé.

### Décisions
- Dépôt `vision-audit` : l'app est publiée sous `/vision-audit/`.
- Anomalies générées placées au 4e trimestre (TVA du T4 non encore déclarée au 31/12).
- Fraudes avec sortie d'argent : la « vérité » comptabilise une créance sur la personne (416).
- Chemin optimal = procédure la moins chère qui révèle chaque anomalie + 0,5 h d'entretien ; budget = max(chemin ; 2,5 h) × marge (×2 en difficulté 1 → ×1,2 en difficulté 10). Simulation : un joueur réaliste tient dans le budget sur 99 niveaux sur 100.
- Score : efficience 20/20 jusqu'au chemin optimal, 10/20 au budget, 0 au-delà ; pénalités : faux positif −15, indice −10, mauvaise opinion −15.
- Opinion : refus de corriger → réserve si significatif ; négative si ≥ 3 anomalies significatives ou total ≥ 10 × le seuil (règle simplifiée du jeu) ; abstention si la lettre d'affirmation est refusée (ISA 580) ; continuité décrite → paragraphe ; masquée → réserve + mention.
- Compte saisi accepté s'il est le compte attendu ou un compte parent d'au moins 2 chiffres.
- Procédures ajoutées au §7 : revue des immobilisations, lecture du courrier juridique (avec les PV).

### Vérifié sur sources (mentions levées)
- TVA horeca : 12 % repas sur place, 21 % boissons ([b2brouter](https://www.b2brouter.net/be/les-differents-taux-de-tva-en-belgique/), proposition de loi [dekamer.be](https://www.dekamer.be/FLWB/PDF/54/0534/54K0534001.pdf)).
- Compte 110 « Apport disponible hors capital » ([CNC](https://www.cnc-cbn.be/fr/node/2250)).
- Sonnette d'alarme SRL : art. 5:153 CSA ([IRE](https://www.ibr-ire.be/fr/reglementation-et-publications/doctrine/notes-techniques/note-technique-detail-page/la-proc-dure-de-sonnette-d-alarme-dans-la-srl-fr-quence-d-application)).
- Prorata temporis en jours obligatoire la première année depuis 2020 ([myfid](https://www.myfid.be/ressources/fiscalite/amortissement/)) — **le moteur a été corrigé** (il comptait en mois).
- Durées généralement admises : informatique 3 ans, mobilier 10 ans, matériel roulant 5 ans ([myfid](https://www.myfid.be/ressources/fiscalite/amortissement/)).
- ONSS : 13,07 % travailleur, 25 % patronal de base pour un employé ([Securex](https://www.securex.be/fr/premier-engagement/couts-a-prevoir/calcul-cotisations-onss)).

### Points `À VÉRIFIER` restants (relecture de Gauthier)
- Fiches des affaires réelles (`src/content/real-cases.ts`) : faits recoupés, sources affichées au débrief ; à relire avant de lever la mention (règle du cahier des charges).
- TVA horeca sur les boissons non alcoolisées : projet de passage à 12 % (2025) à confirmer.
- Durées d'amortissement des installations et machines (5 à 10 ans dans le jeu).
- Créance douteuse : réduction de valeur sur le HTVA, la TVA étant récupérable (base légale à confirmer).
- Parties liées : obligation de mention en annexe pour une petite société (selon la CNC, elle visait surtout les sociétés dépassant les critères de taille).
- Seuil de signification à 0,5-1 % du chiffre d'affaires ; stock obsolète valorisé à 20 % du coût (hypothèses du jeu).
- Simplifications assumées : précompte forfaitaire 22 %, pas d'impôt des sociétés, pas de réductions ONSS.

### Nouveaux points `À VÉRIFIER` (J7)
- Bien mis au rebut : amortissement jusqu'à la date de sortie (prorata en jours) et moins-value en 663 (ou 660 selon la pratique).
- Facture payée deux fois : présentation du solde débiteur fournisseur parmi les créances au bilan.
- Régularisation TVA après contrôle : comptes 640 (charge), 451 (TVA) et 452 (amende) ; amende fixée à environ 10 % dans le jeu (barème réel à confirmer).
- Heures supplémentaires : taux horaire = brut mensuel ÷ (38 h × 13 ÷ 3) ; sursalaire de 50 % (100 % dimanche et jours fériés).
- Cut-off sur les stocks : facture à recevoir (444) comptabilisée hors TVA, la TVA étant déduite avec la facture en janvier.

### À faire par Gauthier
1. Activer GitHub Pages : Settings → Pages → Source = GitHub Actions.
2. Installer l'app sur téléphone Android et PC Windows, tester le mode avion.
3. Relire les points `À VÉRIFIER` ci-dessus, ainsi que les fiches d'Hélène (`src/content/tutorials.ts`) et les textes des nouvelles anomalies (`src/content/anomaly-texts.ts`).

<sub>Projet créé par Gauthier Doumont.</sub>
