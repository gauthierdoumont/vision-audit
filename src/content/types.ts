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

export type Topic = {
  id: string;
  question: string;
  answer: string[];
  /** La réponse est un mensonge : confronté à l'un de ces indices, le personnage avoue. */
  lie?: { contradictedBy: string[]; confession: string[]; denial: string[] };
};

export type CharacterProfile = 'cooperatif' | 'nerveux' | 'evasif' | 'arrogant' | 'complice';

export type Character = { id: string; name: string; role: string; profile: CharacterProfile; topics: Topic[] };

export type Assertion = 'existence' | 'exhaustivite' | 'evaluation' | 'separation' | 'droits' | 'presentation';

export type Qualification = 'erreur' | 'fraude';

export type EntryLine = { account: string; debit: number; credit: number };

export type Anomaly = {
  id: string;
  /** Type du catalogue (ex. : duplicate-purchase), pour le mini-cours d'introduction. */
  type?: string;
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
  /** Aucune écriture à passer : l'information manque dans l'annexe (ex. : parties liées). */
  disclosureOnly?: boolean;
};

/** Consignes annoncées dans le briefing (le joueur les connaît dès le départ : rien n'est dévoilé). */
export type LevelNotice = 'client-refuse' | 'limitation-inventaire' | 'lettre-refusee';

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
  /** Fausses pistes : ce qui attire l'œil, et le document qui l'explique (révélées au débrief). */
  decoys?: { title: string; explanation: string[]; suspicious: string[]; justification: string[] }[];
  /** Affaire réelle dont le dossier s'inspire, révélée au débrief (niveaux 81-100). */
  realCase?: { name: string; lines: string[]; sources: string[]; verified: boolean };
  /** Fil rouge Orion Trading : ce que le joueur apprend au débrief. */
  orion?: string[];
  /** Grade du joueur dans la campagne (Stagiaire, Assistant…). */
  grade?: string;
  /** Les collègues du cabinet : le pari de Maxime, les outils d'Inès. */
  firm?: { maximeBet?: { hours: number; line: string }; ines?: string };
  notices?: LevelNotice[];
};
