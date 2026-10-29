// Fiches d'Hélène : une fiche par mécanique de jeu, et un mini-cours par type d'anomalie, affichés la première fois
// qu'on les rencontre. Textes courts (3 à 6 lignes). Audit Detective — créé par Gauthier Doumont.
import type { AnomalyType } from '../engine/anomalies';

export type Tutorial = { id: string; title: string; lines: string[] };

export type MechanicId =
  | 'bienvenue'
  | 'carnet'
  | 'conclusion'
  | 'sondage'
  | 'pari'
  | 'outils-assistant'
  | 'mensonges'
  | 'benford'
  | 'refus'
  | 'format-moyen'
  | 'inventaire'
  | 'format-long'
  | 'limitation'
  | 'cas-reel';

export const MECHANIC_TUTORIALS: Record<MechanicId, Omit<Tutorial, 'id'>> = {
  bienvenue: {
    title: 'Le dossier et le budget d’heures',
    lines: [
      'Bienvenue chez Vigie & Associés. Un dossier se lit en cinq onglets : Dossier, Procédures, Entretiens, Carnet, Conclusion.',
      'Le Dossier contient les pièces du client (balance, journaux…). Les Procédures en ajoutent d’autres, mais chacune coûte des heures.',
      'En haut à droite : les heures qui restent sur ton budget. Le client ne paie pas les heures en trop, et ton score non plus.',
      'Le seuil de signification, à côté du nom du client, dit à partir de quel montant une anomalie compte vraiment.',
    ],
  },
  carnet: {
    title: 'Le carnet d’indices et les entretiens',
    lines: [
      'Une ligne de document te paraît suspecte ? Épingle-la : elle rejoint ton Carnet.',
      'Dans les Entretiens, chaque question coûte 0,5 h. Une réponse peut aussi s’épingler.',
      'Pas de constat sans preuve : chaque constat de ta conclusion doit s’appuyer sur au moins un indice épinglé pertinent.',
    ],
  },
  conclusion: {
    title: 'Conclure : constats, opinion, étoiles',
    lines: [
      'Pour chaque anomalie : le compte PCMN touché, l’assertion, le montant (±1 %), erreur ou fraude, et l’écriture de correction (débit = crédit).',
      'L’écriture de correction annule ce qui est faux et passe ce qui aurait dû l’être.',
      'Ensuite, l’opinion : sans réserve, avec réserve, négative ou abstention. Et faut-il un paragraphe sur la continuité ?',
      '1 étoile : une anomalie trouvée et la bonne opinion. 2 : tout trouvé. 3 : tout trouvé, dans le budget, sans mon aide.',
      'Bloqué ? Mon indice (onglet Procédures) coûte 10 points. En dernier recours, « Voir la solution » (onglet Conclusion) arrête la partie à 0 étoile.',
    ],
  },
  sondage: {
    title: 'Le sondage de factures',
    lines: [
      'Nouvelle procédure : le sondage. Tu choisis toi-même les factures d’achat à examiner, 1 h par lot de 5 pièces.',
      'Choisis avec une idée en tête : montants ronds ou inhabituels, fournisseurs peu connus, fin d’exercice.',
      'La facture originale montre ce que le journal ne dit pas : taux de TVA, adresse de livraison, IBAN, description.',
    ],
  },
  pari: {
    title: 'Le pari de Maxime',
    lines: [
      'Maxime, notre senior, adore parier sur ton temps. S’il annonce un nombre d’heures, essaie de faire mieux.',
      'Le pari ne change pas ton score. Mais gagner un café contre Maxime, ça n’a pas de prix.',
    ],
  },
  'outils-assistant': {
    title: 'Ta nouvelle boîte à outils',
    lines: [
      'Assistant, tu as accès à de nouvelles procédures :',
      'Cut-off (factures de fin d’année ↔ bons de livraison) et recherche de dettes non comptabilisées (paiements de janvier-février).',
      'Circularisation clients, confirmation bancaire : des preuves externes, demandées et reçues directement par nous (ISA 505).',
      'Lecture des PV et du courrier, contrôle de la paie, recherche à la BCE (qui dirige les tiers ?).',
      'Une preuve externe vaut plus qu’une preuve interne. Choisis selon ce que tu soupçonnes.',
    ],
  },
  mensonges: {
    title: 'Erreur ou fraude : les clients peuvent mentir',
    lines: [
      'À partir d’ici, certaines anomalies sont volontaires. Et ceux qui les ont commises ne vont pas te le dire.',
      'Une réponse ne colle pas avec une pièce ? Utilise « Confronter » dans l’entretien, avec l’indice du carnet qui la contredit (0,5 h).',
      'Avec la bonne preuve, la personne avoue. L’aveu s’épingle aussi.',
      'Fraude = intention de tromper ou de s’enrichir. Sans trace d’intention, c’est une erreur. N’accuse pas à la légère.',
    ],
  },
  benford: {
    title: 'Les outils d’Inès : la loi de Benford',
    lines: [
      'Inès a passé toutes les factures d’achat au crible de la loi de Benford (1 h).',
      'Dans des montants naturels, le premier chiffre est « 1 » dans environ 30 % des cas, « 9 » dans moins de 5 %.',
      'Un excès de montants juste sous un seuil d’approbation, ou un chiffre surreprésenté, signale des montants fabriqués.',
      'Benford montre où regarder, pas ce qui s’est passé. Il faut ensuite une preuve sur pièce.',
    ],
  },
  refus: {
    title: 'Quand le client refuse de corriger',
    lines: [
      'Le briefing le dit : la gérance refuse de modifier ses comptes.',
      'Une anomalie significative non corrigée empêche une opinion sans réserve (ISA 705).',
      'Localisée : opinion avec réserve. Significative et diffuse : opinion négative.',
      'Sous le seuil de signification, une anomalie non corrigée ne change pas l’opinion. Mais elle reste un constat.',
    ],
  },
  'format-moyen': {
    title: 'Dossiers moyens : fausses pistes',
    lines: [
      'Les dossiers s’épaississent : plus de pièces, et parfois deux anomalies.',
      'Attention aux fausses pistes : une variation inhabituelle a souvent une explication honnête, écrite quelque part (contrat, PV, embauche…).',
      'Accuser à tort coûte 15 points par constat. Avant de conclure, cherche le document qui explique… ou qui confirme.',
    ],
  },
  inventaire: {
    title: 'Inventaire physique et contrats',
    lines: [
      'Observation de l’inventaire (4 h) : tu reçois la liste d’inventaire du client ET notre propre comptage du 31/12 (ISA 501).',
      'Compare-les article par article. Regarde aussi les observations du comptage et la date du dernier mouvement.',
      'Revue des contrats (2 h) : engagements, conditions de prix, clauses inhabituelles, signataires.',
    ],
  },
  'format-long': {
    title: 'Dossiers longs : l’opinion devient délicate',
    lines: [
      'Superviseur, tu signes presque. Plusieurs anomalies, des parties liées, et une opinion à bien peser.',
      'Continuité (ISA 570) : pertes, dettes échues, banque qui hésite ? Si l’annexe décrit l’incertitude, paragraphe d’observation. Si elle la cache, réserve en plus.',
      'Abstention : quand tu ne peux pas réunir assez de preuves et que l’effet est diffus (ex. : lettre d’affirmation refusée, ISA 580).',
      'Négative : anomalies non corrigées significatives et diffuses.',
    ],
  },
  limitation: {
    title: 'Limitation de l’étendue des travaux',
    lines: [
      'Parfois, une preuve est impossible à obtenir : inventaire du 31/12 auquel on n’a pas assisté, lettre d’affirmation refusée…',
      'Ce n’est pas une anomalie dans les comptes, mais une limitation de tes travaux (ISA 705).',
      'Effet limité à un poste : opinion avec réserve. Effet diffus (toute la comptabilité est en doute) : abstention.',
    ],
  },
  'cas-reel': {
    title: 'Dossiers inspirés d’affaires réelles',
    lines: [
      'Réviseur, tes prochains dossiers reprennent le mécanisme de grandes fraudes comptables, à l’échelle d’une PME belge.',
      'Pendant la partie, tout est fictif et anonymisé. L’affaire réelle t’est révélée au débrief, avec ses sources.',
      'Les montages sont plus élaborés : sociétés écrans, allers-retours de trésorerie, confirmations truquées.',
    ],
  },
};

/** Mini-cours présenté avant le premier dossier où l'anomalie apparaît seule. */
export const ANOMALY_NOTIONS: Record<AnomalyType, Omit<Tutorial, 'id'>> = {
  'duplicate-purchase': {
    title: 'Notion : la facture comptabilisée deux fois',
    lines: [
      'Une même facture fournisseur encodée deux fois (version mail et version papier, par exemple).',
      'Indices : même numéro de facture deux fois au journal, fournisseur qui garde un solde alors qu’il a été payé.',
      'Comptes : 604 (ou 61) et 411 surévalués, 440 surévalué. Correction : contrepasser le second encodage.',
      'Assertion : existence (une charge et une dette en trop). Le plus souvent une erreur.',
    ],
  },
  'wrong-vat-rate': {
    title: 'Notion : le mauvais taux de TVA',
    lines: [
      'Taux belges : 21 % (taux normal), 12 %, 6 % (biens de première nécessité, certains services), 0 %.',
      'Indice : TVA ÷ montant HTVA ne donne pas le taux prévu pour le produit. Vérifie sur la facture originale.',
      'Comptes : 411 (TVA à récupérer) faux. L’écart reste aussi sur le 440 après paiement.',
      'Assertion : évaluation (l’opération existe, le montant est faux). En général une erreur.',
    ],
  },
  'restaurant-vat': {
    title: 'Notion : la TVA sur les frais de restaurant',
    lines: [
      'En Belgique, la TVA sur les frais de restaurant et de réception n’est pas déductible.',
      'Le montant TVA comprise doit rester en charge (61). Mettre la TVA en 411 crée une créance qui n’existe pas.',
      'Correction : débit 61, crédit 411, pour le montant de TVA.',
      'Assertion : existence (créance de TVA inexistante). Une erreur de règle fiscale (ISA 250).',
    ],
  },
  'debit-credit-inversion': {
    title: 'Notion : l’inversion débit / crédit',
    lines: [
      'Une note de crédit fournisseur diminue les achats. Encodée comme une facture, elle les augmente.',
      'L’effet est double : il faut annuler le mauvais encodage ET passer le bon, soit deux fois le montant.',
      'Comptes : 604, 411 et 440, chacun corrigé du double.',
      'Assertion : existence (achats et dette en trop). Une erreur d’encodage.',
    ],
  },
  'missing-depreciation': {
    title: 'Notion : l’amortissement oublié ou mal calculé',
    lines: [
      'Chaque immobilisation s’amortit sur sa durée d’utilisation, prorata temporis en jours la première année.',
      'Indice : le tableau des immobilisations calcule une dotation que le 6302 ne reprend pas, ou une durée inhabituelle.',
      'Correction : débit 6302 (dotation), crédit 2x9 (amortissements actés).',
      'Assertion : évaluation (l’actif est compté trop haut). En général une erreur (ISA 540).',
    ],
  },
  'capex-expensed': {
    title: 'Notion : l’investissement passé en charges',
    lines: [
      'Un équipement durable utilisé plusieurs années est une immobilisation (classe 2), pas une charge d’entretien.',
      'Indice : une « charge d’entretien » d’un montant inhabituel, dont la facture décrit un bien neuf.',
      'Correction : activer en 23 ou 24, sortir la charge du 61, puis acter l’amortissement prorata temporis.',
      'Assertion : présentation (mauvais classement). Une erreur d’imputation.',
    ],
  },
  'fictitious-sale': {
    title: 'Notion : la vente fictive de fin d’exercice',
    lines: [
      'Une facture de vente émise juste avant le 31/12 pour gonfler le chiffre d’affaires, sans livraison réelle.',
      'Indices : pas de bon de livraison, note de crédit qui l’annule en janvier, client qui ne confirme pas.',
      'Correction : contrepasser la vente (débit 700 et 451, crédit 400).',
      'Assertion : existence. C’est une fraude (ISA 240). Le test de cut-off et la circularisation la trahissent.',
    ],
  },
  'early-revenue': {
    title: 'Notion : le produit reconnu trop tôt',
    lines: [
      'Une vente se rattache à l’exercice de la livraison (ou de la prestation), pas à celui de la commande.',
      'Indice : facture de décembre, bon de livraison de janvier.',
      'Correction : reporter le produit, débit 700, crédit 493 (produits à reporter). La TVA reste due à la date de facture.',
      'Assertion : séparation des exercices (cut-off). Souvent une erreur.',
    ],
  },
  'doubtful-receivable': {
    title: 'Notion : la créance douteuse',
    lines: [
      'Un client en faillite ne paiera sans doute pas. La créance doit être isolée et dépréciée.',
      'Indices : courrier du curateur, statut au registre BCE, factures impayées depuis longtemps.',
      'Correction : 407 (créances douteuses) au débit, 400 au crédit ; réduction de valeur 634 / 409.',
      'Assertion : évaluation. En général une erreur de prudence (ISA 540).',
    ],
  },
  'fictitious-supplier': {
    title: 'Notion : le fournisseur fictif',
    lines: [
      'Un employé crée un faux fournisseur et se fait payer ses factures sur son propre compte.',
      'Indices : IBAN du fournisseur identique à celui d’un employé (journal de paie), société inconnue à la BCE, montants juste sous un seuil d’approbation.',
      'Correction : annuler la charge et la TVA déduite ; l’argent sorti devient une créance sur l’employé (416).',
      'Assertion : existence. C’est une fraude (détournement).',
    ],
  },
  'unrecorded-invoice': {
    title: 'Notion : la dette omise',
    lines: [
      'Une facture reçue avant le 31/12 et jamais encodée : la dette manque au bilan.',
      'Indices : paiement en janvier d’une facture datée de décembre ; fournisseur qui confirme un solde plus élevé.',
      'Correction : passer la facture (débit 604 et 411, crédit 440).',
      'Assertion : exhaustivité (il manque quelque chose). C’est l’inverse de l’existence.',
    ],
  },
  'private-expense': {
    title: 'Notion : la dépense privée passée en société',
    lines: [
      'Un achat personnel du dirigeant payé et comptabilisé par la société.',
      'Indices : adresse de livraison au domicile, objet sans lien avec l’activité.',
      'Correction : sortir la charge et la TVA déduite ; le montant TVA comprise devient une créance sur le dirigeant (416).',
      'Assertion : existence (pas de charge professionnelle). C’est une fraude.',
    ],
  },
  'fictitious-bank-account': {
    title: 'Notion : le compte bancaire fictif',
    lines: [
      'Un compte d’épargne au bilan… que la banque ne connaît pas.',
      'Seule une confirmation bancaire demandée et reçue directement par le réviseur le prouve (ISA 505).',
      'Correction : annuler l’actif (55) et le produit qui l’a créé.',
      'Assertion : existence. C’est une fraude (mécanisme Parmalat).',
    ],
  },
  'personal-transfer': {
    title: 'Notion : les virements vers un compte privé',
    lines: [
      'Des virements vers le compte personnel d’un dirigeant, déguisés en honoraires.',
      'Indices : charge sans facture, bénéficiaire sur le relevé bancaire = personne physique de la société.',
      'Correction : sortir la charge (61), constater une créance sur la personne (416).',
      'Assertion : existence. C’est une fraude.',
    ],
  },
  'inflated-stock': {
    title: 'Notion : le stock gonflé',
    lines: [
      'Le stock final augmente le résultat. Le gonfler est la façon la plus simple d’embellir une marge.',
      'Indice : la liste d’inventaire du client affiche plus que ce qui a été réellement compté au 31/12.',
      'Correction : diminuer le stock (34) par la variation des stocks (609).',
      'Assertion : existence. Souvent une fraude (ISA 501).',
    ],
  },
  'obsolete-stock': {
    title: 'Notion : le stock obsolète',
    lines: [
      'Un stock qui ne se vend plus vaut moins que son coût : il faut une réduction de valeur.',
      'Indices : dernier mouvement très ancien, état constaté au comptage (emballages abîmés, modèles dépassés).',
      'Correction : débit 631 (réductions de valeur sur stocks), crédit 349 (réductions de valeur actées).',
      'Assertion : évaluation. En général une erreur (ISA 540).',
    ],
  },
  'capitalized-expenses': {
    title: 'Notion : les charges activées',
    lines: [
      'Des réparations ordinaires inscrites en immobilisations pour gonfler le résultat.',
      'Indices : le compte 23 augmente, mais les factures décrivent de l’entretien, sans nouveau bien au tableau des immobilisations.',
      'Correction : sortir l’actif (23) et remettre la charge (61).',
      'Assertion : existence (l’actif n’existe pas). C’est une fraude (mécanisme WorldCom).',
    ],
  },
  'ghost-employee': {
    title: 'Notion : l’employé fantôme',
    lines: [
      'Un salaire versé à une personne qui ne travaille pas pour la société.',
      'Indices : nom au journal de paie mais absent du registre du personnel (pas de Dimona), IBAN identique à celui d’un autre employé.',
      'Correction : sortir les rémunérations (62), constater une créance sur l’auteur (416).',
      'Assertion : existence. C’est une fraude.',
    ],
  },
  'unrecorded-social-debt': {
    title: 'Notion : la dette sociale omise',
    lines: [
      'Les cotisations ONSS de décembre sont dues au 31/12, même si elles se paient en janvier.',
      'Indice : paiement ONSS de janvier plus élevé que le solde du 454 au 31/12.',
      'Correction : débit 621 (cotisations patronales), crédit 454 (ONSS).',
      'Assertion : exhaustivité. En général une erreur de clôture.',
    ],
  },
  'unrecorded-provision': {
    title: 'Notion : le litige non provisionné',
    lines: [
      'Une obligation probable, née avant la clôture et estimable, doit être provisionnée.',
      'Indices : PV qui parlent d’un procès, courrier d’avocat qui juge une condamnation probable.',
      'Correction : débit 637 (dotation aux provisions), crédit 16 (provisions pour risques et charges).',
      'Assertion : exhaustivité. Fraude si la gérance connaissait le risque et l’a caché.',
    ],
  },
  'related-party-undisclosed': {
    title: 'Notion : les parties liées non mentionnées',
    lines: [
      'Une partie liée : société ou personne qui contrôle l’entité ou que l’entité contrôle (dirigeants, leurs sociétés…).',
      'Indices : même nom de dirigeant à la BCE pour le client et un fournisseur, contrat signé des deux côtés, prix hors marché.',
      'Pas d’écriture : les montants sont comptabilisés, mais l’information doit figurer dans l’annexe. Dans le formulaire, choisis « aucune écriture ».',
      'Assertion : présentation (ISA 550).',
    ],
  },
  'circular-sales': {
    title: 'Notion : les ventes circulaires',
    lines: [
      'La société « vend » à une entité liée, qui paie avec l’argent que la société vient de lui avancer.',
      'Indices : client récent dirigé par la gérance, avance de trésorerie juste avant l’encaissement, lettre annexe permettant de tout rendre.',
      'Correction : annuler la vente (700, 451) et l’avance (416). La trésorerie ne change pas.',
      'Assertion : existence. C’est une fraude.',
    ],
  },
  'overstated-rebates': {
    title: 'Notion : les remises fournisseurs surévaluées',
    lines: [
      'Les ristournes de fin d’année diminuent les achats. En gonfler le montant améliore la marge.',
      'Indice : le produit à recevoir (404) ne correspond pas au taux prévu par l’accord commercial.',
      'Correction : ramener le 404 au montant contractuel et remettre la différence en achats (604).',
      'Assertion : évaluation. C’est une fraude.',
    ],
  },
  'disguised-loan': {
    title: 'Notion : l’emprunt déguisé',
    lines: [
      'Un financement remboursable présenté comme un produit, via une société de projet.',
      'Indice : la convention prévoit un remboursement ; la « contrepartie » est dirigée par la gérance.',
      'Correction : sortir le produit (74) et inscrire la dette (48). Les garanties données vont hors bilan.',
      'Assertion : présentation. C’est une fraude.',
    ],
  },
  'fictitious-escrow': {
    title: 'Notion : les fonds fictifs chez un tiers',
    lines: [
      'Des fonds prétendument détenus par un fiduciaire, qui n’existent pas.',
      'Seule une confirmation écrite envoyée par nous, directement au tiers, a de la valeur (ISA 505).',
      'Correction : annuler l’actif et le produit qui l’a créé.',
      'Assertion : existence. C’est une fraude.',
    ],
  },
};
