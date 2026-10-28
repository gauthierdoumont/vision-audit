// Génération de l'entreprise cliente (fictive). Audit Detective — Gauthier Doumont.
import { FIRST_NAMES, LAST_NAMES, LOCALITIES, STREETS } from '../content/names';
import { SECTORS } from '../content/sectors';
import type { Rng } from './rng';
import type { Company, Person, SectorId } from './types';

export const FISCAL_YEAR = 2025;

export function randomPerson(rng: Rng, exclude: Person[] = []): Person {
  for (;;) {
    const person = { firstName: rng.pick(FIRST_NAMES), lastName: rng.pick(LAST_NAMES) };
    if (!exclude.some((p) => p.lastName === person.lastName)) return person;
  }
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}

export function generateCompany(rng: Rng, sector: SectorId): Company {
  const spec = SECTORS[sector];
  const manager = randomPerson(rng);
  const accountant = randomPerson(rng, [manager]);
  const locality = rng.pick(LOCALITIES);
  // Petites sociétés au sens du CSA (art. 1:24) ; seuils non utilisés pour l'instant, À VÉRIFIER si on les affiche.
  const legalForm = rng.pick(['SRL', 'SRL', 'SRL', 'SA'] as const);
  const base = fillTemplate(rng.pick(spec.companyNames), {
    nom: manager.lastName,
    prenom: manager.firstName,
    ville: locality.city,
  });
  return {
    name: `${base} ${legalForm}`,
    legalForm,
    sector,
    street: `${rng.pick(STREETS)} ${rng.int(1, 180)}`,
    city: locality.city,
    postalCode: locality.postalCode,
    manager,
    accountant,
    staff: 0,
    fiscalYear: FISCAL_YEAR,
  };
}
