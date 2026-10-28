// Documents comptables du client : balances, journaux, factures, revue analytique, immobilisations, Benford.
// Audit Detective — créé par Gauthier Doumont.
import { accountLabel } from '../../content/pcmn';
import type { DocLine, GameDocument } from '../../content/types';
import { accountBalance, partyBalance, trialBalance } from '../balance';
import { DOC } from '../ids';
import { invoiceTotals, lineAmount } from '../invoices';
import { depreciationFor } from '../ledger';
import { formatDate, formatPercent } from '../money';
import type { Invoice } from '../types';
import { amount, dash, isQ4, net, partyName, pieceNumbers, type DocContext } from './common';

export function balanceDocument({ company, books }: DocContext): GameDocument {
  const balance = [...trialBalance(books.entries).entries()]
    .map(([account, { debit, credit }]) => ({ account, net: debit - credit }))
    .filter((a) => a.net !== 0)
    .sort((a, b) => a.account.localeCompare(b.account));
  return {
    id: DOC.balance,
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

export function purchaseJournal({ company, books }: DocContext): GameDocument {
  const pieces = pieceNumbers(books, 'ACH');
  const lines: DocLine[] = books.entries
    .filter((e) => e.journal === 'ACH' && isQ4(e))
    .map((entry) => {
      const invoice = books.invoices.find((i) => i.id === entry.invoiceId);
      const charge = entry.lines.find((l) => l.account !== '411' && l.account !== '440')?.account ?? '';
      return {
        id: `e-${entry.id}`,
        cells: [
          pieces.get(entry.id) ?? '',
          formatDate(entry.date),
          partyName(books, entry.partyId),
          invoice?.number ?? '',
          charge,
          amount(net(entry, (a) => a !== '411' && a !== '440')),
          amount(net(entry, (a) => a === '411')),
          amount(-net(entry, (a) => a === '440')),
        ],
      };
    });
  return {
    id: DOC.purchaseJournal,
    title: `Journal des achats — 4e trimestre ${company.fiscalYear}`,
    kind: 'journal',
    header: [company.name, `Journal ACH, du 01/10 au 31/12/${company.fiscalYear}`],
    columns: ['Pièce', 'Date', 'Fournisseur', 'N° facture', 'Compte', 'HTVA', 'TVA', 'TVAC'],
    lines,
  };
}

export function salesJournal({ company, books }: DocContext): GameDocument {
  const pieces = pieceNumbers(books, 'VEN');
  const lines: DocLine[] = books.entries
    .filter((e) => e.journal === 'VEN' && isQ4(e))
    .map((entry) => {
      const invoice = books.invoices.find((i) => i.id === entry.invoiceId);
      const product = entry.lines.find((l) => l.account.startsWith('7') || l.account.startsWith('49'))?.account ?? '';
      return {
        id: `e-${entry.id}`,
        cells: [
          pieces.get(entry.id) ?? '',
          formatDate(entry.date),
          partyName(books, entry.partyId),
          invoice?.number ?? '',
          product,
          amount(-net(entry, (a) => a !== '451' && a !== '400')),
          amount(-net(entry, (a) => a === '451')),
          amount(net(entry, (a) => a === '400')),
        ],
      };
    });
  return {
    id: DOC.salesJournal,
    title: `Journal des ventes — 4e trimestre ${company.fiscalYear}`,
    kind: 'journal',
    header: [company.name, `Journal VEN, du 01/10 au 31/12/${company.fiscalYear}`],
    columns: ['Pièce', 'Date', 'Client', 'N° facture', 'Compte', 'HTVA', 'TVA', 'TVAC'],
    lines,
  };
}

function partyBalanceDocument({ company, books }: DocContext, kind: 'supplier' | 'client'): GameDocument {
  const account = kind === 'supplier' ? '440' : '400';
  const sign = kind === 'supplier' ? -1 : 1;
  const parties = books.parties.filter((p) => p.kind === kind && books.entries.some((e) => (e.partyId === p.id || e.lines.some((l) => l.partyId === p.id)) && (isQ4(e) || partyBalance(books.entries, account, p.id) !== 0)));
  return {
    id: kind === 'supplier' ? DOC.supplierBalance : DOC.clientBalance,
    title: `Balance des ${kind === 'supplier' ? 'fournisseurs' : 'clients'} au 31/12/${company.fiscalYear}`,
    kind: 'balance',
    header: [company.name, `Soldes du compte ${account} par ${kind === 'supplier' ? 'fournisseur' : 'client'}`],
    columns: [kind === 'supplier' ? 'Fournisseur' : 'Client', 'Solde au 31/12', 'Dernier mouvement'],
    lines: parties.map((p) => {
      const value = sign * partyBalance(books.entries, account, p.id);
      const last = [...books.entries].reverse().find((e) => e.partyId === p.id);
      const label = value < 0 ? `${amount(-value)} (${kind === 'supplier' ? 'débiteur' : 'créditeur'})` : amount(value);
      return { id: `s-${p.id}`, cells: [p.name, label, last ? formatDate(last.date) : ''] };
    }),
    footer: [kind === 'supplier' ? 'Un solde débiteur signifie que le fournisseur nous doit de l’argent.' : 'Un solde créditeur signifie que l’on doit de l’argent au client.'],
  };
}

export const supplierBalance = (ctx: DocContext) => partyBalanceDocument(ctx, 'supplier');
export const clientBalance = (ctx: DocContext) => partyBalanceDocument(ctx, 'client');

export function invoiceDocument({ company, books }: DocContext, invoice: Invoice): GameDocument {
  const party = books.parties.find((p) => p.id === invoice.partyId)!;
  const totals = invoiceTotals(invoice);
  const creditNote = invoice.kind === 'credit-note';
  const restaurant = invoice.account === '615';
  const label = creditNote ? 'Note de crédit' : restaurant ? 'Note de restaurant' : 'Facture';
  return {
    id: DOC.invoice(invoice.id),
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
      // La dernière ligne de TVA (taux le plus élevé) porte l'identifiant « vat », cible des traces.
      ...totals.byRate
        .filter((r) => r.rate > 0)
        .map((r, i, all) => ({ id: i === all.length - 1 ? 'vat' : `vat-${r.rate}`, cells: [`TVA ${r.rate} % sur ${amount(r.base)}`, '', '', amount(r.vat)] })),
      { id: 'total', cells: [creditNote ? 'Total TVAC à votre crédit' : 'Total TVAC', '', '', amount(totals.total)] },
      ...(invoice.deliveryAddress ? [{ id: 'delivery', cells: [`Livraison : ${invoice.deliveryAddress}`, '', '', ''] }] : []),
      ...(restaurant || creditNote ? [] : [{ id: 'iban', cells: [`Paiement sur le compte ${party.iban}`, '', '', ''] }]),
    ],
    footer: creditNote ? ['Retour de marchandises. Montant remboursé par virement.'] : restaurant ? ['Payé par carte bancaire.'] : [`Communication : ${invoice.number}`],
  };
}

export function analyticDocument({ rng, company, sector, truth, books, analyticGrowth }: DocContext): GameDocument {
  const year = company.fiscalYear;
  const accounts = ['700', '604', '610', '611', '612', '613', '615', '620', '621', '6302', ...(sector.salesMode === 'invoice' ? ['400'] : []), '440', '411'];
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
          : Math.round(reference / (1 + (analyticGrowth?.[account] ?? rng.int(-3, 8)) / 100));
    const variation = prior === 0 ? (current === 0 ? '—' : 'nouveau') : `${current >= prior ? '+' : ''}${formatPercent(((current - prior) / prior) * 100)}`;
    return { id: `r-${account}`, cells: [`${account} ${accountLabel(account)}`, amount(prior), amount(current), variation] };
  });
  return {
    id: DOC.analytic,
    title: 'Revue analytique N / N-1',
    kind: 'report',
    header: ['Feuille de travail Vigie & Associés', `${company.name} — comparaison ${year - 1} / ${year}`],
    columns: ['Poste', String(year - 1), String(year), 'Variation'],
    lines,
    footer: ['Comptes de bilan : soldes au 31/12. Comptes de résultat : montants de l’exercice.'],
  };
}

export function assetDocument({ company, books }: DocContext): GameDocument {
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
    id: DOC.assets,
    title: `Tableau des immobilisations et amortissements ${year}`,
    kind: 'report',
    header: [company.name, 'Registre tenu par le client — amortissement linéaire'],
    columns: ['Désignation', 'Acquisition', 'Valeur d’acquisition', 'Durée', 'Amort. antérieurs', `Dotation ${year}`, 'Valeur nette'],
    lines: [...lines, { id: 'total', cells: ['Total des dotations de l’exercice', '', '', '', '', amount(total), ''] }],
  };
}

/** Loi de Benford : fréquence attendue du premier chiffre significatif. */
export const BENFORD = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => Math.log10(1 + 1 / digit));

export function benfordDocument({ company, books }: DocContext): GameDocument {
  const amounts = books.entries.filter((e) => e.journal === 'ACH').map((e) => Math.abs(net(e, (a) => a !== '411' && a !== '440'))).filter((v) => v > 0);
  const firstDigit = (cents: number) => Number(String(Math.floor(cents / 100)).replace(/^0+/, '')[0] ?? 0);
  const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => amounts.filter((v) => firstDigit(v) === digit).length);
  const near = books.entries.filter((e) => e.journal === 'ACH').filter((e) => {
    const v = net(e, (a) => a !== '411' && a !== '440');
    return v >= 450000 && v < 500000;
  });
  const suppliers = [...new Set(near.map((e) => partyName(books, e.partyId)))];
  return {
    id: DOC.benford,
    title: 'Analyse de Benford — factures d’achat',
    kind: 'report',
    header: ['Outil d’Inès, Vigie & Associés', `${company.name} — ${amounts.length} factures d’achat de l’exercice (montants HTVA)`],
    columns: ['Premier chiffre', 'Attendu (Benford)', 'Observé', 'Écart'],
    lines: [
      ...counts.map((count, i) => {
        const observed = amounts.length === 0 ? 0 : (count / amounts.length) * 100;
        const expected = BENFORD[i]! * 100;
        return { id: `d${i + 1}`, cells: [String(i + 1), formatPercent(expected), `${count} (${formatPercent(observed)})`, `${observed - expected >= 0 ? '+' : ''}${formatPercent(observed - expected)}`] };
      }),
      {
        id: 'seuil',
        cells: ['4 500 à 4 999 €', 'juste sous le seuil d’approbation de 5 000 €', `${near.length} facture(s)`, suppliers.join(', ') || '—'],
      },
    ],
    footer: ['Un excès de montants juste sous un seuil d’approbation mérite toujours un coup d’œil.'],
  };
}
