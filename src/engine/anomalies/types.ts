// Types et outils communs aux anomalies. Audit Detective — créé par Gauthier Doumont.
import type { SectorSpec } from '../../content/sectors';
import type { Assertion, Qualification } from '../../content/types';
import type { TraceRef } from '../ids';
import { invoiceTotals } from '../invoices';
import { monthOf, type Cents } from '../money';
import type { Rng } from '../rng';
import type { Books, Company, Entry, EntryLine, Invoice, Party, RegistryEntry } from '../types';

export type AnomalyType =
  // Erreurs simples (niveaux 1-20)
  | 'duplicate-purchase'
  | 'wrong-vat-rate'
  | 'restaurant-vat'
  | 'debit-credit-inversion'
  | 'missing-depreciation'
  | 'capex-expensed'
  // Fraudes classiques (niveaux 21-40)
  | 'fictitious-sale'
  | 'early-revenue'
  | 'doubtful-receivable'
  | 'fictitious-supplier'
  | 'unrecorded-invoice'
  | 'private-expense'
  | 'fictitious-bank-account'
  | 'personal-transfer';

/** Personne du client concernée par l'anomalie, interrogée à son sujet. */
export type Actor = 'manager' | 'accountant' | 'storekeeper' | 'sales';

export type InjectContext = {
  rng: Rng;
  company: Company;
  sector: SectorSpec;
  truth: Books;
  books: Books;
  difficulty: number;
  /** Identifiants (écritures, factures, tiers…) déjà utilisés par une autre anomalie. */
  used: Set<string>;
  /** Identifiant unique pour une écriture, une facture ou un tiers ajouté par l'anomalie. */
  newId: (prefix: string) => string;
};

export type Injection = {
  type: AnomalyType;
  cycle: string;
  assertion: Assertion;
  qualification: Qualification;
  /** Fournisseur ou client à circulariser en priorité. */
  supplierId?: string;
  clientId?: string;
  accounts: { account: string; amount: Cents }[];
  /** Écriture qui ramène les livres à la vérité ; vide si seule l'annexe est à compléter. */
  correction: EntryLine[];
  traces: TraceRef[];
  actor: Actor;
  /** Fraude : l'auteur ment sur le sujet ; ces indices permettent de le confronter. */
  contradictedBy?: TraceRef[];
  params: Record<string, string>;
  variant?: string;
};

export type AnomalyDefinition = {
  type: AnomalyType;
  /** Le secteur permet-il cette anomalie (TVA déductible, ventes sur facture…) ? */
  appliesTo: (sector: SectorSpec) => boolean;
  inject: (ctx: InjectContext) => Injection;
};

export const d = (account: string, amount: Cents): EntryLine => ({ account, debit: amount, credit: 0 });
export const c = (account: string, amount: Cents): EntryLine => ({ account, debit: 0, credit: amount });

export const reverse = (lines: EntryLine[], factor = 1): EntryLine[] =>
  lines.map((l) => ({ account: l.account, debit: l.credit * factor, credit: l.debit * factor }));

/** Additionne les lignes par compte et par sens (écriture de correction compacte). */
export function merge(lines: EntryLine[]): EntryLine[] {
  const net = new Map<string, Cents>();
  for (const l of lines) net.set(l.account, (net.get(l.account) ?? 0) + l.debit - l.credit);
  return [...net.entries()]
    .filter(([, v]) => v !== 0)
    .map(([account, v]) => (v > 0 ? d(account, v) : c(account, -v)))
    .sort((a, b) => b.debit - a.debit);
}

export const q4 = (date: string) => monthOf(date) >= 10;
export const octNov = (date: string) => monthOf(date) === 10 || monthOf(date) === 11;

export function purchaseEntries(books: Books, predicate: (entry: Entry, invoice: Invoice) => boolean) {
  return books.entries.flatMap((entry) => {
    const invoice = books.invoices.find((i) => i.id === entry.invoiceId);
    return entry.journal === 'ACH' && invoice && predicate(entry, invoice) ? [{ entry, invoice }] : [];
  });
}

export function saleEntries(books: Books, predicate: (entry: Entry, invoice: Invoice) => boolean) {
  return books.entries.flatMap((entry) => {
    const invoice = books.invoices.find((i) => i.id === entry.invoiceId);
    return entry.journal === 'VEN' && invoice && predicate(entry, invoice) ? [{ entry, invoice }] : [];
  });
}

export function paymentOf(books: Books, invoiceId: string): Entry | undefined {
  return books.entries.find((e) => e.journal === 'FIN' && e.invoiceId === invoiceId);
}

export function partyName(books: Books, partyId?: string): string {
  return books.parties.find((p) => p.id === partyId)?.name ?? '';
}

export function totalsOf(invoice: Invoice) {
  return invoiceTotals(invoice);
}

/** Choisit au hasard un élément non encore utilisé par une autre anomalie, et le réserve. */
export function claim<T>(ctx: InjectContext, items: T[], key: (item: T) => string): T {
  const free = items.filter((i) => !ctx.used.has(key(i)));
  if (free.length === 0) throw new Error('Aucune cible disponible pour cette anomalie');
  const item = ctx.rng.pick(free);
  ctx.used.add(key(item));
  return item;
}

export const deductibleVat = (sector: SectorSpec) => !sector.vatExempt;
export const invoicedSales = (sector: SectorSpec) => sector.salesMode === 'invoice';

/** Ajoute un tiers (et son inscription BCE éventuelle) dans la vérité et dans les livres. */
export function addParty(ctx: InjectContext, party: Party, registry?: RegistryEntry): void {
  for (const b of [ctx.truth, ctx.books]) {
    b.parties.push(structuredClone(party));
    if (registry) b.world.registry.push(structuredClone(registry));
  }
}

/** Le même changement dans la vérité et dans les livres (faits réels : courrier, livraison, PV…). */
export function everywhere(ctx: InjectContext, change: (books: Books) => void): void {
  change(ctx.truth);
  change(ctx.books);
}

/** Total des ventes (HTVA) de l'exercice, pour dimensionner une anomalie. */
export function salesTotal(books: Books): Cents {
  return books.entries.flatMap((e) => e.lines).filter((l) => l.account === '700').reduce((s, l) => s + l.credit - l.debit, 0);
}
