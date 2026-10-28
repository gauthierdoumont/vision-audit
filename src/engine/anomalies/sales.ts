// Fraudes et erreurs du cycle ventes / clients. Audit Detective — créé par Gauthier Doumont.
import { REF } from '../ids';
import { sortEntries } from '../ledger';
import { euros, formatAmount, formatDate, isoDate, roundTo } from '../money';
import type { Entry, Invoice } from '../types';
import { c, claim, d, everywhere, invoicedSales, merge, partyName, reverse, saleEntries, salesTotal, totalsOf, type AnomalyDefinition } from './types';

/** Facture de vente inventée fin décembre, annulée par une note de crédit en janvier. */
export const fictitiousSale: AnomalyDefinition = {
  type: 'fictitious-sale',
  appliesTo: invoicedSales,
  inject: (ctx) => {
    const { books, rng, company, sector } = ctx;
    const year = company.fiscalYear;
    const client = claim(ctx, books.parties.filter((p) => p.kind === 'client'), (p) => p.id);
    const base = roundTo(Math.round((salesTotal(books) * rng.int(15, 30)) / 1000), euros(10));
    const lastNumber = Math.max(...books.invoices.filter((i) => i.flow === 'sale').map((i) => Number(i.number.split('-')[1])));
    const invoice: Invoice = {
      id: ctx.newId('i'),
      kind: 'invoice',
      flow: 'sale',
      number: `${year}-${String(lastNumber + 1).padStart(4, '0')}`,
      date: isoDate(year, 12, rng.int(28, 30)),
      dueDate: isoDate(year + 1, 1, 29),
      partyId: client.id,
      account: '700',
      lines: sector.salesMix.map((mix) => ({ label: mix.label, quantity: 1, unitPrice: Math.round(base * mix.share), vatRate: mix.vatRate })),
      vatDeductible: true,
    };
    const { base: net, vat, total } = totalsOf(invoice);
    const entry: Entry = {
      id: ctx.newId('e'),
      journal: 'VEN',
      date: invoice.date,
      label: `Facture ${invoice.number} — ${client.name}`,
      lines: [d('400', total), c('700', net), c('451', vat)].filter((l) => l.debit || l.credit),
      partyId: client.id,
      invoiceId: invoice.id,
    };
    books.invoices.push(invoice);
    books.entries.push(entry);
    sortEntries(books.entries);
    const cancellation = { id: ctx.newId('ev'), date: isoDate(year + 1, 1, rng.int(8, 20)), label: `Note de crédit émise — annule la facture ${invoice.number}`, amount: -total, partyId: client.id };
    everywhere(ctx, (b) => b.world.afterClosing.push({ ...cancellation }));
    return {
      type: 'fictitious-sale',
      cycle: 'ventes',
      assertion: 'existence',
      qualification: 'fraude',
      clientId: client.id,
      actor: 'manager',
      accounts: [{ account: '400', amount: total }, { account: '700', amount: net }],
      correction: merge(reverse(entry.lines)),
      traces: [REF.sale(entry.id), REF.cutoff(`f-${invoice.id}`), REF.clientConfirmation(client.id), REF.afterClosing(cancellation.id), REF.confession()],
      contradictedBy: [REF.cutoff(`f-${invoice.id}`), REF.afterClosing(cancellation.id), REF.clientConfirmation(client.id)],
      params: { client: client.name, number: invoice.number, date: formatDate(invoice.date), base: formatAmount(net), vat: formatAmount(vat), total: formatAmount(total), cancelled: formatDate(cancellation.date, true) },
    };
  },
};

/** Facture de décembre pour une livraison de janvier : le produit appartient à l'exercice suivant. */
export const earlyRevenue: AnomalyDefinition = {
  type: 'early-revenue',
  appliesTo: invoicedSales,
  inject: (ctx) => {
    const { books, truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const { entry, invoice } = claim(ctx, saleEntries(books, (e) => e.date >= isoDate(year, 12, 8)), (t) => t.entry.id);
    const delivery = isoDate(year + 1, 1, rng.int(4, 12));
    everywhere(ctx, (b) => {
      const i = b.invoices.find((x) => x.id === invoice.id)!;
      i.deliveryDate = delivery;
      const bl = b.world.deliveries.find((x) => x.invoiceNumber === invoice.number);
      if (bl) bl.date = delivery;
    });
    const truthEntry = truth.entries.find((e) => e.id === entry.id)!;
    truthEntry.lines = truthEntry.lines.map((l) => (l.account === '700' ? { ...l, account: '493' } : l));
    const { base } = totalsOf(invoice);
    return {
      type: 'early-revenue',
      cycle: 'ventes',
      assertion: 'separation',
      qualification: 'erreur',
      clientId: invoice.partyId,
      actor: 'accountant',
      accounts: [{ account: '700', amount: base }, { account: '493', amount: base }],
      correction: [d('700', base), c('493', base)],
      traces: [REF.sale(entry.id), REF.cutoff(`f-${invoice.id}`), REF.topic()],
      params: { client: partyName(books, invoice.partyId), number: invoice.number, date: formatDate(invoice.date), delivery: formatDate(delivery, true), base: formatAmount(base), year: String(year) },
    };
  },
};

/** Client déclaré en faillite en décembre : la créance ouverte doit être dépréciée. */
export const doubtfulReceivable: AnomalyDefinition = {
  type: 'doubtful-receivable',
  appliesTo: invoicedSales,
  inject: (ctx) => {
    const { books, truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const since = isoDate(year, 10, 15);
    const candidates = books.parties.filter((p) => p.kind === 'client' && books.invoices.some((i) => i.partyId === p.id && i.flow === 'sale' && i.date >= since));
    const client = claim(ctx, candidates, (p) => p.id);
    const open = books.invoices.filter((i) => i.partyId === client.id && i.flow === 'sale' && i.date >= since);
    for (const i of open) ctx.used.add(i.id);
    const openIds = new Set(open.map((i) => i.id));
    const bankruptcy = isoDate(year, 12, rng.int(8, 18));
    everywhere(ctx, (b) => {
      // Le client n'a plus rien payé depuis la mi-octobre.
      b.entries = b.entries.filter((e) => !(e.journal === 'FIN' && e.invoiceId && openIds.has(e.invoiceId)));
      b.parties.find((p) => p.id === client.id)!.status = 'bankrupt';
      const registry = b.world.registry.find((r) => r.id === client.registryId);
      if (registry) registry.status = `Faillite prononcée le ${formatDate(bankruptcy, true)}`;
      b.world.letters.push({
        id: 'curateur',
        from: 'Maître Lambert, curateur',
        subject: `Faillite de ${client.name}`,
        lines: [
          { id: 'l1', text: `Le tribunal de l’entreprise a déclaré la faillite de ${client.name} le ${formatDate(bankruptcy, true)}.` },
          { id: 'l2', text: 'Les créanciers sont invités à déposer leur déclaration de créance au greffe dans le mois.' },
          { id: 'l3', text: 'Vu l’état de l’actif, les créanciers ordinaires ne doivent espérer qu’un dividende très faible, voire nul.' },
        ],
      });
      b.world.minutes.push({ id: 'm-relances', date: isoDate(year, 11, rng.int(20, 28)), meeting: 'Organe d’administration', text: `${client.name} ne répond plus aux relances. On garde espoir d’être payé.` });
    });
    const total = open.reduce((s, i) => s + totalsOf(i).total, 0);
    const base = open.reduce((s, i) => s + totalsOf(i).base, 0);
    // Réduction de valeur sur le montant HTVA : la TVA pourra être récupérée auprès de l'État (À VÉRIFIER).
    const correction = [d('407', total), d('634', base), c('400', total), c('409', base)];
    truth.entries.push({ id: ctx.newId('e'), journal: 'OD', date: isoDate(year, 12, 31), label: `Créance douteuse ${client.name}`, lines: correction, partyId: client.id });
    sortEntries(truth.entries);
    return {
      type: 'doubtful-receivable',
      cycle: 'ventes',
      assertion: 'evaluation',
      qualification: 'erreur',
      clientId: client.id,
      actor: 'accountant',
      accounts: [{ account: '634', amount: base }, { account: '409', amount: base }, { account: '407', amount: total }, { account: '400', amount: total }],
      correction,
      traces: [REF.clientBalance(client.id), REF.legal('curateur-l1'), REF.minutes('m-relances'), REF.registry(client.registryId!), REF.clientConfirmation(client.id), REF.topic()],
      params: { client: client.name, total: formatAmount(total), base: formatAmount(base), date: formatDate(bankruptcy, true), count: String(open.length) },
    };
  },
};

export const SALES_ANOMALIES = [fictitiousSale, earlyRevenue, doubtfulReceivable];

