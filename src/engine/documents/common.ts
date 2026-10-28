// Outils partagés par les générateurs de documents. Audit Detective — créé par Gauthier Doumont.
import type { SectorSpec } from '../../content/sectors';
import { formatAmount, monthOf, type Cents } from '../money';
import type { Rng } from '../rng';
import type { Books, Company, Entry } from '../types';

export type DocContext = {
  rng: Rng;
  company: Company;
  sector: SectorSpec;
  truth: Books;
  books: Books;
  confirmedSuppliers: string[];
  confirmedClients: string[];
  /** Croissance N/N-1 imposée pour certains comptes (fausse piste « forte hausse »). */
  analyticGrowth?: Record<string, number>;
  /** Procédures impossibles (limitation de l'étendue des travaux). */
  unavailable?: string[];
};

export const isQ4 = (e: { date: string }) => monthOf(e.date) >= 10;
export const amount = (cents: Cents) => formatAmount(cents);
export const dash = (cents: Cents) => (cents === 0 ? '' : formatAmount(cents));

export function partyName(books: Books, partyId?: string): string {
  return books.parties.find((p) => p.id === partyId)?.name ?? '';
}

export function inYear(company: Company) {
  return (e: { date: string }) => e.date.startsWith(String(company.fiscalYear));
}

/** Numéros de pièces (ACH-0001, VEN-0001…) dans l'ordre chronologique de l'année. */
export function pieceNumbers(books: Books, journal: Entry['journal']): Map<string, string> {
  const numbers = new Map<string, string>();
  books.entries.filter((e) => e.journal === journal).forEach((e, i) => numbers.set(e.id, `${journal}-${String(i + 1).padStart(4, '0')}`));
  return numbers;
}

export function net(entry: Entry, match: (account: string) => boolean): Cents {
  return entry.lines.filter((l) => match(l.account)).reduce((s, l) => s + l.debit - l.credit, 0);
}
