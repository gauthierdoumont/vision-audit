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
  /**
   * Réplique de la personne concernée. Si `confession` existe, `answer` est un mensonge : la personne avoue
   * quand on la confronte à un indice qui la contredit.
   */
  topic: {
    question: (p: Params) => string;
    answer: (p: Params, variant?: string) => string[];
    confession?: (p: Params, variant?: string) => string[];
  };
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
        ? `« ${p.asset} » est amorti sur ${p.wrongYears} ans au lieu de ${p.years} ans (durée usuelle généralement admise). Dotation actée : ${p.booked} € au lieu de ${p.truth} €.`
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
      `Il fallait l’activer en ${p.account} pour ${p.cost} € et l’amortir sur ${p.years} ans, prorata temporis ${p.days} jours sur ${p.daysInYear} : ${p.depreciation} € de dotation.`,
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
  'fictitious-sale': {
    levelTitles: ['La vente du réveillon', 'Un chiffre d’affaires trop beau', 'Le cadeau de fin d’année'],
    title: (p) => `Vente fictive : facture ${p.number} à ${p.client} (${p.total} €)`,
    explanation: (p) => [
      `La facture ${p.number} du ${p.date} (${p.total} TVAC) ne correspond à aucune livraison : aucun bon de livraison, et une note de crédit l’annule le ${p.cancelled}.`,
      `Le chiffre d’affaires (700) est gonflé de ${p.base} €, la créance client (400) de ${p.total} € et la TVA due (451) de ${p.vat} €.`,
      'Assertion touchée : l’existence. La vente n’a jamais eu lieu.',
      'C’est une fraude : la gérance voulait embellir le résultat avant de rencontrer la banque.',
    ],
    hint: ['Une vente sans bon de livraison, annulée juste après la clôture… Regarde autour du 31/12.'],
    focus: 'les ventes de fin d’année',
    topic: {
      question: () => 'Comment se sont passées les ventes de décembre ?',
      answer: (p) => [`Très bien ! ${p.client} nous a passé une grosse commande juste avant Noël.`, 'Les marchandises sont parties avant les fêtes, évidemment.'],
      confession: (p) => [
        'Bon… Il n’y a jamais eu de livraison.',
        `Le banquier voulait voir un meilleur chiffre au 31/12. ${p.client} a accepté qu’on annule en janvier.`,
      ],
    },
    isa: 'ISA 240 (fraude), ISA 505 (confirmations externes), ISA 560 (événements postérieurs)',
  },
  'early-revenue': {
    levelTitles: ['Trop pressé de facturer', 'Le colis de janvier', 'Un produit en avance'],
    title: (p) => `Vente ${p.number} (${p.client}) livrée en janvier mais comptée en ${p.year}`,
    explanation: (p) => [
      `La facture ${p.number} est datée du ${p.date}, mais la livraison a eu lieu le ${p.delivery}.`,
      `Le produit (${p.base} € HTVA) appartient à l’exercice suivant : il faut le reporter (493 Produits à reporter).`,
      'Assertion touchée : la séparation des exercices (cut-off).',
      'C’est une erreur : on facture à la commande, sans vérifier la date de livraison. La TVA, elle, reste due à la date de la facture.',
    ],
    hint: ['Rapproche les factures de fin décembre des bons de livraison.'],
    focus: 'les ventes de fin d’année',
    topic: {
      question: () => 'Comment fixez-vous la date des factures de vente ?',
      answer: (p) => ['On facture dès que le client signe le bon de commande, c’est plus simple.', `Pour ${p.client}, la livraison a dû glisser en janvier, à cause des congés.`],
    },
    isa: 'ISA 500 (éléments probants), ISA 330 (procédures en réponse aux risques)',
  },
  'doubtful-receivable': {
    levelTitles: ['Le client qui ne paie plus', 'Une créance en sursis', 'Faillite au pied du sapin'],
    title: (p) => `Créance sur ${p.client} (en faillite) non dépréciée`,
    explanation: (p) => [
      `${p.client} a été déclaré en faillite le ${p.date}. ${p.count} facture(s) restent impayées pour ${p.total} € TVAC.`,
      'La créance doit passer en créances douteuses (407) et faire l’objet d’une réduction de valeur (634 / 409).',
      `La réduction de valeur porte sur le montant HTVA (${p.base} €) : la TVA pourra être récupérée auprès de l’État (À VÉRIFIER).`,
      'Assertion touchée : l’évaluation. C’est une erreur de prudence : le client espérait encore être payé.',
    ],
    hint: ['Une faillite se lit dans le courrier et au registre des entreprises. Et dans la balance âgée des clients.'],
    focus: 'les créances clients',
    topic: {
      question: () => 'Avez-vous des clients en difficulté de paiement ?',
      answer: (p) => [`${p.client} ne répond plus depuis novembre.`, 'On a reçu un courrier d’un curateur, je crois. Mais on garde espoir, ce sont de vieux clients.'],
    },
    isa: 'ISA 540 (estimations comptables), ISA 560 (événements postérieurs)',
  },
  'fictitious-supplier': {
    levelTitles: ['Le consultant fantôme', 'Des conseils hors de prix', 'Juste sous le seuil'],
    title: (p) => `Fournisseur fictif ${p.supplier} : ${p.total} € versés sur le compte du comptable`,
    explanation: (p) => [
      `${p.supplier} ${p.registry === 'coquille' ? 'est une coquille vide (boîte postale, aucune activité réelle)' : 'n’existe pas à la BCE'}. Ses ${p.count} factures « de conseil » sont payées sur le compte ${p.iban}, celui de ${p.accountant} (journal de paie).`,
      'Les montants sont juste sous le seuil de 5 000 € HTVA qui impose la signature de la gérance : un classique.',
      `Correction : sortir les charges (613) et la TVA déduite (411), et constater une créance de ${p.total} € sur l’employé (416).`,
      'Assertion touchée : l’existence. C’est une fraude (détournement).',
    ],
    hint: ['À qui appartient le compte bancaire de ce fournisseur de conseil ? Compare avec la paie.'],
    focus: 'les honoraires',
    topic: {
      question: () => 'Faites-vous appel à des consultants externes ?',
      answer: (p) => [`Oui, ${p.supplier}, pour du conseil en organisation. La gérance est au courant.`, 'Ils travaillent à distance, on les voit peu.'],
      confession: (p) => [
        'C’est… c’est mon compte, oui.',
        `J’avais des dettes. ${p.supplier}, c’est moi. Je comptais tout rembourser.`,
      ],
    },
    isa: 'ISA 240 (fraude), ISA 550 (parties liées), ISA 500 (éléments probants)',
  },
  'unrecorded-invoice': {
    levelTitles: ['La facture oubliée', 'Une dette sous le tapis', 'Égarée en décembre'],
    title: (p) => `Facture ${p.number} (${p.supplier}) de décembre non comptabilisée`,
    explanation: (p) => [
      `La facture ${p.number} du ${p.date} (${p.total} TVAC) n’a jamais été encodée. Elle a pourtant été payée en janvier.`,
      'Les achats, la TVA à récupérer et surtout les dettes fournisseurs sont sous-évalués.',
      'Assertion touchée : l’exhaustivité. Une dette existante manque au bilan.',
      'C’est une erreur : facture égarée, pas de contrôle de séquence.',
    ],
    hint: ['Les paiements de janvier concernent des dettes de décembre. Sont-elles toutes au bilan ?'],
    focus: 'les dettes fournisseurs',
    topic: {
      question: () => 'Toutes les factures de décembre sont-elles encodées ?',
      answer: (p) => ['Normalement oui… Enfin, il y avait une sacrée pile de courrier à Noël.', `Celle de ${p.supplier} ? Je n’ai plus la certitude de l’avoir vue passer.`],
    },
    isa: 'ISA 500 (éléments probants), ISA 505 (confirmations externes), ISA 560 (événements postérieurs)',
  },
  'private-expense': {
    levelTitles: ['Un cadeau pour la maison', 'La société paie tout', 'Livré à domicile'],
    title: (p) => `Dépense privée de ${p.manager} passée en charges : ${p.item}`,
    explanation: (p) => [
      `La facture de ${p.shop} (${p.item}, ${p.total} TVAC) est livrée au domicile de ${p.manager}. Rien à voir avec l’activité.`,
      `La charge (611) et la TVA déduite (${p.vat} €) doivent être annulées : c’est une créance sur ${p.manager} (416).`,
      'Assertion touchée : l’existence. Il n’y a pas de charge professionnelle réelle.',
      'C’est une fraude : avantage personnel déguisé (et fiscalement, un avantage de toute nature à analyser).',
    ],
    hint: ['Lis l’adresse de livraison des factures de petit matériel.'],
    focus: 'les frais généraux',
    topic: {
      question: () => 'Quel matériel avez-vous acheté pour la société au 4e trimestre ?',
      answer: (p) => [`Un peu d’équipement, dont un achat chez ${p.shop} pour la salle de réunion.`, 'Il faut recevoir les clients correctement. Je ne vois pas où est le problème.'],
      confession: () => ['Bon. Il est chez moi.', 'Tout le monde fait ça, non ? Je le rembourserai à la société.'],
    },
    isa: 'ISA 240 (fraude), ISA 250 (respect des textes légaux)',
  },
  'fictitious-bank-account': {
    levelTitles: ['Le compte épargne introuvable', 'Une banque qui ne vous connaît pas', 'Le trésor imaginaire'],
    title: (p) => `Compte épargne fictif chez ${p.bank} (${p.amount} €)`,
    explanation: (p) => [
      `La balance affiche ${p.amount} € sur un « compte épargne » chez ${p.bank}. La banque répond qu’aucun compte n’existe au nom de la société.`,
      'Le montant a été passé en produits divers (74) : le résultat est gonflé d’autant.',
      'Assertion touchée : l’existence. C’est une fraude, sur le modèle de Parmalat (et plus tard Wirecard).',
      'Leçon : une confirmation bancaire se demande et se reçoit directement, jamais par l’intermédiaire du client.',
    ],
    hint: ['Demande aux banques elles-mêmes quels comptes la société possède.'],
    focus: 'la trésorerie',
    topic: {
      question: () => 'Comment placez-vous la trésorerie disponible ?',
      answer: (p) => [`Sur un compte épargne chez ${p.bank}. Un placement sûr, je m’en occupe personnellement.`, 'Les relevés ? La banque a du retard, vous les aurez la semaine prochaine.'],
      confession: (p) => ['… D’accord. Il n’y a pas de compte.', `Sans ces ${p.amount} €, on affichait une perte. La banque nous aurait coupé le crédit.`],
    },
    isa: 'ISA 240 (fraude), ISA 505 (confirmations externes)',
  },
  'personal-transfer': {
    levelTitles: ['Des honoraires bien personnels', 'Le virement maison', 'Conseil à domicile'],
    title: (p) => `Virements vers le compte privé de ${p.manager} comptés en honoraires (${p.total} €)`,
    explanation: (p) => [
      `${p.count} virements vers le compte ${p.iban}, au nom de ${p.manager}, sont comptabilisés en honoraires (613), sans aucune facture.`,
      `Ce ne sont pas des charges : c’est une créance de ${p.total} € sur ${p.manager} (416).`,
      'Assertion touchée : l’existence. C’est une fraude : prélèvements privés déguisés.',
      'Leçon : une charge sans facture, payée à une personne physique, se vérifie toujours sur le relevé bancaire.',
    ],
    hint: ['Les honoraires ont bondi. À qui sont-ils versés, d’après la banque ?'],
    focus: 'la trésorerie',
    topic: {
      question: () => 'Qui sont les conseillers payés en honoraires au 4e trimestre ?',
      answer: () => ['Des consultants externes. Je n’ai pas les noms en tête.', 'Mon comptable vous enverra les factures.'],
      confession: () => ['Ces virements, c’est pour moi. Je ne touchais aucune rémunération de gérance cette année.', 'Je croyais que ça passait en honoraires…'],
    },
    isa: 'ISA 240 (fraude), ISA 550 (parties liées)',
  },
  'inflated-stock': {
    levelTitles: ['Des sacs en trop', 'L’inventaire enchanté', 'Compter, c’est trop facile'],
    title: (p) => `Stock gonflé à l’inventaire (+${p.diff} €)`,
    explanation: (p) => [
      `La liste d’inventaire ne correspond pas au comptage : ${p.items}.`,
      `Le stock (340) et le résultat (via 609) sont surévalués de ${p.diff} €.`,
      'Assertion touchée : l’existence. Ces marchandises ne sont pas dans l’entrepôt.',
      'C’est une fraude : gonfler le stock final est le moyen le plus simple d’améliorer une marge.',
    ],
    hint: ['Compare la liste d’inventaire du client avec ce que l’on a réellement compté.'],
    focus: 'les stocks',
    topic: {
      question: () => 'Comment avez-vous établi la liste d’inventaire au 31/12 ?',
      answer: () => ['Comme chaque année : comptage complet, par moi-même. Tout est rigoureux.', 'Vous n’allez pas recompter mes sacs, quand même ?'],
      confession: () => ['Bon. J’ai « arrondi » quelques quantités.', 'Sans ça, la marge s’effondrait et la banque nous tombait dessus.'],
    },
    isa: 'ISA 501 (inventaire physique), ISA 240 (fraude)',
  },
  'obsolete-stock': {
    levelTitles: ['La réserve oubliée', 'Ça ne se vend plus', 'Le stock poussiéreux'],
    title: (p) => `Stock obsolète non déprécié : ${p.item}`,
    explanation: (p) => [
      `« ${p.item} » (${p.quantity} unités, ${p.value} € au coût) n’a plus bougé depuis ${p.since}. Au comptage, les emballages sont jaunis.`,
      `Sa valeur de réalisation est bien inférieure au coût : réduction de valeur de ${p.writeDown} € (631 / 349), sur base d’une revente estimée à 20 % du coût (À VÉRIFIER).`,
      'Assertion touchée : l’évaluation. Le stock existe, mais il vaut beaucoup moins.',
      'C’est une erreur : on garde les articles au prix d’achat « au cas où ».',
    ],
    hint: ['Regarde la date du dernier mouvement de chaque article.'],
    focus: 'les stocks',
    topic: {
      question: () => 'Y a-t-il des articles qui ne se vendent plus ?',
      answer: (p) => [`Il y a « ${p.item} », au fond de l’entrepôt. Personne n’en veut depuis deux ans.`, 'On le garde, on ne sait jamais.'],
    },
    isa: 'ISA 501 (inventaire physique), ISA 540 (estimations comptables)',
  },
  'capitalized-expenses': {
    levelTitles: ['Réparer, c’est investir ?', 'L’actif qui n’en était pas un', 'Le coup de WorldCom'],
    title: (p) => `Réparations activées en immobilisations (${p.total} €)`,
    explanation: (p) => [
      `${p.count} factures de ${p.supplier} décrivent des réparations ordinaires, mais elles ont été passées en 2300 (installations).`,
      'Une réparation qui ne fait que maintenir l’état d’un bien est une charge (611), pas un investissement.',
      `Le résultat et l’actif sont gonflés de ${p.total} €. Assertion touchée : l’existence (l’actif n’existe pas).`,
      'C’est une fraude, sur le modèle de WorldCom : transformer des charges en investissements pour embellir le résultat.',
    ],
    hint: ['Le compte 2300 a bougé. Que disent les factures ? Et le tableau des immobilisations ?'],
    focus: 'les immobilisations',
    topic: {
      question: () => 'Quels investissements avez-vous faits au 4e trimestre ?',
      answer: () => ['Une modernisation importante des installations. Ça valorise la société.', 'Le comptable a tout passé en immobilisations, comme il se doit.'],
      confession: () => ['Ce sont des réparations, oui.', 'Mais en charges, le résultat tombait dans le rouge…'],
    },
    isa: 'ISA 240 (fraude), ISA 500 (éléments probants)',
  },
  'ghost-employee': {
    levelTitles: ['Le collègue invisible', 'Un salaire pour personne', 'Le fantôme de la paie'],
    title: (p) => `Employé fantôme : ${p.ghost} (${p.total} €)`,
    explanation: (p) => [
      `${p.ghost} figure au journal de paie depuis octobre, sans inscription au registre du personnel ni déclaration Dimona.`,
      `Son salaire net (${p.net} € par mois) est versé sur le compte ${p.iban}, celui de ${p.accountant}.`,
      `Correction : sortir ${p.total} € des rémunérations (620) et constater une créance sur l’employé fautif (416).`,
      'Assertion touchée : l’existence. C’est une fraude.',
    ],
    hint: ['Tous les noms du journal de paie sont-ils au registre du personnel ? Et les comptes bancaires ?'],
    focus: 'la paie',
    topic: {
      question: () => 'Y a-t-il eu des embauches cette année ?',
      answer: (p) => [`Oui, ${p.ghost}, en octobre. Un renfort pour la fin d’année.`, 'Le dossier est en ordre, je l’ai fait moi-même.'],
      confession: () => ['Cette personne n’existe pas.', 'Je gère la paie sans personne d’autre depuis des années. Personne ne vérifiait.'],
    },
    isa: 'ISA 240 (fraude), ISA 330 (procédures en réponse aux risques)',
  },
  'unrecorded-social-debt': {
    levelTitles: ['L’ONSS oublié', 'La dette sociale', 'Décembre coûte plus cher'],
    title: (p) => `Cotisations patronales de décembre non comptabilisées (${p.amount} €)`,
    explanation: (p) => [
      `Les cotisations patronales de décembre (${p.amount} €) n’ont pas été encodées. Elles ont pourtant été payées le 15 janvier.`,
      'La charge (621) et la dette ONSS (454) sont sous-évaluées.',
      'Assertion touchée : l’exhaustivité. Une dette existante manque au bilan.',
      'C’est une erreur de clôture : l’encodage de la paie de décembre a été fait à moitié.',
    ],
    hint: ['Compare le paiement ONSS de janvier au solde du compte 454 au 31/12.'],
    focus: 'les dettes sociales',
    topic: {
      question: () => 'Comment comptabilisez-vous la paie de décembre ?',
      answer: () => ['Je reçois le décompte du secrétariat social et j’encode tout.', 'Enfin, cette année le décompte patronal est arrivé tard… je pensais l’avoir passé.'],
    },
    isa: 'ISA 500 (éléments probants), ISA 560 (événements postérieurs)',
  },
  'unrecorded-provision': {
    levelTitles: ['Le procès oublié', 'Ça ne nous concerne pas', 'L’avocate avait prévenu'],
    title: (p) => `Litige non provisionné (${p.likely} €)`,
    explanation: (p) => [
      `Procès en cours : ${p.claimant} réclame ${p.claimed} € pour ${p.reason}. L’avocate juge une condamnation probable, autour de ${p.likely} €.`,
      'Une dette probable, au montant estimable, née avant la clôture : il faut une provision (637 / 164).',
      'Assertion touchée : l’exhaustivité. Une obligation existante manque au bilan.',
      'C’est une fraude : la gérance connaissait le litige (PV, courrier) et l’a passé sous silence.',
    ],
    hint: ['Lis les PV et le courrier de l’avocate.'],
    focus: 'les litiges',
    topic: {
      question: () => 'La société a-t-elle des litiges en cours ?',
      answer: () => ['Aucun. Nous n’avons jamais eu de problème avec personne.'],
      confession: (p) => [`D’accord, il y a ce dossier avec ${p.claimant}.`, 'Je pensais attendre le jugement avant d’en parler.'],
    },
    isa: 'ISA 501 (litiges), ISA 580 (déclarations écrites), ISA 240 (fraude)',
  },
  'related-party-undisclosed': {
    levelTitles: ['Le fournisseur de la famille', 'Entre soi', 'Des prix d’ami… pour qui ?'],
    title: (p) => `Transactions avec ${p.supplier}, dirigée par ${p.manager}, non mentionnées`,
    explanation: (p) => [
      `${p.supplier} est dirigée par ${p.manager} (registre BCE). Le contrat-cadre, signé par la même personne pour les deux sociétés, fixe des prix bien au-dessus du marché.`,
      `Ces transactions (${p.volume} € HTVA en ${p.year}) ne sont pas conclues aux conditions du marché. Les sociétés qui dépassent les critères de taille doivent les mentionner dans l’annexe ; pour une petite société, l’obligation reste À VÉRIFIER selon le schéma utilisé.`,
      'Pas d’écriture à passer : c’est une anomalie de présentation (information). En droit des sociétés, la procédure de conflit d’intérêts aurait aussi dû être suivie.',
      `C’est une fraude : ${p.manager} tire profit des deux côtés de la transaction.`,
    ],
    hint: ['Qui dirige les fournisseurs ? Un tour à la BCE et dans les contrats s’impose.'],
    focus: 'les parties liées',
    topic: {
      question: () => 'Avez-vous des liens personnels avec vos fournisseurs ?',
      answer: () => ['Aucun. Nous choisissons nos fournisseurs sur des critères purement professionnels.'],
      confession: (p) => [`${p.supplier}, c’est ma société, oui.`, 'Je ne pensais pas que ça devait figurer quelque part.'],
    },
    isa: 'ISA 550 (parties liées), ISA 240 (fraude)',
  },
  'circular-sales': {
    levelTitles: ['Le grand carrousel', 'Des clients trop proches', 'L’argent qui revient'],
    title: (p) => `Ventes circulaires à ${p.partner} (${p.total} €)`,
    explanation: (p) => [
      `${p.partner}, créée l’an dernier, est dirigée par la gérance. Elle « achète » des licences (${p.base} € HTVA) et paie avec… l’argent que la société vient de lui avancer.`,
      'Une lettre annexe lui permet de tout rendre sans frais : il n’y a pas de vente, seulement un aller-retour de trésorerie.',
      'Correction : annuler la vente (700, 451) et l’avance (416) ; la trésorerie ne change pas.',
      'Assertion touchée : l’existence. C’est une fraude, sur le mécanisme de Lernout & Hauspie.',
    ],
    hint: ['Qui est ce nouveau client ? D’où vient l’argent qui a payé sa facture ?'],
    focus: 'les ventes',
    topic: {
      question: () => 'Qui sont vos nouveaux clients cette année ?',
      answer: (p) => [`${p.partner}, un distributeur prometteur. Il a cru en nous dès le premier jour.`, 'Il a payé rubis sur l’ongle, vous l’avez vu à la banque.'],
      confession: () => ['C’est ma structure, oui. Et l’argent venait de chez nous.', 'Il fallait montrer de la croissance aux investisseurs.'],
    },
    isa: 'ISA 240 (fraude), ISA 550 (parties liées), ISA 505 (confirmations externes)',
  },
  'overstated-rebates': {
    levelTitles: ['Des remises trop généreuses', 'La ristourne miracle', 'Le coup d’Ahold'],
    title: (p) => `Ristourne fournisseur surévaluée (${p.supplier}, +${p.diff} €)`,
    explanation: (p) => [
      `L’accord avec ${p.supplier} prévoit ${p.rate} % du volume, soit ${p.real} €. La société a comptabilisé ${p.booked} € à recevoir.`,
      `Les achats (604) sont minorés et les produits à recevoir (404) gonflés de ${p.diff} €.`,
      'Assertion touchée : l’évaluation. C’est une fraude, sur le mécanisme d’Ahold / US Foodservice.',
      'Leçon : une remise se vérifie dans le contrat et auprès du fournisseur, pas dans le tableur de la direction.',
    ],
    hint: ['Les produits à recevoir (404) ont une source : l’accord commercial. Fais le calcul.'],
    focus: 'les achats',
    topic: {
      question: (p) => `Comment calculez-vous la ristourne de ${p.supplier} ?`,
      answer: () => ['Selon nos négociations. Le fournisseur nous a promis un geste important cette année.', 'Ce n’est pas écrit partout, mais c’est acquis.'],
      confession: () => ['L’accord dit bien ce que vous lisez.', 'J’ai anticipé des remises que nous n’obtiendrons sans doute jamais.'],
    },
    isa: 'ISA 240 (fraude), ISA 505 (confirmations externes), ISA 540 (estimations)',
  },
  'disguised-loan': {
    levelTitles: ['Le partenaire providentiel', 'Une dette déguisée', 'Le montage hors bilan'],
    title: (p) => `Emprunt via ${p.vehicle} présenté comme un produit (${p.amount} €)`,
    explanation: (p) => [
      `Les ${p.amount} € reçus de ${p.vehicle}, société de projet dirigée par la gérance, sont un prêt remboursable : la convention le dit.`,
      'Ils ont été comptabilisés en produits (74) : le résultat est gonflé et une dette disparaît du bilan.',
      'Correction : reclasser en dette (489). La garantie donnée à la banque est en plus un engagement à mentionner hors bilan.',
      'Assertion touchée : la présentation. C’est une fraude, sur le mécanisme des entités ad hoc d’Enron.',
    ],
    hint: ['Une « indemnité » versée par une société inconnue ? Lis la convention qui la justifie.'],
    focus: 'les produits exceptionnels',
    topic: {
      question: () => 'D’où viennent les autres produits d’exploitation de décembre ?',
      answer: (p) => [`D’une indemnité de partenariat versée par ${p.vehicle}. Un excellent accord.`, 'Ce n’est pas remboursable, évidemment.'],
      confession: () => ['C’est un prêt. Je l’ai fait passer par une société à part.', 'Au bilan, la dette aurait effrayé la banque.'],
    },
    isa: 'ISA 240 (fraude), ISA 550 (parties liées)',
  },
  'fictitious-escrow': {
    levelTitles: ['L’argent du fiduciaire', 'Les milliards d’Asie (en petit)', 'Un compte de tiers introuvable'],
    title: (p) => `Fonds chez le fiduciaire ${p.trustee} inexistants (${p.amount} €)`,
    explanation: (p) => [
      `La balance montre ${p.amount} € « détenus » par ${p.trustee}. Interrogé directement, le fiduciaire ne connaît pas la société.`,
      'Les fonds n’existent pas : le produit (74) et l’actif (5502) doivent être annulés.',
      'Assertion touchée : l’existence. C’est une fraude, sur le mécanisme de Wirecard.',
      'Leçon : une confirmation obtenue par l’intermédiaire du client ne vaut rien ; on écrit soi-même au tiers.',
    ],
    hint: ['Demande directement au fiduciaire de confirmer les fonds.'],
    focus: 'la trésorerie',
    topic: {
      question: () => 'Que représente le compte de tiers au bilan ?',
      answer: (p) => [`Les commissions de nos partenaires de paiement, conservées par ${p.trustee}. C’est la norme du secteur.`, 'Les attestations ? Je vous les transmets moi-même, c’est plus rapide.'],
      confession: () => ['Il n’y a rien sur ce compte.', 'Les attestations, c’est moi qui les ai faites.'],
    },
    isa: 'ISA 240 (fraude), ISA 505 (confirmations externes)',
  },
  lapping: {
    levelTitles: ['Le jeu des chaises musicales', 'Un paiement en cache un autre', 'Décalage horaire'],
    title: (p) => `Encaissement de ${p.clientA} détourné et masqué par celui de ${p.clientB} (${p.totalA} €)`,
    explanation: (p) => [
      `${p.clientA} a payé sa facture ${p.numberA} (${p.totalA} €) le ${p.dateA}. L’argent n’est jamais arrivé sur le compte de la société.`,
      `Pour le cacher, le paiement de ${p.clientB} (${p.totalB} €, reçu le ${p.dateB}) a été imputé sur la facture de ${p.clientA}. ${p.clientB} paraît donc encore devoir sa facture ${p.numberB}.`,
      `Les créances clients (400) sont surévaluées de ${p.totalA} € : c’est en réalité une créance sur ${p.accountant} (416).`,
      'Assertion touchée : l’existence. C’est une fraude (lapping) : chaque nouveau paiement bouche le trou du précédent.',
    ],
    hint: ['Un client qui reste débiteur alors que la banque montre son paiement ? Demande-lui ce qu’il a payé, et quand.'],
    focus: 'les encaissements clients',
    topic: {
      question: (p) => `Pourquoi ${p.clientB} doit-il encore la facture ${p.numberB} ?`,
      answer: (p) => [`${p.clientB} ? Un mauvais payeur, je l’ai relancé deux fois.`, 'Il finira par payer, comme d’habitude.'],
      confession: (p) => [
        `Il a payé, oui… J’ai mis son paiement sur la facture de ${p.clientA}.`,
        `Le paiement de ${p.clientA}, je l’avais gardé. Je comptais le remettre avant la clôture.`,
      ],
    },
    isa: 'ISA 240 (fraude), ISA 505 (confirmations externes), ISA 500 (éléments probants)',
  },
  'unauthorized-credit-note': {
    levelTitles: ['Un geste trop commercial', 'La note de crédit de trop', 'Remise sans signature'],
    title: (p) => `Note de crédit ${p.creditNote} non autorisée (${p.client}, ${p.total} €)`,
    explanation: (p) => [
      `Le ${p.date}, une note de crédit ${p.creditNote} annule la facture ${p.number} de ${p.client}. Personne à la gérance ne l’a signée, alors que le PV l’exige.`,
      `Or ${p.client} confirme avoir payé la facture en entier, en espèces, le ${p.paid}. L’argent est resté chez ${p.seller}.`,
      `Correction : annuler la note de crédit (ventes 700 : ${p.base} € ; TVA 451 : ${p.vat} €) et constater une créance de ${p.total} € sur ${p.seller} (416).`,
      'Assertion touchée : l’existence (la note de crédit ne correspond à aucune remise réelle). C’est une fraude.',
    ],
    hint: ['Une note de crédit doit être autorisée. Et le client, qu’en dit-il ?'],
    focus: 'les notes de crédit',
    topic: {
      question: (p) => `Pourquoi avoir accordé la note de crédit ${p.creditNote} à ${p.client} ?`,
      answer: (p) => [`${p.client} était mécontent d’une livraison. Un petit geste commercial, rien de plus.`, 'Je n’ai pas voulu déranger la gérance pour ça.'],
      confession: (p) => [`Bon… ${p.client} avait payé, en liquide, directement à moi.`, 'J’ai fait la note de crédit pour que son compte tombe à zéro. Je rembourserai.'],
    },
    isa: 'ISA 240 (fraude), ISA 505 (confirmations externes), ISA 330 (procédures en réponse aux risques)',
  },
  'double-payment': {
    levelTitles: ['Deux fois plutôt qu’une', 'Le virement en écho', 'Payé, repayé'],
    title: (p) => `Facture ${p.number} (${p.supplier}) payée deux fois, puis passée en charges`,
    explanation: (p) => [
      `La facture ${p.number} (${p.total} € TVAC) a été payée le ${p.first}, puis une seconde fois le ${p.second}.`,
      `${p.supplier} nous doit donc ${p.total} € (il nous les rembourse le ${p.refund}). Au lieu de le réclamer, le comptable a « régularisé » ce solde en charges (604).`,
      'Correction : annuler la régularisation (débit 440, crédit 604). Le solde débiteur du fournisseur est une créance (à présenter parmi les créances au bilan, À VÉRIFIER).',
      'Assertion touchée : l’existence (une charge qui ne correspond à aucun achat). C’est une erreur : double paiement, puis solution de facilité.',
    ],
    hint: ['Le relevé bancaire : un même numéro de facture apparaît-il deux fois ?'],
    focus: 'les paiements fournisseurs',
    topic: {
      question: (p) => `Que s’est-il passé avec le compte de ${p.supplier} en fin d’année ?`,
      answer: (p) => [`Il était débiteur, je ne comprenais pas pourquoi. J’ai soldé l’écart en charges pour que la balance soit propre.`, `La ${p.number} ? Ah… on l’a peut-être payée deux fois.`],
    },
    isa: 'ISA 500 (éléments probants), ISA 505 (confirmations externes), ISA 560 (événements postérieurs)',
  },
  'stock-cutoff': {
    levelTitles: ['Livré le 30 décembre', 'Un camion avant le réveillon', 'Dans le stock, pas dans les dettes'],
    title: (p) => `Marchandises du 30/12 (${p.supplier}) en stock, mais achat non comptabilisé (${p.value} €)`,
    explanation: (p) => [
      `Le 30/12, ${p.supplier} a livré ${p.quantity} × « ${p.item} » (bon ${p.receipt}). Ces marchandises sont à nous et ont été comptées dans le stock au 31/12.`,
      `La facture n’est arrivée qu’en janvier : l’achat n’a pas été comptabilisé en ${p.year}. Le stock augmente le résultat, mais le coût correspondant manque.`,
      `Correction : prendre en charge l’achat et une facture à recevoir, hors TVA (débit 604, crédit 444 : ${p.value} €). La TVA (${p.vat} €) sera déduite avec la facture, en janvier.`,
      'Assertion touchée : la séparation des exercices (cut-off). C’est une erreur.',
    ],
    hint: ['Les dernières entrées en stock de décembre ont-elles toutes leur facture ? Regarde les paiements de janvier.'],
    focus: 'les stocks de fin d’année',
    topic: {
      question: (p) => `La livraison de ${p.supplier} du 30/12, vous l’avez comptée ?`,
      answer: (p) => [`Bien sûr, elle était dans le magasin le 31 au matin. Bon ${p.receipt}.`, 'La facture ? Elle est arrivée après le Nouvel An, c’est la compta qui s’en occupe.'],
    },
    isa: 'ISA 501 (inventaire physique), ISA 500 (éléments probants), ISA 560 (événements postérieurs)',
  },
  'scrapped-asset': {
    levelTitles: ['Une machine qui n’existe plus', 'Au rebut, mais au bilan', 'Le fantôme de l’atelier'],
    title: (p) => `« ${p.asset} » mis au rebut le ${p.date} mais toujours à l’actif`,
    explanation: (p) => [
      `« ${p.asset} » a été mis au rebut le ${p.date} (PV, facture d’enlèvement de ${p.recycler}). Il figure pourtant toujours au tableau des immobilisations, amorti toute l’année.`,
      `Il fallait l’amortir jusqu’à sa sortie : ${p.days} jours sur ${p.daysInYear}, soit ${p.toDate} € au lieu de ${p.full} € (prorata en jours, À VÉRIFIER).`,
      `Puis sortir le bien : valeur d’acquisition ${p.cost} € (crédit ${p.account}), amortissements actés (débit ${p.depreciationAccount}) ; la valeur nette restante, ${p.net} €, est une moins-value (663, ou 660 selon la pratique, À VÉRIFIER).`,
      'Assertion touchée : l’existence. C’est une erreur : le registre des immobilisations n’a pas été mis à jour.',
    ],
    hint: ['Une facture d’enlèvement de matériel ? Compare-la au tableau des immobilisations.'],
    focus: 'les immobilisations',
    topic: {
      question: (p) => `« ${p.asset} » est-il toujours utilisé ?`,
      answer: (p) => [`Celui-là ? Il est parti chez ${p.recycler} en octobre, il était fichu.`, 'Le tableau des immobilisations ? Je le reprends d’une année à l’autre…'],
    },
    isa: 'ISA 500 (éléments probants), ISA 540 (estimations comptables)',
  },
  'rigged-reconciliation': {
    levelTitles: ['Le chèque qui n’arrive jamais', 'Rapprochement créatif', 'En cours d’encaissement…'],
    title: (p) => `Rapprochement bancaire arrangé : chèque de ${p.client} détourné (${p.total} €)`,
    explanation: (p) => [
      `Le rapprochement du client justifie l’écart avec la banque par un chèque de ${p.client} (${p.total} €) « remis le 31/12 ». La banque ne l’a jamais reçu.`,
      `${p.client} confirme avoir payé la facture ${p.number} par chèque le ${p.cheque}. Ce chèque a été encaissé ailleurs, par ${p.accountant}.`,
      `Le compte 550 est surévalué de ${p.total} € : c’est une créance sur ${p.accountant} (débit 416, crédit 550).`,
      'Assertion touchée : l’existence. C’est une fraude : un poste de rapprochement se vérifie toujours sur les relevés suivants et auprès de la banque.',
    ],
    hint: ['Le rapprochement bancaire : chaque poste en suspens doit se retrouver sur les relevés de janvier.'],
    focus: 'la trésorerie',
    topic: {
      question: (p) => `Le chèque de ${p.client} en cours d’encaissement au 31/12, où en est-il ?`,
      answer: () => ['Déposé le 31 au soir. Les banques sont lentes entre les fêtes, vous savez.', 'Il apparaîtra sur le relevé de janvier.'],
      confession: (p) => [`Il n’apparaîtra pas. Le chèque de ${p.client}, je l’ai encaissé sur mon compte.`, 'J’ai mis l’écart en « chèque en transit » pour gagner du temps.'],
    },
    isa: 'ISA 240 (fraude), ISA 505 (confirmations externes), ISA 500 (éléments probants)',
  },
  'inflated-overtime': {
    levelTitles: ['Des heures très supplémentaires', 'La pointeuse ne ment pas', 'Décembre chargé… sur le papier'],
    title: (p) => `Heures supplémentaires gonflées : ${p.name} (${p.booked} h payées, ${p.real} h pointées)`,
    explanation: (p) => [
      `En décembre, ${p.name} s’est fait payer ${p.booked} heures supplémentaires. La pointeuse n’en enregistre que ${p.real}.`,
      `Les ${p.extra} heures en trop (au taux de ${p.rate} € + 50 % de sursalaire) gonflent les rémunérations (620) de ${p.gross} € et les cotisations patronales (621) de ${p.employer} €.`,
      `Correction : annuler ces montants et les dettes ONSS et précompte qui s’y rattachent (pas encore payées au 31/12) ; le net versé en trop, ${p.net} €, est une créance sur ${p.name} (416).`,
      'Assertion touchée : l’existence (des prestations jamais effectuées). C’est une fraude.',
    ],
    hint: ['Compare les heures payées dans le journal de paie aux heures pointées.'],
    focus: 'la paie',
    topic: {
      question: () => 'Beaucoup d’heures supplémentaires en décembre au magasin ?',
      answer: () => ['Énormément ! Les fêtes, les inventaires… Je n’ai pas compté mes heures.', 'C’est moi qui encode les relevés, comme toujours.'],
      confession: (p) => [`D’accord… ${p.real} heures, pas ${p.booked}.`, 'J’encode moi-même mes relevés. Personne ne vérifiait.'],
    },
    isa: 'ISA 240 (fraude), ISA 500 (éléments probants), ISA 330 (procédures en réponse aux risques)',
  },
  'unrecorded-tax-debt': {
    levelTitles: ['Le fisc est passé', 'Une dette qui attend janvier', 'Contrôle TVA, et après ?'],
    title: (p) => `Régularisation TVA après contrôle non comptabilisée (${p.total} €)`,
    explanation: (p) => [
      `Le ${p.date}, ${p.manager} a signé l’accord de régularisation du contrôle TVA : ${p.vat} € de TVA à reverser (déduction sur les voitures limitée à 50 %) et ${p.fine} € d’amende.`,
      `La dette existe au 31/12, même si elle se paie en janvier. Il faut la comptabiliser en ${p.year} : débit 640 (${p.total} €), crédit 451 (${p.vat} €) et 452 (${p.fine} €) — comptes À VÉRIFIER selon le plan du client.`,
      'Assertion touchée : l’exhaustivité. Une dette fiscale manque au bilan.',
      'C’est une erreur : la gérance pensait que « payé en janvier » voulait dire « charge de janvier ».',
    ],
    hint: ['Lis le courrier reçu en fin d’année, et les paiements de janvier.'],
    focus: 'les dettes fiscales',
    topic: {
      question: () => 'Avez-vous eu un contrôle fiscal cette année ?',
      answer: (p) => ['Oui, la TVA est passée en décembre. On a trouvé un accord.', `On paie en janvier, donc c’est pour les comptes ${Number(p.year) + 1}, non ?`],
    },
    isa: 'ISA 250 (respect des textes légaux), ISA 560 (événements postérieurs), ISA 500 (éléments probants)',
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
