// Identifiants des documents et de leurs lignes, partagés par les anomalies (traces) et les documents.
// Audit Detective — créé par Gauthier Doumont.

export const DOC = {
  balance: 'balance',
  purchaseJournal: 'journal-achats',
  salesJournal: 'journal-ventes',
  supplierBalance: 'balance-fournisseurs',
  clientBalance: 'balance-clients',
  analytic: 'revue-analytique',
  bank: 'releve-bancaire',
  bankConfirmation: 'confirmation-bancaire',
  assets: 'immobilisations',
  cutoff: 'cut-off',
  afterClosing: 'operations-posterieures',
  minutes: 'proces-verbaux',
  registry: 'registre-bce',
  payroll: 'journal-paie',
  personnel: 'registre-personnel',
  timesheet: 'pointage',
  benford: 'analyse-benford',
  inventory: 'liste-inventaire',
  count: 'comptage-inventaire',
  contracts: 'contrats',
  legal: 'courrier-avocat',
  invoice: (invoiceId: string) => `inv-${invoiceId}`,
  supplierConfirmation: (partyId: string) => `conf-${partyId}`,
  clientConfirmation: (partyId: string) => `confc-${partyId}`,
} as const;

/** Référence vers une ligne de document, ou vers la réplique d'entretien liée à l'anomalie. */
export type TraceRef = { doc: string; line: string } | { topic: true; confession?: boolean };

const at = (doc: string, line: string): TraceRef => ({ doc, line });

export const REF = {
  purchase: (entryId: string) => at(DOC.purchaseJournal, `e-${entryId}`),
  sale: (entryId: string) => at(DOC.salesJournal, `e-${entryId}`),
  invoiceLine: (invoiceId: string, line: 'vat' | 'total' | 'base' | 'iban' | 'delivery' | number) => at(DOC.invoice(invoiceId), typeof line === 'number' ? `i${line}` : line),
  supplierBalance: (partyId: string) => at(DOC.supplierBalance, `s-${partyId}`),
  clientBalance: (partyId: string) => at(DOC.clientBalance, `s-${partyId}`),
  supplierConfirmation: (partyId: string) => at(DOC.supplierConfirmation(partyId), 'ecart'),
  clientConfirmation: (partyId: string) => at(DOC.clientConfirmation(partyId), 'ecart'),
  /** Opération confirmée par le client (ex. : « Paiement reçu »), d'après ses propres livres. */
  clientConfirmationLine: (partyId: string, entryId: string) => at(DOC.clientConfirmation(partyId), `c-${entryId}`),
  bank: (entryId: string) => at(DOC.bank, `b-${entryId}`),
  /** Poste du rapprochement bancaire proposé par le client. */
  reconciliation: (id: string) => at(DOC.bank, `rec-${id}`),
  bankConfirmation: (line: string) => at(DOC.bankConfirmation, line),
  analytic: (account: string) => at(DOC.analytic, `r-${account}`),
  balance: (account: string) => at(DOC.balance, `l-${account}`),
  asset: (assetId: string) => at(DOC.assets, `a-${assetId}`),
  assetTotal: () => at(DOC.assets, 'total'),
  cutoff: (line: string) => at(DOC.cutoff, line),
  afterClosing: (eventId: string) => at(DOC.afterClosing, `x-${eventId}`),
  minutes: (minuteId: string) => at(DOC.minutes, `m-${minuteId}`),
  registry: (entryId: string) => at(DOC.registry, `r-${entryId}`),
  payroll: (employeeId: string) => at(DOC.payroll, `p-${employeeId}`),
  personnel: (line: string) => at(DOC.personnel, line),
  timesheet: (employeeId: string) => at(DOC.timesheet, `t-${employeeId}`),
  benford: (digit: number) => at(DOC.benford, `d${digit}`),
  benfordThreshold: () => at(DOC.benford, 'seuil'),
  inventory: (itemId: string) => at(DOC.inventory, `s-${itemId}`),
  count: (itemId: string) => at(DOC.count, `c-${itemId}`),
  contract: (contractId: string) => at(DOC.contracts, `k-${contractId}`),
  legal: (line: string) => at(DOC.legal, line),
  topic: (): TraceRef => ({ topic: true }),
  confession: (): TraceRef => ({ topic: true, confession: true }),
};
