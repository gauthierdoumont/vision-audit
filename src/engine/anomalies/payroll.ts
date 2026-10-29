// Anomalies du cycle personnel. Audit Detective — créé par Gauthier Doumont.
import { randomPerson } from '../company';
import { overtimePay } from '../documents/internal';
import { REF } from '../ids';
import { between, EMPLOYER_ONSS, MONTHS, sortEntries, WITHHOLDING_TAX, WORKER_ONSS } from '../ledger';
import { formatAmount, isoDate, daysInMonth } from '../money';
import type { Employee, Entry } from '../types';
import { c, d, employeeFor, merge, reverse, type AnomalyDefinition } from './types';

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

/** Heures supplémentaires de décembre gonflées par l'employé du magasin : la pointeuse en montre bien moins. */
export const inflatedOvertime: AnomalyDefinition = {
  type: 'inflated-overtime',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, truth, rng, company } = ctx;
    const yearEnd = isoDate(company.fiscalYear, 12, 31);
    const worker = employeeFor(books, 'storekeeper');
    if (ctx.used.has(worker.id) || worker.role === 'Comptabilité') throw new Error('Aucun employé disponible');
    ctx.used.add(worker.id);
    // Taux horaire brut : salaire mensuel ÷ (38 h × 13 semaines ÷ 3 mois).
    const hourlyRate = Math.round((worker.monthlyGross * 3) / (38 * 13));
    const real = rng.int(4, 9);
    const booked = real + rng.int(28, 42);
    worker.overtime = { hours: booked, hourlyRate };
    truth.world.employees.find((e) => e.id === worker.id)!.overtime = { hours: real, hourlyRate };
    const pay = (hours: number) => {
      const gross = overtimePay({ hours, hourlyRate });
      const onss = Math.round((gross * WORKER_ONSS) / 100);
      const tax = Math.round(((gross - onss) * WITHHOLDING_TAX) / 100);
      return { gross, onss, tax, net: gross - onss - tax, employer: Math.round((gross * EMPLOYER_ONSS) / 100) };
    };
    const name = `${worker.firstName} ${worker.lastName}`;
    const ids = [ctx.newId('e'), ctx.newId('e'), ctx.newId('e')] as const;
    const entries = (p: ReturnType<typeof pay>, payment: Entry['lines']): Entry[] => [
      { id: ids[0], journal: 'OD', date: yearEnd, label: `Heures supplémentaires de décembre — ${name}`, lines: [d('620', p.gross), c('454', p.onss), c('453', p.tax), c('455', p.net)] },
      { id: ids[1], journal: 'OD', date: yearEnd, label: `Cotisations patronales sur heures supplémentaires — ${name}`, lines: [d('621', p.employer), c('454', p.employer)] },
      { id: ids[2], journal: 'FIN', date: yearEnd, label: `Heures supplémentaires nettes — ${name}`, lines: payment },
    ];
    const paid = pay(booked);
    const due = pay(real);
    const booksEntries = entries(paid, [d('455', paid.net), c('550', paid.net)]);
    // Vérité : seules les heures pointées sont dues ; le net versé en trop est une créance sur l'employé (416).
    const truthEntries = entries(due, [d('455', due.net), d('416', paid.net - due.net), c('550', paid.net)]);
    books.entries.push(...booksEntries);
    truth.entries.push(...truthEntries);
    sortEntries(books.entries);
    sortEntries(truth.entries);
    return {
      type: 'inflated-overtime',
      cycle: 'personnel',
      assertion: 'existence',
      qualification: 'fraude',
      actor: 'storekeeper',
      accounts: [{ account: '620', amount: paid.gross - due.gross }, { account: '416', amount: paid.net - due.net }],
      correction: merge([...booksEntries.flatMap((e) => reverse(e.lines)), ...truthEntries.flatMap((e) => e.lines)]),
      traces: [REF.payroll(`${worker.id}-hs`), REF.timesheet(worker.id), REF.afterClosing('onss-12'), REF.confession()],
      contradictedBy: [REF.timesheet(worker.id)],
      params: {
        name,
        booked: String(booked),
        real: String(real),
        extra: String(booked - real),
        rate: formatAmount(hourlyRate),
        gross: formatAmount(paid.gross - due.gross),
        net: formatAmount(paid.net - due.net),
        employer: formatAmount(paid.employer - due.employer),
      },
    };
  },
};

export const PAYROLL_ANOMALIES = [ghostEmployee, unrecordedSocialDebt, inflatedOvertime];
