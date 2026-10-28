// Anomalies sur les stocks. Audit Detective — créé par Gauthier Doumont.
import { REF } from '../ids';
import { restateStock, stockValue } from '../ledger';
import { euros, formatAmount, isoDate, roundTo } from '../money';
import type { StockItem } from '../types';
import { c, claim, d, everywhere, type AnomalyDefinition } from './types';

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

export const STOCK_ANOMALIES = [inflatedStock, obsoleteStock];
