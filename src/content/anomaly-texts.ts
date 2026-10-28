// Textes du catalogue d'anomalies (titres, explications, indices, entretiens). Les valeurs entre accolades
// viennent du moteur. Audit Detective — créé par Gauthier Doumont.
import type { AnomalyType } from '../engine/anomalies';

type Params = Record<string, string>;

export type AnomalyText = {
  levelTitles: readonly string[];
  title: (p: Params) => string;
  explanation: (p: Params, variant?: string) => string[];
  hint: string[];
  /** Zone que la mentore désigne dans le briefing pour les niveaux faciles. */
  focus: string;
  topic: { question: (p: Params) => string; answer: (p: Params, variant?: string) => string[] };
  isa: string;
};

export const ANOMALY_TEXTS: Record<AnomalyType, AnomalyText> = {
  'duplicate-purchase': {
    levelTitles: ['Une facture, deux encodages', 'Le fournisseur qui comptait double', 'Copie conforme'],
    title: (p) => `Facture ${p.number} (${p.supplier}) comptabilisée deux fois`,
    explanation: (p) => [
      `La facture ${p.number} (${p.total} TVAC) a été encodée le ${p.date} puis à nouveau le ${p.duplicateDate}. Elle n'a été payée qu'une fois.`,
      `Les achats (604) sont gonflés de ${p.base} €, la TVA à récupérer (411) de ${p.vat} € et la dette fournisseur (440) de ${p.total} €.`,
      'Assertion touchée : l’existence. Une partie de la charge et de la dette ne correspond à aucune opération réelle.',
      'C’est une erreur : double réception (PDF et papier), sans intention de tromper.',
    ],
    hint: ['Le journal des achats : compare les numéros de facture fournisseur, ligne par ligne.', 'Puis regarde quel fournisseur affiche encore un solde.'],
    focus: 'les achats',
    topic: {
      question: (p) => `Pourquoi le fournisseur ${p.supplier} a-t-il encore un solde ouvert ?`,
      answer: (p) => [
        `${p.supplier} ? On les paie toujours à l'échéance…`,
        `Attendez, la ${p.number}… je la vois deux fois. Une version mail, une version papier.`,
        'Je n’ai pas fait le rapprochement. Je corrige.',
      ],
    },
    isa: 'ISA 500 (éléments probants), ISA 505 (confirmations externes), ISA 450 (anomalies relevées)',
  },
  'wrong-vat-rate': {
    levelTitles: ['Le taux qui fâche', 'Six ou vingt et un ?', 'Une TVA au mauvais taux'],
    title: (p) => `Facture ${p.number} (${p.supplier}) encodée à ${p.wrongRate} % au lieu de ${p.rate} %`,
    explanation: (p) => [
      `La facture ${p.number} applique ${p.rate} % de TVA (${p.product}). Le comptable a encodé ${p.wrongRate} % : ${p.wrongVat} € au lieu de ${p.vat} €.`,
      `La TVA à récupérer (411) est donc comptée ${p.direction === 'trop' ? 'en trop' : 'en moins'} de ${p.diff} €, et la dette fournisseur (440) garde un écart du même montant après paiement.`,
      'Assertion touchée : l’évaluation. Les opérations existent, mais le montant enregistré est faux.',
      'C’est une erreur d’encodage. La déclaration TVA du 4e trimestre devra en tenir compte.',
    ],
    hint: ['Le journal des achats : calcule TVA ÷ HTVA sur chaque ligne et compare au taux belge du produit.'],
    focus: 'la TVA sur achats',
    topic: {
      question: (p) => `Quel taux de TVA appliquez-vous aux achats chez ${p.supplier} ?`,
      answer: (p) => [
        `Le logiciel propose ${p.wrongRate} % par défaut, je valide en général.`,
        `${p.rate} % sur la facture ? Ah… Je n'ai pas vérifié celle-là.`,
      ],
    },
    isa: 'ISA 500 (éléments probants), ISA 530 (sondages), ISA 450 (anomalies relevées)',
  },
  'restaurant-vat': {
    levelTitles: ['Un dîner bien arrosé', 'L’addition, s’il vous plaît', 'Les repas d’affaires'],
    title: (p) => (p.count === '1' ? 'TVA déduite sur une note de restaurant' : `TVA déduite sur ${p.count} notes de restaurant`),
    explanation: (p) => [
      p.count === '1'
        ? `Au 4e trimestre, une note de restaurant (${p.restaurant}) a été encodée avec sa TVA en 411 : ${p.vat} €.`
        : `Au 4e trimestre, ${p.count} notes de restaurant ont été encodées avec leur TVA en 411 : ${p.vat} € au total.`,
      'En Belgique, la TVA sur les frais de restaurant et de réception n’est pas déductible. Elle fait partie de la charge (TVAC en 61).',
      'Assertion touchée : l’existence. Cette créance de TVA sur l’État n’existe pas.',
      'C’est une erreur de règle fiscale, pas une fraude : les repas sont réels et justifiés.',
    ],
    hint: ['Repère les frais de restaurant dans le journal des achats. Que devient leur TVA ?'],
    focus: 'les frais généraux',
    topic: {
      question: () => 'Comment encodez-vous les notes de restaurant ?',
      answer: () => [
        'Comme les autres factures : la TVA en 411, le reste en charges.',
        'Ce n’est pas comme ça ? On récupère bien la TVA sur le reste…',
      ],
    },
    isa: 'ISA 250 (respect des textes légaux), ISA 500 (éléments probants)',
  },
  'debit-credit-inversion': {
    levelTitles: ['Le monde à l’envers', 'Débit, crédit, même combat ?', 'La note de crédit retournée'],
    title: (p) => `Note de crédit ${p.number} (${p.supplier}) encodée comme une facture`,
    explanation: (p) => [
      `La note de crédit ${p.number} (${p.total} TVAC) devait diminuer les achats. Elle a été encodée à l’envers, comme une facture.`,
      `L’effet est double : il faut annuler l’encodage erroné ET passer la bonne écriture. Les achats sont surévalués de ${p.doubleBase} € et la dette de ${p.doubleTotal} €.`,
      'Assertion touchée : l’existence. Des achats et une dette qui n’existent pas sont comptabilisés.',
      'C’est une erreur d’encodage (inversion débit/crédit).',
    ],
    hint: ['Une note de crédit diminue les achats. Dans le journal, son signe est-il le bon ?'],
    focus: 'les achats',
    topic: {
      question: (p) => `Que s'est-il passé avec ${p.supplier} cet automne ?`,
      answer: (p) => [
        `On leur a renvoyé une livraison abîmée. Ils ont fait une note de crédit, ${p.number}, et nous ont remboursés.`,
        'Je l’ai encodée dans le journal des achats, comme d’habitude.',
      ],
    },
    isa: 'ISA 500 (éléments probants), ISA 505 (confirmations externes), ISA 450 (anomalies relevées)',
  },
  'missing-depreciation': {
    levelTitles: ['L’usure oubliée', 'Le temps qui passe', 'Amortir, c’est mourir un peu'],
    title: (p) => `${p.wrongYears ? 'Amortissement calculé sur une mauvaise durée' : 'Amortissement oublié'} : « ${p.asset} »`,
    explanation: (p, variant) => [
      variant === 'wrong-duration'
        ? `« ${p.asset} » est amorti sur ${p.wrongYears} ans au lieu de ${p.years} ans (durée usuelle, À VÉRIFIER). Dotation actée : ${p.booked} € au lieu de ${p.truth} €.`
        : `La dotation de l’exercice pour « ${p.asset} » (${p.truth} €) figure au tableau des immobilisations mais n’a jamais été comptabilisée.`,
      `Les amortissements (6302) sont sous-évalués de ${p.diff} €, l’actif et le résultat sont surévalués d’autant.`,
      'Assertion touchée : l’évaluation. L’immobilisation est comptée à une valeur trop élevée.',
      'C’est une erreur : oubli ou mauvais paramétrage, sans intention.',
    ],
    hint: ['Compare le tableau des immobilisations aux amortissements comptabilisés (6302).'],
    focus: 'les immobilisations',
    topic: {
      question: () => 'Qui calcule les amortissements de fin d’année ?',
      answer: (p, variant) =>
        variant === 'wrong-duration'
          ? ['C’est moi. Pour les nouvelles machines, j’ai mis la durée par défaut du logiciel.', `${p.wrongYears} ans, ça me semblait prudent…`]
          : ['C’est moi, en décembre. J’ai repris la liste de l’an dernier.', 'J’espère n’avoir rien oublié, c’était la course.'],
    },
    isa: 'ISA 540 (estimations comptables), ISA 500 (éléments probants)',
  },
  'capex-expensed': {
    levelTitles: ['Une machine en charges', 'L’investissement caché', 'Entretien ou investissement ?'],
    title: (p) => `« ${p.asset} » (${p.cost} €) passé en charges au lieu d’être immobilisé`,
    explanation: (p) => [
      `La facture ${p.number} (${p.supplier}) concerne l’achat d’un équipement durable : « ${p.asset} ». Elle a été imputée en 611 (entretien).`,
      `Il fallait l’activer en ${p.account} pour ${p.cost} € et l’amortir sur ${p.years} ans, prorata ${p.months} mois : ${p.depreciation} € de dotation.`,
      `Correction : activer l’actif, sortir la charge du 611, et acter l’amortissement (6302 / ${p.depreciationAccount}).`,
      'Assertion touchée : la présentation (classification). C’est une erreur d’imputation.',
    ],
    hint: ['Le journal des achats : une « charge d’entretien » d’un montant inhabituel, ça se regarde de près.'],
    focus: 'les immobilisations',
    topic: {
      question: (p) => `Qu'avez-vous acheté chez ${p.supplier} ?`,
      answer: (p) => [
        `Du nouveau matériel : « ${p.asset} », installé en fin d'année.`,
        'Je l’ai mise en entretien, c’est du matériel pour l’atelier, non ?',
      ],
    },
    isa: 'ISA 500 (éléments probants), ISA 450 (anomalies relevées)',
  },
};

/** Questions d'entretien sans lien avec l'anomalie (bruit). */
export const GENERIC_TOPICS = [
  {
    question: 'Comment se passe la clôture de l’exercice chez vous ?',
    answer: ['Je m’occupe de tout, avec l’aide de la fiduciaire pour le bilan.', 'Décembre est toujours un peu chargé.'],
  },
  {
    question: 'Y a-t-il eu des changements importants cette année ?',
    answer: ['Pas vraiment. Quelques nouveaux fournisseurs, et on a investi dans du matériel en fin d’année.'],
  },
  {
    question: 'Qui valide les factures avant paiement ?',
    answer: ['La gérance signe les paiements. Moi, j’encode et je prépare les virements.'],
  },
] as const;
