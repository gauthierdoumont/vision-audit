// Sous-ensemble du PCMN (plan comptable minimum normalisé belge) utilisé par le jeu.
// Audit Detective — Gauthier Doumont.

export type PcmnAccount = { code: string; label: string };

export const PCMN: PcmnAccount[] = [
  { code: '100', label: 'Capital souscrit' },
  { code: '110', label: 'Apport disponible (SRL, hors capital)' },
  { code: '13', label: 'Réserves' },
  { code: '140', label: 'Bénéfice reporté' },
  { code: '141', label: 'Perte reportée' },
  { code: '16', label: 'Provisions pour risques et charges' },
  { code: '164', label: 'Provisions pour autres risques et charges' },
  { code: '17', label: 'Dettes à plus d’un an' },
  { code: '22', label: 'Terrains et constructions' },
  { code: '23', label: 'Installations, machines et outillage' },
  { code: '2300', label: 'Installations, machines et outillage — valeur d’acquisition' },
  { code: '2309', label: 'Installations, machines et outillage — amortissements actés' },
  { code: '24', label: 'Mobilier et matériel roulant' },
  { code: '2400', label: 'Mobilier et matériel de bureau — valeur d’acquisition' },
  { code: '2409', label: 'Mobilier et matériel de bureau — amortissements actés' },
  { code: '2410', label: 'Matériel roulant — valeur d’acquisition' },
  { code: '2419', label: 'Matériel roulant — amortissements actés' },
  { code: '34', label: 'Marchandises' },
  { code: '340', label: 'Marchandises — valeur d’acquisition' },
  { code: '349', label: 'Marchandises : réductions de valeur actées' },
  { code: '400', label: 'Clients' },
  { code: '404', label: 'Produits à recevoir' },
  { code: '406', label: 'Acomptes versés' },
  { code: '407', label: 'Créances douteuses' },
  { code: '409', label: 'Clients : réductions de valeur actées' },
  { code: '411', label: 'TVA à récupérer' },
  { code: '416', label: 'Créances diverses' },
  { code: '440', label: 'Fournisseurs' },
  { code: '451', label: 'TVA à payer' },
  { code: '453', label: 'Précomptes retenus' },
  { code: '454', label: 'Office national de sécurité sociale' },
  { code: '455', label: 'Rémunérations' },
  { code: '489', label: 'Autres dettes diverses' },
  { code: '490', label: 'Charges à reporter' },
  { code: '491', label: 'Produits acquis' },
  { code: '492', label: 'Charges à imputer' },
  { code: '493', label: 'Produits à reporter' },
  { code: '550', label: 'Établissements de crédit : comptes courants' },
  { code: '5501', label: 'Établissements de crédit : compte épargne' },
  { code: '5502', label: 'Fonds détenus par un fiduciaire (compte de tiers)' },
  { code: '570', label: 'Caisses-espèces' },
  { code: '604', label: 'Achats de marchandises' },
  { code: '609', label: 'Variation des stocks' },
  { code: '61', label: 'Services et biens divers' },
  // Subdivisions du 61 : libres dans le PCMN, choisies pour le jeu.
  { code: '610', label: 'Loyers et charges locatives' },
  { code: '611', label: 'Entretien et réparations' },
  { code: '612', label: 'Télécommunications' },
  { code: '613', label: 'Honoraires (fiduciaire, conseils)' },
  { code: '615', label: 'Frais de restaurant et de réception' },
  { code: '62', label: 'Rémunérations, charges sociales et pensions' },
  { code: '620', label: 'Rémunérations et avantages sociaux directs' },
  { code: '621', label: 'Cotisations patronales d’assurances sociales' },
  { code: '630', label: 'Dotations aux amortissements et réductions de valeur sur immobilisations' },
  { code: '6302', label: 'Dotations aux amortissements sur immobilisations corporelles' },
  { code: '631', label: 'Réductions de valeur sur stocks' },
  { code: '634', label: 'Réductions de valeur sur créances commerciales' },
  { code: '635', label: 'Provisions pour pensions et obligations similaires' },
  { code: '637', label: 'Provisions pour autres risques et charges' },
  { code: '700', label: 'Ventes et prestations de services' },
  { code: '66', label: 'Charges d’exploitation ou financières non récurrentes' },
  { code: '74', label: "Autres produits d'exploitation" },
  { code: '75', label: 'Produits financiers' },
];

export function findAccount(code: string): PcmnAccount | undefined {
  return PCMN.find((account) => account.code === code.trim());
}

/** Libellé du compte, ou du compte parent le plus proche (ex. : 4400 → 440). */
export function accountLabel(code: string): string {
  for (let length = code.length; length >= 2; length--) {
    const account = findAccount(code.slice(0, length));
    if (account) return account.label;
  }
  return '';
}
