import type { Assertion, Opinion, Qualification } from './types';

export const ASSERTION_LABELS: Record<Assertion, string> = {
  existence: 'Existence',
  exhaustivite: 'Exhaustivité',
  evaluation: 'Évaluation',
  separation: 'Séparation des exercices',
  droits: 'Droits et obligations',
  presentation: 'Présentation',
};

export const QUALIFICATION_LABELS: Record<Qualification, string> = {
  erreur: 'Erreur',
  fraude: 'Fraude',
};

export const OPINION_LABELS: Record<Opinion, string> = {
  'sans-reserve': 'Opinion sans réserve',
  'avec-reserve': 'Opinion avec réserve',
  negative: 'Opinion négative',
  abstention: "Déclaration d'abstention",
};
