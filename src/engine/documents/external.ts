// Documents de tiers et de séparation des exercices : banque, confirmations, registre BCE, opérations postérieures.
// Audit Detective — créé par Gauthier Doumont.
import type { DocLine, GameDocument } from '../../content/types';
import { partyBalance } from '../balance';
import { DOC } from '../ids';
import { invoiceTotals } from '../invoices';
import { formatDate, isoDate } from '../money';
import type { Entry } from '../types';
import { amount, isQ4, partyName, type DocContext } from './common';

const exact550 = (e: Entry) => e.lines.filter((l) => l.account === '550').reduce((s, l) => s + l.debit - l.credit, 0);

export function bankStatement({ company, truth, books }: DocContext): GameDocument {
  const bankEntries = truth.entries.filter((e) => e.lines.some((l) => l.account === '550'));
  const openingBalance = bankEntries.filter((e) => !isQ4(e)).reduce((s, e) => s + exact550(e), 0);
  const q4 = bankEntries.filter(isQ4);
  const closing = openingBalance + q4.reduce((s, e) => s + exact550(e), 0);
  const ledger = books.entries.reduce((s, e) => s + exact550(e), 0);
  const account = truth.world.bankAccounts[0]!;
  return {
    id: DOC.bank,
    title: 'Relevés bancaires du 4e trimestre et rapprochement',
    kind: 'bank',
    header: [`${account.bank} — compte ${account.iban} (fictif)`, `Titulaire : ${company.name}`],
    columns: ['Date', 'Libellé', 'Montant'],
    lines: [
      { id: 'open', cells: ['30/09', 'Solde initial', amount(openingBalance)] },
      ...q4.map((e) => {
        const value = exact550(e);
        const counterparty = partyName(truth, e.partyId);
        return { id: `b-${e.id}`, cells: [formatDate(e.date), counterparty && !e.label.includes(counterparty) ? `${e.label} — ${counterparty}` : e.label, `${value > 0 ? '+' : ''}${amount(value)}`] };
      }),
      { id: 'close', cells: ['31/12', 'Solde final', amount(closing)] },
    ],
    footer: [`Rapprochement : solde bancaire ${amount(closing)} — solde comptable du 550 ${amount(ledger)}. ${closing === ledger ? 'Aucun écart.' : 'Écart à expliquer.'}`],
  };
}

export function bankConfirmation({ company, truth, books }: DocContext): GameDocument {
  const real = truth.world.bankAccounts;
  const balanceOf = (account: string) => truth.entries.flatMap((e) => e.lines).filter((l) => l.account === account).reduce((s, l) => s + l.debit - l.credit, 0);
  const lines: DocLine[] = books.world.bankAccounts.map((account) => {
    const exists = real.some((r) => r.iban === account.iban);
    return {
      id: `bc-${account.id}`,
      cells: [account.bank, `${account.label} ${account.iban}`, exists ? `Solde au 31/12 : ${amount(balanceOf(account.account))}` : 'Aucun compte ouvert au nom de la société sous ce numéro'],
    };
  });
  return {
    id: DOC.bankConfirmation,
    title: 'Confirmations bancaires au 31/12',
    kind: 'letter',
    header: ['Réponses des banques à la demande de Vigie & Associés', `Objet : relations de ${company.name} au 31/12/${company.fiscalYear}`],
    columns: ['Banque', 'Compte', 'Réponse'],
    lines: [...lines, { id: 'bc-credits', cells: ['Toutes', 'Crédits et garanties', 'Aucun crédit en cours ; garantie locative bloquée.'] }],
    footer: ['Chaque banque répond directement au réviseur, sans passer par le client.'],
  };
}

function confirmationDocument({ company, truth, books }: DocContext, partyId: string, kind: 'supplier' | 'client'): GameDocument {
  const party = truth.parties.find((p) => p.id === partyId)!;
  const account = kind === 'supplier' ? '440' : '400';
  const sign = kind === 'supplier' ? -1 : 1;
  const ownView = sign * partyBalance(truth.entries, account, partyId);
  const clientView = sign * partyBalance(books.entries, account, partyId);
  const operations: DocLine[] = truth.entries
    .filter((e) => e.partyId === partyId && isQ4(e) && e.lines.some((l) => l.account === account))
    .map((e) => {
      const invoice = truth.invoices.find((i) => i.id === e.invoiceId);
      const value = sign * e.lines.filter((l) => l.account === account).reduce((s, l) => s + l.debit - l.credit, 0);
      const document = invoice ? `${invoice.kind === 'credit-note' ? 'Note de crédit' : 'Facture'} ${invoice.number}` : '';
      const what = e.journal === 'ACH' || e.journal === 'VEN' ? document : `${value < 0 ? 'Paiement reçu' : 'Remboursement'}${document ? ` — ${invoice!.number}` : ''}`;
      return { id: `c-${e.id}`, cells: [formatDate(e.date), what || e.label, amount(value)] };
    });
  const bankrupt = party.status === 'bankrupt';
  return {
    id: kind === 'supplier' ? DOC.supplierConfirmation(partyId) : DOC.clientConfirmation(partyId),
    title: `Confirmation de solde — ${party.name}`,
    kind: 'letter',
    header: [
      bankrupt ? `Réponse du curateur de ${party.name}` : `${party.name}, service comptabilité`,
      'À l’attention de Vigie & Associés, réviseurs d’entreprises',
      `Objet : solde de ${company.name} au 31/12/${company.fiscalYear}`,
    ],
    columns: ['Date', 'Opération', 'Montant'],
    lines: [
      ...(bankrupt ? [] : operations),
      {
        id: 'solde',
        cells: [
          '31/12',
          bankrupt
            ? 'Société en faillite : la créance est à déclarer au passif de la faillite'
            : kind === 'supplier'
              ? 'Solde dû selon nos livres'
              : 'Montant que nous vous devons selon nos livres',
          bankrupt ? '—' : amount(ownView),
        ],
      },
      { id: 'ecart', cells: ['', `Note du réviseur : solde chez le client, écart de ${amount(clientView - (bankrupt ? clientView : ownView))}`, amount(clientView)] },
    ],
    footer: [bankrupt ? 'Courrier du curateur joint au dossier.' : 'Opérations du 4e trimestre. Montants positifs : facturé ; négatifs : payé ou crédité.'],
  };
}

export const supplierConfirmation = (ctx: DocContext, partyId: string) => confirmationDocument(ctx, partyId, 'supplier');
export const clientConfirmation = (ctx: DocContext, partyId: string) => confirmationDocument(ctx, partyId, 'client');

/** Extrait du registre BCE (fictif) : la société, ses fournisseurs du trimestre et ses clients. */
export function registryDocument({ company, truth, books }: DocContext): GameDocument {
  const q4Parties = books.parties.filter((p) => books.entries.some((e) => e.partyId === p.id && isQ4(e)) || p.kind === 'client');
  const lines: DocLine[] = [];
  const company0 = truth.world.registry.find((r) => r.id === 'bce0')!;
  lines.push({ id: `r-${company0.id}`, cells: [company0.name, company0.number, company0.directors.join(', '), company0.status] });
  for (const party of q4Parties) {
    const entry = truth.world.registry.find((r) => r.id === party.registryId);
    lines.push(
      entry
        ? { id: `r-${entry.id}`, cells: [entry.name, entry.number, entry.directors.join(', '), entry.status] }
        : { id: `r-none-${party.id}`, cells: [party.name, '—', '—', 'Aucune entreprise trouvée sous ce nom'] },
    );
  }
  return {
    id: DOC.registry,
    title: 'Recherche à la Banque-Carrefour des Entreprises (fictive)',
    kind: 'report',
    header: ['Extraits consultés par Vigie & Associés', `Tiers de ${company.name} au 4e trimestre ${company.fiscalYear}`],
    columns: ['Dénomination', 'N° d’entreprise', 'Administrateurs', 'Situation'],
    lines,
    footer: ['Registre fictif : numéros et noms inventés pour le jeu.'],
  };
}

export function afterClosingDocument({ company, truth }: DocContext): GameDocument {
  return {
    id: DOC.afterClosing,
    title: `Opérations de janvier-février ${company.fiscalYear + 1}`,
    kind: 'bank',
    header: [company.name, 'Paiements, encaissements et documents postérieurs à la clôture'],
    columns: ['Date', 'Opération', 'Tiers', 'Montant'],
    lines: truth.world.afterClosing.map((ev) => ({
      id: `x-${ev.id}`,
      cells: [formatDate(ev.date, true), ev.label, partyName(truth, ev.partyId), `${ev.amount > 0 ? '+' : ''}${amount(ev.amount)}`],
    })),
    footer: ['Une dette payée en janvier existait-elle déjà au 31/12 ? Une vente annulée en janvier était-elle réelle ?'],
  };
}

/** Test de séparation des exercices : factures de vente de fin décembre et bons de livraison autour de la clôture. */
export function cutoffDocument({ company, truth, books }: DocContext): GameDocument {
  const year = company.fiscalYear;
  const from = isoDate(year, 12, 1);
  const invoices = books.invoices.filter((i) => i.flow === 'sale' && i.date >= from).sort((a, b) => a.date.localeCompare(b.date));
  const deliveries = truth.world.deliveries;
  const lines: DocLine[] = invoices.map((invoice) => {
    const bl = deliveries.find((d) => d.invoiceNumber === invoice.number);
    return {
      id: `f-${invoice.id}`,
      cells: [formatDate(invoice.date), `Facture ${invoice.number} — ${partyName(books, invoice.partyId)}`, amount(invoiceTotals(invoice).total), bl ? `${bl.number} du ${formatDate(bl.date, true)}` : 'Aucun bon de livraison'],
    };
  });
  for (const bl of deliveries.filter((d) => d.date > isoDate(year, 12, 31)).sort((a, b) => a.date.localeCompare(b.date))) {
    if (invoices.some((i) => i.number === bl.invoiceNumber)) continue;
    lines.push({ id: `bl-${bl.id}`, cells: [formatDate(bl.date, true), `${bl.number} — ${partyName(truth, bl.partyId)}`, '', `Facturé en ${year + 1} (${bl.invoiceNumber})`] });
  }
  return {
    id: DOC.cutoff,
    title: 'Test de séparation des exercices — ventes',
    kind: 'report',
    header: ['Feuille de travail Vigie & Associés', `Factures de vente du 01/12 au 31/12/${year} et livraisons de janvier ${year + 1}`],
    columns: ['Date', 'Pièce', 'Montant TVAC', 'Bon de livraison'],
    lines,
    footer: ['Le produit d’une vente de biens appartient à l’exercice de la livraison.'],
  };
}
