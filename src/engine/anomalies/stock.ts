// Anomalies sur les stocks. Audit Detective — créé par Gauthier Doumont.
import { REF } from '../ids';
import { restateStock, sortEntries, stockValue } from '../ledger';
import { euros, formatAmount, formatDate, isoDate, roundTo, vatOf } from '../money';
import type { StockItem } from '../types';
import { c, claim, d, everywhere, partyName, purchaseEntries, q4, salesTotal, type AnomalyDefinition } from './types';

/** Quantités gonflées sur la liste d'inventaire pour améliorer le résultat. */
export const inflatedStock: AnomalyDefinition = {
  type: 'inflated-stock',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, truth, rng } = ctx;
    const items = [claim(ctx, books.world.stock, (i) => i.id), claim(ctx, books.world.stock, (i) => i.id)];
    const before = stockValue(books.world.stock);
    for (const item of items) item.quantity = item.quantity * rng.int(2, 3) + rng.int(5, 30);
    restateStock(books);
    const diff = stockValue(books.world.stock) - before;
    const counted = (item: StockItem) => truth.world.stock.find((t) => t.id === item.id)!.quantity;
    return {
      type: 'inflated-stock',
      cycle: 'stocks',
      assertion: 'existence',
      qualification: 'fraude',
      actor: 'manager',
      accounts: [{ account: '340', amount: diff }, { account: '609', amount: diff }],
      correction: [d('609', diff), c('340', diff)],
      traces: [...items.map((i) => REF.inventory(i.id)), ...items.map((i) => REF.count(i.id)), REF.confession()],
      contradictedBy: items.map((i) => REF.count(i.id)),
      params: {
        items: items.map((i) => `${i.label} (${i.quantity} inscrits, ${counted(i)} comptés)`).join(' ; '),
        diff: formatAmount(diff),
      },
    };
  },
};

/** Articles invendables depuis deux ans, gardés à leur coût d'achat. */
export const obsoleteStock: AnomalyDefinition = {
  type: 'obsolete-stock',
  appliesTo: () => true,
  inject: (ctx) => {
    const { truth, books, rng, company } = ctx;
    const year = company.fiscalYear;
    const source = claim(ctx, books.world.stock, (i) => i.id);
    const item: StockItem = {
      id: `${source.id}-ancien`,
      label: `${source.label} — ancienne gamme`,
      quantity: rng.int(20, 60),
      unitCost: source.unitCost,
      lastMovement: isoDate(year - 2, rng.int(2, 11), rng.int(1, 28)),
      countNote: 'Emballages jaunis et poussiéreux, aucune sortie depuis longtemps',
    };
    everywhere(ctx, (b) => {
      b.world.stock.push({ ...item });
      restateStock(b);
    });
    // Valeur de réalisation estimée à 20 % du coût (À VÉRIFIER au cas par cas : liquidation à prix cassés).
    const value = item.quantity * item.unitCost;
    const writeDown = roundTo(Math.round(value * 0.8), euros(1));
    truth.entries.push({ id: ctx.newId('e'), journal: 'OD', date: isoDate(year, 12, 31), label: `Réduction de valeur ${item.label}`, lines: [d('631', writeDown), c('349', writeDown)] });
    return {
      type: 'obsolete-stock',
      cycle: 'stocks',
      assertion: 'evaluation',
      qualification: 'erreur',
      actor: 'storekeeper',
      accounts: [{ account: '631', amount: writeDown }, { account: '349', amount: writeDown }],
      correction: [d('631', writeDown), c('349', writeDown)],
      traces: [REF.inventory(item.id), REF.count(item.id), REF.topic()],
      params: { item: item.label, quantity: String(item.quantity), value: formatAmount(value), writeDown: formatAmount(writeDown), since: String(year - 2) },
    };
  },
};

/** Marchandises reçues le 30/12 et comptées dans le stock, mais facture (de janvier) non prise en charge. */
export const stockCutoff: AnomalyDefinition = {
  type: 'stock-cutoff',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const { invoice } = rng.pick(purchaseEntries(books, (e, i) => i.kind === 'invoice' && i.account === '604' && q4(e.date)));
    const product = invoice.lines[0]!;
    const supplier = partyName(books, invoice.partyId);
    const quantity = Math.max(2, Math.round((salesTotal(books) * rng.int(10, 22)) / 1000 / product.unitPrice));
    const value = quantity * product.unitPrice;
    const vat = vatOf(value, product.vatRate);
    const receipt = `BR-${rng.int(1000, 9999)}`;
    const item: StockItem = {
      id: ctx.newId('st'),
      label: `${product.label} — réception du 30/12`,
      quantity,
      unitCost: product.unitPrice,
      lastMovement: isoDate(year, 12, 30),
      countNote: `Livré le 30/12 par ${supplier} (bon ${receipt}), facture pas encore reçue`,
    };
    const payment = { id: ctx.newId('ev'), date: isoDate(year + 1, 1, rng.int(22, 31)), label: `Paiement facture du ${formatDate(isoDate(year + 1, 1, rng.int(3, 8)), true)} (marchandises du bon ${receipt}, livrées le 30/12)`, amount: -(value + vat), partyId: invoice.partyId };
    everywhere(ctx, (b) => {
      b.world.stock.push({ ...item });
      restateStock(b);
      b.world.afterClosing.push({ ...payment });
    });
    // La marchandise est à nous et comptée au 31/12 : son coût et la dette doivent l'être aussi (facture à recevoir, HTVA).
    truth.entries.push({ id: ctx.newId('e'), journal: 'OD', date: isoDate(year, 12, 31), label: `Facture à recevoir — ${supplier}, bon ${receipt}`, lines: [d('604', value), c('444', value)], partyId: invoice.partyId });
    sortEntries(truth.entries);
    return {
      type: 'stock-cutoff',
      cycle: 'stocks',
      assertion: 'separation',
      qualification: 'erreur',
      actor: 'storekeeper',
      accounts: [{ account: '604', amount: value }, { account: '444', amount: value }],
      correction: [d('604', value), c('444', value)],
      traces: [REF.count(item.id), REF.inventory(item.id), REF.afterClosing(payment.id), REF.topic()],
      params: { supplier, item: product.label, quantity: String(quantity), value: formatAmount(value), vat: formatAmount(vat), receipt, year: String(year) },
    };
  },
};

export const STOCK_ANOMALIES = [inflatedStock, obsoleteStock, stockCutoff];
