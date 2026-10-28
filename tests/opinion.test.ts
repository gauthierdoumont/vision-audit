// Opinion attendue selon les anomalies non corrigées, les limitations et la continuité. Audit Detective — Gauthier Doumont.
import { expectedOpinion } from '../src/engine/scenarios';

const base = { materiality: 500_000, clientCorrects: false };

describe('opinion attendue', () => {
  it('client qui corrige : sans réserve', () => {
    expect(expectedOpinion({ ...base, clientCorrects: true, amounts: [2_000_000] }).opinion).toBe('sans-reserve');
  });
  it('refus mais sous le seuil : sans réserve', () => {
    expect(expectedOpinion({ ...base, amounts: [300_000] }).opinion).toBe('sans-reserve');
  });
  it('refus, significatif mais localisé : avec réserve', () => {
    expect(expectedOpinion({ ...base, amounts: [1_200_000] }).opinion).toBe('avec-reserve');
  });
  it('refus sur trois postes significatifs : négative', () => {
    expect(expectedOpinion({ ...base, amounts: [600_000, 700_000, 800_000] }).opinion).toBe('negative');
  });
  it('lettre d’affirmation refusée : abstention, même si tout est corrigé', () => {
    expect(expectedOpinion({ ...base, clientCorrects: true, amounts: [100_000], limitation: 'representation-letter' }).opinion).toBe('abstention');
  });
  it('inventaire non observé : réserve', () => {
    expect(expectedOpinion({ ...base, clientCorrects: true, amounts: [100_000], limitation: 'inventory' }).opinion).toBe('avec-reserve');
  });
  it('continuité décrite dans l’annexe : paragraphe, opinion inchangée', () => {
    const result = expectedOpinion({ ...base, clientCorrects: true, amounts: [100_000], goingConcern: 'disclosed' });
    expect(result).toMatchObject({ opinion: 'sans-reserve', continuity: true });
  });
  it('continuité masquée : réserve et mention', () => {
    const result = expectedOpinion({ ...base, clientCorrects: true, amounts: [100_000], goingConcern: 'hidden' });
    expect(result).toMatchObject({ opinion: 'avec-reserve', continuity: true });
  });
  it('annexe incomplète que le client refuse de compléter : réserve', () => {
    expect(expectedOpinion({ ...base, amounts: [], disclosures: 1 }).opinion).toBe('avec-reserve');
  });
});
