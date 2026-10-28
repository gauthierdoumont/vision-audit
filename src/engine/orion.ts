// Apparitions d'Orion Trading dans les comptes des clients. Audit Detective — créé par Gauthier Doumont.
import { ORION } from '../content/orion';
import { addParty, c, d, everywhere, type InjectContext } from './anomalies/types';
import { between, sortEntries } from './ledger';
import { addDays, isoDate } from './money';
import type { Entry, Invoice, Party } from './types';

export function orionParty(ctx: InjectContext, kind: Party['kind']): Party {
  const existing = ctx.books.parties.find((p) => p.name === ORION.name && p.kind === kind);
  if (existing) return existing;
  const party: Party = { id: ctx.newId('p'), kind, name: ORION.name, address: ORION.address, iban: `BE00 9999 0077 ${ctx.rng.int(1000, 9999)}`, registryId: ctx.newId('bce') };
  addParty(ctx, party, { id: party.registryId!, name: ORION.name, number: ORION.number, address: ORION.address, founded: String(ctx.company.fiscalYear - 2), directors: [ORION.director], activity: 'Intermédiation commerciale', status: 'Active' });
  return party;
}

/** Une petite commission d'Orion, réelle et payée : un indice du fil rouge, pas une anomalie du dossier. */
export function injectOrionCameo(ctx: InjectContext): void {
  const { rng, company } = ctx;
  const party = orionParty(ctx, 'supplier');
  const date = isoDate(company.fiscalYear, rng.pick([10, 11]), rng.int(3, 20));
  const base = between(rng, [900, 2400], 10);
  const invoice: Invoice = {
    id: ctx.newId('i'),
    kind: 'invoice',
    flow: 'purchase',
    number: `ORT-${company.fiscalYear}-${rng.int(100, 999)}`,
    date,
    dueDate: addDays(date, 15),
    partyId: party.id,
    account: '613',
    lines: [{ label: 'Commission d’intermédiation commerciale', quantity: 1, unitPrice: base, vatRate: 21 }],
    vatDeductible: !ctx.sector.vatExempt,
  };
  const vat = Math.round((base * 21) / 100);
  const charge = invoice.vatDeductible ? base : base + vat;
  const purchase: Entry = { id: ctx.newId('e'), journal: 'ACH', date, label: `Commission ${ORION.name}`, lines: [d('613', charge), ...(invoice.vatDeductible ? [d('411', vat)] : []), c('440', base + vat)], partyId: party.id, invoiceId: invoice.id };
  const payment: Entry = { id: ctx.newId('e'), journal: 'FIN', date: addDays(date, 15), label: `Paiement ${invoice.number}`, lines: [d('440', base + vat), c('550', base + vat)], partyId: party.id, invoiceId: invoice.id };
  everywhere(ctx, (b) => {
    b.invoices.push(structuredClone(invoice));
    b.entries.push(structuredClone(purchase), structuredClone(payment));
    sortEntries(b.entries);
  });
}
