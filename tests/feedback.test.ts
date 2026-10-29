// Solution et explication des erreurs au débrief. Audit Detective — Gauthier Doumont.
import { level001 as level } from '../src/content/levels/level-001';
import { correctionWhy, criteriaFeedback, falsePositiveWhy, opinionFeedback, revealingLeads } from '../src/game/feedback';
import { scoreGame } from '../src/game/scoring';
import { createGame, gameReducer, type Finding, type GameAction, type GameState } from '../src/game/state';

const play = (...actions: GameAction[]): GameState => actions.reduce((state, action) => gameReducer(level, state, action), createGame(level));

const perfect: Finding = {
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
const opinion: GameAction[] = [
  { type: 'set-opinion', opinion: 'sans-reserve' },
  { type: 'set-continuity', continuity: false },
];
const feedbackFor = (finding: Finding) => criteriaFeedback(scoreGame(level, play(...opinion, { type: 'add-finding', finding })).anomalies[0]!);
const why = (finding: Finding, label: string) => feedbackFor(finding).find((c) => c.label === label)!;

describe('voir la solution', () => {
  it('termine la partie à 0 étoile et 0 point, même avec un travail parfait', () => {
    const state = play(...opinion, { type: 'add-finding', finding: perfect }, { type: 'view-solution' });
    expect(state.submitted).toBe(true);
    const result = scoreGame(level, state);
    expect(result.stars).toBe(0);
    expect(result.total).toBe(0);
    // Le travail reste corrigé, pour l'explication des erreurs.
    expect(result.anomalies[0]!.correction).toBe(true);
  });

  it('une sauvegarde ancienne reprend sans solution consultée', () => {
    expect(createGame(level).solutionViewed).toBe(false);
  });
});

describe('explication des erreurs', () => {
  it('un constat parfait ne génère aucune explication', () => {
    expect(feedbackFor(perfect).every((c) => c.ok && c.why.length === 0)).toBe(true);
  });

  it('montant TVA comprise sur un compte hors TVA', () => {
    expect(why({ ...perfect, account: '604', amount: 3392 }, 'Montant').why.join(' ')).toMatch(/TVA comprise \(6 %\)/);
  });

  it('montant d’un autre compte accepté', () => {
    // Compte 440 (attendu 3 392 €) mais montant du 604.
    expect(why({ ...perfect, amount: 3200 }, 'Montant').why.join(' ')).toMatch(/compte 604/);
  });

  it('assertion : définition et conseil pour trancher', () => {
    const c = why({ ...perfect, assertion: 'exhaustivite' }, 'Assertion');
    expect(c.yours).toBe('Exhaustivité');
    expect(c.expected).toBe('Existence');
    expect(c.why.join(' ')).toMatch(/existe-t-il vraiment/);
  });

  it('qualification : fraude sans preuve d’intention', () => {
    expect(why({ ...perfect, qualification: 'fraude' }, 'Qualification').why[0]).toMatch(/accusation grave/);
  });

  it('écriture inversée, ligne manquante, compte en trop', () => {
    const expected = level.anomalies[0]!.correction;
    const reversed = perfect.correction.map((l) => ({ ...l, debit: l.credit, credit: l.debit }));
    expect(correctionWhy(reversed, expected).join(' ')).toMatch(/inversée/);
    expect(correctionWhy(perfect.correction.slice(0, 2), expected).join(' ')).toMatch(/Il manque 411/);
    expect(correctionWhy([...perfect.correction, { account: '62', debit: 1, credit: 0 }], expected).join(' ')).toMatch(/62 .*rien à faire/);
    expect(correctionWhy([], expected)[0]).toMatch(/aucune écriture/);
  });

  it('constat sans indice', () => {
    expect(why({ ...perfect, clues: [] }, 'Indices').why[0]).toMatch(/sans preuve/);
  });

  it('anomalie manquée : procédures qui la révélaient, de la moins chère à la plus chère', () => {
    const leads = revealingLeads(level, createGame(level), level.anomalies[0]!);
    expect(leads.initial.length + leads.procedures.length).toBeGreaterThan(0);
    const hours = leads.procedures.map((p) => p.hours);
    expect(hours).toEqual([...hours].sort((a, b) => a - b));
  });

  it('faux positif expliqué', () => {
    expect(falsePositiveWhy(level, { ...perfect, id: 'f2', account: '62', clues: [] })[0]).toMatch(/Aucune anomalie ne touche le compte 62/);
    expect(falsePositiveWhy(level, { ...perfect, id: 'f2' })[0]).toMatch(/double emploi/);
  });

  it('opinion : ta réponse, l’attendu et le pourquoi', () => {
    const [op, continuity] = opinionFeedback(level, play({ type: 'set-opinion', opinion: 'negative' }, { type: 'set-continuity', continuity: true }));
    expect(op!.ok).toBe(false);
    expect(op!.why.join(' ')).toMatch(/Ton choix/);
    expect(continuity!.ok).toBe(false);
  });
});
