// Fraudes de trésorerie. Audit Detective — créé par Gauthier Doumont.
import { REF } from '../ids';
import { between, fictitiousIban, sortEntries } from '../ledger';
import { addDays, euros, formatAmount, formatDate, isoDate, roundTo } from '../money';
import type { Entry } from '../types';
import { c, claim, d, invoicedSales, partyName, paymentOf, saleEntries, salesTotal, totalsOf, type AnomalyDefinition } from './types';

/** Compte d'épargne inventé (façon Parmalat) : un actif qui n'existe pas, gonflant le résultat. */
export const fictitiousBankAccount: AnomalyDefinition = {
  type: 'fictitious-bank-account',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, rng, company } = ctx;
    const amount = roundTo(Math.round((salesTotal(books) * rng.int(3, 6)) / 100), euros(1000));
    const bank = rng.pick(['Banque Hesbaye', 'Crédit du Condroz', 'Banque Mosane']);
    books.world.bankAccounts.push({ id: 'bk-epargne', bank, iban: fictitiousIban(rng), account: '5501', label: 'Compte épargne' });
    const entry: Entry = {
      id: ctx.newId('e'),
      journal: 'OD',
      date: isoDate(company.fiscalYear, 12, 31),
      label: `Placement — ${bank}, compte épargne`,
      lines: [d('5501', amount), c('74', amount)],
    };
    books.entries.push(entry);
    sortEntries(books.entries);
    return {
      type: 'fictitious-bank-account',
      cycle: 'trésorerie',
      assertion: 'existence',
      qualification: 'fraude',
      actor: 'manager',
      accounts: [{ account: '5501', amount }, { account: '74', amount }],
      correction: [d('74', amount), c('5501', amount)],
      traces: [REF.balance('5501'), REF.bankConfirmation('bc-bk-epargne'), REF.confession()],
      contradictedBy: [REF.bankConfirmation('bc-bk-epargne')],
      params: { bank, amount: formatAmount(amount) },
    };
  },
};

/** Virements vers le compte privé du gérant, déguisés en honoraires. */
export const personalTransfer: AnomalyDefinition = {
  type: 'personal-transfer',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const manager = `${company.manager.firstName} ${company.manager.lastName}`;
    const iban = fictitiousIban(rng);
    const transfers = [10, 11, 12].slice(0, rng.int(2, 3)).map((month) => {
      const amount = between(rng, [1500, 3500], 50);
      const entry: Entry = { id: ctx.newId('e'), journal: 'FIN', date: isoDate(year, month, rng.int(3, 26)), label: 'Honoraires — conseil', lines: [d('613', amount), c('550', amount)] };
      books.entries.push(entry);
      truth.entries.push({ ...structuredClone(entry), label: `Virement vers ${iban} — ${manager}`, lines: [d('416', amount), c('550', amount)] });
      return entry;
    });
    sortEntries(books.entries);
    sortEntries(truth.entries);
    const total = transfers.reduce((s, t) => s + t.lines[0]!.debit, 0);
    return {
      type: 'personal-transfer',
      cycle: 'trésorerie',
      assertion: 'existence',
      qualification: 'fraude',
      actor: 'manager',
      accounts: [{ account: '613', amount: total }, { account: '416', amount: total }],
      correction: [d('416', total), c('613', total)],
      traces: [...transfers.map((t) => REF.bank(t.id)), REF.analytic('613'), REF.confession()],
      contradictedBy: transfers.map((t) => REF.bank(t.id)),
      params: { manager, iban, count: String(transfers.length), total: formatAmount(total) },
    };
  },
};

/**
 * Rapprochement « arrangé » : le comptable a encaissé le chèque d'un client sur son compte privé. Dans les livres, le
 * chèque est « remis le 31/12 » ; l'écart avec la banque est justifié par un faux poste de rapprochement.
 */
export const riggedReconciliation: AnomalyDefinition = {
  type: 'rigged-reconciliation',
  appliesTo: invoicedSales,
  inject: (ctx) => {
    const { books, truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const { invoice } = claim(
      ctx,
      saleEntries(books, (e, i) => i.kind === 'invoice' && e.date >= isoDate(year, 10, 1) && e.date <= isoDate(year, 12, 24) && !paymentOf(books, i.id) && !ctx.used.has(i.partyId)),
      (t) => t.entry.id,
    );
    ctx.used.add(invoice.partyId);
    ctx.used.add(invoice.id);
    const { total } = totalsOf(invoice);
    const client = partyName(books, invoice.partyId);
    const chequeDate = [isoDate(year, 12, rng.int(14, 22)), addDays(invoice.date, 3)].sort()[1]!;
    const id = ctx.newId('e');
    // Vérité : le client a payé par chèque ; le chèque a été encaissé sur le compte du comptable (créance 416).
    truth.entries.push({ id, journal: 'FIN', date: chequeDate, label: `Chèque du client ${client} encaissé sur un compte privé`, lines: [d('416', total), c('400', total)], partyId: invoice.partyId, invoiceId: invoice.id });
    // Livres : le chèque est « remis à la banque le 31/12 » et le rapprochement invente un encaissement en cours.
    books.entries.push({ id, journal: 'FIN', date: isoDate(year, 12, 31), label: `Remise de chèque — ${invoice.number}`, lines: [d('550', total), c('400', total)], partyId: invoice.partyId, invoiceId: invoice.id });
    books.world.reconciliation.push({ id: 'cheque', label: `chèque du client ${client} remis le 31/12, en cours d’encaissement`, amount: total });
    sortEntries(truth.entries);
    sortEntries(books.entries);
    const accountant = books.world.employees.find((e) => e.role === 'Comptabilité')!;
    return {
      type: 'rigged-reconciliation',
      cycle: 'trésorerie',
      assertion: 'existence',
      qualification: 'fraude',
      clientId: invoice.partyId,
      actor: 'accountant',
      accounts: [{ account: '550', amount: total }, { account: '416', amount: total }],
      correction: [d('416', total), c('550', total)],
      traces: [REF.reconciliation('cheque'), REF.bankConfirmation('bc-bk1'), REF.clientConfirmationLine(invoice.partyId, id), REF.confession()],
      contradictedBy: [REF.bankConfirmation('bc-bk1'), REF.clientConfirmationLine(invoice.partyId, id)],
      bankGap: total,
      params: { client, number: invoice.number, total: formatAmount(total), cheque: formatDate(chequeDate), accountant: `${accountant.firstName} ${accountant.lastName}` },
    };
  },
};

export const TREASURY_ANOMALIES = [fictitiousBankAccount, personalTransfer, riggedReconciliation];
