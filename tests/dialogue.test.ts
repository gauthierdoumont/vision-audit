// Mensonges, confrontation et aveux. Audit Detective — Gauthier Doumont.
import { getLevel } from '../src/content/levels';
import { describeClue } from '../src/game/clues';
import { confessed, createGame, gameReducer, type GameAction } from '../src/game/state';

const level = getLevel('level-021')!; // vente fictive : la gérance ment
const liar = level.characters.find((c) => c.topics.some((t) => t.lie))!;
const topic = liar.topics.find((t) => t.lie)!;
const play = (...actions: GameAction[]) => actions.reduce((s, a) => gameReducer(level, s, a), createGame(level));
const ask: GameAction = { type: 'ask-topic', characterId: liar.id, topicId: topic.id };

describe('confrontation', () => {
  it('le fraudeur ment et son mensonge est contredit par des indices réels', () => {
    expect(liar.id).toBe('gerant');
    expect(['arrogant', 'evasif']).toContain(liar.profile);
    for (const clue of topic.lie!.contradictedBy) expect(describeClue(level, clue)).toBeDefined();
  });

  it('confronté à la bonne preuve, il avoue ; l’aveu devient un indice', () => {
    const state = play(ask, { type: 'confront', characterId: liar.id, topicId: topic.id, clueId: topic.lie!.contradictedBy[0]! });
    expect(confessed(level, state, liar.id, topic.id)).toBe(true);
    expect(state.hoursUsed).toBe(1);
    expect(describeClue(level, `topic:${liar.id}.${topic.id}.aveu`)?.source).toMatch(/^Aveu/);
  });

  it('une mauvaise preuve ne donne rien, mais coûte du temps', () => {
    const state = play(ask, { type: 'confront', characterId: liar.id, topicId: topic.id, clueId: 'balance#l-550' });
    expect(confessed(level, state, liar.id, topic.id)).toBe(false);
    expect(state.hoursUsed).toBe(1);
  });

  it('on ne confronte pas une question qu’on n’a pas posée, ni deux fois avec la même preuve', () => {
    const confront: GameAction = { type: 'confront', characterId: liar.id, topicId: topic.id, clueId: 'balance#l-550' };
    expect(play(confront).hoursUsed).toBe(0);
    expect(play(ask, confront, confront).hoursUsed).toBe(1);
  });

  it('les personnes non impliquées sont coopératives et ne mentent pas', () => {
    const honest = level.characters.filter((c) => c !== liar);
    for (const c of honest) {
      expect(c.profile).toBe('cooperatif');
      expect(c.topics.some((t) => t.lie)).toBe(false);
    }
  });
});
