// Répliques génériques des personnages du client, selon leur rôle et leur profil.
// Audit Detective — créé par Gauthier Doumont.
import type { CharacterProfile } from './types';

export type Role = 'manager' | 'accountant' | 'storekeeper' | 'sales';

export const ROLE_LABELS: Record<Role, string> = {
  manager: 'Gérance',
  accountant: 'Comptabilité',
  storekeeper: 'Magasin',
  sales: 'Commercial',
};

type GenericTopic = { id: string; question: string; answers: Partial<Record<CharacterProfile, string[]>> & { cooperatif: string[] } };

export const GENERIC_TOPICS: Record<Role, GenericTopic[]> = {
  manager: [
    {
      id: 'annee',
      question: 'Comment s’est passée l’année ?',
      answers: {
        cooperatif: ['Plutôt bien. Le carnet de commandes est rempli, on a investi un peu en fin d’année.'],
        arrogant: ['Excellente année. Franchement, je ne vois pas bien ce que vous cherchez.', 'Mon temps est précieux, allons à l’essentiel.'],
        evasif: ['Bien, bien… Vous savez, les chiffres, c’est surtout le comptable.'],
        nerveux: ['Correcte… enfin, je crois. Pourquoi, il y a un souci ?'],
      },
    },
    {
      id: 'controle',
      question: 'Qui approuve les paiements ?',
      answers: {
        cooperatif: ['Je signe tout ce qui dépasse 5 000 € HTVA. En dessous, la comptabilité gère seule.'],
        arrogant: ['Moi. C’est ma société, je sais ce que je paie.'],
        evasif: ['Ça dépend… Le comptable prépare, je signe quand j’ai le temps.'],
      },
    },
    {
      id: 'banque',
      question: 'Quelles sont vos relations avec la banque ?',
      answers: {
        cooperatif: ['Bonnes. Elle veut simplement des comptes contrôlés chaque année.'],
        arrogant: ['La banque est ravie de nous avoir comme client.'],
        evasif: ['On discute… Rien d’inquiétant.'],
      },
    },
  ],
  accountant: [
    {
      id: 'cloture',
      question: 'Comment se passe la clôture de l’exercice ?',
      answers: {
        cooperatif: ['Je m’occupe de tout, avec l’aide de la fiduciaire pour le bilan.', 'Décembre est toujours un peu chargé.'],
        nerveux: ['C’est… dense. Je fais au mieux, vraiment.', 'La fiduciaire relit derrière moi, normalement.'],
        evasif: ['Comme chaque année. Rien de particulier à signaler.'],
      },
    },
    {
      id: 'procedures',
      question: 'Qui encode et qui paie les factures ?',
      answers: {
        cooperatif: ['J’encode, je prépare les virements, la gérance signe au-delà de 5 000 €.'],
        nerveux: ['Moi pour presque tout. On est une petite équipe.'],
        evasif: ['Ça dépend des fournisseurs. C’est assez souple.'],
      },
    },
    {
      id: 'outils',
      question: 'Quel logiciel comptable utilisez-vous ?',
      answers: {
        cooperatif: ['Un logiciel belge classique, avec la TVA intégrée. La fiduciaire y a accès.'],
        nerveux: ['Le même depuis dix ans. Il a ses caprices…'],
      },
    },
  ],
  storekeeper: [
    {
      id: 'inventaire',
      question: 'Comment se passe l’inventaire de fin d’année ?',
      answers: {
        cooperatif: ['On compte tout le 31 décembre, rayon par rayon, à deux.'],
        evasif: ['On compte… enfin, on estime surtout. Il y a beaucoup de références.'],
      },
    },
  ],
  sales: [
    {
      id: 'clients',
      question: 'Comment se porte la clientèle ?',
      answers: {
        cooperatif: ['Fidèle, dans l’ensemble. Quelques retards de paiement, comme partout.'],
        arrogant: ['Mes clients m’adorent. Mes chiffres parlent pour moi.'],
      },
    },
  ],
};

/** Réponse à une confrontation avec un indice qui ne contredit pas le mensonge. */
export const DENIALS: Record<CharacterProfile, string[]> = {
  cooperatif: ['Je ne vois pas le rapport, désolé.'],
  nerveux: ['Je… non, ça n’a rien à voir. Vous m’embrouillez.'],
  evasif: ['Ce document ne prouve rien du tout.'],
  arrogant: ['Vous perdez votre temps. Et le mien.'],
  complice: ['Demandez plutôt à la gérance.'],
};
