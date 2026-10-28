// Sous-ensemble du PCMN (plan comptable minimum normalisé belge) utilisé par le jeu.
// Audit Detective — Gauthier Doumont.

export type PcmnAccount = { code: string; label: string };

export const PCMN: PcmnAccount[] = [
  { code: '100', label: 'Capital souscrit' },
  { code: '13', label: 'Réserves' },
  { code: '140', label: 'Bénéfice reporté' },
  { code: '16', label: 'Provisions pour risques et charges' },
  { code: '17', label: 'Dettes à plus d’un an' },
  { code: '22', label: 'Terrains et constructions' },
  { code: '23', label: 'Installations, machines et outillage' },
  { code: '24', label: 'Mobilier et matériel roulant' },
  { code: '34', label: 'Marchandises' },
  { code: '349', label: 'Marchandises : réductions de valeur actées' },
  { code: '400', label: 'Clients' },
  { code: '407', label: 'Créances douteuses' },
  { code: '409', label: 'Clients : réductions de valeur actées' },
  { code: '411', label: 'TVA à récupérer' },
  { code: '440', label: 'Fournisseurs' },
  { code: '451', label: 'TVA à payer' },
  { code: '453', label: 'Précomptes retenus' },
  { code: '454', label: 'Office national de sécurité sociale' },
  { code: '455', label: 'Rémunérations' },
  { code: '490', label: 'Charges à reporter' },
  { code: '491', label: 'Produits acquis' },
  { code: '492', label: 'Charges à imputer' },
  { code: '493', label: 'Produits à reporter' },
  { code: '550', label: 'Établissements de crédit : comptes courants' },
  { code: '570', label: 'Caisses-espèces' },
  { code: '604', label: 'Achats de marchandises' },
  { code: '609', label: 'Variation des stocks' },
  { code: '61', label: 'Services et biens divers' },
  { code: '62', label: 'Rémunérations, charges sociales et pensions' },
  { code: '630', label: "Dotations aux amortissements" },
  { code: '631', label: 'Réductions de valeur sur stocks' },
  { code: '634', label: 'Réductions de valeur sur créances commerciales' },
  { code: '635', label: 'Provisions pour pensions et obligations similaires' },
  { code: '637', label: 'Provisions pour autres risques et charges' },
  { code: '700', label: 'Ventes et prestations de services' },
  { code: '74', label: "Autres produits d'exploitation" },
  { code: '75', label: 'Produits financiers' },
];

export function findAccount(code: string): PcmnAccount | undefined {
  return PCMN.find((account) => account.code === code.trim());
}
