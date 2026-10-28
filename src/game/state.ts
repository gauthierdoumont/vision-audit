// État d'une partie et transitions (fonctions pures). Audit Detective — Gauthier Doumont.
import type { Assertion, EntryLine, Level, Opinion, Qualification } from '../content/types';

export const INTERVIEW_HOURS = 0.5;

export type Finding = {
  id: string;
  account: string;
  assertion: Assertion;
  amount: number;
  qualification: Qualification;
  correction: EntryLine[];
  /** Indices épinglés qui appuient le constat. */
  clues: string[];
};

export type GameState = {
  levelId: string;
  briefingRead: boolean;
  hoursUsed: number;
  doneProcedures: string[];
  /** Sujets d'entretien abordés, au format `personnage.sujet`. */
  askedTopics: string[];
  pins: string[];
  hintsUsed: number;
  findings: Finding[];
  opinion: Opinion | null;
  continuity: boolean | null;
  submitted: boolean;
};

export type GameAction =
  | { type: 'read-briefing' }
  | { type: 'run-procedure'; procedureId: string }
  | { type: 'ask-topic'; characterId: string; topicId: string }
  | { type: 'toggle-pin'; clueId: string }
  | { type: 'use-hint' }
  | { type: 'add-finding'; finding: Finding }
  | { type: 'remove-finding'; findingId: string }
  | { type: 'set-opinion'; opinion: Opinion }
  | { type: 'set-continuity'; continuity: boolean }
  | { type: 'submit' };

export function createGame(level: Level): GameState {
  return {
    levelId: level.id,
    briefingRead: false,
    hoursUsed: 0,
    doneProcedures: [],
    askedTopics: [],
    pins: [],
    hintsUsed: 0,
    findings: [],
    opinion: null,
    continuity: null,
    submitted: false,
  };
}

export function gameReducer(level: Level, state: GameState, action: GameAction): GameState {
  if (state.submitted) return state;

  switch (action.type) {
    case 'read-briefing':
      return { ...state, briefingRead: true };
    case 'run-procedure': {
      const procedure = level.procedures.find((p) => p.id === action.procedureId);
      if (!procedure || state.doneProcedures.includes(procedure.id)) return state;
      return {
        ...state,
        hoursUsed: state.hoursUsed + procedure.hours,
        doneProcedures: [...state.doneProcedures, procedure.id],
      };
    }
    case 'ask-topic': {
      const key = `${action.characterId}.${action.topicId}`;
      if (state.askedTopics.includes(key)) return state;
      return { ...state, hoursUsed: state.hoursUsed + INTERVIEW_HOURS, askedTopics: [...state.askedTopics, key] };
    }
    case 'toggle-pin': {
      const pinned = state.pins.includes(action.clueId);
      return {
        ...state,
        pins: pinned ? state.pins.filter((id) => id !== action.clueId) : [...state.pins, action.clueId],
      };
    }
    case 'use-hint':
      return { ...state, hintsUsed: state.hintsUsed + 1 };
    case 'add-finding':
      return { ...state, findings: [...state.findings, action.finding] };
    case 'remove-finding':
      return { ...state, findings: state.findings.filter((f) => f.id !== action.findingId) };
    case 'set-opinion':
      return { ...state, opinion: action.opinion };
    case 'set-continuity':
      return { ...state, continuity: action.continuity };
    case 'submit':
      return { ...state, submitted: true };
  }
}

/** Documents visibles : ceux du départ, plus ceux révélés par les procédures réalisées. */
export function availableDocumentIds(level: Level, state: GameState): string[] {
  const revealed = level.procedures.filter((p) => state.doneProcedures.includes(p.id)).flatMap((p) => p.reveals);
  return [...new Set([...level.initialDocuments, ...revealed])];
}

export function hoursLeft(level: Level, state: GameState): number {
  return level.budgetHours - state.hoursUsed;
}
