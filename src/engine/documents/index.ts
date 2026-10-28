// Assemble les documents d'un cas et les procédures qui les révèlent. Audit Detective — créé par Gauthier Doumont.
import type { GameDocument, Procedure } from '../../content/types';
import type { TraceRef } from '../ids';
import {
  analyticDocument, assetDocument, balanceDocument, benfordDocument, clientBalance, invoiceDocument, purchaseJournal, salesJournal, supplierBalance,
} from './accounting';
import { isQ4, type DocContext } from './common';
import { afterClosingDocument, bankConfirmation, bankStatement, clientConfirmation, cutoffDocument, registryDocument, supplierConfirmation } from './external';
import { contractsDocument, lettersDocument, minutesDocument, payrollDocument, personnelDocument } from './internal';

export type { DocContext } from './common';

export type ProcedureId =
  | 'analytique'
  | 'sondage'
  | 'immobilisations'
  | 'rapprochement-bancaire'
  | 'circularisation-fournisseurs'
  | 'circularisation-clients'
  | 'cut-off'
  | 'dettes-non-comptabilisees'
  | 'lecture-pv'
  | 'controle-paie'
  | 'confirmation-bancaire'
  | 'benford'
  | 'parties-liees'
  | 'contrats';

type ProcedureSpec = {
  id: ProcedureId;
  name: string;
  hours: number;
  description: string;
  /** Premier niveau de campagne où la procédure est disponible. */
  unlockLevel: number;
  /** La procédure a-t-elle un sens pour ce client ? */
  applies?: (ctx: DocContext) => boolean;
  documents: (ctx: DocContext) => GameDocument[];
  sampling?: boolean;
};

const invoiced = (ctx: DocContext) => ctx.sector.salesMode === 'invoice';

export const PROCEDURES: ProcedureSpec[] = [
  { id: 'analytique', name: 'Revue analytique', hours: 1, unlockLevel: 1, description: 'Comparer les postes N et N-1 pour repérer les variations anormales.', documents: (ctx) => [analyticDocument(ctx)] },
  {
    id: 'sondage',
    name: 'Sondage de factures',
    hours: 1,
    unlockLevel: 2,
    description: 'Choisir des pièces du journal des achats et examiner les factures originales (1 h par lot de 5).',
    documents: (ctx) => ctx.books.invoices.filter((i) => i.flow === 'purchase' && isQ4(i)).sort((a, b) => a.date.localeCompare(b.date)).map((i) => invoiceDocument(ctx, i)),
    sampling: true,
  },
  { id: 'immobilisations', name: 'Revue des immobilisations', hours: 1, unlockLevel: 1, description: 'Examiner le tableau des immobilisations et le calcul des amortissements.', documents: (ctx) => [assetDocument(ctx)] },
  { id: 'rapprochement-bancaire', name: 'Rapprochement bancaire', hours: 2, unlockLevel: 1, description: 'Confronter les relevés du 4e trimestre au compte 550.', documents: (ctx) => [bankStatement(ctx)] },
  {
    id: 'circularisation-fournisseurs',
    name: 'Circularisation fournisseurs',
    hours: 3,
    unlockLevel: 1,
    description: 'Demander à trois fournisseurs de confirmer directement leur solde.',
    documents: (ctx) => ctx.confirmedSuppliers.map((id) => supplierConfirmation(ctx, id)),
  },
  {
    id: 'circularisation-clients',
    name: 'Circularisation clients',
    hours: 3,
    unlockLevel: 21,
    applies: invoiced,
    description: 'Demander à trois clients de confirmer ce qu’ils doivent.',
    documents: (ctx) => ctx.confirmedClients.map((id) => clientConfirmation(ctx, id)),
  },
  { id: 'cut-off', name: 'Test de cut-off (ventes)', hours: 2, unlockLevel: 21, applies: invoiced, description: 'Rapprocher les factures de fin d’année des bons de livraison.', documents: (ctx) => [cutoffDocument(ctx)] },
  {
    id: 'dettes-non-comptabilisees',
    name: 'Recherche de dettes non comptabilisées',
    hours: 2,
    unlockLevel: 21,
    description: 'Examiner les paiements et documents de janvier-février suivants.',
    documents: (ctx) => [afterClosingDocument(ctx)],
  },
  {
    id: 'lecture-pv',
    name: 'Lecture des PV et du courrier',
    hours: 1,
    unlockLevel: 21,
    description: 'Lire les procès-verbaux de l’année et les courriers juridiques reçus.',
    documents: (ctx) => [minutesDocument(ctx), ...(ctx.books.world.letters.length > 0 ? [lettersDocument(ctx)] : [])],
  },
  { id: 'controle-paie', name: 'Contrôle de la paie', hours: 2, unlockLevel: 21, description: 'Comparer le journal de paie au registre du personnel.', documents: (ctx) => [payrollDocument(ctx), personnelDocument(ctx)] },
  { id: 'confirmation-bancaire', name: 'Confirmation bancaire', hours: 3, unlockLevel: 21, description: 'Demander aux banques de confirmer comptes et soldes au 31/12.', documents: (ctx) => [bankConfirmation(ctx)] },
  { id: 'benford', name: 'Analyse de Benford (Inès)', hours: 1, unlockLevel: 25, description: 'Inès passe toutes les factures d’achat au crible de la loi de Benford.', documents: (ctx) => [benfordDocument(ctx)] },
  { id: 'parties-liees', name: 'Recherche à la BCE (parties liées)', hours: 2, unlockLevel: 21, description: 'Consulter le registre des entreprises : qui dirige les fournisseurs et clients ?', documents: (ctx) => [registryDocument(ctx)] },
  { id: 'contrats', name: 'Revue des contrats', hours: 2, unlockLevel: 41, description: 'Lire les contrats en vigueur : engagements, conditions, clauses.', documents: (ctx) => [contractsDocument(ctx)] },
];

export type DocumentSet = {
  documents: GameDocument[];
  initialDocuments: string[];
  procedures: Procedure[];
  /** Identifiant d'indice d'une trace documentaire (les répliques d'entretien sont gérées à part). */
  clueOf: (ref: TraceRef) => string;
};

/** Équivalent « niveau de campagne » pour débloquer les procédures dans les autres modes. */
export function unlockLevelForDifficulty(difficulty: number): number {
  return difficulty <= 2 ? 20 : difficulty <= 4 ? 40 : 100;
}

export function buildDocuments(ctx: DocContext, levelNumber: number): DocumentSet {
  const initial = [balanceDocument(ctx), purchaseJournal(ctx), supplierBalance(ctx), ...(invoiced(ctx) ? [salesJournal(ctx), clientBalance(ctx)] : [])];
  const available = PROCEDURES.filter((p) => p.unlockLevel <= levelNumber && (!p.applies || p.applies(ctx)));
  const revealed = available.map((p) => ({ spec: p, documents: p.documents(ctx) }));
  const procedures: Procedure[] = revealed.map(({ spec, documents }) => ({
    id: spec.id,
    name: spec.name,
    hours: spec.hours,
    description: spec.description,
    reveals: spec.sampling ? [] : documents.map((d) => d.id),
    ...(spec.sampling ? { sampling: { pool: documents.map((d) => d.id), batchSize: 5 } } : {}),
  }));
  return {
    documents: [...initial, ...revealed.flatMap((r) => r.documents)],
    initialDocuments: initial.map((d) => d.id),
    procedures,
    clueOf: (ref) => {
      if ('topic' in ref) throw new Error('Une réplique d’entretien n’est pas un document');
      return `${ref.doc}#${ref.line}`;
    },
  };
}
