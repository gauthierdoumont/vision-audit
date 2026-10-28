// Fil rouge de la campagne : la société écran fictive « Orion Trading ». Audit Detective — Gauthier Doumont.

export const ORION = {
  name: 'Orion Trading SRL',
  address: 'Boîte postale 77, 1000 Bruxelles',
  director: 'Marc Delvaux',
  number: '0000.777.077',
} as const;

/** Ce que le joueur apprend au débrief des niveaux où Orion apparaît. */
export const ORION_DEBRIEFS: Record<number, string[]> = {
  33: ['Inès a repéré une petite facture d’« Orion Trading SRL » pour une commission d’intermédiation.', 'Rien d’illégal en soi… mais personne chez le client ne sait qui est Orion.'],
  52: ['Encore Orion Trading. Même boîte postale à Bruxelles, autre client, même « commission ».', 'Hélène ouvre un dossier à part. Elle ne dit pas pourquoi.'],
  66: ['Orion Trading facture des commissions à des clients qui ne se connaissent pas entre eux.', 'Maxime a arrêté de parier sur ce dossier-là.'],
  78: ['La BCE donne le nom de l’administrateur d’Orion Trading : Marc Delvaux.', 'Inès lance une recherche sur ce nom dans tous les dossiers du cabinet.'],
  85: ['Marc Delvaux apparaît aussi comme conseiller dans le montage de ce dossier.', 'Orion n’est pas un hasard : c’est un fournisseur de « solutions » pour embellir des comptes.'],
  92: ['Bilan d’Inès : Orion Trading a encaissé des commissions chez sept clients du cabinet, toujours juste avant la clôture.', 'Hélène prévient : « Le jour où on la croise en direct, on ne la lâche pas. »'],
  96: ['Orion Trading vient de changer d’adresse, mais pas d’administrateur.', 'Hélène : « Le prochain gros dossier sera le bon. Prépare-toi. »'],
  100: [
    'Affaire Orion bouclée. Orion Trading était une société écran dirigée par Marc Delvaux.',
    'Le schéma : de fausses missions de conseil d’un côté, des ventes circulaires de l’autre, pour gonfler les comptes de ses clients… contre commission.',
    'Tes constats, recoupés dossier après dossier, permettent au cabinet de saisir les autorités compétentes.',
    'Hélène : « Bienvenue parmi les réviseurs. » Maxime t’offre le café, pour une fois sans pari.',
  ],
};

export const ORION_FINAL_BRIEFING = 'Le client de ce dossier travaille avec Orion Trading. Ne laisse rien passer.';
