// Catalogue des anomalies injectables. Audit Detective — créé par Gauthier Doumont.
import { ASSET_ANOMALIES } from './assets';
import { CASE_ANOMALIES } from './cases';
import { SIMPLE_ERRORS } from './errors';
import { PAYROLL_ANOMALIES } from './payroll';
import { PROVISION_ANOMALIES } from './provisions';
import { PURCHASE_ANOMALIES } from './purchases';
import { SALES_ANOMALIES } from './sales';
import { STOCK_ANOMALIES } from './stock';
import { TREASURY_ANOMALIES } from './treasury';
import type { AnomalyDefinition, AnomalyType, InjectContext, Injection } from './types';

export * from './types';

export const ANOMALY_CATALOGUE: AnomalyDefinition[] = [
  ...SIMPLE_ERRORS,
  ...SALES_ANOMALIES,
  ...PURCHASE_ANOMALIES,
  ...TREASURY_ANOMALIES,
  ...STOCK_ANOMALIES,
  ...ASSET_ANOMALIES,
  ...PAYROLL_ANOMALIES,
  ...PROVISION_ANOMALIES,
  ...CASE_ANOMALIES,
];

export const ANOMALY_TYPES: AnomalyType[] = ANOMALY_CATALOGUE.map((a) => a.type);

export const SIMPLE_ERROR_TYPES: AnomalyType[] = SIMPLE_ERRORS.map((a) => a.type);

export function definitionOf(type: AnomalyType): AnomalyDefinition {
  const definition = ANOMALY_CATALOGUE.find((a) => a.type === type);
  if (!definition) throw new Error(`Anomalie inconnue : ${type}`);
  return definition;
}

/** Injecte une anomalie dans les livres (et, pour les détournements, dans la vérité). */
export function injectAnomaly(type: AnomalyType, ctx: InjectContext): Injection {
  return definitionOf(type).inject(ctx);
}

/** Cycle de chaque anomalie (statistiques, parties ciblées). Vérifié par un test contre les injections. */
export const CYCLE_OF: Record<AnomalyType, string> = {
  'duplicate-purchase': 'achats',
  'wrong-vat-rate': 'achats',
  'restaurant-vat': 'achats',
  'debit-credit-inversion': 'achats',
  'missing-depreciation': 'immobilisations',
  'capex-expensed': 'immobilisations',
  'fictitious-sale': 'ventes',
  'early-revenue': 'ventes',
  'doubtful-receivable': 'ventes',
  'fictitious-supplier': 'achats',
  'unrecorded-invoice': 'achats',
  'private-expense': 'achats',
  'fictitious-bank-account': 'trésorerie',
  'personal-transfer': 'trésorerie',
  'inflated-stock': 'stocks',
  'obsolete-stock': 'stocks',
  'capitalized-expenses': 'immobilisations',
  'ghost-employee': 'personnel',
  'unrecorded-social-debt': 'personnel',
  'unrecorded-provision': 'provisions',
  'related-party-undisclosed': 'parties liées',
  'circular-sales': 'parties liées',
  'overstated-rebates': 'achats',
  'disguised-loan': 'parties liées',
  'fictitious-escrow': 'trésorerie',
};

/** Difficulté minimale à partir de laquelle une anomalie apparaît dans les modes libres. */
export const MIN_DIFFICULTY: Record<AnomalyType, number> = {
  'duplicate-purchase': 1,
  'wrong-vat-rate': 1,
  'restaurant-vat': 1,
  'debit-credit-inversion': 2,
  'missing-depreciation': 2,
  'capex-expensed': 2,
  'fictitious-sale': 3,
  'early-revenue': 3,
  'doubtful-receivable': 3,
  'fictitious-supplier': 3,
  'unrecorded-invoice': 3,
  'private-expense': 3,
  'fictitious-bank-account': 4,
  'personal-transfer': 3,
  'inflated-stock': 5,
  'obsolete-stock': 5,
  'capitalized-expenses': 5,
  'ghost-employee': 5,
  'unrecorded-social-debt': 5,
  'unrecorded-provision': 5,
  'related-party-undisclosed': 5,
  'circular-sales': 7,
  'overstated-rebates': 7,
  'disguised-loan': 7,
  'fictitious-escrow': 7,
};
