// Campagne : 120 niveaux, plus des niveaux « bis » intercalés. Chapitre « Stagiaire » (1-20) : erreurs simples.
// Le niveau 1 est écrit à la main ; les suivants sont générés à partir de leur graine.
// Audit Detective — créé par Gauthier Doumont.
import type { LevelSpec } from '../../engine/generate';

type Options = Pick<LevelSpec, 'decoys' | 'limitation' | 'goingConcern' | 'clientCorrects' | 'realCase' | 'orion'>;

const spec = (number: number, sector: LevelSpec['sector'], difficulty: number, anomaly: LevelSpec['anomalies'][number], options: Options = {}): LevelSpec => ({
  number,
  seed: `vigie-${String(number).padStart(3, '0')}`,
  difficulty,
  sector,
  anomalies: [anomaly],
  ...options,
});

/** Niveau à plusieurs anomalies et options de scénario (formats moyen et long). */
const story = (number: number, sector: LevelSpec['sector'], difficulty: number, anomalies: LevelSpec['anomalies'], options: Options = {}): LevelSpec => ({
  number,
  seed: `vigie-${String(number).padStart(3, '0')}`,
  difficulty,
  sector,
  anomalies,
  format: number <= 60 ? 'moyen' : 'long',
  ...options,
});

/** Niveau « bis » : intercalé après le niveau du même numéro, avec sa propre graine. */
const bis = (level: LevelSpec): LevelSpec => ({ ...level, bis: true, seed: `${level.seed}-bis` });

const MAIN_SPECS: LevelSpec[] = [
  // Chaque erreur est d'abord introduite seule, en difficulté basse (mini-tutoriel).
  spec(2, 'garage', 1, 'duplicate-purchase'),
  spec(3, 'boulangerie', 1, 'wrong-vat-rate'),
  spec(4, 'informatique', 1, 'restaurant-vat'),
  spec(5, 'horeca', 2, 'debit-credit-inversion'),
  spec(6, 'garage', 2, 'missing-depreciation'),
  spec(7, 'boulangerie', 2, 'capex-expensed'),
  // Puis elles reviennent, dans d'autres secteurs, avec plus de bruit et un client parfois récalcitrant.
  spec(8, 'horeca', 2, 'wrong-vat-rate'),
  spec(9, 'informatique', 2, 'duplicate-purchase'),
  spec(10, 'garage', 3, 'capex-expensed'),
  spec(11, 'horeca', 3, 'restaurant-vat'),
  spec(12, 'boulangerie', 3, 'debit-credit-inversion'),
  spec(13, 'informatique', 3, 'missing-depreciation'),
  spec(14, 'garage', 3, 'wrong-vat-rate'),
  spec(15, 'horeca', 4, 'duplicate-purchase'),
  spec(16, 'informatique', 4, 'capex-expensed'),
  spec(17, 'garage', 4, 'debit-credit-inversion'),
  spec(18, 'boulangerie', 4, 'missing-depreciation'),
  spec(19, 'boulangerie', 4, 'restaurant-vat'),
  spec(20, 'informatique', 4, 'wrong-vat-rate'),

  // Chapitre « Assistant » (21-40) : fraudes classiques isolées, personnages qui mentent.
  spec(21, 'garage', 3, 'fictitious-sale'),
  spec(22, 'boulangerie', 3, 'unrecorded-invoice'),
  spec(23, 'informatique', 3, 'private-expense'),
  spec(24, 'construction', 3, 'early-revenue'),
  spec(25, 'detail', 3, 'fictitious-supplier'),
  spec(26, 'transport', 3, 'doubtful-receivable'),
  spec(27, 'horeca', 3, 'personal-transfer'),
  spec(28, 'ecommerce', 4, 'fictitious-bank-account'),
  spec(29, 'grossiste', 4, 'fictitious-sale'),
  spec(30, 'medical', 4, 'unrecorded-invoice'),
  spec(31, 'garage', 4, 'private-expense'),
  spec(32, 'informatique', 4, 'early-revenue'),
  spec(33, 'construction', 4, 'fictitious-supplier', { orion: 'cameo' }),
  spec(34, 'grossiste', 4, 'doubtful-receivable'),
  spec(35, 'boulangerie', 4, 'personal-transfer'),
  spec(36, 'transport', 5, 'fictitious-bank-account'),
  spec(37, 'horeca', 5, 'fictitious-supplier'),
  spec(38, 'transport', 5, 'fictitious-sale'),
  spec(39, 'ecommerce', 5, 'private-expense'),
  spec(40, 'detail', 5, 'unrecorded-invoice'),

  // Chapitre « Senior » (41-60), format moyen : 1-2 anomalies, une fausse piste, entretiens décisifs.
  story(41, 'grossiste', 4, ['inflated-stock'], { decoys: ['maintenance-contract'] }),
  story(42, 'detail', 4, ['obsolete-stock'], { decoys: ['revenue-growth'] }),
  story(43, 'construction', 4, ['ghost-employee'], { decoys: ['late-hire'] }),
  story(44, 'transport', 5, ['capitalized-expenses'], { decoys: ['maintenance-contract'] }),
  story(45, 'horeca', 5, ['unrecorded-provision'], { decoys: ['supplier-advance'] }),
  story(46, 'informatique', 5, ['unrecorded-social-debt'], { decoys: ['late-hire'] }),
  story(47, 'boulangerie', 5, ['related-party-undisclosed'], { decoys: ['revenue-growth'] }),
  story(48, 'garage', 5, ['fictitious-sale', 'unrecorded-invoice'], { decoys: ['supplier-advance'] }),
  story(49, 'ecommerce', 5, ['duplicate-purchase', 'private-expense'], { decoys: ['maintenance-contract'] }),
  story(50, 'grossiste', 6, ['inflated-stock', 'capitalized-expenses'], { decoys: ['revenue-growth'] }),
  story(51, 'transport', 6, ['ghost-employee', 'personal-transfer'], { decoys: ['late-hire'] }),
  story(52, 'construction', 6, ['obsolete-stock', 'early-revenue'], { decoys: ['supplier-advance'], orion: 'cameo' }),
  story(53, 'detail', 6, ['fictitious-supplier', 'unrecorded-social-debt'], { decoys: ['maintenance-contract'] }),
  story(54, 'grossiste', 6, ['doubtful-receivable', 'wrong-vat-rate'], { decoys: ['supplier-advance'] }),
  story(55, 'medical', 6, ['unrecorded-provision', 'missing-depreciation'], { decoys: ['late-hire'] }),
  story(56, 'garage', 6, ['related-party-undisclosed', 'inflated-stock'], { decoys: ['maintenance-contract'] }),
  story(57, 'horeca', 6, ['fictitious-bank-account', 'capex-expensed'], { decoys: ['revenue-growth'] }),
  story(58, 'detail', 6, ['private-expense', 'obsolete-stock'], { decoys: ['maintenance-contract'] }),
  story(59, 'informatique', 6, ['ghost-employee', 'doubtful-receivable'], { decoys: ['late-hire'] }),
  story(60, 'grossiste', 6, ['fictitious-sale', 'inflated-stock'], { decoys: ['revenue-growth'], clientCorrects: false }),

  // Chapitre « Superviseur » (61-80), format long : combinaisons, parties liées, opinions délicates.
  story(61, 'construction', 7, ['related-party-undisclosed', 'fictitious-supplier', 'obsolete-stock'], { decoys: ['maintenance-contract', 'supplier-advance'] }),
  story(62, 'transport', 7, ['unrecorded-provision', 'doubtful-receivable'], { goingConcern: 'disclosed', decoys: ['late-hire'] }),
  story(63, 'garage', 7, ['capitalized-expenses', 'early-revenue'], { limitation: 'inventory', decoys: ['revenue-growth'] }),
  story(64, 'grossiste', 7, ['fictitious-sale', 'inflated-stock', 'unrecorded-invoice'], { clientCorrects: false, decoys: ['supplier-advance'] }),
  story(65, 'informatique', 7, ['ghost-employee', 'private-expense'], { limitation: 'representation-letter', decoys: ['late-hire'] }),
  story(66, 'horeca', 8, ['unrecorded-social-debt', 'fictitious-bank-account'], { goingConcern: 'hidden', decoys: ['maintenance-contract'], orion: 'cameo' }),
  story(67, 'detail', 8, ['related-party-undisclosed', 'capitalized-expenses', 'inflated-stock'], { decoys: ['revenue-growth', 'supplier-advance'] }),
  story(68, 'ecommerce', 8, ['duplicate-purchase', 'restaurant-vat', 'personal-transfer', 'obsolete-stock'], { decoys: ['maintenance-contract'] }),
  story(69, 'construction', 8, ['fictitious-sale', 'unrecorded-invoice'], { goingConcern: 'disclosed', decoys: ['late-hire'] }),
  story(70, 'grossiste', 8, ['fictitious-supplier', 'doubtful-receivable'], { limitation: 'inventory', clientCorrects: false, decoys: ['supplier-advance'] }),
  story(71, 'medical', 8, ['ghost-employee', 'unrecorded-provision', 'related-party-undisclosed'], { decoys: ['maintenance-contract'] }),
  story(72, 'transport', 9, ['inflated-stock', 'capitalized-expenses'], { goingConcern: 'hidden', decoys: ['revenue-growth'] }),
  story(73, 'garage', 9, ['early-revenue', 'wrong-vat-rate', 'ghost-employee', 'missing-depreciation'], { decoys: ['late-hire', 'supplier-advance'] }),
  story(74, 'boulangerie', 9, ['fictitious-bank-account', 'private-expense'], { limitation: 'representation-letter', decoys: ['maintenance-contract'] }),
  story(75, 'informatique', 9, ['related-party-undisclosed', 'fictitious-sale', 'obsolete-stock'], { clientCorrects: false, decoys: ['revenue-growth'] }),
  story(76, 'grossiste', 9, ['unrecorded-invoice', 'unrecorded-social-debt', 'unrecorded-provision', 'doubtful-receivable'], { decoys: ['supplier-advance'] }),
  story(77, 'horeca', 10, ['personal-transfer', 'inflated-stock', 'unrecorded-provision'], { goingConcern: 'disclosed', decoys: ['maintenance-contract', 'late-hire'] }),
  story(78, 'detail', 10, ['fictitious-supplier', 'capitalized-expenses', 'unrecorded-invoice'], { limitation: 'inventory', decoys: ['revenue-growth'], orion: 'cameo' }),
  story(79, 'transport', 10, ['fictitious-supplier', 'personal-transfer', 'capitalized-expenses', 'related-party-undisclosed'], { clientCorrects: false, decoys: ['supplier-advance', 'late-hire'] }),
  story(80, 'construction', 10, ['fictitious-sale', 'ghost-employee', 'unrecorded-provision'], { goingConcern: 'hidden', clientCorrects: false, decoys: ['maintenance-contract', 'revenue-growth'] }),
  // Chapitre « Réviseur » (81-100), format long : affaires réelles à l'échelle d'une PME, et dénouement Orion.
  story(81, 'informatique', 8, ['circular-sales', 'unrecorded-invoice'], { realCase: 'lernout-hauspie', decoys: ['revenue-growth'] }),
  story(82, 'grossiste', 8, ['fictitious-bank-account', 'inflated-stock'], { realCase: 'parmalat', decoys: ['supplier-advance'] }),
  story(83, 'informatique', 8, ['capitalized-expenses', 'related-party-undisclosed'], { realCase: 'worldcom', decoys: ['maintenance-contract'] }),
  story(84, 'grossiste', 8, ['overstated-rebates', 'obsolete-stock'], { realCase: 'ahold', decoys: ['revenue-growth'] }),
  story(85, 'construction', 9, ['disguised-loan', 'fictitious-supplier'], { realCase: 'enron', orion: 'cameo', decoys: ['maintenance-contract'] }),
  story(86, 'ecommerce', 9, ['fictitious-escrow', 'personal-transfer'], { realCase: 'wirecard', decoys: ['late-hire'] }),
  story(87, 'informatique', 9, ['fictitious-bank-account', 'fictitious-sale'], { realCase: 'satyam', clientCorrects: false, decoys: ['supplier-advance'] }),
  story(88, 'transport', 9, ['circular-sales', 'doubtful-receivable'], { realCase: 'lernout-hauspie', decoys: ['late-hire'] }),
  story(89, 'horeca', 9, ['fictitious-bank-account', 'unrecorded-provision'], { realCase: 'parmalat', goingConcern: 'disclosed', decoys: ['maintenance-contract'] }),
  story(90, 'detail', 9, ['capitalized-expenses', 'inflated-stock', 'ghost-employee'], { realCase: 'worldcom', decoys: ['revenue-growth'] }),
  story(91, 'grossiste', 9, ['overstated-rebates', 'fictitious-sale'], { realCase: 'ahold', clientCorrects: false, decoys: ['supplier-advance'] }),
  story(92, 'construction', 10, ['disguised-loan', 'unrecorded-provision'], { realCase: 'enron', goingConcern: 'hidden', orion: 'cameo', decoys: ['late-hire'] }),
  story(93, 'ecommerce', 10, ['fictitious-escrow', 'private-expense', 'obsolete-stock'], { realCase: 'wirecard', decoys: ['maintenance-contract'] }),
  story(94, 'garage', 10, ['fictitious-bank-account', 'early-revenue', 'unrecorded-social-debt'], { realCase: 'satyam', limitation: 'representation-letter', decoys: ['revenue-growth'] }),
  story(95, 'informatique', 10, ['circular-sales', 'related-party-undisclosed'], { realCase: 'lernout-hauspie', clientCorrects: false, decoys: ['late-hire'] }),
  story(96, 'transport', 10, ['capitalized-expenses', 'disguised-loan'], { realCase: 'worldcom', orion: 'cameo', decoys: ['supplier-advance'] }),
  story(97, 'grossiste', 10, ['overstated-rebates', 'inflated-stock', 'unrecorded-invoice'], { realCase: 'ahold', goingConcern: 'disclosed', decoys: ['maintenance-contract'] }),
  story(98, 'horeca', 10, ['fictitious-escrow', 'ghost-employee'], { realCase: 'wirecard', decoys: ['revenue-growth', 'late-hire'] }),
  story(99, 'detail', 10, ['fictitious-bank-account', 'fictitious-supplier'], { realCase: 'satyam', clientCorrects: false, decoys: ['maintenance-contract'] }),
  story(100, 'informatique', 10, ['circular-sales', 'fictitious-supplier', 'personal-transfer'], { orion: 'final', realCase: 'lernout-hauspie', decoys: ['supplier-advance', 'late-hire'] }),
];

/**
 * Niveaux « bis » : chaque nouvelle anomalie y est d'abord introduite seule (mini-tutoriel), puis combinée.
 * Ils adoucissent aussi les marches de difficulté. Les numéros des niveaux existants ne changent pas.
 */
const BIS_SPECS: LevelSpec[] = [
  // Stagiaire : erreurs simples supplémentaires.
  bis(spec(7, 'detail', 2, 'double-payment')),
  bis(spec(9, 'transport', 2, 'scrapped-asset')),
  bis(spec(14, 'grossiste', 3, 'double-payment')),
  bis(spec(17, 'medical', 4, 'scrapped-asset')),
  // Assistant : fraudes classiques supplémentaires.
  bis(spec(23, 'grossiste', 3, 'lapping')),
  bis(spec(27, 'garage', 3, 'rigged-reconciliation')),
  bis(spec(30, 'detail', 4, 'unrecorded-tax-debt')),
  bis(spec(34, 'informatique', 4, 'unauthorized-credit-note')),
  bis(spec(38, 'horeca', 5, 'inflated-overtime')),
  // Senior : nouvelles anomalies en format moyen.
  bis(story(42, 'grossiste', 4, ['stock-cutoff'], { decoys: ['revenue-growth'] })),
  bis(story(46, 'garage', 5, ['lapping', 'stock-cutoff'], { decoys: ['supplier-advance'] })),
  bis(story(55, 'informatique', 6, ['rigged-reconciliation', 'scrapped-asset'], { decoys: ['maintenance-contract'] })),
  bis(story(58, 'detail', 6, ['inflated-overtime', 'unrecorded-tax-debt'], { decoys: ['late-hire'] })),
  // Superviseur : combinaisons, puis les quatre montages des affaires réelles, introduits seuls avant le chapitre Réviseur.
  bis(story(64, 'construction', 7, ['unauthorized-credit-note', 'stock-cutoff', 'double-payment'], { clientCorrects: false, decoys: ['revenue-growth'] })),
  bis(story(72, 'transport', 9, ['rigged-reconciliation', 'inflated-overtime'], { goingConcern: 'disclosed', decoys: ['late-hire'] })),
  bis(story(77, 'informatique', 8, ['circular-sales'], { decoys: ['revenue-growth'] })),
  bis(story(78, 'grossiste', 8, ['overstated-rebates'], { decoys: ['supplier-advance'] })),
  bis(story(79, 'construction', 8, ['disguised-loan'], { decoys: ['maintenance-contract'] })),
  bis(story(80, 'ecommerce', 8, ['fictitious-escrow'], { decoys: ['late-hire'] })),
  // Réviseur : les nouvelles anomalies dans des dossiers longs.
  bis(story(88, 'garage', 9, ['lapping', 'unrecorded-tax-debt', 'scrapped-asset'], { decoys: ['supplier-advance'] })),
  bis(story(96, 'grossiste', 10, ['rigged-reconciliation', 'unauthorized-credit-note', 'stock-cutoff'], { limitation: 'representation-letter', decoys: ['revenue-growth'] })),
];

/** Chapitre « Associé » (101-120) : les dossiers les plus épineux, toutes anomalies confondues. */
const PARTNER_SPECS: LevelSpec[] = [
  story(101, 'garage', 9, ['lapping', 'capex-expensed', 'unrecorded-tax-debt'], { decoys: ['maintenance-contract'] }),
  story(102, 'boulangerie', 9, ['inflated-overtime', 'obsolete-stock'], { goingConcern: 'disclosed', decoys: ['late-hire'] }),
  story(103, 'informatique', 9, ['unauthorized-credit-note', 'related-party-undisclosed', 'scrapped-asset'], { decoys: ['revenue-growth'] }),
  story(104, 'grossiste', 9, ['stock-cutoff', 'overstated-rebates', 'double-payment'], { decoys: ['supplier-advance'] }),
  story(105, 'construction', 9, ['rigged-reconciliation', 'unrecorded-provision'], { goingConcern: 'hidden', decoys: ['maintenance-contract'] }),
  story(106, 'horeca', 9, ['restaurant-vat', 'ghost-employee', 'unrecorded-tax-debt'], { decoys: ['late-hire'] }),
  story(107, 'transport', 10, ['lapping', 'fictitious-supplier'], { clientCorrects: false, decoys: ['supplier-advance'] }),
  story(108, 'ecommerce', 10, ['fictitious-escrow', 'stock-cutoff'], { limitation: 'representation-letter', decoys: ['revenue-growth'] }),
  story(109, 'detail', 10, ['private-expense', 'inflated-overtime', 'scrapped-asset'], { decoys: ['maintenance-contract', 'late-hire'] }),
  story(110, 'medical', 10, ['ghost-employee', 'double-payment', 'unrecorded-social-debt'], { decoys: ['late-hire'] }),
  story(111, 'garage', 10, ['circular-sales', 'unauthorized-credit-note'], { decoys: ['revenue-growth'] }),
  story(112, 'informatique', 10, ['disguised-loan', 'rigged-reconciliation'], { goingConcern: 'disclosed', decoys: ['supplier-advance'] }),
  story(113, 'grossiste', 10, ['inflated-stock', 'overstated-rebates', 'lapping'], { clientCorrects: false, decoys: ['maintenance-contract'] }),
  story(114, 'construction', 10, ['early-revenue', 'capitalized-expenses', 'unrecorded-tax-debt'], { decoys: ['late-hire'] }),
  story(115, 'horeca', 10, ['fictitious-bank-account', 'inflated-overtime'], { goingConcern: 'hidden', decoys: ['revenue-growth'] }),
  story(116, 'transport', 10, ['doubtful-receivable', 'stock-cutoff', 'scrapped-asset'], { decoys: ['supplier-advance'] }),
  story(117, 'ecommerce', 10, ['fictitious-escrow', 'private-expense', 'double-payment'], { limitation: 'representation-letter', decoys: ['maintenance-contract'] }),
  story(118, 'detail', 10, ['related-party-undisclosed', 'unrecorded-provision', 'obsolete-stock'], { decoys: ['maintenance-contract', 'revenue-growth'] }),
  story(119, 'informatique', 10, ['circular-sales', 'rigged-reconciliation', 'ghost-employee'], { clientCorrects: false, decoys: ['late-hire'] }),
  story(120, 'grossiste', 10, ['fictitious-sale', 'lapping', 'stock-cutoff', 'unrecorded-tax-debt'], { goingConcern: 'hidden', decoys: ['supplier-advance', 'revenue-growth'] }),
];

/** Ordre de jeu : chaque niveau « bis » suit le niveau de même numéro. */
export const CAMPAIGN_SPECS: LevelSpec[] = [...MAIN_SPECS, ...BIS_SPECS, ...PARTNER_SPECS].sort((a, b) => a.number - b.number || Number(!!a.bis) - Number(!!b.bis));
