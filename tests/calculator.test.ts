import { evaluate, formatResult } from '../src/game/calculator';

describe('calculatrice', () => {
  it('respecte les priorités et les parenthèses', () => {
    expect(evaluate('2 + 3 × 4')).toBe(14);
    expect(evaluate('(2 + 3) × 4')).toBe(20);
    expect(evaluate('10 − 4 − 3')).toBe(3);
    expect(evaluate('−5 + 2')).toBe(-3);
  });
  it('lit les décimales à la belge et les pourcentages', () => {
    expect(evaluate('3200 × 6%')).toBeCloseTo(192);
    expect(evaluate('3392 ÷ 1,06')).toBeCloseTo(3200);
  });
  it('refuse les expressions invalides sans planter', () => {
    expect(evaluate('2 +')).toBeNaN();
    expect(evaluate('1 / 0')).toBeNaN();
    expect(evaluate('abc')).toBeNaN();
    expect(evaluate('(1 + 2')).toBeNaN();
    expect(formatResult(NaN)).toBe('Erreur');
  });
});
