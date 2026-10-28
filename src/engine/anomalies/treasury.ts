// Fraudes de trésorerie. Audit Detective — créé par Gauthier Doumont.
import { REF } from '../ids';
import { between, fictitiousIban, sortEntries } from '../ledger';
import { euros, formatAmount, isoDate, roundTo } from '../money';
import type { Entry } from '../types';
import { c, d, salesTotal, type AnomalyDefinition } from './types';

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

export const TREASURY_ANOMALIES = [fictitiousBankAccount, personalTransfer];
