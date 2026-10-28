// Transforme la comptabilité générée en documents lisibles par le joueur, et les traces en indices.
// Audit Detective — créé par Gauthier Doumont.
import { accountLabel } from '../content/pcmn';
import { SECTORS } from '../content/sectors';
import type { DocLine, GameDocument, Procedure } from '../content/types';
import type { TraceRef } from './anomalies';
import { accountBalance, partyBalance, trialBalance } from './balance';
import { invoiceTotals, lineAmount } from './invoices';
import { depreciationFor } from './ledger';
import { formatAmount, formatDate, formatPercent, monthOf, type Cents } from './money';
import type { Rng } from './rng';
import type { Books, Company, Entry, Invoice } from './types';

export const ACCOUNTANT_ID = 'comptable';

type Context = { rng: Rng; company: Company; truth: Books; books: Books; confirmedSuppliers: string[] };

export type DocumentSet = {
  documents: GameDocument[];
  initialDocuments: string[];
  procedures: Procedure[];
  clueOf: (ref: TraceRef, topicId: string) => string;
};

const isQ4 = (e: { date: string }) => monthOf(e.date) >= 10;
const amount = (cents: Cents) => formatAmount(cents);
const dash = (cents: Cents) => (cents === 0 ? '' : formatAmount(cents));

function partyName(books: Books, partyId?: string): string {
  return books.parties.find((p) => p.id === partyId)?.name ?? '';
}

function balanceDocument({ company, books }: Context): GameDocument {
  const balance = [...trialBalance(books.entries).entries()]
    .map(([account, { debit, credit }]) => ({ account, net: debit - credit }))
    .filter((a) => a.net !== 0)
    .sort((a, b) => a.account.localeCompare(b.account));
  return {
    id: 'balance',
    title: `Balance générale au 31/12/${company.fiscalYear}`,
    kind: 'balance',
    header: [company.name, `Exercice du 01/01/${company.fiscalYear} au 31/12/${company.fiscalYear}`],
    columns: ['Compte', 'Libellé', 'Débit', 'Crédit'],
    lines: balance.map((a) => ({
      id: `l-${a.account}`,
      cells: [a.account, accountLabel(a.account), a.net > 0 ? amount(a.net) : '', a.net < 0 ? amount(-a.net) : ''],
    })),
    footer: ['Soldes après écritures d’inventaire, avant affectation du résultat.'],
  };
}

/** Numéros de pièces ACH-0001… dans l'ordre chronologique de l'année. */
function pieceNumbers(books: Books): Map<string, string> {
  const numbers = new Map<string, string>();
  books.entries
    .filter((e) => e.journal === 'ACH')
    .forEach((e, i) => numbers.set(e.id, `ACH-${String(i + 1).padStart(4, '0')}`));
  return numbers;
}

function journalDocument({ company, books }: Context): GameDocument {
  const pieces = pieceNumbers(books);
  const lines: DocLine[] = books.entries.filter((e) => e.journal === 'ACH' && isQ4(e)).map((entry) => {
    const invoice = books.invoices.find((i) => i.id === entry.invoiceId);
    const sum = (match: (account: string) => boolean) =>
      entry.lines.filter((l) => match(l.account)).reduce((s, l) => s + l.debit - l.credit, 0);
    const chargeAccount = entry.lines.find((l) => l.account !== '411' && l.account !== '440')?.account ?? '';
    return {
      id: `e-${entry.id}`,
      cells: [
        pieces.get(entry.id) ?? '',
        formatDate(entry.date),
        partyName(books, entry.partyId),
        invoice?.number ?? '',
        chargeAccount,
        amount(sum((a) => a !== '411' && a !== '440')),
        amount(sum((a) => a === '411')),
        amount(-sum((a) => a === '440')),
      ],
    };
  });
  return {
    id: 'journal-achats',
    title: `Journal des achats — 4e trimestre ${company.fiscalYear}`,
    kind: 'journal',
    header: [company.name, `Journal ACH, du 01/10 au 31/12/${company.fiscalYear}`],
    columns: ['Pièce', 'Date', 'Fournisseur', 'N° facture', 'Compte', 'HTVA', 'TVA', 'TVAC'],
    lines,
  };
}

function supplierBalanceDocument({ company, books }: Context): GameDocument {
  const suppliers = books.parties.filter((p) => p.kind === 'supplier' && books.entries.some((e) => e.partyId === p.id && isQ4(e)));
  return {
    id: 'balance-fournisseurs',
    title: `Balance des fournisseurs au 31/12/${company.fiscalYear}`,
    kind: 'balance',
    header: [company.name, 'Soldes du compte 440 par fournisseur'],
    columns: ['Fournisseur', 'Solde au 31/12'],
    lines: suppliers.map((p) => {
      const due = -partyBalance(books.entries, '440', p.id);
      return { id: `s-${p.id}`, cells: [p.name, due < 0 ? `${amount(-due)} (débiteur)` : amount(due)] };
    }),
    footer: ['Un solde débiteur signifie que le fournisseur nous doit de l’argent.'],
  };
}

function invoiceDocument({ company, books }: Context, invoice: Invoice): GameDocument {
  const party = books.parties.find((p) => p.id === invoice.partyId)!;
  const totals = invoiceTotals(invoice);
  const creditNote = invoice.kind === 'credit-note';
  const restaurant = invoice.account === '615';
  const label = creditNote ? 'Note de crédit' : restaurant ? 'Note de restaurant' : 'Facture';
  return {
    id: `inv-${invoice.id}`,
    title: `${label} ${invoice.number} — ${party.name}`,
    kind: 'invoice',
    header: [
      `${party.name} — ${party.address}`,
      'TVA BE 0000.000.000 (fictif)',
      `Client : ${company.name}, ${company.street}, ${company.postalCode} ${company.city}`,
      `${label} ${invoice.number} du ${formatDate(invoice.date, true)}${creditNote || restaurant ? '' : ` — échéance ${formatDate(invoice.dueDate, true)}`}`,
    ],
    columns: ['Désignation', 'Qté', 'Prix unitaire', 'Montant'],
    lines: [
      ...invoice.lines.map((l, i) => ({
        id: `i${i}`,
        cells: [`${l.label} (TVA ${l.vatRate} %)`, String(l.quantity), amount(l.unitPrice), amount(lineAmount(l))],
      })),
      { id: 'base', cells: ['Total HTVA', '', '', amount(totals.base)] },
      ...totals.byRate.map((r) => ({ id: `vat-${r.rate}`, cells: [`TVA ${r.rate} % sur ${amount(r.base)}`, '', '', amount(r.vat)] })),
      { id: 'total', cells: [creditNote ? 'Total TVAC à votre crédit' : 'Total TVAC', '', '', amount(totals.total)] },
    ],
    footer: creditNote ? ['Retour de marchandises. Montant remboursé par virement.'] : restaurant ? ['Payé par carte bancaire.'] : [`Communication : ${invoice.number}`],
  };
}

function analyticDocument({ rng, company, truth, books }: Context): GameDocument {
  const year = company.fiscalYear;
  const spec = SECTORS[company.sector];
  const accounts = ['700', '604', '610', '611', '612', '613', '615', '620', '621', '6302', ...(spec.salesMode === 'invoice' ? ['400'] : []), '440', '411'];
  const opening = (account: string) => Math.abs(accountBalance(truth.entries, account, (e) => e.journal === 'OD' && e.date.endsWith('01-01')));
  const priorDepreciation = truth.assets.filter((a) => !a.acquisitionDate.startsWith(String(year))).reduce((s, a) => s + depreciationFor(a, year - 1), 0);
  const lines = accounts.map((account) => {
    const current = Math.abs(accountBalance(books.entries, account));
    const reference = Math.abs(accountBalance(truth.entries, account));
    const prior =
      account === '440' || account === '400'
        ? opening(account)
        : account === '6302'
          ? priorDepreciation
          : Math.round(reference / (1 + rng.int(-3, 8) / 100));
    const variation = prior === 0 ? 'nouveau' : `${current >= prior ? '+' : ''}${formatPercent(((current - prior) / prior) * 100)}`;
    return { id: `r-${account}`, cells: [`${account} ${accountLabel(account)}`, amount(prior), amount(current), variation] };
  });
  return {
    id: 'revue-analytique',
    title: 'Revue analytique N / N-1',
    kind: 'report',
    header: ['Feuille de travail Vigie & Associés', `${company.name} — comparaison ${year - 1} / ${year}`],
    columns: ['Poste', String(year - 1), String(year), 'Variation'],
    lines,
    footer: ['Comptes de bilan : soldes au 31/12. Comptes de résultat : montants de l’exercice.'],
  };
}

function bankDocument({ company, truth }: Context): GameDocument {
  const bankEntries = truth.entries.filter((e) => e.lines.some((l) => l.account === '550'));
  const movement = (e: Entry) => e.lines.filter((l) => l.account === '550').reduce((s, l) => s + l.debit - l.credit, 0);
  const openingBalance = bankEntries.filter((e) => !isQ4(e)).reduce((s, e) => s + movement(e), 0);
  const q4 = bankEntries.filter(isQ4);
  const closing = openingBalance + q4.reduce((s, e) => s + movement(e), 0);
  const ledger = accountBalance(truth.entries, '550');
  return {
    id: 'releve-bancaire',
    title: `Relevés bancaires du 4e trimestre et rapprochement`,
    kind: 'bank',
    header: ['Banque de Wallonie — compte BE00 0000 0000 0000 (fictif)', `Titulaire : ${company.name}`],
    columns: ['Date', 'Libellé', 'Montant'],
    lines: [
      { id: 'open', cells: ['30/09', 'Solde initial', amount(openingBalance)] },
      ...q4.map((e) => {
        const value = movement(e);
        const counterparty = partyName(truth, e.partyId);
        return { id: `b-${e.id}`, cells: [formatDate(e.date), counterparty ? `${e.label} — ${counterparty}` : e.label, `${value > 0 ? '+' : ''}${amount(value)}`] };
      }),
      { id: 'close', cells: ['31/12', 'Solde final', amount(closing)] },
    ],
    footer: [`Rapprochement : solde bancaire ${amount(closing)} — solde comptable du 550 ${amount(ledger)}. ${closing === ledger ? 'Aucun écart.' : 'Écart à expliquer.'}`],
  };
}

function confirmationDocument({ company, truth, books }: Context, partyId: string): GameDocument {
  const party = truth.parties.find((p) => p.id === partyId)!;
  const ownView = -partyBalance(truth.entries, '440', partyId);
  const clientView = -partyBalance(books.entries, '440', partyId);
  const lines: DocLine[] = truth.entries
    .filter((e) => e.partyId === partyId && isQ4(e))
    .map((e) => {
      const invoice = truth.invoices.find((i) => i.id === e.invoiceId);
      const value = e.lines.filter((l) => l.account === '440').reduce((s, l) => s + l.credit - l.debit, 0);
      const what =
        e.journal === 'ACH'
          ? `${invoice?.kind === 'credit-note' ? 'Note de crédit' : 'Facture'} ${invoice?.number ?? ''}`
          : `${value < 0 ? 'Paiement reçu' : 'Remboursement effectué'}${invoice ? ` — ${invoice.number}` : ''}`;
      return { id: `c-${e.id}`, cells: [formatDate(e.date), what, amount(value)] };
    });
  return {
    id: `conf-${partyId}`,
    title: `Confirmation de solde — ${party.name}`,
    kind: 'letter',
    header: [`${party.name}, service comptabilité`, 'À l’attention de Vigie & Associés, réviseurs d’entreprises', `Objet : solde de ${company.name} au 31/12/${company.fiscalYear}`],
    columns: ['Date', 'Opération', 'Montant'],
    lines: [
      ...lines,
      { id: 'solde', cells: ['31/12', 'Solde dû selon nos livres', amount(ownView)] },
      { id: 'ecart', cells: ['', `Note du réviseur : solde chez le client, écart de ${amount(clientView - ownView)}`, amount(clientView)] },
    ],
    footer: ['Opérations du 4e trimestre. Montants positifs : facturé ; négatifs : payé ou crédité.'],
  };
}

function assetDocument({ company, books }: Context): GameDocument {
  const year = company.fiscalYear;
  const lines = books.assets.map((a) => {
    const dotation = depreciationFor(a, year);
    return {
      id: `a-${a.id}`,
      cells: [a.label, formatDate(a.acquisitionDate, true), amount(a.cost), `${a.years} ans`, dash(a.priorDepreciation), amount(dotation), amount(a.cost - a.priorDepreciation - dotation)],
    };
  });
  const total = books.assets.reduce((s, a) => s + depreciationFor(a, year), 0);
  return {
    id: 'immobilisations',
    title: `Tableau des immobilisations et amortissements ${year}`,
    kind: 'report',
    header: [company.name, 'Registre tenu par le client — amortissement linéaire'],
    columns: ['Désignation', 'Acquisition', 'Valeur d’acquisition', 'Durée', 'Amort. antérieurs', `Dotation ${year}`, 'Valeur nette'],
    lines: [...lines, { id: 'total', cells: ['Total des dotations de l’exercice', '', '', '', '', amount(total), ''] }],
  };
}

export function buildDocuments(context: Context): DocumentSet {
  const { books, confirmedSuppliers } = context;
  const q4Invoices = books.invoices.filter((i) => i.flow === 'purchase' && isQ4(i)).sort((a, b) => a.date.localeCompare(b.date));
  const invoices = q4Invoices.map((invoice) => invoiceDocument(context, invoice));
  const confirmations = confirmedSuppliers.map((partyId) => confirmationDocument(context, partyId));
  const documents = [
    balanceDocument(context),
    journalDocument(context),
    supplierBalanceDocument(context),
    analyticDocument(context),
    bankDocument(context),
    assetDocument(context),
    ...confirmations,
    ...invoices,
  ];

  const procedures: Procedure[] = [
    { id: 'analytique', name: 'Revue analytique', hours: 1, description: 'Comparer les postes N et N-1 pour repérer les variations anormales.', reveals: ['revue-analytique'] },
    {
      id: 'sondage',
      name: 'Sondage de factures',
      hours: 1,
      description: 'Choisir des pièces du journal des achats et examiner les factures originales (1 h par lot de 5).',
      reveals: [],
      sampling: { pool: invoices.map((d) => d.id), batchSize: 5 },
    },
    { id: 'immobilisations', name: 'Revue des immobilisations', hours: 1, description: 'Examiner le tableau des immobilisations et le calcul des amortissements.', reveals: ['immobilisations'] },
    { id: 'rapprochement-bancaire', name: 'Rapprochement bancaire', hours: 2, description: 'Confronter les relevés du 4e trimestre au compte 550.', reveals: ['releve-bancaire'] },
    {
      id: 'circularisation-fournisseurs',
      name: 'Circularisation fournisseurs',
      hours: 3,
      description: `Demander à ${confirmedSuppliers.length} fournisseurs de confirmer directement leur solde.`,
      reveals: confirmations.map((d) => d.id),
    },
  ];

  const clueOf = (ref: TraceRef, topicId: string): string => {
    switch (ref.kind) {
      case 'journal':
        return `journal-achats#e-${ref.entryId}`;
      case 'invoice': {
        const invoice = books.invoices.find((i) => i.id === ref.invoiceId)!;
        const line = ref.line === 'vat' ? `vat-${invoiceTotals(invoice).byRate.at(-1)!.rate}` : ref.line === 'total' ? 'total' : `i${ref.line}`;
        return `inv-${ref.invoiceId}#${line}`;
      }
      case 'supplier-balance':
        return `balance-fournisseurs#s-${ref.partyId}`;
      case 'confirmation':
        return `conf-${ref.partyId}#ecart`;
      case 'bank':
        return `releve-bancaire#b-${ref.entryId}`;
      case 'analytic':
        return `revue-analytique#r-${ref.account}`;
      case 'asset':
        return `immobilisations#a-${ref.assetId}`;
      case 'topic':
        return `topic:${ACCOUNTANT_ID}.${topicId}`;
    }
  };

  return { documents, initialDocuments: ['balance', 'journal-achats', 'balance-fournisseurs'], procedures, clueOf };
}
