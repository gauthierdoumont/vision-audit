// Le cabinet Vigie & Associés : grades du joueur et répliques des collègues. Audit Detective — Gauthier Doumont.

export const GRADES = [
  { from: 1, label: 'Stagiaire' },
  { from: 21, label: 'Assistant' },
  { from: 41, label: 'Senior' },
  { from: 61, label: 'Superviseur' },
  { from: 81, label: 'Réviseur' },
] as const;

export function gradeFor(levelNumber: number): string {
  return [...GRADES].reverse().find((g) => levelNumber >= g.from)!.label;
}

/** Ce que dit Hélène quand le joueur change de grade (premier niveau du chapitre). */
export const PROMOTIONS: Record<number, string> = {
  21: 'Félicitations : tu passes assistant. À partir de maintenant, les erreurs ne sont plus toutes innocentes.',
  41: 'Te voilà senior. Dossiers plus épais, fausses pistes, et des clients qui savent mentir.',
  61: 'Superviseur. Tu signes presque à ma place. Presque.',
  81: 'Réviseur. Les prochains dossiers ressemblent à des affaires qui ont fait la une. Ouvre l’œil.',
};

export const MAXIME_BETS = [
  'Maxime parie un café que tu y passeras plus de {heures}.',
  'Maxime a misé une pizza : selon lui, tu dépasseras {heures}.',
  'Maxime fanfaronne : « Moi, je bouclais ce genre de dossier en {heures}. »',
] as const;

export const MAXIME_RESULTS = {
  won: 'Maxime te doit un café. Il fait semblant de ne pas l’avoir entendu.',
  lost: 'Maxime a gagné son pari. Il a déjà choisi le café le plus cher.',
} as const;

export const INES_LINES: Record<number, string> = {
  25: 'Inès a branché son outil d’analyse de Benford sur nos dossiers. Il est dans tes procédures, profites-en.',
};
