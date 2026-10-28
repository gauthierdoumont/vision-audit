// Glossaire du joueur : assertions, normes ISA citées dans le jeu et notions clés. Audit Detective — Gauthier Doumont.

export type GlossaryEntry = { term: string; definition: string };

export const ASSERTIONS_GLOSSARY: GlossaryEntry[] = [
  { term: 'Existence', definition: 'Les actifs, dettes, produits et charges comptabilisés correspondent à des éléments ou opérations réels. Exemples : vente fictive, facture en double.' },
  { term: 'Exhaustivité', definition: 'Tout ce qui devait être comptabilisé l’a été. Exemples : facture de décembre oubliée, litige non provisionné.' },
  { term: 'Évaluation', definition: 'Les montants sont corrects : bon taux, bonne valeur, dépréciations nécessaires. Exemples : stock obsolète, créance douteuse.' },
  { term: 'Séparation des exercices', definition: 'Chaque opération est rattachée au bon exercice (cut-off). Exemple : vente facturée en décembre mais livrée en janvier.' },
  { term: 'Droits et obligations', definition: 'La société détient réellement les actifs et doit réellement les dettes inscrites.' },
  { term: 'Présentation', definition: 'Les éléments sont correctement classés et décrits, annexe comprise. Exemples : investissement passé en charges, parties liées non mentionnées.' },
];

export const ISA_GLOSSARY: GlossaryEntry[] = [
  { term: 'ISA 240', definition: 'Fraude : l’auditeur garde un esprit critique et répond au risque d’anomalies intentionnelles.' },
  { term: 'ISA 250', definition: 'Textes légaux et réglementaires : leur non-respect peut avoir un effet sur les comptes (ex. : TVA non déductible).' },
  { term: 'ISA 320', definition: 'Caractère significatif : le seuil de signification guide l’étendue des travaux et l’évaluation des anomalies.' },
  { term: 'ISA 330', definition: 'Procédures d’audit en réponse aux risques évalués.' },
  { term: 'ISA 450', definition: 'Évaluation des anomalies relevées : on les cumule, on demande leur correction, on mesure leur effet.' },
  { term: 'ISA 500', definition: 'Éléments probants : suffisants et appropriés ; une preuve externe vaut plus qu’une preuve interne.' },
  { term: 'ISA 501', definition: 'Considérations particulières : présence à l’inventaire physique, litiges, information sectorielle.' },
  { term: 'ISA 505', definition: 'Confirmations externes : demandées et reçues directement par l’auditeur, jamais via le client.' },
  { term: 'ISA 520', definition: 'Procédures analytiques : comparaisons N/N-1, ratios, attentes.' },
  { term: 'ISA 530', definition: 'Sondages : choisir un échantillon représentatif et en tirer des conclusions.' },
  { term: 'ISA 540', definition: 'Estimations comptables : amortissements, dépréciations, provisions.' },
  { term: 'ISA 550', definition: 'Parties liées : identifier les relations et transactions, vérifier qu’elles sont correctement présentées.' },
  { term: 'ISA 560', definition: 'Événements postérieurs à la clôture : ce qui se passe après le 31/12 peut éclairer la situation au 31/12.' },
  { term: 'ISA 570', definition: 'Continuité d’exploitation : en cas d’incertitude significative, elle doit être décrite dans l’annexe et mentionnée dans le rapport.' },
  { term: 'ISA 580', definition: 'Déclarations écrites (lettre d’affirmation) : sans elles, l’auditeur ne peut pas exprimer d’opinion.' },
  { term: 'ISA 700', definition: 'Opinion sur les comptes : forme et contenu du rapport.' },
  { term: 'ISA 705', definition: 'Opinion modifiée : avec réserve, négative ou abstention, selon la gravité et le caractère diffus.' },
  { term: 'ISA 706', definition: 'Paragraphes d’observation : attirer l’attention sans modifier l’opinion.' },
];

export const NOTIONS_GLOSSARY: GlossaryEntry[] = [
  { term: 'Seuil de signification', definition: 'Montant au-delà duquel une anomalie peut influencer le jugement d’un utilisateur des comptes.' },
  { term: 'Cut-off', definition: 'Test de séparation des exercices autour du 31/12 : factures, livraisons, paiements.' },
  { term: 'Circularisation', definition: 'Demande de confirmation envoyée directement à un tiers (client, fournisseur, banque).' },
  { term: 'Loi de Benford', definition: 'Dans beaucoup de séries réelles, le premier chiffre est « 1 » dans environ 30 % des cas. Un écart peut signaler des montants fabriqués.' },
  { term: 'Opinion avec réserve', definition: 'Anomalie ou limitation significative mais localisée.' },
  { term: 'Opinion négative', definition: 'Anomalies significatives et diffuses : les comptes ne donnent pas une image fidèle.' },
  { term: 'Déclaration d’abstention', definition: 'Impossible de réunir des éléments probants suffisants, avec un effet diffus : pas d’opinion.' },
  { term: 'Partie liée', definition: 'Personne ou société qui contrôle l’entité ou est contrôlée par elle (dirigeants, sociétés des dirigeants…).' },
];
