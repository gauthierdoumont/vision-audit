// Erreurs simples (niveaux 1-20). Audit Detective — créé par Gauthier Doumont.
import { REF } from '../ids';
import { depreciationFor, sortEntries } from '../ledger';
import { addDays, formatAmount, formatDate, monthOf, vatOf } from '../money';
import type { Entry } from '../types';
import {
  c, claim, d, deductibleVat, merge, octNov, partyName, paymentOf, purchaseEntries, q4, reverse, totalsOf,
  type AnomalyDefinition,
} from './types';

export const duplicatePurchase: AnomalyDefinition = {
  type: 'duplicate-purchase',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, rng } = ctx;
    const { entry, invoice } = claim(
      ctx,
      purchaseEntries(books, (e, i) => i.kind === 'invoice' && i.account === '604' && octNov(e.date) && !!paymentOf(books, i.id)),
      (t) => t.entry.id,
    );
    const { base, vat, total } = totalsOf(invoice);
    const duplicate: Entry = { ...structuredClone(entry), id: `${entry.id}-bis`, date: addDays(entry.date, rng.int(4, 12)) };
    books.entries.push(duplicate);
    sortEntries(books.entries);
    return {
      type: 'duplicate-purchase',
      cycle: 'achats',
      assertion: 'existence',
      qualification: 'erreur',
      supplierId: invoice.partyId,
      actor: 'accountant',
      accounts: [{ account: '440', amount: total }, { account: '604', amount: invoice.vatDeductible ? base : total }],
      correction: merge(reverse(duplicate.lines)),
      traces: [REF.purchase(entry.id), REF.purchase(duplicate.id), REF.supplierBalance(invoice.partyId), REF.supplierConfirmation(invoice.partyId), REF.bank(paymentOf(books, invoice.id)!.id), REF.topic()],
      params: {
        supplier: partyName(books, invoice.partyId),
        number: invoice.number,
        date: formatDate(invoice.date),
        duplicateDate: formatDate(duplicate.date),
        base: formatAmount(base),
        vat: formatAmount(invoice.vatDeductible ? vat : 0),
        total: formatAmount(total),
      },
    };
  },
};

export const wrongVatRate: AnomalyDefinition = {
  type: 'wrong-vat-rate',
  appliesTo: deductibleVat,
  inject: (ctx) => {
    const { books } = ctx;
    const { entry, invoice } = claim(
      ctx,
      purchaseEntries(books, (e, i) => i.kind === 'invoice' && i.account === '604' && octNov(e.date) && !!paymentOf(books, i.id) && new Set(i.lines.map((l) => l.vatRate)).size === 1),
      (t) => t.entry.id,
    );
    const { base, vat } = totalsOf(invoice);
    const rate = invoice.lines[0]!.vatRate;
    const wrongRate = rate === 6 ? 21 : 6;
    const wrongVat = vatOf(base, wrongRate);
    const before = entry.lines;
    entry.lines = [d('604', base), d('411', wrongVat), c('440', base + wrongVat)];
    const diff = wrongVat - vat;
    const amount = Math.abs(diff);
    return {
      type: 'wrong-vat-rate',
      cycle: 'achats',
      assertion: 'evaluation',
      qualification: 'erreur',
      supplierId: invoice.partyId,
      actor: 'accountant',
      accounts: [{ account: '411', amount }, { account: '440', amount }],
      correction: merge([...reverse(entry.lines), ...before]),
      traces: [REF.purchase(entry.id), REF.invoiceLine(invoice.id, 'vat'), REF.supplierBalance(invoice.partyId), REF.supplierConfirmation(invoice.partyId), REF.topic()],
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
  },
};

export const restaurantVat: AnomalyDefinition = {
  type: 'restaurant-vat',
  appliesTo: deductibleVat,
  inject: (ctx) => {
    const { books } = ctx;
    const targets = purchaseEntries(books, (e, i) => i.account === '615' && q4(e.date) && !ctx.used.has(e.id));
    if (targets.length === 0) throw new Error('Aucune note de restaurant au 4e trimestre');
    let total = 0;
    const correction = [];
    for (const { entry, invoice } of targets) {
      ctx.used.add(entry.id);
      const t = totalsOf(invoice);
      const before = entry.lines;
      entry.lines = [d('615', t.base), d('411', t.vat), c('440', t.total)];
      correction.push(...reverse(entry.lines), ...before);
      total += t.vat;
    }
    return {
      type: 'restaurant-vat',
      cycle: 'achats',
      assertion: 'existence',
      qualification: 'erreur',
      actor: 'accountant',
      accounts: [{ account: '411', amount: total }, { account: '615', amount: total }],
      correction: merge(correction),
      traces: [...targets.map(({ entry }) => REF.purchase(entry.id)), ...targets.map(({ invoice }) => REF.invoiceLine(invoice.id, 'vat')), REF.topic()],
      params: { count: String(targets.length), restaurant: partyName(books, targets[0]!.invoice.partyId), vat: formatAmount(total) },
    };
  },
};

export const debitCreditInversion: AnomalyDefinition = {
  type: 'debit-credit-inversion',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books } = ctx;
    const { entry, invoice } = claim(ctx, purchaseEntries(books, (e, i) => i.kind === 'credit-note' && octNov(e.date)), (t) => t.entry.id);
    const { base, total } = totalsOf(invoice);
    const before = entry.lines;
    entry.lines = reverse(entry.lines);
    return {
      type: 'debit-credit-inversion',
      cycle: 'achats',
      assertion: 'existence',
      qualification: 'erreur',
      supplierId: invoice.partyId,
      actor: 'accountant',
      accounts: [{ account: '440', amount: 2 * total }, { account: '604', amount: 2 * (invoice.vatDeductible ? base : total) }],
      correction: merge([...reverse(entry.lines), ...before]),
      traces: [REF.purchase(entry.id), REF.invoiceLine(invoice.id, 'total'), REF.supplierBalance(invoice.partyId), REF.supplierConfirmation(invoice.partyId), REF.bank(paymentOf(books, invoice.id)!.id), REF.topic()],
      params: {
        supplier: partyName(books, invoice.partyId),
        number: invoice.number,
        base: formatAmount(base),
        total: formatAmount(total),
        doubleTotal: formatAmount(2 * total),
        doubleBase: formatAmount(2 * (invoice.vatDeductible ? base : total)),
      },
    };
  },
};

export const missingDepreciation: AnomalyDefinition = {
  type: 'missing-depreciation',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, rng, company } = ctx;
    const year = company.fiscalYear;
    const free = books.assets.filter((a) => !ctx.used.has(a.id));
    const newAsset = free.find((a) => a.acquisitionDate.startsWith(String(year)));
    const wrongDuration = newAsset !== undefined && rng.chance(0.5);
    const asset = wrongDuration ? newAsset : rng.pick(free.filter((a) => a !== newAsset && depreciationFor(a, year) > 0));
    ctx.used.add(asset.id);
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
      actor: 'accountant',
      accounts: [{ account: '6302', amount: diff }, { account: asset.depreciationAccount, amount: diff }],
      correction: [d('6302', diff), c(asset.depreciationAccount, diff)],
      traces: [REF.asset(asset.id), wrongDuration && invoice ? REF.invoiceLine(invoice.id, 0) : REF.analytic('6302'), REF.topic()],
      params,
      variant: wrongDuration ? 'wrong-duration' : 'forgotten',
    };
  },
};

export const capexExpensed: AnomalyDefinition = {
  type: 'capex-expensed',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, company } = ctx;
    const asset = books.assets.find((a) => a.acquisitionDate.startsWith(String(company.fiscalYear)))!;
    if (ctx.used.has(asset.id)) throw new Error('Investissement déjà utilisé');
    ctx.used.add(asset.id);
    const invoice = books.invoices.find((i) => i.assetId === asset.id)!;
    const entry = books.entries.find((e) => e.journal === 'ACH' && e.invoiceId === invoice.id)!;
    ctx.used.add(entry.id);
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
      actor: 'accountant',
      accounts: [{ account: asset.account, amount: asset.cost }, { account: '611', amount: asset.cost }],
      correction: [d(asset.account, asset.cost), d('6302', depreciation), c('611', asset.cost), c(asset.depreciationAccount, depreciation)],
      traces: [REF.purchase(entry.id), REF.invoiceLine(invoice.id, 0), REF.analytic('611'), REF.topic()],
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
  },
};

export const SIMPLE_ERRORS = [duplicatePurchase, wrongVatRate, restaurantVat, debitCreditInversion, missingDepreciation, capexExpensed];
