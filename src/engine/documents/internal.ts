// Documents internes du client : procès-verbaux, courriers, paie, registre du personnel, contrats.
// Audit Detective — créé par Gauthier Doumont.
import type { GameDocument } from '../../content/types';
import { DOC } from '../ids';
import { WITHHOLDING_TAX, WORKER_ONSS } from '../ledger';
import { formatDate } from '../money';
import { amount, type DocContext } from './common';

export function minutesDocument({ company, books }: DocContext): GameDocument {
  const minutes = [...books.world.minutes].sort((a, b) => a.date.localeCompare(b.date));
  return {
    id: DOC.minutes,
    title: `Procès-verbaux ${company.fiscalYear}`,
    kind: 'letter',
    header: [company.name, 'Assemblée générale et organe d’administration'],
    columns: ['Date', 'Organe', 'Décision ou point abordé'],
    lines: minutes.map((m) => ({ id: `m-${m.id}`, cells: [formatDate(m.date, true), m.meeting, m.text] })),
  };
}

export function lettersDocument({ books }: DocContext): GameDocument {
  return {
    id: DOC.legal,
    title: 'Courriers reçus (avocats, curateurs, administration)',
    kind: 'letter',
    header: ['Correspondance juridique et administrative conservée par le client'],
    columns: ['Expéditeur', 'Contenu'],
    lines: books.world.letters.flatMap((letter) => letter.lines.map((l) => ({ id: `${letter.id}-${l.id}`, cells: [letter.from, l.text] }))),
  };
}

/** Numéro de déclaration Dimona fictif. */
const dimona = (index: number) => `D-${String(70412 + index * 37).padStart(6, '0')}`;

/** Journal de paie de décembre : une ligne par personne payée. */
export function payrollDocument({ company, books }: DocContext): GameDocument {
  const netOf = (gross: number) => {
    const onss = Math.round((gross * WORKER_ONSS) / 100);
    return gross - onss - Math.round(((gross - onss) * WITHHOLDING_TAX) / 100);
  };
  return {
    id: DOC.payroll,
    title: `Journal de paie — décembre ${company.fiscalYear}`,
    kind: 'journal',
    header: [company.name, 'Rémunérations de décembre, virements du 31/12'],
    columns: ['Nom', 'Fonction', 'Brut', 'Net versé', 'Compte du bénéficiaire', 'Dimona'],
    lines: books.world.employees.flatMap((e, i) => [
      { id: `p-${e.id}`, cells: [`${e.firstName} ${e.lastName}`, e.role, amount(e.monthlyGross), amount(netOf(e.monthlyGross)), e.iban, e.registered ? dimona(i) : '—'] },
      ...(e.overtime
        ? [
            {
              id: `p-${e.id}-hs`,
              cells: [
                `${e.firstName} ${e.lastName}`,
                `Heures supplémentaires : ${e.overtime.hours} h à ${amount(e.overtime.hourlyRate)} € + 50 %`,
                amount(overtimePay(e.overtime)),
                amount(netOf(overtimePay(e.overtime))),
                e.iban,
                '',
              ],
            },
          ]
        : []),
    ]),
  };
}

/** Sursalaire légal d'au moins 50 % pour les heures supplémentaires (100 % le dimanche et les jours fériés). */
export function overtimePay({ hours, hourlyRate }: { hours: number; hourlyRate: number }): number {
  return Math.round(hours * hourlyRate * 1.5);
}

/** Relevé de la pointeuse (vérité) : les heures supplémentaires réellement prestées en décembre. */
export function timesheetDocument({ company, truth }: DocContext): GameDocument {
  return {
    id: DOC.timesheet,
    title: `Relevé de pointage — décembre ${company.fiscalYear}`,
    kind: 'report',
    header: [company.name, 'Export de la pointeuse : heures prestées au-delà de l’horaire normal'],
    columns: ['Nom', 'Fonction', 'Heures supplémentaires pointées'],
    lines: truth.world.employees.filter((e) => e.overtime).map((e) => ({ id: `t-${e.id}`, cells: [`${e.firstName} ${e.lastName}`, e.role, `${e.overtime!.hours} h`] })),
    footer: ['Les heures supplémentaires doivent être pointées et validées par la gérance avant d’être payées.'],
  };
}

/** Registre du personnel (tenu à jour, déclarations Dimona) : la référence pour un employé fantôme. */
export function personnelDocument({ company, truth }: DocContext): GameDocument {
  return {
    id: DOC.personnel,
    title: 'Registre du personnel',
    kind: 'report',
    header: [company.name, 'Personnes inscrites et déclarées à l’ONSS (Dimona)'],
    columns: ['Nom', 'Fonction', 'Entrée', 'Dimona'],
    lines: truth.world.employees
      .filter((e) => e.registered)
      .map((e, i) => ({ id: `e-${e.id}`, cells: [`${e.firstName} ${e.lastName}`, e.role, formatDate(e.startDate, true), dimona(i)] })),
  };
}

export function contractsDocument({ books }: DocContext): GameDocument {
  return {
    id: DOC.contracts,
    title: 'Contrats en vigueur',
    kind: 'letter',
    header: ['Contrats conservés par le client'],
    columns: ['Contrat', 'Clause'],
    lines: books.world.contracts.flatMap((k) => k.clauses.map((clause, i) => ({ id: i === 0 ? `k-${k.id}` : `k-${k.id}-${i}`, cells: [k.title, clause] }))),
  };
}

/** Liste d'inventaire établie par le client (quantités et valeurs qu'il a comptabilisées). */
export function inventoryListDocument({ company, books }: DocContext): GameDocument {
  const total = books.world.stock.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  return {
    id: DOC.inventory,
    title: `Liste d’inventaire au 31/12/${company.fiscalYear}`,
    kind: 'report',
    header: [company.name, 'Établie et signée par la gérance'],
    columns: ['Article', 'Quantité', 'Coût unitaire', 'Valeur', 'Dernier mouvement'],
    lines: [
      ...books.world.stock.map((i) => ({ id: `s-${i.id}`, cells: [i.label, String(i.quantity), amount(i.unitCost), amount(i.quantity * i.unitCost), formatDate(i.lastMovement, true)] })),
      { id: 'total', cells: ['Total du stock', '', '', amount(total), ''] },
    ],
  };
}

/** Feuille de comptage de Vigie & Associés lors de l'observation de l'inventaire physique. */
export function countSheetDocument({ company, truth }: DocContext): GameDocument {
  return {
    id: DOC.count,
    title: 'Observation de l’inventaire physique — feuille de comptage',
    kind: 'report',
    header: ['Vigie & Associés, présents le 31/12 au matin', `${company.name} — recomptage contradictoire`],
    columns: ['Article', 'Quantité comptée', 'Observation'],
    lines: truth.world.stock.map((i) => ({ id: `c-${i.id}`, cells: [i.label, String(i.quantity), i.countNote ?? 'RAS'] })),
  };
}
