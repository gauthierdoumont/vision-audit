// Prénoms, noms et localités belges courants pour générer des personnages fictifs.
// Audit Detective — Gauthier Doumont.

export const FIRST_NAMES = [
  'Julie', 'Sarah', 'Laura', 'Marie', 'Camille', 'Manon', 'Émilie', 'Charlotte', 'Elise', 'Céline',
  'Nathalie', 'Sophie', 'Valérie', 'Anne', 'Pauline', 'Thomas', 'Nicolas', 'Julien', 'Maxime', 'Antoine',
  'Kevin', 'Olivier', 'Benoît', 'Philippe', 'Pierre', 'Christophe', 'Sébastien', 'Laurent', 'François', 'Arnaud',
] as const;

export const LAST_NAMES = [
  'Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet',
  'Dubois', 'Lambert', 'Dupont', 'Martin', 'Simon', 'Laurent', 'Leclercq', 'Lejeune', 'Renard', 'Collard',
  'Henrard', 'Gilson', 'Lemaire', 'Dethier', 'Lambotte', 'Mathieu', 'François', 'Hubert', 'Gérard', 'Piron',
] as const;

export const LOCALITIES = [
  { city: 'Namur', postalCode: '5000' },
  { city: 'Jambes', postalCode: '5100' },
  { city: 'Gembloux', postalCode: '5030' },
  { city: 'Dinant', postalCode: '5500' },
  { city: 'Ciney', postalCode: '5590' },
  { city: 'Andenne', postalCode: '5300' },
  { city: 'Wavre', postalCode: '1300' },
  { city: 'Huy', postalCode: '4500' },
  { city: 'Liège', postalCode: '4000' },
  { city: 'Charleroi', postalCode: '6000' },
  { city: 'Mons', postalCode: '7000' },
  { city: 'Marche-en-Famenne', postalCode: '6900' },
  { city: 'Fleurus', postalCode: '6220' },
  { city: 'Nivelles', postalCode: '1400' },
] as const;

export const STREETS = [
  'Rue de la Station', 'Chaussée de Namur', 'Rue du Moulin', 'Avenue des Combattants', 'Rue de Bruxelles',
  'Rue Haute', 'Rue de l’Église', 'Place communale', 'Rue des Champs', 'Chaussée de Louvain',
] as const;
