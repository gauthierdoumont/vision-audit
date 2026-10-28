// Totaux d'une facture : la TVA est calculée par taux, sur le total HTVA de ce taux.
import { vatOf, type Cents } from './money';
import type { Invoice, InvoiceLine } from './types';

export type VatBreakdown = { rate: number; base: Cents; vat: Cents };

export type InvoiceTotals = { base: Cents; vat: Cents; total: Cents; byRate: VatBreakdown[] };

export function lineAmount(line: InvoiceLine): Cents {
  return Math.round(line.quantity * line.unitPrice);
}

export function invoiceTotals(invoice: Pick<Invoice, 'lines'>): InvoiceTotals {
  const rates = new Map<number, Cents>();
  for (const line of invoice.lines) rates.set(line.vatRate, (rates.get(line.vatRate) ?? 0) + lineAmount(line));
  const byRate = [...rates.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, base]) => ({ rate, base, vat: vatOf(base, rate) }));
  const base = byRate.reduce((s, r) => s + r.base, 0);
  const vat = byRate.reduce((s, r) => s + r.vat, 0);
  return { base, vat, total: base + vat, byRate };
}
