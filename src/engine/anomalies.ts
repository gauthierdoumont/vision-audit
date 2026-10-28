// Injection des anomalies dans une copie de la comptabilité « vraie ».
// Chaque injection renvoie l'écriture de correction qui ramène les comptes à la vérité, et ses traces.
// Audit Detective — créé par Gauthier Doumont.
import type { Assertion, Qualification } from '../content/types';
import { invoiceTotals } from './invoices';
import { addDays, formatAmount, formatDate, monthOf, vatOf, type Cents } from './money';
import { depreciationFor } from './ledger';
import type { Rng } from './rng';
import type { Books, Company, Entry, EntryLine, Invoice } from './types';

export type AnomalyType =
  | 'duplicate-purchase'
  | 'wrong-vat-rate'
  | 'restaurant-vat'
  | 'debit-credit-inversion'
  | 'missing-depreciation'
  | 'capex-expensed';

export const ANOMALY_TYPES: AnomalyType[] = [
  'duplicate-purchase',
  'wrong-vat-rate',
  'restaurant-vat',
  'debit-credit-inversion',
  'missing-depreciation',
  'capex-expensed',
];

/** Référence abstraite vers une ligne de document ; documents.ts la traduit en identifiant d'indice. */
export type TraceRef =
  | { kind: 'journal'; entryId: string }
  | { kind: 'invoice'; invoiceId: string; line: 'vat' | 'total' | number }
  | { kind: 'supplier-balance'; partyId: string }
  | { kind: 'confirmation'; partyId: string }
  | { kind: 'bank'; entryId: string }
  | { kind: 'analytic'; account: string }
  | { kind: 'asset'; assetId: string }
  | { kind: 'topic' };

export type Injection = {
  type: AnomalyType;
  cycle: string;
  assertion: Assertion;
  qualification: Qualification;
  /** Fournisseur à circulariser en priorité, s'il y en a un. */
  partyId?: string;
  accounts: { account: string; amount: Cents }[];
  correction: EntryLine[];
  traces: TraceRef[];
  /** Valeurs pour les textes (explications, entretien, indice). */
  params: Record<string, string>;
  /** Variante (ex. amortissement oublié ou mauvaise durée). */
  variant?: string;
};

const d = (account: string, amount: Cents): EntryLine => ({ account, debit: amount, credit: 0 });
const c = (account: string, amount: Cents): EntryLine => ({ account, debit: 0, credit: amount });

function sortEntries(books: Books) {
  books.entries.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
}

function purchaseEntries(books: Books, predicate: (entry: Entry, invoice: Invoice) => boolean) {
  return books.entries.flatMap((entry) => {
    const invoice = books.invoices.find((i) => i.id === entry.invoiceId);
    return entry.journal === 'ACH' && invoice && predicate(entry, invoice) ? [{ entry, invoice }] : [];
  });
}

function paymentOf(books: Books, invoiceId: string): Entry | undefined {
  return books.entries.find((e) => e.journal === 'FIN' && e.invoiceId === invoiceId);
}

function partyName(books: Books, partyId: string): string {
  return books.parties.find((p) => p.id === partyId)?.name ?? '';
}

const q4 = (date: string) => monthOf(date) >= 10;
const q4BeforeDecember = (date: string) => monthOf(date) === 10 || monthOf(date) === 11;

function duplicatePurchase(rng: Rng, books: Books): Injection {
  const { entry, invoice } = rng.pick(
    purchaseEntries(books, (e, i) => i.kind === 'invoice' && i.account === '604' && q4BeforeDecember(e.date) && !!paymentOf(books, i.id)),
  );
  const { base, vat, total } = invoiceTotals(invoice);
  const duplicate: Entry = { ...structuredClone(entry), id: `${entry.id}-bis`, date: addDays(entry.date, rng.int(4, 12)) };
  books.entries.push(duplicate);
  sortEntries(books);
  return {
    type: 'duplicate-purchase',
    cycle: 'achats',
    assertion: 'existence',
    qualification: 'erreur',
    partyId: invoice.partyId,
    accounts: [{ account: '440', amount: total }, { account: '604', amount: base }],
    correction: [d('440', total), c('604', base), c('411', vat)],
    traces: [
      { kind: 'journal', entryId: entry.id },
      { kind: 'journal', entryId: duplicate.id },
      { kind: 'supplier-balance', partyId: invoice.partyId },
      { kind: 'confirmation', partyId: invoice.partyId },
      { kind: 'bank', entryId: paymentOf(books, invoice.id)!.id },
      { kind: 'topic' },
    ],
    params: {
      supplier: partyName(books, invoice.partyId),
      number: invoice.number,
      date: formatDate(invoice.date),
      duplicateDate: formatDate(duplicate.date),
      base: formatAmount(base),
      vat: formatAmount(vat),
      total: formatAmount(total),
    },
  };
}

function wrongVatRate(rng: Rng, books: Books): Injection {
  const { entry, invoice } = rng.pick(
    purchaseEntries(
      books,
      (e, i) => i.kind === 'invoice' && i.account === '604' && q4BeforeDecember(e.date) && !!paymentOf(books, i.id) && new Set(i.lines.map((l) => l.vatRate)).size === 1,
    ),
  );
  const { base, vat } = invoiceTotals(invoice);
  const rate = invoice.lines[0]!.vatRate;
  const wrongRate = rate === 6 ? 21 : 6;
  const wrongVat = vatOf(base, wrongRate);
  entry.lines = [d('604', base), d('411', wrongVat), c('440', base + wrongVat)];
  const diff = wrongVat - vat;
  const amount = Math.abs(diff);
  return {
    type: 'wrong-vat-rate',
    cycle: 'achats',
    assertion: 'evaluation',
    qualification: 'erreur',
    partyId: invoice.partyId,
    accounts: [{ account: '411', amount }, { account: '440', amount }],
    correction: diff > 0 ? [d('440', amount), c('411', amount)] : [d('411', amount), c('440', amount)],
    traces: [
      { kind: 'journal', entryId: entry.id },
      { kind: 'invoice', invoiceId: invoice.id, line: 'vat' },
      { kind: 'supplier-balance', partyId: invoice.partyId },
      { kind: 'confirmation', partyId: invoice.partyId },
      { kind: 'topic' },
    ],
    params: {
      supplier: partyName(books, invoice.partyId),
      number: invoice.number,
      base: formatAmount(base),
      rate: String(rate),
      wrongRate: String(wrongRate),
      vat: formatAmount(vat),
      wrongVat: formatAmount(wrongVat),
      diff: formatAmount(amount),
      direction: diff > 0 ? 'trop' : 'pas assez',
      product: invoice.lines[0]!.label,
    },
    variant: diff > 0 ? 'overstated' : 'understated',
  };
}

function restaurantVat(_rng: Rng, books: Books): Injection {
  const targets = purchaseEntries(books, (e, i) => i.account === '615' && q4(e.date));
  let total = 0;
  for (const { entry, invoice } of targets) {
    const t = invoiceTotals(invoice);
    entry.lines = [d('615', t.base), d('411', t.vat), c('440', t.total)];
    total += t.vat;
  }
  return {
    type: 'restaurant-vat',
    cycle: 'achats',
    assertion: 'existence',
    qualification: 'erreur',
    accounts: [{ account: '411', amount: total }, { account: '615', amount: total }],
    correction: [d('615', total), c('411', total)],
    traces: [
      ...targets.map(({ entry }) => ({ kind: 'journal' as const, entryId: entry.id })),
      ...targets.map(({ invoice }) => ({ kind: 'invoice' as const, invoiceId: invoice.id, line: 'vat' as const })),
      { kind: 'topic' },
    ],
    params: {
      count: String(targets.length),
      restaurant: partyName(books, targets[0]!.invoice.partyId),
      vat: formatAmount(total),
    },
  };
}

function debitCreditInversion(rng: Rng, books: Books): Injection {
  const { entry, invoice } = rng.pick(purchaseEntries(books, (e, i) => i.kind === 'credit-note' && q4BeforeDecember(e.date)));
  const { base, vat, total } = invoiceTotals(invoice);
  entry.lines = entry.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit }));
  return {
    type: 'debit-credit-inversion',
    cycle: 'achats',
    assertion: 'existence',
    qualification: 'erreur',
    partyId: invoice.partyId,
    accounts: [{ account: '440', amount: 2 * total }, { account: '604', amount: 2 * base }],
    correction: [d('440', 2 * total), c('604', 2 * base), c('411', 2 * vat)],
    traces: [
      { kind: 'journal', entryId: entry.id },
      { kind: 'invoice', invoiceId: invoice.id, line: 'total' },
      { kind: 'supplier-balance', partyId: invoice.partyId },
      { kind: 'confirmation', partyId: invoice.partyId },
      { kind: 'bank', entryId: paymentOf(books, invoice.id)!.id },
      { kind: 'topic' },
    ],
    params: {
      supplier: partyName(books, invoice.partyId),
      number: invoice.number,
      base: formatAmount(base),
      vat: formatAmount(vat),
      total: formatAmount(total),
      doubleTotal: formatAmount(2 * total),
      doubleBase: formatAmount(2 * base),
    },
  };
}

function missingDepreciation(rng: Rng, books: Books, company: Company): Injection {
  const year = company.fiscalYear;
  const newAsset = books.assets.find((a) => a.acquisitionDate.startsWith(String(year)));
  const wrongDuration = newAsset !== undefined && rng.chance(0.5);
  const asset = wrongDuration ? newAsset : rng.pick(books.assets.filter((a) => a !== newAsset));
  const entry = books.entries.find((e) => e.journal === 'OD' && e.assetId === asset.id)!;
  const truth = depreciationFor(asset, year);
  let diff = truth;
  const params: Record<string, string> = { asset: asset.label, years: String(asset.years), truth: formatAmount(truth) };

  if (wrongDuration) {
    asset.years *= 2;
    const booked = depreciationFor(asset, year);
    entry.lines = [d('6302', booked), c(asset.depreciationAccount, booked)];
    diff = truth - booked;
    params.wrongYears = String(asset.years);
    params.booked = formatAmount(booked);
  } else {
    books.entries = books.entries.filter((e) => e !== entry);
  }
  params.diff = formatAmount(diff);

  const invoice = books.invoices.find((i) => i.assetId === asset.id);
  return {
    type: 'missing-depreciation',
    cycle: 'immobilisations',
    assertion: 'evaluation',
    qualification: 'erreur',
    accounts: [{ account: '6302', amount: diff }, { account: asset.depreciationAccount, amount: diff }],
    correction: [d('6302', diff), c(asset.depreciationAccount, diff)],
    traces: [
      { kind: 'asset', assetId: asset.id },
      ...(wrongDuration && invoice ? [{ kind: 'invoice' as const, invoiceId: invoice.id, line: 0 }] : [{ kind: 'analytic' as const, account: '6302' }]),
      { kind: 'topic' },
    ],
    params,
    variant: wrongDuration ? 'wrong-duration' : 'forgotten',
  };
}

function capexExpensed(_rng: Rng, books: Books, company: Company): Injection {
  const asset = books.assets.find((a) => a.acquisitionDate.startsWith(String(company.fiscalYear)))!;
  const invoice = books.invoices.find((i) => i.assetId === asset.id)!;
  const entry = books.entries.find((e) => e.journal === 'ACH' && e.invoiceId === invoice.id)!;
  const depreciation = depreciationFor(asset, company.fiscalYear);
  entry.lines = entry.lines.map((l) => (l.account === asset.account ? { ...l, account: '611' } : l));
  entry.label = `Entretien — ${partyName(books, invoice.partyId)}`;
  books.entries = books.entries.filter((e) => !(e.journal === 'OD' && e.assetId === asset.id));
  books.assets = books.assets.filter((a) => a.id !== asset.id);
  return {
    type: 'capex-expensed',
    cycle: 'immobilisations',
    assertion: 'presentation',
    qualification: 'erreur',
    accounts: [{ account: asset.account, amount: asset.cost }, { account: '611', amount: asset.cost }],
    correction: [d(asset.account, asset.cost), d('6302', depreciation), c('611', asset.cost), c(asset.depreciationAccount, depreciation)],
    traces: [
      { kind: 'journal', entryId: entry.id },
      { kind: 'invoice', invoiceId: invoice.id, line: 0 },
      { kind: 'analytic', account: '611' },
      { kind: 'topic' },
    ],
    params: {
      asset: asset.label,
      supplier: partyName(books, invoice.partyId),
      number: invoice.number,
      cost: formatAmount(asset.cost),
      years: String(asset.years),
      months: String(13 - monthOf(asset.acquisitionDate)),
      depreciation: formatAmount(depreciation),
      account: asset.account,
      depreciationAccount: asset.depreciationAccount,
    },
  };
}

const INJECTORS: Record<AnomalyType, (rng: Rng, books: Books, company: Company) => Injection> = {
  'duplicate-purchase': duplicatePurchase,
  'wrong-vat-rate': wrongVatRate,
  'restaurant-vat': restaurantVat,
  'debit-credit-inversion': debitCreditInversion,
  'missing-depreciation': missingDepreciation,
  'capex-expensed': capexExpensed,
};

/** Injecte une anomalie dans `books` (modifié sur place) et décrit comment la corriger. */
export function injectAnomaly(type: AnomalyType, rng: Rng, books: Books, company: Company): Injection {
  return INJECTORS[type](rng, books, company);
}
