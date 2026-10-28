// Logique de partie et score. Audit Detective — Gauthier Doumont.
import { level001 as level } from '../src/content/levels/level-001';
import { availableDocumentIds, createGame, gameReducer, type Finding, type GameAction, type GameState } from '../src/game/state';
import { correctionMatches, scoreGame } from '../src/game/scoring';

const play = (...actions: GameAction[]): GameState =>
  actions.reduce((state, action) => gameReducer(level, state, action), createGame(level));

const perfectFinding: Finding = {
  id: 'f1',
  account: '440',
  assertion: 'existence',
  amount: 3392,
  qualification: 'erreur',
  correction: [
    { account: '604', debit: 0, credit: 3200 },
    { account: '440', debit: 3392, credit: 0 },
    { account: '411', debit: 0, credit: 192 },
  ],
  clues: ['journal-achats#a0413'],
};

describe('partie', () => {
  it('une procédure coûte ses heures une seule fois et révèle son document', () => {
    const state = play({ type: 'run-procedure', procedureId: 'rapprochement-bancaire' }, { type: 'run-procedure', procedureId: 'rapprochement-bancaire' });
    expect(state.hoursUsed).toBe(2);
    expect(availableDocumentIds(level, state)).toContain('releve-bancaire');
  });

  it('un sujet d’entretien coûte 0,5 h', () => {
    expect(play({ type: 'ask-topic', characterId: 'dethier', topicId: 'reception' }).hoursUsed).toBe(0.5);
  });

  it('épingler deux fois retire l’indice', () => {
    const pin = { type: 'toggle-pin', clueId: 'journal-achats#a0410' } as const;
    expect(play(pin).pins).toEqual(['journal-achats#a0410']);
    expect(play(pin, pin).pins).toEqual([]);
  });

  it('une partie rendue ne bouge plus', () => {
    const state = play({ type: 'submit' }, { type: 'use-hint' });
    expect(state.hintsUsed).toBe(0);
  });
});

describe('score', () => {
  const base = [
    { type: 'run-procedure', procedureId: 'analytique' },
    { type: 'run-procedure', procedureId: 'rapprochement-bancaire' },
    { type: 'set-opinion', opinion: 'sans-reserve' },
    { type: 'set-continuity', continuity: false },
  ] as GameAction[];

  it('partie parfaite sur le chemin optimal : 100 points et 3 étoiles', () => {
    const result = scoreGame(level, play(...base, { type: 'add-finding', finding: perfectFinding }));
    expect(result.total).toBe(100);
    expect(result.stars).toBe(3);
  });

  it('constat sur 604 au montant HTVA également accepté', () => {
    const finding = { ...perfectFinding, account: '604', amount: 3200 };
    expect(scoreGame(level, play(...base, { type: 'add-finding', finding })).anomalies[0]!.amount).toBe(true);
  });

  it('tolérance de ±1 % sur le montant', () => {
    const ok = { ...perfectFinding, amount: 3420 };
    const ko = { ...perfectFinding, amount: 3500 };
    expect(scoreGame(level, play(...base, { type: 'add-finding', finding: ok })).anomalies[0]!.amount).toBe(true);
    expect(scoreGame(level, play(...base, { type: 'add-finding', finding: ko })).anomalies[0]!.amount).toBe(false);
  });

  it('un indice de la mentore enlève la 3e étoile et 10 points', () => {
    const result = scoreGame(level, play(...base, { type: 'use-hint' }, { type: 'add-finding', finding: perfectFinding }));
    expect(result.stars).toBe(2);
    expect(result.total).toBe(90);
  });

  it('mauvaise opinion : 0 étoile', () => {
    const result = scoreGame(
      level,
      play(...base, { type: 'set-opinion', opinion: 'avec-reserve' }, { type: 'add-finding', finding: perfectFinding }),
    );
    expect(result.stars).toBe(0);
  });

  it('faux positif pénalisé', () => {
    const wrong: Finding = { ...perfectFinding, id: 'f2', account: '62', amount: 1000, clues: [] };
    const result = scoreGame(level, play(...base, { type: 'add-finding', finding: perfectFinding }, { type: 'add-finding', finding: wrong }));
    expect(result.falsePositives).toHaveLength(1);
    expect(result.total).toBe(85);
  });

  it('dépassement du budget : efficience nulle et pas de 3e étoile', () => {
    const extra = ['circularisation-fournisseurs'].map((id) => ({ type: 'run-procedure', procedureId: id }) as GameAction);
    const topics = ['reception', 'solde-moulins', 'facture-1187'].map((t) => ({ type: 'ask-topic', characterId: 'dethier', topicId: t }) as GameAction);
    const state = play(...base, ...extra, ...topics, { type: 'add-finding', finding: perfectFinding });
    expect(state.hoursUsed).toBe(7.5);
    const result = scoreGame(level, state);
    expect(result.efficiency).toBe(0);
    expect(result.stars).toBe(2);
  });

  it('écriture inversée refusée', () => {
    const reversed = perfectFinding.correction.map((l) => ({ ...l, debit: l.credit, credit: l.debit }));
    expect(correctionMatches(reversed, level.anomalies[0]!.correction)).toBe(false);
  });
});
