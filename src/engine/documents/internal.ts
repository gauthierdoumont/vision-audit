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
    title: 'Courriers reçus (avocats, curateurs)',
    kind: 'letter',
    header: ['Correspondance juridique conservée par le client'],
    columns: ['Expéditeur', 'Contenu'],
    lines: books.world.letters.flatMap((letter) => letter.lines.map((l) => ({ id: `${letter.id}-${l.id}`, cells: [letter.from, l.text] }))),
  };
}

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
    columns: ['Nom', 'Fonction', 'Brut', 'Net versé', 'Compte du bénéficiaire'],
    lines: books.world.employees.map((e) => ({ id: `p-${e.id}`, cells: [`${e.firstName} ${e.lastName}`, e.role, amount(e.monthlyGross), amount(netOf(e.monthlyGross)), e.iban] })),
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
      .map((e, i) => ({ id: `e-${e.id}`, cells: [`${e.firstName} ${e.lastName}`, e.role, formatDate(e.startDate, true), `D-${String(70412 + i * 37).padStart(6, '0')}`] })),
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
