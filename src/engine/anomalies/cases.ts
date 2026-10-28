// Montages inspirés d'affaires réelles, ramenés à l'échelle d'une PME belge (niveaux 81-100).
// Audit Detective — créé par Gauthier Doumont.
import { REF } from '../ids';
import { orionParty } from '../orion';
import { fictitiousCompanyNumber, fictitiousIban, sortEntries } from '../ledger';
import { addDays, euros, formatAmount, isoDate, roundTo } from '../money';
import type { Entry, Invoice, Party } from '../types';
import { addParty, c, d, everywhere, invoicedSales, merge, reverse, salesTotal, totalsOf, type AnomalyDefinition, type InjectContext } from './types';

/** Société « partenaire » dirigée par la gérance (ou un prête-nom), inscrite à la BCE. */
function linkedCompany(ctx: InjectContext, name: string, kind: Party['kind'], activity: string): Party {
  const { rng, company } = ctx;
  const party: Party = { id: ctx.newId('p'), kind, name, address: `Boîte postale ${rng.int(100, 999)}, 1000 Bruxelles`, iban: fictitiousIban(rng), registryId: ctx.newId('bce') };
  addParty(ctx, party, {
    id: party.registryId!,
    name,
    number: fictitiousCompanyNumber(rng),
    address: party.address,
    founded: String(company.fiscalYear - 1),
    directors: [`${company.manager.firstName} ${company.manager.lastName}`],
    activity,
    status: 'Active',
  });
  return party;
}

/** Inspiration Lernout & Hauspie : ventes à des sociétés liées, payées avec l'argent prêté par la société elle-même. */
export const circularSales: AnomalyDefinition = {
  type: 'circular-sales',
  appliesTo: invoicedSales,
  inject: (ctx) => {
    const { books, rng, company, sector } = ctx;
    const year = company.fiscalYear;
    const partner = ctx.orion ? orionParty(ctx, 'client') : linkedCompany(ctx, `${rng.pick(['Nova', 'Delta', 'Atlas', 'Vega'])} Distribution Partners SRL`, 'client', 'Distribution — société créée l’an dernier');
    const base = roundTo(Math.round((salesTotal(books) * rng.int(5, 9)) / 100), euros(100));
    const invoice: Invoice = {
      id: ctx.newId('i'),
      kind: 'invoice',
      flow: 'sale',
      number: `${year}-${String(900 + rng.int(1, 99)).padStart(4, '0')}`,
      date: isoDate(year, 11, rng.int(3, 12)),
      dueDate: isoDate(year, 12, 15),
      partyId: partner.id,
      account: '700',
      lines: sector.salesMix.map((mix) => ({ label: `Licence de distribution exclusive — ${mix.label}`, quantity: 1, unitPrice: Math.round(base * mix.share), vatRate: mix.vatRate })),
      vatDeductible: true,
    };
    const t = totalsOf(invoice);
    const sale: Entry = { id: ctx.newId('e'), journal: 'VEN', date: invoice.date, label: `Facture ${invoice.number} — ${partner.name}`, lines: [d('400', t.total), c('700', t.base), ...(t.vat ? [c('451', t.vat)] : [])], partyId: partner.id, invoiceId: invoice.id };
    const loan: Entry = { id: ctx.newId('e'), journal: 'FIN', date: isoDate(year, 12, rng.int(1, 6)), label: `Avance de fonds — ${partner.name}`, lines: [d('416', t.total), c('550', t.total)], partyId: partner.id };
    const receipt: Entry = { id: ctx.newId('e'), journal: 'FIN', date: addDays(loan.date, rng.int(2, 5)), label: `Encaissement ${invoice.number}`, lines: [d('550', t.total), c('400', t.total)], partyId: partner.id, invoiceId: invoice.id };
    books.invoices.push(invoice);
    books.entries.push(sale, loan, receipt);
    // En réalité, l'argent a fait un aller-retour : ni vente ni prêt. On garde les mouvements bancaires.
    ctx.truth.entries.push({ ...structuredClone(loan), lines: [d('489', t.total), c('550', t.total)] }, { ...structuredClone(receipt), lines: [d('550', t.total), c('489', t.total)] });
    sortEntries(books.entries);
    sortEntries(ctx.truth.entries);
    everywhere(ctx, (b) =>
      b.world.contracts.push({
        id: 'side-letter',
        title: `Lettre annexe ${partner.name}`,
        partyId: partner.id,
        clauses: [`Si ${partner.name} ne revend pas les licences d’ici juin, elle pourra les rendre sans frais.`, 'Document signé par la gérance, non communiqué à la comptabilité.'],
      }),
    );
    return {
      type: 'circular-sales',
      cycle: 'parties liées',
      assertion: 'existence',
      qualification: 'fraude',
      clientId: partner.id,
      actor: 'manager',
      accounts: [{ account: '700', amount: t.base }, { account: '416', amount: t.total }],
      correction: merge([...reverse(sale.lines), ...reverse(loan.lines), ...reverse(receipt.lines), d('489', t.total), c('550', t.total), d('550', t.total), c('489', t.total)]),
      traces: [REF.sale(sale.id), REF.bank(loan.id), REF.bank(receipt.id), REF.registry(partner.registryId!), REF.contract('side-letter'), REF.confession()],
      contradictedBy: [REF.registry(partner.registryId!), REF.contract('side-letter'), REF.bank(loan.id)],
      params: { partner: partner.name, base: formatAmount(t.base), total: formatAmount(t.total), number: invoice.number },
    };
  },
};

/** Inspiration Ahold / US Foodservice : ristournes fournisseurs à recevoir gonflées. */
export const overstatedRebates: AnomalyDefinition = {
  type: 'overstated-rebates',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, rng, company } = ctx;
    const year = company.fiscalYear;
    const supplier = books.parties.find((p) => p.kind === 'supplier' && !ctx.used.has(p.id))!;
    ctx.used.add(supplier.id);
    const volume = books.invoices.filter((i) => i.partyId === supplier.id && i.flow === 'purchase').reduce((s, i) => s + (i.kind === 'credit-note' ? -1 : 1) * totalsOf(i).base, 0);
    const rate = rng.int(2, 3);
    const real = Math.round((volume * rate) / 100);
    const booked = roundTo(real * rng.int(4, 6), euros(100));
    const entryOf = (amount: number): Entry => ({ id: 'rebate', journal: 'OD', date: isoDate(year, 12, 31), label: `Ristourne de fin d’année à recevoir — ${supplier.name}`, lines: [d('404', amount), c('604', amount)], partyId: supplier.id });
    const id = ctx.newId('e');
    ctx.truth.entries.push({ ...entryOf(real), id });
    books.entries.push({ ...entryOf(booked), id });
    everywhere(ctx, (b) =>
      b.world.contracts.push({
        id: 'ristourne',
        title: `Accord commercial ${supplier.name}`,
        partyId: supplier.id,
        clauses: [`Ristourne de fin d’année : ${rate} % du volume d’achats HTVA, payée en mars.`, `Volume ${year} selon le fournisseur : ${formatAmount(volume)} € HTVA.`],
      }),
    );
    const diff = booked - real;
    return {
      type: 'overstated-rebates',
      cycle: 'achats',
      assertion: 'evaluation',
      qualification: 'fraude',
      supplierId: supplier.id,
      actor: 'manager',
      accounts: [{ account: '404', amount: diff }, { account: '604', amount: diff }],
      correction: [d('604', diff), c('404', diff)],
      traces: [REF.balance('404'), REF.contract('ristourne'), { doc: 'contrats', line: 'k-ristourne-1' }, REF.confession()],
      contradictedBy: [REF.contract('ristourne'), { doc: 'contrats', line: 'k-ristourne-1' }],
      params: { supplier: supplier.name, rate: String(rate), real: formatAmount(real), booked: formatAmount(booked), diff: formatAmount(diff) },
    };
  },
};

/** Inspiration Enron : un emprunt contracté via une société de projet, présenté comme un produit. */
export const disguisedLoan: AnomalyDefinition = {
  type: 'disguised-loan',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, rng, company } = ctx;
    const year = company.fiscalYear;
    const vehicle = linkedCompany(ctx, `${rng.pick(['Horizon', 'Phoenix', 'Raptor', 'Condor'])} Projets SRL`, 'supplier', 'Société de projet — financement');
    const amount = roundTo(Math.round((salesTotal(books) * rng.int(6, 10)) / 100), euros(1000));
    const entry: Entry = { id: ctx.newId('e'), journal: 'FIN', date: isoDate(year, 12, rng.int(10, 20)), label: `Indemnité de partenariat — ${vehicle.name}`, lines: [d('550', amount), c('74', amount)], partyId: vehicle.id };
    books.entries.push(entry);
    ctx.truth.entries.push({ ...structuredClone(entry), label: `Prêt reçu de ${vehicle.name}`, lines: [d('550', amount), c('489', amount)] });
    sortEntries(books.entries);
    sortEntries(ctx.truth.entries);
    everywhere(ctx, (b) =>
      b.world.contracts.push({
        id: 'projet',
        title: `Convention avec ${vehicle.name}`,
        partyId: vehicle.id,
        clauses: [`${vehicle.name} met ${formatAmount(amount)} € à disposition de la société, remboursables en 24 mois avec intérêts.`, `La société garantit l’emprunt bancaire contracté par ${vehicle.name} pour ce montant.`],
      }),
    );
    return {
      type: 'disguised-loan',
      cycle: 'parties liées',
      assertion: 'presentation',
      qualification: 'fraude',
      actor: 'manager',
      accounts: [{ account: '74', amount }, { account: '489', amount }],
      correction: [d('74', amount), c('489', amount)],
      traces: [REF.bank(entry.id), REF.contract('projet'), REF.registry(vehicle.registryId!), REF.analytic('74'), REF.confession()],
      contradictedBy: [REF.contract('projet'), REF.registry(vehicle.registryId!)],
      params: { vehicle: vehicle.name, amount: formatAmount(amount) },
    };
  },
};

/** Inspiration Wirecard : des fonds « détenus par un fiduciaire » à l'étranger, qui n'existent pas. */
export const fictitiousEscrow: AnomalyDefinition = {
  type: 'fictitious-escrow',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, rng, company } = ctx;
    const amount = roundTo(Math.round((salesTotal(books) * rng.int(8, 14)) / 100), euros(1000));
    const trustee = rng.pick(['Pacific Trust Services', 'Island Escrow Ltd', 'Harbour Fiduciary Partners']);
    books.world.bankAccounts.push({ id: 'bk-fiducie', bank: `${trustee} (fiduciaire)`, iban: `XX00 ${rng.int(1000, 9999)} ${rng.int(1000, 9999)}`, account: '5502', label: 'Compte de tiers (fonds de partenaires de paiement)' });
    const entry: Entry = { id: ctx.newId('e'), journal: 'OD', date: isoDate(company.fiscalYear, 12, 31), label: `Commissions partenaires détenues par ${trustee}`, lines: [d('5502', amount), c('74', amount)] };
    books.entries.push(entry);
    sortEntries(books.entries);
    return {
      type: 'fictitious-escrow',
      cycle: 'trésorerie',
      assertion: 'existence',
      qualification: 'fraude',
      actor: 'manager',
      accounts: [{ account: '5502', amount }, { account: '74', amount }],
      correction: [d('74', amount), c('5502', amount)],
      traces: [REF.balance('5502'), REF.bankConfirmation('bc-bk-fiducie'), REF.confession()],
      contradictedBy: [REF.bankConfirmation('bc-bk-fiducie')],
      params: { trustee, amount: formatAmount(amount), escrow: formatAmount(amount) },
    };
  },
};

export const CASE_ANOMALIES = [circularSales, overstatedRebates, disguisedLoan, fictitiousEscrow];

