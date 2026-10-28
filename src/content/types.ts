// Types du contenu de jeu (niveaux, documents, personnages). Audit Detective — Gauthier Doumont.

export type DocumentKind = 'invoice' | 'journal' | 'bank' | 'report' | 'letter' | 'balance';

export type DocLine = { id: string; cells: string[] };

export type GameDocument = {
  id: string;
  title: string;
  kind: DocumentKind;
  /** En-tête affiché au-dessus du tableau (émetteur, destinataire, références). */
  header?: string[];
  columns?: string[];
  lines: DocLine[];
  footer?: string[];
};

export type Procedure = {
  id: string;
  name: string;
  /** Coût en heures ; pour un sondage, coût par lot de `batchSize` pièces. */
  hours: number;
  description: string;
  /** Documents ajoutés au dossier une fois la procédure réalisée. */
  reveals: string[];
  /** Sondage : le joueur choisit lui-même les pièces à examiner dans `pool`. */
  sampling?: { pool: string[]; batchSize: number };
};

export type Topic = { id: string; question: string; answer: string[] };

export type CharacterProfile = 'cooperatif' | 'nerveux' | 'evasif' | 'arrogant' | 'complice';

export type Character = { id: string; name: string; role: string; profile: CharacterProfile; topics: Topic[] };

export type Assertion = 'existence' | 'exhaustivite' | 'evaluation' | 'separation' | 'droits' | 'presentation';

export type Qualification = 'erreur' | 'fraude';

export type EntryLine = { account: string; debit: number; credit: number };

export type Anomaly = {
  id: string;
  title: string;
  cycle: string;
  /** Comptes acceptés comme « compte touché », avec le montant attendu pour chacun. */
  accounts: { account: string; amount: number }[];
  assertion: Assertion;
  qualification: Qualification;
  correction: EntryLine[];
  /** Identifiants d'indices (voir game/clues.ts) qui révèlent l'anomalie. */
  traces: string[];
  isa: string;
  explanation: string[];
};

export type Opinion = 'sans-reserve' | 'avec-reserve' | 'negative' | 'abstention';

export type Level = {
  id: string;
  number: number;
  title: string;
  format: 'court' | 'moyen' | 'long';
  difficulty: number;
  client: { name: string; sector: string; city: string; legalForm: string };
  materiality: number;
  budgetHours: number;
  /** Heures du chemin optimal (procédures minimales pour tout trouver). */
  optimalHours: number;
  briefing: { from: string; subject: string; body: string[] };
  documents: GameDocument[];
  initialDocuments: string[];
  procedures: Procedure[];
  characters: Character[];
  anomalies: Anomaly[];
  expectedOpinion: { opinion: Opinion; continuity: boolean; explanation: string[] };
  hint: string[];
};
