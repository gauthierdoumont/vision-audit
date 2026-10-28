// Types internes du moteur de génération. Montants en centimes. Audit Detective — Gauthier Doumont.
import type { Cents } from './money';

export type SectorId = 'boulangerie' | 'garage' | 'informatique' | 'horeca';

export type Person = { firstName: string; lastName: string };

export type Company = {
  name: string;
  legalForm: 'SRL' | 'SA' | 'SC';
  sector: SectorId;
  street: string;
  city: string;
  postalCode: string;
  manager: Person;
  accountant: Person;
  staff: number;
  fiscalYear: number;
};

export type PartyKind = 'supplier' | 'client';

export type Party = { id: string; kind: PartyKind; name: string; address: string };

/** `partyId` sur une ligne : utile quand une écriture touche plusieurs tiers (ex. : bilan d'ouverture). */
export type EntryLine = { account: string; debit: Cents; credit: Cents; partyId?: string };

export type JournalCode = 'ACH' | 'VEN' | 'FIN' | 'OD';

export type Entry = {
  id: string;
  journal: JournalCode;
  date: string;
  label: string;
  lines: EntryLine[];
  partyId?: string;
  invoiceId?: string;
  assetId?: string;
};

export type InvoiceLine = { label: string; quantity: number; unitPrice: Cents; vatRate: number };

export type InvoiceKind = 'invoice' | 'credit-note';

export type Invoice = {
  id: string;
  kind: InvoiceKind;
  /** purchase : reçue d'un fournisseur ; sale : émise vers un client. */
  flow: 'purchase' | 'sale';
  number: string;
  date: string;
  dueDate: string;
  partyId: string;
  /** Compte de charge, d'actif ou de produit mouvementé par la facture. */
  account: string;
  lines: InvoiceLine[];
  /** TVA non déductible (frais de restaurant) : elle reste en charge. */
  vatDeductible: boolean;
  assetId?: string;
};

export type FixedAsset = {
  id: string;
  label: string;
  account: string;
  depreciationAccount: string;
  acquisitionDate: string;
  cost: Cents;
  years: number;
  /** Amortissements actés avant l'exercice. */
  priorDepreciation: Cents;
};

export type Books = {
  entries: Entry[];
  invoices: Invoice[];
  assets: FixedAsset[];
  parties: Party[];
};

export type TrialBalance = Map<string, { debit: Cents; credit: Cents }>;
