// Scénarios de niveau : fausses pistes, limitation de l'étendue des travaux, continuité d'exploitation,
// et opinion attendue. Audit Detective — créé par Gauthier Doumont.
import type { Opinion } from '../content/types';
import { addParty, c, d, everywhere, type InjectContext } from './anomalies/types';
import { accountBalance } from './balance';
import { REF, type TraceRef } from './ids';
import { between, fictitiousCompanyNumber, sortEntries } from './ledger';
import { addDays, euros, formatAmount, isoDate, roundTo, type Cents } from './money';
import type { Entry, Invoice, Party } from './types';

export type DecoyType = 'maintenance-contract' | 'supplier-advance' | 'late-hire' | 'revenue-growth';

export type DecoyResult = {
  type: DecoyType;
  title: string;
  explanation: string[];
  /** Ce qui attire l'œil. */
  suspicious: TraceRef[];
  /** Le document qui l'explique. */
  justification: TraceRef[];
};

/** Fausse piste : un fait réel, donc identique dans la vérité et dans les livres. */
export function injectDecoy(type: DecoyType, ctx: InjectContext): DecoyResult {
  const { rng, company, books } = ctx;
  const year = company.fiscalYear;
  switch (type) {
    case 'maintenance-contract': {
      const party: Party = { id: ctx.newId('p'), kind: 'supplier', name: 'Technic Service Wallonie SRL', address: '5000 Namur', iban: `BE00 9999 ${rng.int(1000, 9999)} ${rng.int(1000, 9999)}`, registryId: ctx.newId('bce') };
      addParty(ctx, party, { id: party.registryId!, name: party.name, number: fictitiousCompanyNumber(rng), address: party.address, founded: '2004', directors: ['Gérance'], activity: 'Maintenance industrielle', status: 'Active' });
      const date = isoDate(year, 11, rng.int(3, 12));
      const invoice: Invoice = {
        id: ctx.newId('i'),
        kind: 'invoice',
        flow: 'purchase',
        number: `TS-${year}-${rng.int(100, 999)}`,
        date,
        dueDate: addDays(date, 30),
        partyId: party.id,
        account: '611',
        lines: [{ label: `Contrat d’entretien annuel ${year} — forfait`, quantity: 1, unitPrice: between(rng, [5000, 9000], 50), vatRate: 21 }],
        vatDeductible: !ctx.sector.vatExempt,
      };
      const base = invoice.lines[0]!.unitPrice;
      const vat = invoice.vatDeductible ? Math.round((base * 21) / 100) : 0;
      const charge = invoice.vatDeductible ? base : base + Math.round((base * 21) / 100);
      const total = base + Math.round((base * 21) / 100);
      const purchase: Entry = { id: ctx.newId('e'), journal: 'ACH', date, label: `Entretien — ${party.name}`, lines: [d('611', charge), ...(vat ? [d('411', vat)] : []), c('440', total)], partyId: party.id, invoiceId: invoice.id };
      const payment: Entry = { id: ctx.newId('e'), journal: 'FIN', date: addDays(date, 30), label: `Paiement ${invoice.number}`, lines: [d('440', total), c('550', total)], partyId: party.id, invoiceId: invoice.id };
      everywhere(ctx, (b) => {
        b.invoices.push(structuredClone(invoice));
        b.entries.push(structuredClone(purchase), structuredClone(payment));
        sortEntries(b.entries);
        b.world.contracts.push({ id: 'entretien', title: `Contrat d’entretien ${party.name}`, partyId: party.id, clauses: [`Entretien préventif de toutes les installations, forfait annuel ${year} facturé en novembre.`, 'Pièces d’usure comprises ; aucun équipement neuf n’est livré.'] });
      });
      return {
        type,
        title: `Grosse facture d’entretien de ${party.name}`,
        explanation: [`La facture de ${formatAmount(base)} € HTVA est le forfait annuel ${year} d’un contrat d’entretien : une charge de l’exercice, pas un investissement.`],
        suspicious: [REF.purchase(purchase.id), REF.analytic('611')],
        justification: [REF.contract('entretien')],
      };
    }
    case 'supplier-advance': {
      const supplier = books.parties.find((p) => p.kind === 'supplier')!;
      const amount = between(rng, [3000, 8000], 100);
      const entry: Entry = { id: ctx.newId('e'), journal: 'FIN', date: isoDate(year, 12, rng.int(10, 20)), label: `Acompte commande de janvier — ${supplier.name}`, lines: [d('406', amount), c('550', amount)], partyId: supplier.id };
      everywhere(ctx, (b) => {
        b.entries.push(structuredClone(entry));
        sortEntries(b.entries);
        b.world.minutes.push({ id: 'm-acompte', date: isoDate(year, 12, 5), meeting: 'Organe d’administration', text: `Commande importante passée à ${supplier.name} pour janvier ; acompte de 30 % exigé, payé en décembre.` });
      });
      return {
        type,
        title: `Acompte de ${formatAmount(amount)} € versé à ${supplier.name}`,
        explanation: ['Un acompte versé en décembre pour une livraison de janvier est une créance (406), correctement comptabilisée. Le PV de décembre l’explique.'],
        suspicious: [REF.balance('406'), REF.bank(entry.id)],
        justification: [REF.minutes('m-acompte')],
      };
    }
    case 'late-hire': {
      // La vraie embauche d'octobre (jamais un éventuel employé fantôme).
      const hire = ctx.truth.world.employees.filter((e) => e.registered).at(-1)!;
      return {
        type,
        title: `Nouveau nom dans la paie : ${hire.firstName} ${hire.lastName}`,
        explanation: [`${hire.firstName} ${hire.lastName} a été embauché(e) le 1er octobre : inscrit(e) au registre du personnel et déclaré(e) à l’ONSS. Rien d’anormal.`],
        suspicious: [REF.payroll(hire.id)],
        justification: [REF.personnel(`e-${hire.id}`)],
      };
    }
    case 'revenue-growth': {
      const client = books.parties.find((p) => p.kind === 'client');
      const name = client?.name ?? 'une enseigne régionale';
      everywhere(ctx, (b) => {
        b.world.minutes.push({ id: 'm-croissance', date: isoDate(year, 3, rng.int(2, 25)), meeting: 'Organe d’administration', text: `Nouveau contrat-cadre avec ${name} : environ 20 % d’activité en plus attendus sur l’année.` });
      });
      return {
        type,
        title: 'Chiffre d’affaires en forte hausse',
        explanation: [`La hausse des ventes s’explique par le nouveau contrat-cadre avec ${name}, décidé en mars (PV). Elle n’est pas due à des ventes fictives.`],
        suspicious: [REF.analytic('700')],
        justification: [REF.minutes('m-croissance')],
      };
    }
  }
}

export type Limitation = 'inventory' | 'representation-letter';
export type GoingConcern = 'disclosed' | 'hidden';

/** Signes de difficultés de continuité : grosse perte, banque qui se retire, sonnette d'alarme. */
export function injectGoingConcern(ctx: InjectContext, variant: GoingConcern): { traces: TraceRef[]; loss: Cents } {
  const { books, company, rng } = ctx;
  const year = company.fiscalYear;
  const equity = -accountBalance(books.entries, '1');
  const loss = roundTo(equity + Math.round(-accountBalance(books.entries, '70') * 0.05) + euros(rng.int(10, 40) * 1000), euros(1000));
  const entry: Entry = { id: ctx.newId('e'), journal: 'OD', date: isoDate(year, 12, 31), label: 'Indemnité due à un ancien client (jugement du 15/12)', lines: [d('66', loss), c('489', loss)] };
  everywhere(ctx, (b) => {
    b.entries.push(structuredClone(entry));
    sortEntries(b.entries);
    b.world.letters.push({
      id: 'banque',
      from: 'Banque de Wallonie, service crédits',
      subject: 'Ligne de crédit',
      lines: [
        { id: 'l1', text: `Au vu de la situation, nous mettons fin à votre ligne de crédit de caisse au 31/03/${year + 1}.` },
        { id: 'l2', text: 'Un remboursement anticipé des découverts sera exigé.' },
      ],
    });
    b.world.minutes.push(
      { id: 'm-alarme', date: isoDate(year, 12, 28), meeting: 'Organe d’administration', text: 'L’actif net devient négatif : procédure de la sonnette d’alarme (CSA, art. 5:153 pour une SRL — À VÉRIFIER). Plan de redressement à présenter à l’assemblée.' },
      {
        id: 'm-annexe',
        date: isoDate(year + 1, 1, 20),
        meeting: 'Organe d’administration',
        text: variant === 'disclosed' ? 'L’incertitude sur la continuité sera décrite dans l’annexe et le rapport de gestion.' : 'Inutile d’inquiéter les partenaires : rien ne sera mentionné dans l’annexe.',
      },
    );
  });
  return { traces: [REF.legal('banque-l1'), REF.minutes('m-alarme'), REF.minutes('m-annexe'), REF.balance('66')], loss };
}

const SEVERITY: Record<Opinion, number> = { 'sans-reserve': 0, 'avec-reserve': 1, negative: 2, abstention: 3 };

export type OpinionInput = {
  amounts: Cents[];
  /** Informations manquantes dans l'annexe (parties liées…), sans montant à corriger. */
  disclosures?: number;
  materiality: Cents;
  clientCorrects: boolean;
  limitation?: Limitation;
  goingConcern?: GoingConcern;
};

/** Opinion attendue (ISA 705, 706, 570, 580) et explication pas à pas. */
export function expectedOpinion({ amounts, disclosures = 0, materiality, clientCorrects, limitation, goingConcern }: OpinionInput) {
  const total = amounts.reduce((s, a) => s + a, 0);
  const lines: string[] = [];
  let opinion: Opinion = 'sans-reserve';
  const raise = (o: Opinion) => {
    if (SEVERITY[o] > SEVERITY[opinion]) opinion = o;
  };
  const m = `${formatAmount(materiality)} €`;
  if (amounts.length === 0) {
    // Aucune anomalie chiffrée : seule l'annexe est en cause (traitée plus bas).
  } else if (clientCorrects) {
    lines.push(`Anomalies relevées : ${formatAmount(total)} € (seuil ${m}). Le client corrige : elles ne restent pas dans les comptes.`);
  } else if (total < materiality) {
    lines.push(`Le client refuse de corriger, mais le total (${formatAmount(total)} €) reste sous le seuil de ${m} : pas d’effet sur l’opinion.`);
  } else if (amounts.filter((a) => a >= materiality).length >= 3 || total >= 10 * materiality) {
    // Règle simplifiée du jeu : le caractère diffus relève du jugement du réviseur (ISA 705, § 5).
    raise('negative');
    lines.push(`Le client refuse de corriger ${formatAmount(total)} € répartis sur plusieurs postes (seuil ${m}) : l’effet est diffus. Opinion négative (ISA 705).`);
  } else {
    raise('avec-reserve');
    lines.push(`Le client refuse de corriger ${formatAmount(total)} € (seuil ${m}) : significatif mais pas diffus. Opinion avec réserve (ISA 705).`);
  }
  if (disclosures > 0) {
    if (clientCorrects) {
      lines.push('Une information manque dans l’annexe (parties liées) : le client accepte de la compléter. Pas d’effet sur l’opinion.');
    } else {
      raise('avec-reserve');
      lines.push('Le client refuse de compléter l’annexe (parties liées) : omission d’une information significative. Réserve (ISA 705, ISA 550).');
    }
  }
  if (limitation === 'inventory') {
    raise('avec-reserve');
    lines.push('Nous n’avons pas pu observer l’inventaire : limitation de l’étendue des travaux, significative mais localisée. Réserve (ISA 705, ISA 501).');
  }
  if (limitation === 'representation-letter') {
    raise('abstention');
    lines.push('La gérance refuse de signer la lettre d’affirmation : sans elle, aucune opinion n’est possible. Déclaration d’abstention (ISA 580).');
  }
  if (goingConcern === 'disclosed') {
    lines.push('Incertitude significative sur la continuité, correctement décrite dans l’annexe : on l’indique dans le rapport, sans modifier l’opinion (ISA 570).');
  } else if (goingConcern === 'hidden') {
    raise('avec-reserve');
    lines.push('Incertitude significative sur la continuité, mais la gérance refuse de la décrire dans l’annexe : réserve, et mention de l’incertitude dans le rapport (ISA 570).');
  } else {
    lines.push('Rien n’indique un problème de continuité : pas de paragraphe sur la continuité.');
  }
  return { opinion, continuity: goingConcern !== undefined, explanation: lines };
}

