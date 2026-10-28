// Personnages du client : rôle, profil, répliques, mensonges et aveux. Audit Detective — Gauthier Doumont.
import { ANOMALY_TEXTS } from '../content/anomaly-texts';
import { DENIALS, GENERIC_TOPICS, ROLE_LABELS, type Role } from '../content/dialogues';
import type { Character, CharacterProfile, Topic } from '../content/types';
import type { Injection } from './anomalies';
import type { Rng } from './rng';
import type { Company, Person } from './types';

const CHARACTER_IDS: Record<Role, string> = { manager: 'gerant', accountant: 'comptable', storekeeper: 'magasinier', sales: 'commercial' };

export const anomalyTopicId = (index: number) => `anomalie-${index}`;

export type CharacterSet = {
  characters: Character[];
  /** Indice d'une réplique liée à l'anomalie `index` (ou de l'aveu qui suit la confrontation). */
  topicClue: (index: number, confession: boolean) => string;
};

export function buildCharacters(
  rng: Rng,
  company: Company,
  employees: { firstName: string; lastName: string; role: string }[],
  injections: Injection[],
  clueOf: (index: number) => string[],
): CharacterSet {
  const roles = new Set<Role>(['manager', 'accountant', ...injections.map((i) => i.actor)]);
  const people: Record<Role, Person> = {
    manager: company.manager,
    accountant: company.accountant,
    storekeeper: employees.find((e) => /magasin|stock|réception/i.test(e.role)) ?? employees[employees.length - 1]!,
    sales: employees.find((e) => /commercial|vente/i.test(e.role)) ?? employees[employees.length - 1]!,
  };

  const profileOf = (role: Role): CharacterProfile => {
    const mine = injections.filter((i) => i.actor === role);
    if (mine.some((i) => i.qualification === 'fraude')) return role === 'manager' ? rng.pick(['arrogant', 'evasif'] as const) : rng.pick(['evasif', 'nerveux'] as const);
    if (mine.length > 0) return rng.pick(['cooperatif', 'nerveux'] as const);
    return 'cooperatif';
  };

  const characters: Character[] = [...roles].map((role) => {
    const profile = profileOf(role);
    const generic = rng.shuffle(GENERIC_TOPICS[role]).slice(0, 2).map<Topic>((t) => ({ id: `general-${t.id}`, question: t.question, answer: [...(t.answers[profile] ?? t.answers.cooperatif)] }));
    const specific = injections.flatMap<Topic>((injection, index) => {
      if (injection.actor !== role) return [];
      const text = ANOMALY_TEXTS[injection.type].topic;
      const answer = text.answer(injection.params, injection.variant);
      const confession = text.confession?.(injection.params, injection.variant);
      return [
        {
          id: anomalyTopicId(index),
          question: text.question(injection.params),
          answer,
          ...(confession ? { lie: { contradictedBy: clueOf(index), confession, denial: DENIALS[profile] } } : {}),
        },
      ];
    });
    const person = people[role];
    return { id: CHARACTER_IDS[role], name: `${person.firstName} ${person.lastName}`, role: ROLE_LABELS[role], profile, topics: rng.shuffle([...generic, ...specific]) };
  });

  return {
    characters,
    topicClue: (index, confession) => `topic:${CHARACTER_IDS[injections[index]!.actor]}.${anomalyTopicId(index)}${confession ? '.aveu' : ''}`,
  };
}
