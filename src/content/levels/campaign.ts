// Campagne de 100 niveaux. Chapitre « Stagiaire » (1-20) : erreurs simples. Le niveau 1 est écrit à la main ;
// les suivants sont générés à partir de leur graine. Audit Detective — créé par Gauthier Doumont.
import type { LevelSpec } from '../../engine/generate';

const spec = (number: number, sector: LevelSpec['sector'], difficulty: number, anomaly: LevelSpec['anomalies'][number]): LevelSpec => ({
  number,
  seed: `vigie-${String(number).padStart(3, '0')}`,
  difficulty,
  sector,
  anomalies: [anomaly],
});

export const CAMPAIGN_SPECS: LevelSpec[] = [
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
  spec(33, 'construction', 4, 'fictitious-supplier'),
  spec(34, 'grossiste', 4, 'doubtful-receivable'),
  spec(35, 'boulangerie', 4, 'personal-transfer'),
  spec(36, 'transport', 5, 'fictitious-bank-account'),
  spec(37, 'horeca', 5, 'fictitious-supplier'),
  spec(38, 'transport', 5, 'fictitious-sale'),
  spec(39, 'ecommerce', 5, 'private-expense'),
  spec(40, 'detail', 5, 'unrecorded-invoice'),
];
