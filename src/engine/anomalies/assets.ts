// Immobilisations : charges activées à tort (inspiration WorldCom). Audit Detective — créé par Gauthier Doumont.
import { REF } from '../ids';
import { between, daysInYear, depreciationFor, fictitiousCompanyNumber, sortEntries } from '../ledger';
import { addDays, formatAmount, formatDate, isoDate } from '../money';
import type { Entry, Invoice, Party } from '../types';
import { addEverywhere, addParty, c, claim, d, everywhere, merge, purchaseEntriesOf, totalsOf, type AnomalyDefinition } from './types';

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

const DAY = 86_400_000;

/**
 * Un bien mis au rebut en octobre reste à l'actif et s'amortit toute l'année. En vérité, on l'amortit jusqu'à sa
 * sortie (prorata en jours, À VÉRIFIER), puis on sort sa valeur d'acquisition et ses amortissements ; la valeur nette
 * restante est une moins-value (663, À VÉRIFIER : 660 selon la pratique).
 */
export const scrappedAsset: AnomalyDefinition = {
  type: 'scrapped-asset',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const asset = claim(
      ctx,
      books.assets.filter((a) => !a.acquisitionDate.startsWith(String(year)) && a.cost - a.priorDepreciation - depreciationFor(a, year) > 0),
      (a) => a.id,
    );
    const scrapped = isoDate(year, 10, rng.int(1, 20));
    const days = (Date.parse(`${scrapped}T00:00:00Z`) - Date.UTC(year, 0, 1)) / DAY;
    const full = depreciationFor(asset, year);
    const toDate = Math.min(full, Math.round((Math.round(asset.cost / asset.years) * days) / daysInYear(year)));
    const net = asset.cost - asset.priorDepreciation - toDate;
    // Vérité : dotation jusqu'à la sortie, puis sortie du bien.
    const dotation = truth.entries.find((e) => e.journal === 'OD' && e.assetId === asset.id)!;
    dotation.lines = [d('6302', toDate), c(asset.depreciationAccount, toDate)];
    truth.entries.push({
      id: ctx.newId('e'),
      journal: 'OD',
      date: scrapped,
      label: `Mise au rebut — ${asset.label}`,
      lines: [d(asset.depreciationAccount, asset.priorDepreciation + toDate), d('663', net), c(asset.account, asset.cost)],
      assetId: asset.id,
    });
    sortEntries(truth.entries);
    // Une société de recyclage enlève le bien : sa facture (réelle) est dans les deux comptabilités.
    const name = rng.pick(['Recyclage Meuse', 'Ferrailles Mosanes', 'Éco-Démantèlement Wallon']) + ' SRL';
    const recycler: Party = { id: ctx.newId('p'), kind: 'supplier', name, address: '5100 Jambes', iban: `BE00 9999 ${rng.int(1000, 9999)} ${rng.int(1000, 9999)}`, registryId: ctx.newId('bce') };
    addParty(ctx, recycler, { id: recycler.registryId!, name, number: fictitiousCompanyNumber(rng), address: recycler.address, founded: String(rng.int(1990, 2015)), directors: ['Gérance'], activity: 'Collecte et recyclage de déchets', status: 'Active' });
    const date = addDays(scrapped, rng.int(1, 6));
    const invoice: Invoice = {
      id: ctx.newId('i'),
      kind: 'invoice',
      flow: 'purchase',
      number: `REC-${year}-${rng.int(100, 999)}`,
      date,
      dueDate: addDays(date, 15),
      partyId: recycler.id,
      account: '611',
      lines: [{ label: `Enlèvement et destruction : ${asset.label} (hors d’usage)`, quantity: 1, unitPrice: between(rng, [180, 450], 5), vatRate: 21 }],
      vatDeductible: !ctx.sector.vatExempt,
    };
    const entries = purchaseEntriesOf(ctx, invoice, `Enlèvement de matériel — ${name}`, addDays(date, 15));
    addEverywhere(ctx, invoice, entries);
    everywhere(ctx, (b) =>
      b.world.minutes.push({ id: 'm-rebut', date: addDays(scrapped, -rng.int(3, 10)), meeting: 'Organe d’administration', text: `${asset.label} hors d’usage : mise au rebut décidée, enlèvement par ${name} le ${formatDate(scrapped, true)}.` }),
    );
    const daysInFiscalYear = daysInYear(year);
    return {
      type: 'scrapped-asset',
      cycle: 'immobilisations',
      assertion: 'existence',
      qualification: 'erreur',
      actor: 'accountant',
      accounts: [{ account: asset.account, amount: asset.cost }, { account: '663', amount: net }],
      correction: merge([d(asset.depreciationAccount, asset.priorDepreciation + full), d('663', net), c('6302', full - toDate), c(asset.account, asset.cost)]),
      traces: [REF.asset(asset.id), REF.invoiceLine(invoice.id, 0), REF.minutes('m-rebut'), REF.topic()],
      params: {
        asset: asset.label,
        date: formatDate(scrapped, true),
        cost: formatAmount(asset.cost),
        prior: formatAmount(asset.priorDepreciation),
        full: formatAmount(full),
        toDate: formatAmount(toDate),
        days: String(days),
        daysInYear: String(daysInFiscalYear),
        net: formatAmount(net),
        account: asset.account,
        depreciationAccount: asset.depreciationAccount,
        recycler: name,
      },
    };
  },
};

export const ASSET_ANOMALIES = [capitalizedExpenses, scrappedAsset];
