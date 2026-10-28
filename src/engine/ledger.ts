// Génère la comptabilité « vraie » d'un exercice : opérations, écritures, factures, immobilisations,
// et le monde qui les entoure (personnel, registres, PV, livraisons, stock).
// Les anomalies sont injectées ensuite (voir anomalies/). Audit Detective — créé par Gauthier Doumont.
//
// Simplifications assumées :
// - ONSS travailleur 13,07 %, cotisations patronales ~25 %, précompte professionnel forfaitaire 22 % (À VÉRIFIER) ;
// - cotisations sociales et précompte payés le 15 du mois suivant ;
// - TVA déclarée par trimestre, payée le 20 du mois suivant ; la TVA du 4e trimestre reste ouverte au 31/12 ;
// - amortissements linéaires, prorata temporis par mois l'année d'acquisition.
import { STREETS } from '../content/names';
import { COMMON_SERVICES, SECTORS, type SupplierSpec } from '../content/sectors';
import { fillTemplate, randomPerson } from './company';
import { invoiceTotals } from './invoices';
import { addDays, daysInMonth, euros, formatAmount, isoDate, monthOf, quarterOf, roundTo, type Cents } from './money';
import type { Rng } from './rng';
import type { Books, Company, Employee, Entry, EntryLine, FixedAsset, Invoice, InvoiceLine, Party, StockItem, World } from './types';

export const WORKER_ONSS = 13.07;
export const EMPLOYER_ONSS = 25;
export const WITHHOLDING_TAX = 22;

export const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
] as const;

export type LedgerResult = { books: Books; company: Company; revenue: Cents };

export function line(account: string, debit: Cents, credit: Cents): EntryLine {
  return { account, debit, credit };
}

export function between(rng: Rng, [min, max]: readonly [number, number], step = 1): Cents {
  return roundTo(rng.int(euros(min), euros(max)), euros(step));
}

/** IBAN fictif : le code de contrôle « 00 » n'est jamais attribué, aucun risque de tomber sur un vrai compte. */
export function fictitiousIban(rng: Rng): string {
  const block = () => String(rng.int(0, 9999)).padStart(4, '0');
  return `BE00 9999 ${block()} ${block()}`;
}

/** Numéro d'entreprise fictif (préfixe 0000, inexistant à la BCE). */
export function fictitiousCompanyNumber(rng: Rng): string {
  return `0000.${String(rng.int(100, 999))}.${String(rng.int(100, 999))}`;
}

export function depreciationFor(asset: FixedAsset, year: number): Cents {
  const annual = Math.round(asset.cost / asset.years);
  const acquisitionYear = Number(asset.acquisitionDate.slice(0, 4));
  const months = acquisitionYear === year ? 13 - monthOf(asset.acquisitionDate) : 12;
  return Math.min(Math.round((annual * months) / 12), asset.cost - asset.priorDepreciation);
}

export function emptyWorld(): World {
  return { employees: [], registry: [], minutes: [], afterClosing: [], deliveries: [], stock: [], contracts: [], bankAccounts: [], letters: [] };
}

export function sortEntries(entries: Entry[]): void {
  entries.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
}

export type LedgerOptions = {
  /** Une embauche réelle au 1er octobre (fausse piste « nouveau nom dans la paie »). */
  lateHire?: boolean;
};

export function generateBooks(rng: Rng, company: Company, difficulty: number, options: LedgerOptions = {}): LedgerResult {
  const spec = SECTORS[company.sector];
  const deductible = !spec.vatExempt;
  const year = company.fiscalYear;
  const yearEnd = isoDate(year, 12, 31);
  const entries: Entry[] = [];
  const invoices: Invoice[] = [];
  const parties: Party[] = [];
  const assets: FixedAsset[] = [];
  const world = emptyWorld();
  let counter = 0;
  const id = (prefix: string) => `${prefix}${++counter}`;

  const addEntry = (entry: Omit<Entry, 'id'>): Entry => {
    const full = { id: id('e'), ...entry, lines: entry.lines.filter((l) => l.debit !== 0 || l.credit !== 0) };
    // Une opération sans montant (ex. : stock inchangé) ne donne pas d'écriture.
    if (full.lines.length > 0) entries.push(full);
    return full;
  };
  const addParty = (kind: Party['kind'], name: string, address: string, activity: string): Party => {
    const registryId = `bce${world.registry.length + 1}`;
    const party: Party = { id: `p${parties.length + 1}`, kind, name, address, iban: fictitiousIban(rng), registryId };
    parties.push(party);
    const director = randomPerson(rng);
    world.registry.push({
      id: registryId,
      name,
      number: fictitiousCompanyNumber(rng),
      address,
      founded: String(rng.int(1985, year - 3)),
      directors: [`${director.firstName} ${director.lastName}`],
      activity,
      status: 'Active',
    });
    return party;
  };

  // ---------- Volume d'activité ----------
  const revenue = roundTo(between(rng, spec.annualRevenue), euros(1000));
  const seasonTotal = spec.seasonality.reduce((s, w) => s + w, 0);
  const monthlyRevenue = spec.seasonality.map((w) => Math.round((revenue * w) / seasonTotal));
  const averageGross = between(rng, spec.monthlyGross, 50);
  const staff = Math.max(2, Math.round((revenue * spec.personnelRatio) / (averageGross * (1 + EMPLOYER_ONSS / 100) * 12)));

  // ---------- Société, banque, personnel ----------
  world.registry.push({
    id: 'bce0',
    name: company.name,
    number: fictitiousCompanyNumber(rng),
    address: `${company.street}, ${company.postalCode} ${company.city}`,
    founded: String(rng.int(1995, year - 6)),
    directors: [`${company.manager.firstName} ${company.manager.lastName}`],
    activity: spec.label,
    status: 'Active',
  });
  world.bankAccounts.push({ id: 'bk1', bank: 'Banque de Wallonie', iban: fictitiousIban(rng), account: '550', label: 'Compte courant' });

  const takenNames = [company.manager, company.accountant];
  const employees: Employee[] = [
    {
      id: 'emp1',
      ...company.accountant,
      role: 'Comptabilité',
      iban: fictitiousIban(rng),
      startDate: isoDate(year - rng.int(3, 12), rng.int(1, 12), 1),
      monthlyGross: roundTo(Math.round(averageGross * 1.1), euros(10)),
      registered: true,
    },
  ];
  for (let i = 1; i < staff; i++) {
    const person = randomPerson(rng, takenNames);
    takenNames.push(person);
    employees.push({
      id: `emp${i + 1}`,
      ...person,
      role: spec.roles[(i - 1) % spec.roles.length]!,
      iban: fictitiousIban(rng),
      startDate: isoDate(year - rng.int(0, 10), rng.int(1, 12), 1),
      monthlyGross: roundTo(Math.round(averageGross * (rng.int(90, 110) / 100)), euros(10)),
      registered: true,
    });
  }
  // Une embauche de l'année commence à son mois d'entrée.
  for (const e of employees) if (e.startDate > yearEnd) e.startDate = isoDate(year, 1, 1);
  if (options.lateHire && employees.length > 2) employees[employees.length - 1]!.startDate = isoDate(year, 10, 1);
  world.employees = employees;

  // ---------- Tiers ----------
  const numberFormats = [
    (n: number) => `F-${year}-${n}`,
    (n: number) => `${year}/${String(n).padStart(5, '0')}`,
    (n: number) => `FA${n}`,
    (n: number) => `${String(year).slice(2)}-${n}`,
  ];
  type SupplierState = { party: Party; spec: SupplierSpec; format: (n: number) => string; next: number };
  const suppliers: SupplierState[] = spec.suppliers.map((s, i) => ({
    party: addParty('supplier', rng.pick(s.names), s.city, `Fournisseur — ${s.products[0]!.label.split(' — ')[0]!.toLowerCase()}`),
    spec: s,
    format: numberFormats[(i + rng.int(0, 3)) % numberFormats.length]!,
    next: rng.int(100, 900),
  }));
  const nextNumber = (s: SupplierState) => {
    s.next += rng.int(3, 40);
    return s.format(s.next);
  };

  const landlord = randomPerson(rng, takenNames);
  const telecom = addParty('supplier', rng.pick(COMMON_SERVICES.telecom.names), '1000 Bruxelles', 'Télécommunications');
  const accountingFirm = addParty('supplier', rng.pick(COMMON_SERVICES.accountingFirm.names), `${company.postalCode} ${company.city}`, 'Fiduciaire');
  const cleaning = addParty('supplier', rng.pick(COMMON_SERVICES.cleaning.names), '5000 Namur', 'Nettoyage de bureaux');
  const restaurants = rng
    .shuffle(COMMON_SERVICES.restaurants)
    .slice(0, 2)
    .map((n) => addParty('supplier', n, `${company.postalCode} ${company.city}`, 'Restauration'));
  const capexSpec = rng.pick(spec.capex);
  const capexSupplier = addParty('supplier', capexSpec.supplier, '5000 Namur', 'Vente de matériel professionnel');
  const clients = rng
    .shuffle(spec.clients)
    .slice(0, 6)
    .map((n) => addParty('client', fillTemplate(n, { ville: company.city }), `${rng.pick(STREETS)} ${rng.int(1, 150)}, ${company.postalCode} ${company.city}`, 'Client'));

  world.contracts.push({
    id: 'bail',
    title: 'Bail commercial',
    clauses: [
      `Bailleur : ${landlord.firstName} ${landlord.lastName}. Locataire : ${company.name}.`,
      `Loyer mensuel indexé, payable le 2 de chaque mois par domiciliation.`,
      'Durée : 9 ans, renouvelable. Garantie locative bloquée sur un compte au nom du locataire.',
    ],
  });

  // ---------- Factures ----------
  const bookPurchase = (invoice: Invoice, label: string) => {
    const { base, vat, total } = invoiceTotals(invoice);
    const charged = invoice.vatDeductible ? base : total;
    const lines = [line(invoice.account, charged, 0), line('411', invoice.vatDeductible ? vat : 0, 0), line('440', 0, total)];
    const signed = invoice.kind === 'credit-note' ? lines.map((l) => line(l.account, l.credit, l.debit)) : lines;
    return addEntry({ journal: 'ACH', date: invoice.date, label, lines: signed, partyId: invoice.partyId, invoiceId: invoice.id, assetId: invoice.assetId });
  };
  const addPurchase = (data: Omit<Invoice, 'id' | 'flow'>, label: string, paymentDelay: number | null) => {
    const invoice: Invoice = { id: id('i'), flow: 'purchase', ...data };
    invoices.push(invoice);
    bookPurchase(invoice, label);
    const { total } = invoiceTotals(invoice);
    if (paymentDelay !== null) {
      const paidOn = addDays(invoice.date, paymentDelay);
      if (paidOn <= yearEnd) {
        const refund = invoice.kind === 'credit-note';
        addEntry({
          journal: 'FIN',
          date: paidOn,
          label: refund ? `Remboursement ${invoice.number}` : `Paiement ${invoice.number}`,
          lines: refund ? [line('550', total, 0), line('440', 0, total)] : [line('440', total, 0), line('550', 0, total)],
          partyId: invoice.partyId,
          invoiceId: invoice.id,
        });
      }
    }
    return invoice;
  };

  const goodsLines = (s: SupplierState, target: Cents): InvoiceLine[] => {
    const products = rng.shuffle(s.spec.products).slice(0, rng.int(1, Math.min(3, s.spec.products.length)));
    return products.map((p) => {
      const unitPrice = between(rng, p.price, 0.05);
      return { label: p.label, quantity: Math.max(1, Math.round(target / products.length / unitPrice)), unitPrice, vatRate: p.vatRate };
    });
  };

  // ---------- Ouverture ----------
  const opening: EntryLine[] = [];
  for (const assetSpec of spec.assets) {
    const cost = between(rng, assetSpec.cost, 100);
    const age = rng.int(1, Math.min(assetSpec.years - 1, 4));
    const asset: FixedAsset = {
      id: id('a'),
      label: assetSpec.label,
      account: assetSpec.account,
      depreciationAccount: assetSpec.depreciationAccount,
      acquisitionDate: isoDate(year - age, rng.int(1, 12), 1),
      cost,
      years: assetSpec.years,
      priorDepreciation: 0,
    };
    for (let y = year - age; y < year; y++) asset.priorDepreciation += depreciationFor(asset, y);
    assets.push(asset);
    opening.push(line(asset.account, cost, 0), line(asset.depreciationAccount, 0, asset.priorDepreciation));
  }
  const openingStock = roundTo(Math.round((revenue * spec.purchaseRatio * rng.int(4, 7)) / 100), euros(10));
  const openingBank = roundTo(Math.round((revenue * rng.int(8, 14)) / 100), 1);
  const openingCash = between(rng, [400, 1500], 10);
  const capitalAccount = company.legalForm === 'SA' ? '100' : '110';
  const capital = company.legalForm === 'SA' ? euros(61_500) : rng.pick([euros(18_600), euros(20_000), euros(25_000)]);
  opening.push(line('340', openingStock, 0), line('550', openingBank, 0), line('570', openingCash, 0));

  // Dettes fournisseurs et créances clients de l'exercice précédent, réglées en janvier.
  const openingPayables = suppliers.map((s) => ({ party: s.party, amount: between(rng, [800, 4000], 0.01) }));
  const openingReceivables = clients.map((c) => ({ party: c, amount: between(rng, [1500, 9000], 0.01) }));
  for (const p of openingPayables) opening.push({ ...line('440', 0, p.amount), partyId: p.party.id });
  for (const r of openingReceivables) opening.push({ ...line('400', r.amount, 0), partyId: r.party.id });
  opening.push(line(capitalAccount, 0, capital));
  const openingDiff = opening.reduce((s, l) => s + l.debit - l.credit, 0);
  opening.push(openingDiff >= 0 ? line('140', 0, openingDiff) : line('141', -openingDiff, 0));
  addEntry({ journal: 'OD', date: isoDate(year, 1, 1), label: 'Bilan d’ouverture', lines: opening });
  for (const p of openingPayables) {
    addEntry({ journal: 'FIN', date: isoDate(year, 1, rng.int(8, 25)), label: 'Paiement factures de décembre', lines: [line('440', p.amount, 0), line('550', 0, p.amount)], partyId: p.party.id });
  }
  for (const r of openingReceivables) {
    addEntry({ journal: 'FIN', date: isoDate(year, 1, rng.int(8, 28)), label: 'Encaissement factures de décembre', lines: [line('550', r.amount, 0), line('400', 0, r.amount)], partyId: r.party.id });
  }

  // ---------- Opérations mensuelles ----------
  const invoicesPerMonth = 2 + Math.ceil(difficulty / 2);
  const restaurantMonths = new Set([rng.int(1, 3), rng.int(4, 6), rng.int(7, 9), rng.int(10, 11), rng.int(1, 9)]);
  const creditNoteMonths = [rng.int(2, 9), rng.int(10, 11)];
  const capexMonth = rng.int(10, 11);
  let saleNumber = rng.int(10, 60);
  let deliveryNumber = rng.int(100, 400);
  let creditNoteNumber = rng.int(10, 90);
  const rent = roundTo(Math.round((revenue * 0.035) / 12), euros(50));

  const saleLines = (base: Cents): InvoiceLine[] =>
    spec.salesMix.map((mix) => ({ label: mix.label, quantity: 1, unitPrice: Math.round(base * mix.share), vatRate: mix.vatRate }));

  for (let month = 1; month <= 12; month++) {
    const lastDay = daysInMonth(year, month);
    const day = () => isoDate(year, month, rng.int(1, Math.min(lastDay, 28)));
    const salesBase = monthlyRevenue[month - 1]!;

    // Achats de marchandises
    for (let i = 0; i < invoicesPerMonth; i++) {
      const s = suppliers[(month + i) % suppliers.length]!;
      const target = Math.round(((salesBase * spec.purchaseRatio) / invoicesPerMonth) * (rng.int(75, 125) / 100));
      const date = day();
      addPurchase(
        { kind: 'invoice', number: nextNumber(s), date, dueDate: addDays(date, 30), partyId: s.party.id, account: '604', lines: goodsLines(s, target), vatDeductible: deductible },
        `Achat ${s.party.name}`,
        30 - rng.int(0, 4),
      );
    }
    if (creditNoteMonths.includes(month)) {
      const s = rng.pick(suppliers);
      const product = rng.pick(s.spec.products);
      const date = day();
      const unitPrice = between(rng, product.price, 0.05);
      addPurchase(
        {
          kind: 'credit-note',
          number: `NC-${year}-${++creditNoteNumber}`,
          date,
          dueDate: date,
          partyId: s.party.id,
          account: '604',
          lines: [{ label: `Retour : ${product.label}`, quantity: Math.max(2, Math.round(euros(rng.int(300, 1500)) / unitPrice)), unitPrice, vatRate: product.vatRate }],
          vatDeductible: deductible,
        },
        `Note de crédit ${s.party.name}`,
        15,
      );
    }

    // Services et frais généraux
    addEntry({ journal: 'FIN', date: isoDate(year, month, 2), label: `Loyer ${MONTHS[month - 1]} — domiciliation`, lines: [line('610', rent, 0), line('550', 0, rent)] });
    const telecomDate = isoDate(year, month, 5);
    addPurchase(
      { kind: 'invoice', number: `TEL${year}${String(month).padStart(2, '0')}${rng.int(1000, 9999)}`, date: telecomDate, dueDate: addDays(telecomDate, 20), partyId: telecom.id, account: '612', lines: [{ label: 'Abonnement internet et téléphonie', quantity: 1, unitPrice: between(rng, [85, 150], 0.01), vatRate: 21 }], vatDeductible: deductible },
      `Facture ${telecom.name}`,
      20,
    );
    const cleaningDate = isoDate(year, month, Math.min(lastDay, 27));
    addPurchase(
      { kind: 'invoice', number: `NP-${year}-${month * 31 + rng.int(1, 30)}`, date: cleaningDate, dueDate: addDays(cleaningDate, 30), partyId: cleaning.id, account: '611', lines: [{ label: `Nettoyage des locaux — ${MONTHS[month - 1]}`, quantity: 1, unitPrice: between(rng, [240, 460], 5), vatRate: 21 }], vatDeductible: deductible },
      `Facture ${cleaning.name}`,
      30,
    );
    if (month % 3 === 0) {
      const date = isoDate(year, month, 15);
      addPurchase(
        { kind: 'invoice', number: `H-${year}-${month / 3}${rng.int(10, 99)}`, date, dueDate: addDays(date, 30), partyId: accountingFirm.id, account: '613', lines: [{ label: `Tenue de la comptabilité — trimestre ${month / 3}`, quantity: 1, unitPrice: between(rng, [900, 1800], 10), vatRate: 21 }], vatDeductible: deductible },
        `Honoraires ${accountingFirm.name}`,
        30,
      );
    }
    if (restaurantMonths.has(month)) {
      const restaurant = rng.pick(restaurants);
      const date = day();
      const guests = rng.int(2, 5);
      addPurchase(
        {
          kind: 'invoice',
          number: `R${rng.int(10000, 99999)}`,
          date,
          dueDate: date,
          partyId: restaurant.id,
          account: '615',
          lines: [
            { label: 'Menus du jour', quantity: guests, unitPrice: between(rng, [24, 42], 0.5), vatRate: 12 },
            { label: 'Boissons', quantity: guests + rng.int(0, 4), unitPrice: between(rng, [3.5, 9], 0.5), vatRate: 21 },
          ],
          vatDeductible: false,
        },
        `Repas d’affaires ${restaurant.name}`,
        0,
      );
    }

    // Investissement de l'année
    if (month === capexMonth) {
      const cost = between(rng, capexSpec.cost, 50);
      const installation = roundTo(Math.round(cost * 0.08), euros(5));
      const date = day();
      const asset: FixedAsset = {
        id: id('a'),
        label: capexSpec.label,
        account: capexSpec.account,
        depreciationAccount: capexSpec.depreciationAccount,
        acquisitionDate: date,
        cost: deductible ? cost : cost + Math.round((cost * 21) / 100),
        years: capexSpec.years,
        priorDepreciation: 0,
      };
      assets.push(asset);
      addPurchase(
        {
          kind: 'invoice',
          number: `EQ-${year}-${rng.int(100, 999)}`,
          date,
          dueDate: addDays(date, 30),
          partyId: capexSupplier.id,
          account: asset.account,
          lines: [
            { label: capexSpec.label, quantity: 1, unitPrice: cost - installation, vatRate: 21 },
            { label: 'Livraison, installation et mise en service', quantity: 1, unitPrice: installation, vatRate: 21 },
          ],
          vatDeductible: deductible,
          assetId: asset.id,
        },
        `Achat ${capexSpec.label}`,
        30,
      );
      world.minutes.push({
        id: 'm-capex',
        date: addDays(date, -20),
        meeting: 'Organe d’administration',
        text: `Décision d’acquérir : ${capexSpec.label}, budget d’environ ${formatAmount(roundTo(cost, euros(500)))} € HTVA.`,
      });
    }

    // Ventes
    if (spec.salesMode === 'counter') {
      const { base, vat, total } = invoiceTotals({ lines: saleLines(salesBase) });
      addEntry({
        journal: 'VEN',
        date: isoDate(year, month, lastDay),
        label: `Recettes de ${MONTHS[month - 1]} (caisse et terminal)`,
        lines: [line('550', total, 0), line('700', 0, base), line('451', 0, vat)],
      });
    } else {
      const count = rng.int(4, 7);
      for (let i = 0; i < count; i++) {
        const client = rng.pick(clients);
        const date = day();
        const amount = roundTo(Math.round((salesBase / count) * (rng.int(70, 130) / 100)), euros(1));
        const invoice: Invoice = {
          id: id('i'),
          kind: 'invoice',
          flow: 'sale',
          number: `${year}-${String(++saleNumber).padStart(4, '0')}`,
          date,
          dueDate: addDays(date, 30),
          partyId: client.id,
          account: '700',
          lines: saleLines(amount),
          vatDeductible: true,
          deliveryDate: addDays(date, -rng.int(0, 2)),
        };
        invoices.push(invoice);
        world.deliveries.push({ id: `d${++deliveryNumber}`, number: `BL-${deliveryNumber}`, date: invoice.deliveryDate!, partyId: client.id, description: spec.salesMix[0]!.label, invoiceNumber: invoice.number });
        const { base, vat, total } = invoiceTotals(invoice);
        addEntry({ journal: 'VEN', date, label: `Facture ${invoice.number} — ${client.name}`, lines: [line('400', total, 0), line('700', 0, base), line('451', 0, vat)], partyId: client.id, invoiceId: invoice.id });
        const paidOn = addDays(invoice.dueDate, rng.int(-5, 15));
        if (paidOn <= yearEnd) {
          addEntry({ journal: 'FIN', date: paidOn, label: `Encaissement ${invoice.number}`, lines: [line('550', total, 0), line('400', 0, total)], partyId: client.id, invoiceId: invoice.id });
        }
      }
    }

    // Salaires du mois (personnes présentes ce mois-là)
    const active = employees.filter((e) => e.startDate <= isoDate(year, month, lastDay));
    const totalGross = active.reduce((s, e) => s + e.monthlyGross, 0);
    const workerOnss = Math.round((totalGross * WORKER_ONSS) / 100);
    const withholding = Math.round(((totalGross - workerOnss) * WITHHOLDING_TAX) / 100);
    const net = totalGross - workerOnss - withholding;
    const employerOnss = Math.round((totalGross * EMPLOYER_ONSS) / 100);
    const payDay = isoDate(year, month, lastDay);
    addEntry({ journal: 'OD', date: payDay, label: `Salaires de ${MONTHS[month - 1]}`, lines: [line('620', totalGross, 0), line('454', 0, workerOnss), line('453', 0, withholding), line('455', 0, net)] });
    addEntry({ journal: 'OD', date: payDay, label: `Cotisations patronales de ${MONTHS[month - 1]}`, lines: [line('621', employerOnss, 0), line('454', 0, employerOnss)] });
    addEntry({ journal: 'FIN', date: payDay, label: `Salaires nets de ${MONTHS[month - 1]}`, lines: [line('455', net, 0), line('550', 0, net)] });
    if (month < 12) {
      const due = isoDate(year, month + 1, 15);
      addEntry({ journal: 'FIN', date: due, label: `Précompte professionnel de ${MONTHS[month - 1]}`, lines: [line('453', withholding, 0), line('550', 0, withholding)] });
      addEntry({ journal: 'FIN', date: due, label: `ONSS de ${MONTHS[month - 1]}`, lines: [line('454', workerOnss + employerOnss, 0), line('550', 0, workerOnss + employerOnss)] });
    }
  }

  // Livraisons de janvier N+1 (pour le test de séparation des exercices).
  for (let i = 0; i < (clients.length > 0 ? 3 : 0); i++) {
    const client = rng.pick(clients);
    world.deliveries.push({
      id: `d${++deliveryNumber}`,
      number: `BL-${deliveryNumber}`,
      date: isoDate(year + 1, 1, rng.int(3, 15)),
      partyId: client.id,
      description: spec.salesMix[0]!.label,
      invoiceNumber: `${year + 1}-${String(i + 1).padStart(4, '0')}`,
    });
  }

  // ---------- TVA : déclarations des trimestres 1 à 3 ----------
  // Les montants sont calculés avant d'ajouter la moindre déclaration (celle du T1 est datée en avril).
  const vatBalance = (quarter: number, account: string) =>
    entries
      .filter((e) => quarterOf(e.date) === quarter)
      .flatMap((e) => e.lines)
      .filter((l) => l.account === account)
      .reduce((s, l) => s + l.debit - l.credit, 0);
  const declarations = [1, 2, 3].map((quarter) => ({ quarter, due: -vatBalance(quarter, '451'), deductible: vatBalance(quarter, '411') }));
  for (const { quarter, due, deductible: recoverable } of declarations) {
    const balance = due - recoverable;
    addEntry({
      journal: 'FIN',
      date: isoDate(year, quarter * 3 + 1, 20),
      label: `TVA — déclaration du ${quarter}e trimestre`,
      lines: [line('451', due, 0), line('411', 0, recoverable), balance >= 0 ? line('550', 0, balance) : line('550', -balance, 0)],
    });
  }

  // ---------- Inventaire et amortissements ----------
  const stockTarget = Math.round((openingStock * rng.int(88, 115)) / 100);
  world.stock = stockItems(rng, spec.suppliers, stockTarget, year);
  const stockChange = stockValue(world.stock) - openingStock;
  // L'écriture est toujours créée (même à zéro) pour pouvoir être recalculée par restateStock.
  entries.push({
    id: id('e'),
    journal: 'OD',
    date: yearEnd,
    label: STOCK_LABEL,
    lines: (stockChange >= 0 ? [line('340', stockChange, 0), line('609', 0, stockChange)] : [line('609', -stockChange, 0), line('340', 0, -stockChange)]).filter(
      (l) => l.debit || l.credit,
    ),
  });
  for (const asset of assets) {
    const amount = depreciationFor(asset, year);
    addEntry({ journal: 'OD', date: yearEnd, label: `Amortissement ${asset.label}`, lines: [line('6302', amount, 0), line(asset.depreciationAccount, 0, amount)], assetId: asset.id });
  }

  // ---------- Procès-verbaux ----------
  world.minutes.push(
    { id: 'm-ag', date: isoDate(year, 6, rng.int(2, 25)), meeting: 'Assemblée générale ordinaire', text: `Approbation des comptes annuels ${year - 1} et décharge à l’organe d’administration.` },
    { id: 'm-affectation', date: isoDate(year, 6, rng.int(2, 25)), meeting: 'Assemblée générale ordinaire', text: 'Le résultat de l’exercice précédent est reporté.' },
    { id: 'm-bail', date: isoDate(year, rng.int(2, 4), rng.int(1, 28)), meeting: 'Organe d’administration', text: 'Le bail commercial est maintenu aux mêmes conditions après indexation.' },
    { id: 'm-personnel', date: isoDate(year, rng.int(8, 9), rng.int(1, 28)), meeting: 'Organe d’administration', text: `Point sur le personnel : ${staff} personnes, pas d’autre embauche prévue.` },
  );

  sortEntries(entries);
  return { books: { entries, invoices, assets, parties, world }, company: { ...company, staff }, revenue };
}

export const STOCK_LABEL = 'Variation des stocks de marchandises';

export function stockValue(items: StockItem[]): Cents {
  return items.reduce((s, item) => s + item.quantity * item.unitCost, 0);
}

/** Recalcule l'écriture de variation des stocks à partir de la liste d'inventaire (après une anomalie de stock). */
export function restateStock(books: Books): void {
  const opening = books.entries.find((e) => e.label === 'Bilan d’ouverture')!.lines.filter((l) => l.account === '340').reduce((s, l) => s + l.debit, 0);
  const change = stockValue(books.world.stock) - opening;
  const entry = books.entries.find((e) => e.label === STOCK_LABEL);
  const lines = change >= 0 ? [line('340', change, 0), line('609', 0, change)] : [line('609', -change, 0), line('340', 0, -change)];
  if (entry) entry.lines = lines.filter((l) => l.debit || l.credit);
}

/** Articles en stock dont la valeur totale approche `target`. */
function stockItems(rng: Rng, suppliers: readonly SupplierSpec[], target: Cents, year: number): StockItem[] {
  const products = suppliers.flatMap((s) => s.products);
  const chosen = rng.shuffle(products).slice(0, Math.min(products.length, 6));
  return chosen.map((p, i) => {
    const unitCost = between(rng, p.price, 0.05);
    return {
      id: `st${i + 1}`,
      label: p.label,
      quantity: Math.max(1, Math.round(target / chosen.length / unitCost)),
      unitCost,
      lastMovement: isoDate(year, 12, rng.int(5, 30)),
    };
  });
}

/**
 * Opérations de janvier-février N+1, déduites de la vérité au 31/12 : paiements des dettes et
 * encaissements des créances ouvertes, cotisations et TVA du 4e trimestre.
 */
export function afterClosingEvents(truth: Books, company: Company, rng: Rng): void {
  const year = company.fiscalYear;
  const yearEnd = isoDate(year, 12, 31);
  const events = truth.world.afterClosing;
  for (const invoice of truth.invoices) {
    // Seules les factures encore ouvertes au 31/12 sont réglées après la clôture.
    if (truth.entries.some((e) => e.journal === 'FIN' && e.invoiceId === invoice.id)) continue;
    // Un client en faillite ne paiera pas.
    if (truth.parties.find((p) => p.id === invoice.partyId)?.status === 'bankrupt') continue;
    const { total } = invoiceTotals(invoice);
    const sale = invoice.flow === 'sale';
    const refund = invoice.kind === 'credit-note';
    events.push({
      id: `pay-${invoice.id}`,
      date: invoice.dueDate > yearEnd ? invoice.dueDate : isoDate(year + 1, 1, rng.int(5, 20)),
      label: `${sale ? 'Encaissement' : refund ? 'Remboursement reçu' : 'Paiement'} ${invoice.number}`,
      amount: sale || refund ? total : -total,
      partyId: invoice.partyId,
    });
  }
  const social = truth.entries.filter((e) => e.date === yearEnd && e.journal === 'OD' && e.lines.some((l) => l.account === '454'));
  const onss = social.flatMap((e) => e.lines).filter((l) => l.account === '454').reduce((s, l) => s + l.credit, 0);
  const tax = social.flatMap((e) => e.lines).filter((l) => l.account === '453').reduce((s, l) => s + l.credit, 0);
  events.push(
    { id: 'onss-12', date: isoDate(year + 1, 1, 15), label: 'ONSS de décembre (travailleurs et employeur)', amount: -onss },
    { id: 'pp-12', date: isoDate(year + 1, 1, 15), label: 'Précompte professionnel de décembre', amount: -tax },
  );
  const q4 = (account: string) =>
    truth.entries.filter((e) => quarterOf(e.date) === 4 && e.date.startsWith(String(year))).flatMap((e) => e.lines).filter((l) => l.account === account).reduce((s, l) => s + l.debit - l.credit, 0);
  const vat = -q4('451') - q4('411');
  if (vat !== 0) events.push({ id: 'tva-t4', date: isoDate(year + 1, 1, 20), label: 'TVA — déclaration du 4e trimestre', amount: -vat });
  events.sort((a, b) => a.date.localeCompare(b.date));
}

