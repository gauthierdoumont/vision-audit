// Fraudes et erreurs du cycle achats / fournisseurs. Audit Detective — créé par Gauthier Doumont.
import { LOCALITIES, STREETS } from '../../content/names';
import { REF } from '../ids';
import { orionParty } from '../orion';
import { between, fictitiousCompanyNumber, MONTHS, sortEntries } from '../ledger';
import { addDays, formatAmount, formatDate, isoDate, monthOf } from '../money';
import type { Entry, Invoice, Party } from '../types';
import {
  addParty, c, claim, d, deductibleVat, everywhere, merge, octNov, partyName, paymentOf, purchaseEntries, reverse, totalsOf, type AnomalyDefinition, type InjectContext,
} from './types';

/** Facture d'achat, son écriture et son paiement, ajoutés aux livres. */
function bookInvoice(ctx: InjectContext, invoice: Invoice, label: string, paidOn: string | null) {
  const { base, vat, total } = totalsOf(invoice);
  const purchase: Entry = {
    id: ctx.newId('e'),
    journal: 'ACH',
    date: invoice.date,
    label,
    lines: [d(invoice.account, invoice.vatDeductible ? base : total), d('411', invoice.vatDeductible ? vat : 0), c('440', total)].filter((l) => l.debit || l.credit),
    partyId: invoice.partyId,
    invoiceId: invoice.id,
  };
  const payment: Entry | null = paidOn
    ? { id: ctx.newId('e'), journal: 'FIN', date: paidOn, label: `Paiement ${invoice.number}`, lines: [d('440', total), c('550', total)], partyId: invoice.partyId, invoiceId: invoice.id }
    : null;
  ctx.books.invoices.push(invoice);
  ctx.books.entries.push(purchase, ...(payment ? [payment] : []));
  sortEntries(ctx.books.entries);
  return { purchase, payment };
}

/** Le comptable facture des « missions de conseil » via une société écran payée sur son propre compte. */
export const fictitiousSupplier: AnomalyDefinition = {
  type: 'fictitious-supplier',
  appliesTo: deductibleVat,
  inject: (ctx) => {
    const { books, truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const accountant = books.world.employees.find((e) => e.role === 'Comptabilité')!;
    const party: Party = ctx.orion
      ? { ...orionParty(ctx, 'supplier'), iban: accountant.iban }
      : {
          id: ctx.newId('p'),
          kind: 'supplier',
          name: `${rng.pick(['Optima Conseil', 'Gestion & Stratégie', 'BizConsult Partners', 'Process Advisory'])} SRL`,
          address: `Boîte postale ${rng.int(100, 999)}, 5000 Namur`,
          iban: accountant.iban,
        };
    if (ctx.orion) for (const b of [truth, books]) b.parties.find((p) => p.id === party.id)!.iban = accountant.iban;
    else addParty(ctx, party);
    ctx.used.add(party.id);
    // Juste sous le seuil de 5 000 € HTVA au-delà duquel la gérance doit signer.
    const months = [10, 11];
    const fakes = months.map((month) => {
      const date = isoDate(year, month, rng.int(2, 14));
      const invoice: Invoice = {
        id: ctx.newId('i'),
        kind: 'invoice',
        flow: 'purchase',
        number: `OC-${year}-${rng.int(10, 99)}`,
        date,
        dueDate: addDays(date, 15),
        partyId: party.id,
        account: '613',
        lines: [{ label: `Mission de conseil en organisation — ${MONTHS[month - 1]}`, quantity: 1, unitPrice: between(rng, [4750, 4990], 5), vatRate: 21 }],
        vatDeductible: true,
      };
      const booked = bookInvoice(ctx, invoice, `Honoraires ${party.name}`, addDays(date, 15));
      // En réalité, l'argent est parti chez le comptable : une créance sur lui (416), sans facture réelle.
      truth.entries.push({ ...structuredClone(booked.payment!), label: `Virement ${party.name}`, lines: [d('416', totalsOf(invoice).total), c('550', totalsOf(invoice).total)] });
      return { invoice, ...booked };
    });
    sortEntries(truth.entries);
    for (const b of [truth, books]) {
      b.world.minutes.push({ id: 'm-seuil', date: isoDate(year, 2, rng.int(2, 26)), meeting: 'Organe d’administration', text: 'Rappel : toute dépense de plus de 5 000 € HTVA doit être approuvée et signée par la gérance.' });
    }
    const base = fakes.reduce((s, f) => s + totalsOf(f.invoice).base, 0);
    const total = fakes.reduce((s, f) => s + totalsOf(f.invoice).total, 0);
    // Une vraie coquille vide (Orion) figure à la BCE ; une société inventée, non.
    const registryRef = party.registryId ? REF.registry(party.registryId) : REF.registry(`none-${party.id}`);
    return {
      type: 'fictitious-supplier',
      cycle: 'achats',
      assertion: 'existence',
      qualification: 'fraude',
      actor: 'accountant',
      accounts: [{ account: '613', amount: base }, { account: '416', amount: total }],
      correction: merge(fakes.flatMap((f) => [...reverse(f.purchase.lines), ...reverse(f.payment!.lines), d('416', totalsOf(f.invoice).total), c('550', totalsOf(f.invoice).total)])),
      traces: [
        ...fakes.map((f) => REF.purchase(f.purchase.id)),
        REF.invoiceLine(fakes[0]!.invoice.id, 'iban'),
        REF.payroll(accountant.id),
        registryRef,
        REF.benfordThreshold(),
        REF.confession(),
      ],
      contradictedBy: [REF.payroll(accountant.id), registryRef, REF.invoiceLine(fakes[0]!.invoice.id, 'iban')],
      params: { registry: party.registryId ? 'coquille' : 'inconnue', supplier: party.name, count: String(fakes.length), base: formatAmount(base), total: formatAmount(total), iban: party.iban, accountant: `${accountant.firstName} ${accountant.lastName}` },
    };
  },
};

/** Facture de décembre jamais encodée : la dette est omise. */
export const unrecordedInvoice: AnomalyDefinition = {
  type: 'unrecorded-invoice',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, company } = ctx;
    const year = company.fiscalYear;
    const { entry, invoice } = claim(
      ctx,
      purchaseEntries(books, (e, i) => i.kind === 'invoice' && i.account === '604' && e.date >= isoDate(year, 12, 3) && !paymentOf(books, i.id)),
      (t) => t.entry.id,
    );
    books.entries = books.entries.filter((e) => e.id !== entry.id);
    books.invoices = books.invoices.filter((i) => i.id !== invoice.id);
    const { base, total } = totalsOf(invoice);
    return {
      type: 'unrecorded-invoice',
      cycle: 'achats',
      assertion: 'exhaustivite',
      qualification: 'erreur',
      supplierId: invoice.partyId,
      actor: 'accountant',
      accounts: [{ account: '440', amount: total }, { account: '604', amount: invoice.vatDeductible ? base : total }],
      correction: merge(entry.lines),
      traces: [REF.afterClosing(`pay-${invoice.id}`), REF.supplierConfirmation(invoice.partyId), REF.topic()],
      params: { supplier: partyName(books, invoice.partyId), number: invoice.number, date: formatDate(invoice.date), base: formatAmount(base), total: formatAmount(total) },
    };
  },
};

const PRIVATE_ITEMS = [
  { shop: 'Électro Center Namur', label: 'Téléviseur OLED 65 pouces et barre de son', price: [2600, 3400] as const },
  { shop: 'Maison & Jardin Wallonie', label: 'Salon de jardin en teck (table et 6 chaises)', price: [2800, 3900] as const },
  { shop: 'Vélo Plus Gembloux', label: 'Vélo électrique de randonnée', price: [3200, 4300] as const },
];

/** Achat privé du gérant, livré chez lui, passé en charges avec TVA déduite. */
export const privateExpense: AnomalyDefinition = {
  type: 'private-expense',
  appliesTo: deductibleVat,
  inject: (ctx) => {
    const { truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const item = rng.pick(PRIVATE_ITEMS);
    const home = rng.pick(LOCALITIES.filter((l) => l.city !== company.city));
    const party: Party = { id: ctx.newId('p'), kind: 'supplier', name: item.shop, address: `${home.postalCode} ${home.city}`, iban: `BE00 9999 ${rng.int(1000, 9999)} ${rng.int(1000, 9999)}`, registryId: ctx.newId('bce') };
    addParty(ctx, party, {
      id: party.registryId!,
      name: party.name,
      number: fictitiousCompanyNumber(rng),
      address: party.address,
      founded: String(rng.int(1995, 2015)),
      directors: ['Direction commerciale'],
      activity: 'Commerce de détail',
      status: 'Active',
    });
    const date = isoDate(year, rng.pick([10, 11]), rng.int(3, 20));
    const invoice: Invoice = {
      id: ctx.newId('i'),
      kind: 'invoice',
      flow: 'purchase',
      number: `T${rng.int(100000, 999999)}`,
      date,
      dueDate: addDays(date, 10),
      partyId: party.id,
      account: '611',
      lines: [{ label: item.label, quantity: 1, unitPrice: between(rng, item.price, 1), vatRate: 21 }],
      vatDeductible: true,
      deliveryAddress: `Domicile de ${company.manager.firstName} ${company.manager.lastName}, ${rng.pick(STREETS)} ${rng.int(1, 90)}, ${home.postalCode} ${home.city}`,
    };
    const booked = bookInvoice(ctx, invoice, `Fournitures et petit matériel — ${party.name}`, addDays(date, 10));
    // En réalité, c'est une dépense privée : une créance sur le gérant (416), sans TVA déductible.
    const { base, vat, total } = totalsOf(invoice);
    truth.invoices.push({ ...structuredClone(invoice), account: '416', vatDeductible: false });
    truth.entries.push({ ...structuredClone(booked.purchase), lines: [d('416', total), c('440', total)] }, structuredClone(booked.payment!));
    sortEntries(truth.entries);
    return {
      type: 'private-expense',
      cycle: 'achats',
      assertion: 'existence',
      qualification: 'fraude',
      actor: 'manager',
      accounts: [{ account: '611', amount: base }, { account: '416', amount: total }],
      correction: [d('416', total), c('611', base), c('411', vat)],
      traces: [REF.purchase(booked.purchase.id), REF.invoiceLine(invoice.id, 'delivery'), REF.invoiceLine(invoice.id, 0), REF.confession()],
      contradictedBy: [REF.invoiceLine(invoice.id, 'delivery')],
      params: { manager: `${company.manager.firstName} ${company.manager.lastName}`, shop: party.name, item: item.label, base: formatAmount(base), vat: formatAmount(vat), total: formatAmount(total), date: formatDate(date), month: MONTHS[monthOf(date) - 1]! },
    };
  },
};

/** Facture payée deux fois ; au 31/12, le comptable « solde » le compte débiteur du fournisseur en charges. */
export const doublePayment: AnomalyDefinition = {
  type: 'double-payment',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, rng, company } = ctx;
    const year = company.fiscalYear;
    const { invoice } = claim(
      ctx,
      purchaseEntries(books, (e, i) => {
        const paid = paymentOf(books, i.id);
        return i.kind === 'invoice' && i.account === '604' && octNov(e.date) && !!paid && paid.date >= isoDate(year, 10, 1) && paid.date <= isoDate(year, 12, 10);
      }),
      (t) => t.entry.id,
    );
    ctx.used.add(invoice.id);
    const first = paymentOf(books, invoice.id)!;
    const { total } = totalsOf(invoice);
    const supplier = partyName(books, invoice.partyId);
    // Le second virement est bien parti : le fournisseur nous doit ce montant et le rembourse en janvier.
    const second: Entry = { id: ctx.newId('e'), journal: 'FIN', date: addDays(first.date, rng.int(6, 15)), label: `Paiement ${invoice.number}`, lines: [d('440', total), c('550', total)], partyId: invoice.partyId, invoiceId: invoice.id };
    const refund = { id: ctx.newId('ev'), date: isoDate(year + 1, 1, rng.int(10, 28)), label: `Remboursement reçu — facture ${invoice.number} payée deux fois`, amount: total, partyId: invoice.partyId };
    everywhere(ctx, (b) => {
      b.entries.push(structuredClone(second));
      sortEntries(b.entries);
      b.world.afterClosing.push({ ...refund });
    });
    // Livres : au lieu de réclamer le remboursement, le solde débiteur est passé en charges.
    const writeOff: Entry = { id: ctx.newId('e'), journal: 'OD', date: isoDate(year, 12, 31), label: `Régularisation du solde ${supplier}`, lines: [d(invoice.account, total), c('440', total)], partyId: invoice.partyId };
    books.entries.push(writeOff);
    sortEntries(books.entries);
    return {
      type: 'double-payment',
      cycle: 'achats',
      assertion: 'existence',
      qualification: 'erreur',
      supplierId: invoice.partyId,
      actor: 'accountant',
      accounts: [{ account: invoice.account, amount: total }, { account: '440', amount: total }],
      correction: [d('440', total), c(invoice.account, total)],
      traces: [REF.bank(first.id), REF.bank(second.id), REF.supplierConfirmation(invoice.partyId), REF.afterClosing(refund.id), REF.topic()],
      params: { supplier, number: invoice.number, total: formatAmount(total), first: formatDate(first.date), second: formatDate(second.date), refund: formatDate(refund.date, true) },
    };
  },
};

export const PURCHASE_ANOMALIES = [fictitiousSupplier, unrecordedInvoice, privateExpense, doublePayment];
