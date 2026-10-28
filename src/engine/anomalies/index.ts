// Catalogue des anomalies injectables. Audit Detective — créé par Gauthier Doumont.
import { ASSET_ANOMALIES } from './assets';
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
