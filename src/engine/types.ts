// Types internes du moteur de génération. Montants en centimes. Audit Detective — Gauthier Doumont.
import type { Cents } from './money';

export type SectorId =
  | 'boulangerie'
  | 'garage'
  | 'informatique'
  | 'horeca'
  | 'grossiste'
  | 'construction'
  | 'ecommerce'
  | 'transport'
  | 'medical'
  | 'detail';

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

export type Party = {
  id: string;
  kind: PartyKind;
  name: string;
  address: string;
  iban: string;
  registryId?: string;
  /** Client en faillite : ses factures ouvertes ne seront jamais payées. */
  status?: 'bankrupt';
};

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
  /** Ventes : date du bon de livraison (une livraison après le 31/12 signale un problème de séparation). */
  deliveryDate?: string;
  /** Adresse de livraison si elle diffère du siège (ex. : domicile du gérant). */
  deliveryAddress?: string;
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

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  iban: string;
  startDate: string;
  monthlyGross: Cents;
  /** Inscrit au registre du personnel (et déclaré à l'ONSS). Un employé fantôme ne l'est pas. */
  registered: boolean;
};

/** Extrait du registre BCE (fictif). */
export type RegistryEntry = {
  id: string;
  name: string;
  number: string;
  address: string;
  founded: string;
  directors: string[];
  activity: string;
  status: string;
};

/** Paragraphe d'un procès-verbal (assemblée générale, organe d'administration). */
export type Minute = { id: string; date: string; meeting: string; text: string };

/** Opération de début d'exercice suivant (janvier-février N+1), utile pour la séparation des exercices. */
export type AfterEvent = { id: string; date: string; label: string; amount: Cents; partyId?: string };

export type Delivery = { id: string; number: string; date: string; partyId: string; description: string; invoiceNumber?: string };

export type StockItem = {
  id: string;
  label: string;
  quantity: number;
  unitCost: Cents;
  lastMovement: string;
  /** Observation notée lors du comptage physique. */
  countNote?: string;
};

export type Contract = { id: string; title: string; partyId?: string; clauses: string[] };

export type BankAccount = { id: string; bank: string; iban: string; account: string; label: string };

/** Ce qui entoure la comptabilité : personnes, registres, pièces de fin d'exercice. */
export type World = {
  employees: Employee[];
  registry: RegistryEntry[];
  minutes: Minute[];
  afterClosing: AfterEvent[];
  deliveries: Delivery[];
  stock: StockItem[];
  contracts: Contract[];
  bankAccounts: BankAccount[];
  /** Courriers reçus (avocat, curateur…) : lignes de texte. */
  letters: { id: string; from: string; subject: string; lines: { id: string; text: string }[] }[];
};

export type Books = {
  entries: Entry[];
  invoices: Invoice[];
  assets: FixedAsset[];
  parties: Party[];
  world: World;
};

export type TrialBalance = Map<string, { debit: Cents; credit: Cents }>;
