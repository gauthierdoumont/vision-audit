// Anomalies du cycle personnel. Audit Detective — créé par Gauthier Doumont.
import { randomPerson } from '../company';
import { REF } from '../ids';
import { between, EMPLOYER_ONSS, MONTHS, sortEntries } from '../ledger';
import { formatAmount, isoDate, daysInMonth } from '../money';
import type { Employee, Entry } from '../types';
import { c, d, type AnomalyDefinition } from './types';

/** Un employé fantôme ajouté à la paie au 4e trimestre ; son salaire part chez le comptable. */
export const ghostEmployee: AnomalyDefinition = {
  type: 'ghost-employee',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const accountant = books.world.employees.find((e) => e.role === 'Comptabilité')!;
    const person = randomPerson(rng, [company.manager, company.accountant, ...books.world.employees]);
    const ghost: Employee = {
      id: ctx.newId('emp'),
      ...person,
      role: books.world.employees[books.world.employees.length - 1]!.role,
      iban: accountant.iban,
      startDate: isoDate(year, 10, 1),
      monthlyGross: books.world.employees[1]?.monthlyGross ?? accountant.monthlyGross,
      registered: false,
    };
    // Le fantôme figure au journal de paie (livres), jamais au registre du personnel (vérité).
    books.world.employees.push(ghost);
    const net = between(rng, [1900, 2300], 10);
    const payments = [10, 11, 12].map((month) => {
      const entry: Entry = { id: ctx.newId('e'), journal: 'FIN', date: isoDate(year, month, daysInMonth(year, month)), label: `Salaire net ${MONTHS[month - 1]} — ${person.firstName} ${person.lastName}`, lines: [d('620', net), c('550', net)] };
      books.entries.push(entry);
      truth.entries.push({ ...structuredClone(entry), label: `Virement ${MONTHS[month - 1]} — compte ${ghost.iban}`, lines: [d('416', net), c('550', net)] });
      return entry;
    });
    sortEntries(books.entries);
    sortEntries(truth.entries);
    const total = net * payments.length;
    return {
      type: 'ghost-employee',
      cycle: 'personnel',
      assertion: 'existence',
      qualification: 'fraude',
      actor: 'accountant',
      accounts: [{ account: '620', amount: total }, { account: '416', amount: total }],
      correction: [d('416', total), c('620', total)],
      traces: [REF.payroll(ghost.id), REF.payroll(accountant.id), ...payments.map((p) => REF.bank(p.id)), REF.confession()],
      contradictedBy: [REF.payroll(ghost.id), REF.payroll(accountant.id)],
      params: { ghost: `${person.firstName} ${person.lastName}`, accountant: `${accountant.firstName} ${accountant.lastName}`, iban: ghost.iban, total: formatAmount(total), net: formatAmount(net) },
    };
  },
};

/** Les cotisations patronales de décembre ne sont pas comptabilisées. */
export const unrecordedSocialDebt: AnomalyDefinition = {
  type: 'unrecorded-social-debt',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, company } = ctx;
    const year = company.fiscalYear;
    const entry = books.entries.find((e) => e.journal === 'OD' && e.date === isoDate(year, 12, 31) && e.lines.some((l) => l.account === '621'))!;
    if (ctx.used.has(entry.id)) throw new Error('Déjà utilisé');
    ctx.used.add(entry.id);
    books.entries = books.entries.filter((e) => e !== entry);
    const amount = entry.lines.find((l) => l.account === '621')!.debit;
    return {
      type: 'unrecorded-social-debt',
      cycle: 'personnel',
      assertion: 'exhaustivite',
      qualification: 'erreur',
      actor: 'accountant',
      accounts: [{ account: '621', amount }, { account: '454', amount }],
      correction: [d('621', amount), c('454', amount)],
      traces: [REF.afterClosing('onss-12'), REF.balance('454'), REF.analytic('621'), REF.topic()],
      params: { amount: formatAmount(amount), rate: String(EMPLOYER_ONSS) },
    };
  },
};

export const PAYROLL_ANOMALIES = [ghostEmployee, unrecordedSocialDebt];
