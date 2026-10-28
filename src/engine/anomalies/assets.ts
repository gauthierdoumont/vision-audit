// Immobilisations : charges activées à tort (inspiration WorldCom). Audit Detective — créé par Gauthier Doumont.
import { REF } from '../ids';
import { between, fictitiousCompanyNumber, sortEntries } from '../ledger';
import { addDays, formatAmount, isoDate } from '../money';
import type { Entry, Invoice, Party } from '../types';
import { addParty, c, d, totalsOf, type AnomalyDefinition } from './types';

const REPAIRS = [
  'Remplacement de pièces d’usure et réglages',
  'Réparation de la toiture après infiltration',
  'Remise en peinture et petites réparations',
  'Révision générale des installations',
];

/** Des réparations ordinaires passées en immobilisations pour gonfler le résultat. */
export const capitalizedExpenses: AnomalyDefinition = {
  type: 'capitalized-expenses',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const party: Party = { id: ctx.newId('p'), kind: 'supplier', name: rng.pick(['Maintenance Wallonie', 'Répar’Tout Namur', 'Entretien Technique Collard']) + ' SRL', address: '5000 Namur', iban: `BE00 9999 ${rng.int(1000, 9999)} ${rng.int(1000, 9999)}`, registryId: ctx.newId('bce') };
    addParty(ctx, party, { id: party.registryId!, name: party.name, number: fictitiousCompanyNumber(rng), address: party.address, founded: String(rng.int(1990, 2015)), directors: ['Gérance'], activity: 'Entretien et réparation', status: 'Active' });
    const bills = [10, 11, 12].slice(0, rng.int(2, 3)).map((month, i) => {
      const date = isoDate(year, month, rng.int(2, 18));
      const invoice: Invoice = {
        id: ctx.newId('i'),
        kind: 'invoice',
        flow: 'purchase',
        number: `R-${year}-${rng.int(100, 999)}`,
        date,
        dueDate: addDays(date, 30),
        partyId: party.id,
        account: '611',
        lines: [{ label: REPAIRS[(i + rng.int(0, 3)) % REPAIRS.length]!, quantity: 1, unitPrice: between(rng, [3500, 8000], 10), vatRate: 21 }],
        vatDeductible: !ctx.sector.vatExempt,
      };
      const t = totalsOf(invoice);
      const charge = invoice.vatDeductible ? t.base : t.total;
      const truthEntry: Entry = {
        id: ctx.newId('e'),
        journal: 'ACH',
        date,
        label: `Réparations — ${party.name}`,
        lines: [d('611', charge), d('411', invoice.vatDeductible ? t.vat : 0), c('440', t.total)].filter((l) => l.debit || l.credit),
        partyId: party.id,
        invoiceId: invoice.id,
      };
      const bookEntry: Entry = { ...structuredClone(truthEntry), label: `Amélioration des installations — ${party.name}`, lines: truthEntry.lines.map((l) => (l.account === '611' ? { ...l, account: '2300' } : l)) };
      truth.invoices.push(structuredClone(invoice));
      truth.entries.push(truthEntry);
      books.invoices.push(invoice);
      books.entries.push(bookEntry);
      return { invoice, entry: bookEntry, charge };
    });
    sortEntries(truth.entries);
    sortEntries(books.entries);
    const total = bills.reduce((s, b) => s + b.charge, 0);
    return {
      type: 'capitalized-expenses',
      cycle: 'immobilisations',
      assertion: 'existence',
      qualification: 'fraude',
      supplierId: party.id,
      actor: 'manager',
      accounts: [{ account: '2300', amount: total }, { account: '611', amount: total }],
      correction: [d('611', total), c('2300', total)],
      traces: [...bills.map((b) => REF.purchase(b.entry.id)), REF.invoiceLine(bills[0]!.invoice.id, 0), REF.assetTotal(), REF.balance('2300'), REF.confession()],
      contradictedBy: bills.map((b) => REF.invoiceLine(b.invoice.id, 0)),
      params: { supplier: party.name, count: String(bills.length), total: formatAmount(total) },
    };
  },
};

export const ASSET_ANOMALIES = [capitalizedExpenses];
