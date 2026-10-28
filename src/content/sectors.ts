// Données des secteurs pour la génération procédurale : fournisseurs, produits, TVA, saisonnalité, immobilisations.
// Toutes les sociétés citées sont fictives. Audit Detective — créé par Gauthier Doumont.
//
// Taux de TVA belges utilisés : 6 % denrées alimentaires, 12 % repas servis au restaurant (hors boissons),
// 21 % taux normal (boissons au restaurant, biens et services courants).
// Durées d'amortissement : durées « usuelles » admises en pratique, À VÉRIFIER par Gauthier.
import type { SectorId } from '../engine/types';

export type Range = readonly [number, number];

export type ProductSpec = { label: string; price: Range; vatRate: number };

export type SupplierSpec = { names: readonly string[]; city: string; products: readonly ProductSpec[] };

export type AssetSpec = {
  label: string;
  account: '2300' | '2400' | '2410';
  depreciationAccount: '2309' | '2409' | '2419';
  /** Durée d'utilité usuelle, À VÉRIFIER. */
  years: number;
  cost: Range;
};

export type SalesMix = { label: string; vatRate: number; share: number };

export type SectorSpec = {
  id: SectorId;
  label: string;
  companyNames: readonly string[];
  /** counter : ventes au comptoir (recettes globales) ; invoice : factures à des clients (compte 400). */
  salesMode: 'counter' | 'invoice';
  salesMix: readonly SalesMix[];
  annualRevenue: Range;
  /** Part des achats de marchandises dans le chiffre d'affaires. */
  purchaseRatio: number;
  /** Poids des mois de janvier à décembre (moyenne 1). */
  seasonality: readonly number[];
  suppliers: readonly SupplierSpec[];
  clients: readonly string[];
  /** Part des charges de personnel dans le chiffre d'affaires (sert à fixer l'effectif). */
  personnelRatio: number;
  monthlyGross: Range;
  /** Fonctions du personnel (le comptable est ajouté automatiquement). */
  roles: readonly string[];
  /** Activité exemptée de TVA (art. 44 CTVA) : pas de TVA sur les ventes, pas de déduction sur les achats. */
  vatExempt?: boolean;
  assets: readonly AssetSpec[];
  capex: readonly (AssetSpec & { supplier: string })[];
};

export const SECTORS: Record<SectorId, SectorSpec> = {
  boulangerie: {
    id: 'boulangerie',
    label: 'Boulangerie-pâtisserie',
    companyNames: ['Boulangerie {nom}', 'Au Bon Pain {nom}', 'Maison {nom}', 'Le Fournil de {ville}'],
    salesMode: 'counter',
    salesMix: [{ label: 'Pains, viennoiseries et pâtisseries', vatRate: 6, share: 1 }],
    annualRevenue: [280_000, 450_000],
    purchaseRatio: 0.42,
    seasonality: [0.9, 0.9, 0.95, 1.05, 1, 0.95, 0.85, 0.8, 1, 1, 1.1, 1.5],
    suppliers: [
      {
        names: ['Moulins de la Meuse', 'Meunerie du Condroz', 'Moulin Saint-Hubert'],
        city: '5100 Jambes',
        products: [
          { label: 'Farine de froment T65 — sac 25 kg', price: [21, 24], vatRate: 6 },
          { label: 'Farine de froment T80 — sac 25 kg', price: [23, 27], vatRate: 6 },
          { label: 'Farine de seigle — sac 25 kg', price: [24, 28], vatRate: 6 },
        ],
      },
      {
        names: ['Laiterie du Condroz', 'Laiterie des Ardennes', 'Crèmerie de Hesbaye'],
        city: '5590 Ciney',
        products: [
          { label: 'Beurre de laiterie — bloc 10 kg', price: [68, 82], vatRate: 6 },
          { label: 'Crème fraîche 35 % — 5 l', price: [24, 30], vatRate: 6 },
          { label: 'Œufs frais — plateau de 180', price: [36, 44], vatRate: 6 },
        ],
      },
      {
        names: ['Sucrerie de Hesbaye', 'Épicerie fine Delvaux', 'Comptoir du Pâtissier'],
        city: '4280 Hannut',
        products: [
          { label: 'Sucre cristallisé — sac 25 kg', price: [22, 27], vatRate: 6 },
          { label: 'Chocolat de couverture — 5 kg', price: [55, 70], vatRate: 6 },
        ],
      },
      {
        names: ['Emballages Dumont', 'Pack Wallonie', 'Cartonnages Lecomte'],
        city: '6000 Charleroi',
        products: [
          { label: 'Sachets à pain kraft — carton de 1 000', price: [38, 48], vatRate: 21 },
          { label: 'Boîtes à pâtisserie — carton de 200', price: [42, 55], vatRate: 21 },
        ],
      },
    ],
    clients: [],
    personnelRatio: 0.33,
    monthlyGross: [2_600, 3_100],
    roles: ['Boulangerie', 'Pâtisserie', 'Vente au comptoir'],
    assets: [
      { label: 'Four à étages', account: '2300', depreciationAccount: '2309', years: 10, cost: [38_000, 55_000] },
      { label: 'Pétrin à spirale', account: '2300', depreciationAccount: '2309', years: 10, cost: [9_000, 14_000] },
      { label: 'Camionnette de livraison', account: '2410', depreciationAccount: '2419', years: 5, cost: [24_000, 32_000] },
      { label: 'Comptoir et vitrines du magasin', account: '2400', depreciationAccount: '2409', years: 10, cost: [12_000, 18_000] },
    ],
    capex: [
      { label: 'Laminoir à pâte', account: '2300', depreciationAccount: '2309', years: 10, cost: [7_500, 11_000], supplier: 'Fours Equip' },
      { label: 'Vitrine réfrigérée', account: '2300', depreciationAccount: '2309', years: 5, cost: [5_500, 8_500], supplier: 'Froid Service Namur' },
      { label: 'Chambre de pousse', account: '2300', depreciationAccount: '2309', years: 10, cost: [9_000, 13_000], supplier: 'Fours Equip' },
    ],
  },
  garage: {
    id: 'garage',
    label: 'Garage',
    companyNames: ['Garage {nom}', 'Auto Service {ville}', 'Garage du Centre', 'Carrosserie {nom}'],
    salesMode: 'invoice',
    salesMix: [{ label: 'Entretien, réparations et pièces', vatRate: 21, share: 1 }],
    annualRevenue: [350_000, 700_000],
    purchaseRatio: 0.45,
    seasonality: [0.9, 0.9, 1, 1.1, 1.05, 1.05, 0.85, 0.8, 1.05, 1.1, 1.1, 1.1],
    suppliers: [
      {
        names: ['Autopièces Wallonie', 'Distri-Pièces Namur', 'Comptoir Auto Meuse'],
        city: '5000 Namur',
        products: [
          { label: 'Kit de distribution', price: [180, 260], vatRate: 21 },
          { label: 'Plaquettes de frein (jeu)', price: [35, 60], vatRate: 21 },
          { label: 'Filtres à huile', price: [7, 12], vatRate: 21 },
        ],
      },
      {
        names: ['Pneus Express Belgique', 'Gomme & Jante', 'Pneus Lambotte'],
        city: '6220 Fleurus',
        products: [
          { label: 'Pneu été 205/55 R16', price: [58, 75], vatRate: 21 },
          { label: 'Pneu hiver 205/55 R16', price: [65, 85], vatRate: 21 },
        ],
      },
      {
        names: ['Lubrifiants du Sud', 'Huiles Mertens', 'Oléo Service'],
        city: '4000 Liège',
        products: [
          { label: 'Huile moteur 5W30 — fût 60 l', price: [260, 320], vatRate: 21 },
          { label: 'Liquide de refroidissement — 20 l', price: [45, 60], vatRate: 21 },
        ],
      },
    ],
    clients: [
      'Transports Gilson SRL', 'Taxis Mosans SRL', 'Fleurs Piron', 'Ambulances du Condroz SRL',
      'Immo Hubert SA', 'Plomberie Renard', 'Traiteur Collard', 'Régie de travaux Dupont SRL',
    ],
    personnelRatio: 0.28,
    monthlyGross: [2_700, 3_300],
    roles: ['Mécanique', 'Carrosserie', 'Accueil atelier'],
    assets: [
      { label: 'Pont élévateur', account: '2300', depreciationAccount: '2309', years: 10, cost: [8_000, 12_000] },
      { label: 'Outillage d’atelier', account: '2300', depreciationAccount: '2309', years: 5, cost: [10_000, 16_000] },
      { label: 'Véhicule de dépannage', account: '2410', depreciationAccount: '2419', years: 5, cost: [30_000, 42_000] },
      { label: 'Mobilier de l’accueil', account: '2400', depreciationAccount: '2409', years: 10, cost: [5_000, 8_000] },
    ],
    capex: [
      { label: 'Station de climatisation', account: '2300', depreciationAccount: '2309', years: 5, cost: [5_500, 8_000], supplier: 'Garage Equip Pro' },
      { label: 'Valise de diagnostic multimarque', account: '2300', depreciationAccount: '2309', years: 5, cost: [4_500, 7_000], supplier: 'Garage Equip Pro' },
      { label: 'Pont élévateur deux colonnes', account: '2300', depreciationAccount: '2309', years: 10, cost: [7_000, 10_000], supplier: 'Levage Service' },
    ],
  },
  informatique: {
    id: 'informatique',
    label: 'PME informatique',
    companyNames: ['{nom} IT Solutions', 'Digit{ville}', 'Réseau {nom}', 'Pixel & Code'],
    salesMode: 'invoice',
    salesMix: [{ label: 'Prestations informatiques et matériel', vatRate: 21, share: 1 }],
    annualRevenue: [400_000, 900_000],
    purchaseRatio: 0.3,
    seasonality: [0.9, 0.95, 1.05, 1, 1, 1, 0.75, 0.7, 1.1, 1.1, 1.15, 1.2],
    suppliers: [
      {
        names: ['Distrinet Benelux', 'Infomat Grossiste', 'Wallonie Hardware'],
        city: '1300 Wavre',
        products: [
          { label: 'Ordinateur portable 14" pro', price: [780, 950], vatRate: 21 },
          { label: 'Écran 27"', price: [180, 240], vatRate: 21 },
          { label: 'Switch réseau 24 ports', price: [220, 320], vatRate: 21 },
        ],
      },
      {
        names: ['Licences Direct', 'Soft Benelux', 'CloudPartners'],
        city: '1400 Nivelles',
        products: [
          { label: 'Licence bureautique annuelle', price: [95, 130], vatRate: 21 },
          { label: 'Licence antivirus entreprise', price: [30, 45], vatRate: 21 },
        ],
      },
      {
        names: ['Câblage Mertens', 'Connect Pro', 'Fibre & Réseau'],
        city: '5000 Namur',
        products: [
          { label: 'Câble réseau Cat6 — touret 305 m', price: [110, 150], vatRate: 21 },
          { label: 'Point d’accès Wi-Fi', price: [140, 190], vatRate: 21 },
        ],
      },
    ],
    clients: [
      'Notaires Associés {ville}', 'Clinique vétérinaire Lejeune', 'Comptafid SRL', 'École Saint-Joseph',
      'Immo Hubert SA', 'Transports Gilson SRL', 'Pharmacie Laurent', 'Cabinet dentaire Simon',
    ],
    personnelRatio: 0.45,
    monthlyGross: [3_300, 4_200],
    roles: ['Technicien réseau', 'Développement', 'Support informatique'],
    assets: [
      { label: 'Serveurs et baie informatique', account: '2400', depreciationAccount: '2409', years: 3, cost: [14_000, 22_000] },
      { label: 'Postes de travail du personnel', account: '2400', depreciationAccount: '2409', years: 3, cost: [8_000, 14_000] },
      { label: 'Voiture de service', account: '2410', depreciationAccount: '2419', years: 5, cost: [26_000, 34_000] },
      { label: 'Mobilier de bureau', account: '2400', depreciationAccount: '2409', years: 10, cost: [6_000, 10_000] },
    ],
    capex: [
      { label: 'Serveur de virtualisation', account: '2400', depreciationAccount: '2409', years: 3, cost: [6_000, 9_500], supplier: 'Distrinet Benelux' },
      { label: 'Baie de stockage réseau', account: '2400', depreciationAccount: '2409', years: 3, cost: [5_000, 8_000], supplier: 'Infomat Grossiste' },
    ],
  },
  horeca: {
    id: 'horeca',
    label: 'Horeca (restaurant)',
    companyNames: ['Brasserie {nom}', 'Le Bistrot de {ville}', 'La Table de {prenom}', 'Restaurant Le Relais'],
    salesMode: 'counter',
    // Taux horeca À VÉRIFIER : 12 % sur les repas servis sur place, 21 % sur les boissons.
    salesMix: [
      { label: 'Repas servis sur place', vatRate: 12, share: 0.7 },
      { label: 'Boissons', vatRate: 21, share: 0.3 },
    ],
    annualRevenue: [300_000, 650_000],
    purchaseRatio: 0.32,
    seasonality: [0.8, 0.85, 0.95, 1.05, 1.1, 1.15, 1.1, 1, 1, 0.95, 0.9, 1.15],
    suppliers: [
      {
        names: ['Boucherie Henrard', 'Viandes du Condroz', 'Maison Lambotte'],
        city: '5590 Ciney',
        products: [
          { label: 'Bœuf — pièce à braiser (kg)', price: [14, 19], vatRate: 6 },
          { label: 'Volaille fermière (kg)', price: [8, 11], vatRate: 6 },
        ],
      },
      {
        names: ['Primeurs de la Meuse', 'Maraîcher Willems', 'Halle aux Légumes'],
        city: '5000 Namur',
        products: [
          { label: 'Légumes de saison — caisse', price: [18, 28], vatRate: 6 },
          { label: 'Pommes de terre — sac 25 kg', price: [14, 20], vatRate: 6 },
        ],
      },
      {
        names: ['Brasserie Distribution Mosane', 'Boissons Claes', 'Drinks Wallonie'],
        city: '5300 Andenne',
        products: [
          { label: 'Bière pression — fût 20 l', price: [62, 78], vatRate: 21 },
          { label: 'Vin rouge — carton de 6', price: [36, 54], vatRate: 21 },
        ],
      },
    ],
    clients: [],
    personnelRatio: 0.4,
    monthlyGross: [2_500, 3_000],
    roles: ['Cuisine', 'Service en salle', 'Plonge'],
    assets: [
      { label: 'Cuisine professionnelle', account: '2300', depreciationAccount: '2309', years: 10, cost: [35_000, 50_000] },
      { label: 'Hotte d’extraction', account: '2300', depreciationAccount: '2309', years: 10, cost: [8_000, 12_000] },
      { label: 'Mobilier de salle', account: '2400', depreciationAccount: '2409', years: 10, cost: [15_000, 25_000] },
    ],
    capex: [
      { label: 'Piano de cuisson', account: '2300', depreciationAccount: '2309', years: 10, cost: [8_000, 12_000], supplier: 'Horeca Equip' },
      { label: 'Cellule de refroidissement rapide', account: '2300', depreciationAccount: '2309', years: 5, cost: [5_500, 8_000], supplier: 'Froid Service Namur' },
      { label: 'Lave-vaisselle à capot', account: '2300', depreciationAccount: '2309', years: 5, cost: [4_500, 6_500], supplier: 'Horeca Equip' },
    ],
  },
  grossiste: {
    id: 'grossiste',
    label: 'Grossiste alimentaire',
    companyNames: ['{nom} Distribution', 'Comptoir Alimentaire de {ville}', 'Grossiste {nom}', 'Delta Food {ville}'],
    salesMode: 'invoice',
    salesMix: [
      { label: 'Denrées alimentaires', vatRate: 6, share: 0.8 },
      { label: 'Boissons alcoolisées', vatRate: 21, share: 0.2 },
    ],
    annualRevenue: [900_000, 1_600_000],
    purchaseRatio: 0.74,
    seasonality: [0.9, 0.9, 0.95, 1, 1, 1.05, 1.05, 1, 1, 1, 1.05, 1.1],
    suppliers: [
      {
        names: ['Fromagerie des Ardennes', 'Laiterie du Condroz', 'Crèmerie de Hesbaye'],
        city: '6900 Marche-en-Famenne',
        products: [
          { label: 'Fromage à pâte dure — meule 10 kg', price: [95, 130], vatRate: 6 },
          { label: 'Beurre — carton de 40 plaquettes', price: [85, 110], vatRate: 6 },
        ],
      },
      {
        names: ['Conserverie Mosane', 'Épicerie Centrale Benelux', 'Sapori Import'],
        city: '4000 Liège',
        products: [
          { label: 'Conserves de légumes — carton de 24', price: [28, 40], vatRate: 6 },
          { label: 'Pâtes sèches — carton de 20 kg', price: [32, 45], vatRate: 6 },
          { label: 'Huile d’olive — bidon 5 l', price: [38, 55], vatRate: 6 },
        ],
      },
      {
        names: ['Brasserie Distribution Mosane', 'Vins & Spiritueux Lambert', 'Cave du Hainaut'],
        city: '7000 Mons',
        products: [
          { label: 'Bière blonde — casier de 24', price: [18, 25], vatRate: 21 },
          { label: 'Vin rouge — carton de 6', price: [30, 48], vatRate: 21 },
        ],
      },
    ],
    clients: ['Restaurant Le Relais', 'Épicerie Collard', 'Brasserie du Marché', 'Traiteur Renard SRL', 'Snack Chez Momo', 'Cantine scolaire Saint-Joseph', 'Hôtel des Remparts SA', 'Supérette Piron'],
    personnelRatio: 0.1,
    monthlyGross: [2_800, 3_300],
    roles: ['Magasinier', 'Chauffeur-livreur', 'Commercial', 'Préparation de commandes'],
    assets: [
      { label: 'Chambre froide', account: '2300', depreciationAccount: '2309', years: 10, cost: [25_000, 40_000] },
      { label: 'Camion frigorifique', account: '2410', depreciationAccount: '2419', years: 5, cost: [45_000, 65_000] },
      { label: 'Rayonnages d’entrepôt', account: '2400', depreciationAccount: '2409', years: 10, cost: [8_000, 14_000] },
    ],
    capex: [
      { label: 'Transpalette électrique', account: '2300', depreciationAccount: '2309', years: 5, cost: [6_000, 9_000], supplier: 'Manutention Wallonie' },
      { label: 'Groupe frigorifique de remplacement', account: '2300', depreciationAccount: '2309', years: 10, cost: [8_000, 12_000], supplier: 'Froid Service Namur' },
    ],
  },
  construction: {
    id: 'construction',
    label: 'Entreprise de construction',
    companyNames: ['Construct {nom}', 'Bâtiments {nom} et Fils', 'Entreprise Générale {nom}', 'Gros Œuvre {ville}'],
    salesMode: 'invoice',
    // Clients particuliers (construction neuve, 21 %). Pas de chantier en autoliquidation pour rester simple.
    salesMix: [{ label: 'Travaux de construction — état d’avancement', vatRate: 21, share: 1 }],
    annualRevenue: [700_000, 1_400_000],
    purchaseRatio: 0.38,
    seasonality: [0.6, 0.7, 1, 1.1, 1.15, 1.15, 1.05, 0.9, 1.15, 1.15, 1.05, 0.7],
    suppliers: [
      {
        names: ['Matériaux du Condroz', 'Négoce Bâti Wallonie', 'Briqueterie Lambert'],
        city: '5590 Ciney',
        products: [
          { label: 'Briques de parement — palette', price: [380, 460], vatRate: 21 },
          { label: 'Blocs béton — palette', price: [240, 300], vatRate: 21 },
          { label: 'Ciment — palette de 40 sacs', price: [260, 320], vatRate: 21 },
        ],
      },
      {
        names: ['Béton Mosan', 'Centrale à Béton Henrard', 'Bétonnière de la Sambre'],
        city: '6000 Charleroi',
        products: [{ label: 'Béton prêt à l’emploi — m³', price: [105, 130], vatRate: 21 }],
      },
      {
        names: ['Acier & Fer Wallonie', 'Ferraillage Martin', 'Armatures du Sud'],
        city: '4500 Huy',
        products: [{ label: 'Treillis d’armature — panneau', price: [28, 38], vatRate: 21 }],
      },
    ],
    clients: ['M. et Mme Dupont — construction neuve', 'M. et Mme Lejeune — construction neuve', 'Famille Gilson — maison neuve', 'M. Renard — extension neuve', 'Mme Hubert — construction neuve', 'Famille Wouters — maison neuve'],
    personnelRatio: 0.32,
    monthlyGross: [3_000, 3_600],
    roles: ['Maçon', 'Chef de chantier', 'Coffreur', 'Conducteur d’engins'],
    assets: [
      { label: 'Mini-pelle', account: '2300', depreciationAccount: '2309', years: 5, cost: [35_000, 50_000] },
      { label: 'Camionnette benne', account: '2410', depreciationAccount: '2419', years: 5, cost: [30_000, 40_000] },
      { label: 'Échafaudages', account: '2300', depreciationAccount: '2309', years: 10, cost: [12_000, 20_000] },
    ],
    capex: [
      { label: 'Bétonnière de chantier', account: '2300', depreciationAccount: '2309', years: 5, cost: [4_500, 7_000], supplier: 'Chantier Equip' },
      { label: 'Plaque vibrante', account: '2300', depreciationAccount: '2309', years: 5, cost: [4_000, 6_000], supplier: 'Chantier Equip' },
    ],
  },
  ecommerce: {
    id: 'ecommerce',
    label: 'E-commerce',
    companyNames: ['{nom} Shop', 'Clic & Colis {ville}', 'MaBoutique{ville}', 'Webstore {nom}'],
    salesMode: 'counter',
    salesMix: [{ label: 'Ventes en ligne (articles de maison)', vatRate: 21, share: 1 }],
    annualRevenue: [400_000, 900_000],
    purchaseRatio: 0.5,
    seasonality: [0.85, 0.8, 0.9, 0.9, 0.95, 0.9, 0.85, 0.85, 0.95, 1.05, 1.4, 1.6],
    suppliers: [
      {
        names: ['Maison Déco Import', 'Home Style Benelux', 'Décor Grossiste'],
        city: '1300 Wavre',
        products: [
          { label: 'Lampes de table — lot de 10', price: [180, 240], vatRate: 21 },
          { label: 'Coussins décoratifs — lot de 20', price: [140, 190], vatRate: 21 },
          { label: 'Vases en céramique — lot de 12', price: [150, 210], vatRate: 21 },
        ],
      },
      {
        names: ['Emballages Dumont', 'Pack Wallonie', 'Cartonnages Lecomte'],
        city: '6000 Charleroi',
        products: [{ label: 'Cartons d’expédition — palette', price: [220, 300], vatRate: 21 }],
      },
      {
        names: ['Textiles du Nord', 'Linge de Maison Peeters', 'Tissus Claes'],
        city: '7000 Mons',
        products: [{ label: 'Plaids en laine — lot de 10', price: [210, 280], vatRate: 21 }],
      },
    ],
    clients: [],
    personnelRatio: 0.15,
    monthlyGross: [2_700, 3_200],
    roles: ['Préparation des colis', 'Service client', 'Gestion du site'],
    assets: [
      { label: 'Serveur et matériel informatique', account: '2400', depreciationAccount: '2409', years: 3, cost: [8_000, 12_000] },
      { label: 'Rayonnages de l’entrepôt', account: '2400', depreciationAccount: '2409', years: 10, cost: [6_000, 10_000] },
    ],
    capex: [
      { label: 'Imprimante d’étiquettes industrielle', account: '2400', depreciationAccount: '2409', years: 3, cost: [4_000, 6_000], supplier: 'Infomat Grossiste' },
      { label: 'Filmeuse de palettes', account: '2300', depreciationAccount: '2309', years: 5, cost: [5_000, 7_500], supplier: 'Manutention Wallonie' },
    ],
  },
  transport: {
    id: 'transport',
    label: 'Transport de marchandises',
    companyNames: ['Transports {nom}', '{nom} Logistique', 'Trans{ville}', 'Messageries {nom}'],
    salesMode: 'invoice',
    salesMix: [{ label: 'Transport de marchandises en Belgique', vatRate: 21, share: 1 }],
    annualRevenue: [600_000, 1_200_000],
    purchaseRatio: 0.3,
    seasonality: [0.9, 0.9, 1, 1, 1, 1, 0.9, 0.85, 1.05, 1.1, 1.15, 1.05],
    suppliers: [
      {
        names: ['Carburants Mosans', 'Diesel Pro Wallonie', 'Station Lambotte'],
        city: '5300 Andenne',
        products: [{ label: 'Gasoil routier — litre', price: [1.55, 1.85], vatRate: 21 }],
      },
      {
        names: ['Pneus Poids Lourds Gilson', 'Gomme & Jante', 'Truck Pneus'],
        city: '6220 Fleurus',
        products: [{ label: 'Pneu poids lourd 315/80 R22,5', price: [380, 480], vatRate: 21 }],
      },
      {
        names: ['Garage Poids Lourds Henrard', 'Truck Service Namur', 'Atelier Diesel Collard'],
        city: '5000 Namur',
        products: [
          { label: 'Entretien périodique camion', price: [650, 900], vatRate: 21 },
          { label: 'Pièces de freinage poids lourd', price: [300, 450], vatRate: 21 },
        ],
      },
    ],
    clients: ['Distribution Peeters SA', 'Matériaux du Condroz', 'Brasserie Distribution Mosane', 'Pack Wallonie', 'Meunerie du Condroz', 'Décor Grossiste'],
    personnelRatio: 0.38,
    monthlyGross: [2_900, 3_400],
    roles: ['Chauffeur poids lourd', 'Planification', 'Mécanique'],
    assets: [
      { label: 'Tracteur routier', account: '2410', depreciationAccount: '2419', years: 5, cost: [90_000, 120_000] },
      { label: 'Semi-remorque', account: '2410', depreciationAccount: '2419', years: 8, cost: [35_000, 50_000] },
      { label: 'Mobilier de bureau', account: '2400', depreciationAccount: '2409', years: 10, cost: [5_000, 8_000] },
    ],
    capex: [
      { label: 'Hayon élévateur', account: '2410', depreciationAccount: '2419', years: 5, cost: [6_000, 9_000], supplier: 'Truck Equip' },
      { label: 'Système de géolocalisation de la flotte', account: '2400', depreciationAccount: '2409', years: 3, cost: [4_000, 6_500], supplier: 'Infomat Grossiste' },
    ],
  },
  medical: {
    id: 'medical',
    label: 'Cabinet médical (société)',
    companyNames: ['Centre Médical {nom}', 'Cabinet du Dr {nom}', 'Polyclinique de {ville}', 'Médical {nom}'],
    salesMode: 'counter',
    // Soins de santé exemptés de TVA (art. 44, § 1er, CTVA) : pas de TVA facturée ni déduite.
    salesMix: [{ label: 'Honoraires médicaux', vatRate: 0, share: 1 }],
    vatExempt: true,
    annualRevenue: [350_000, 700_000],
    purchaseRatio: 0.08,
    seasonality: [1.1, 1.1, 1.05, 1, 0.95, 0.95, 0.8, 0.8, 1, 1.05, 1.1, 1.1],
    suppliers: [
      {
        names: ['Médi-Fournitures Benelux', 'Pharma Distrib Wallonie', 'Santé Matériel'],
        city: '1400 Nivelles',
        products: [
          { label: 'Gants d’examen — carton de 1 000', price: [55, 75], vatRate: 21 },
          { label: 'Compresses stériles — carton', price: [35, 50], vatRate: 21 },
        ],
      },
      {
        names: ['Papeterie Martin', 'Bureau Plus Namur', 'Fournitures Lejeune'],
        city: '5000 Namur',
        products: [{ label: 'Papier et fournitures de bureau', price: [80, 140], vatRate: 21 }],
      },
    ],
    clients: [],
    personnelRatio: 0.3,
    monthlyGross: [2_800, 3_400],
    roles: ['Secrétariat médical', 'Soins infirmiers', 'Accueil'],
    assets: [
      { label: 'Échographe', account: '2300', depreciationAccount: '2309', years: 5, cost: [30_000, 45_000] },
      { label: 'Mobilier des salles de consultation', account: '2400', depreciationAccount: '2409', years: 10, cost: [10_000, 16_000] },
    ],
    capex: [
      { label: 'Électrocardiographe', account: '2300', depreciationAccount: '2309', years: 5, cost: [4_500, 7_000], supplier: 'Santé Matériel' },
      { label: 'Table d’examen électrique', account: '2300', depreciationAccount: '2309', years: 10, cost: [4_000, 6_000], supplier: 'Santé Matériel' },
    ],
  },
  detail: {
    id: 'detail',
    label: 'Commerce de détail',
    companyNames: ['Quincaillerie {nom}', 'Bricolage de {ville}', 'Droguerie {nom}', 'Le Comptoir de {ville}'],
    salesMode: 'counter',
    salesMix: [{ label: 'Ventes au magasin (quincaillerie et bricolage)', vatRate: 21, share: 1 }],
    annualRevenue: [350_000, 750_000],
    purchaseRatio: 0.55,
    seasonality: [0.8, 0.8, 1, 1.15, 1.2, 1.1, 0.95, 0.9, 1, 1, 0.95, 1.15],
    suppliers: [
      {
        names: ['Outillage Benelux', 'Quincaillerie Grossiste Mertens', 'Fixations du Sud'],
        city: '4000 Liège',
        products: [
          { label: 'Perceuses-visseuses — carton de 6', price: [280, 360], vatRate: 21 },
          { label: 'Vis et chevilles — assortiment', price: [45, 70], vatRate: 21 },
        ],
      },
      {
        names: ['Peintures Wallonie', 'Couleurs & Co', 'Droguerie Centrale'],
        city: '6000 Charleroi',
        products: [{ label: 'Peinture murale — seaux de 10 l', price: [38, 55], vatRate: 21 }],
      },
      {
        names: ['Jardin Pro Distribution', 'Horticulture Claes', 'Vert Grossiste'],
        city: '5030 Gembloux',
        products: [{ label: 'Terreau et engrais — palette', price: [320, 420], vatRate: 21 }],
      },
    ],
    clients: [],
    personnelRatio: 0.18,
    monthlyGross: [2_600, 3_000],
    roles: ['Vente', 'Caisse', 'Réception des marchandises'],
    assets: [
      { label: 'Agencement du magasin', account: '2400', depreciationAccount: '2409', years: 10, cost: [25_000, 40_000] },
      { label: 'Caisses enregistreuses', account: '2400', depreciationAccount: '2409', years: 5, cost: [6_000, 9_000] },
    ],
    capex: [
      { label: 'Machine à teinter la peinture', account: '2300', depreciationAccount: '2309', years: 5, cost: [5_000, 8_000], supplier: 'Couleurs & Co' },
      { label: 'Gerbeur électrique', account: '2300', depreciationAccount: '2309', years: 5, cost: [4_500, 7_000], supplier: 'Manutention Wallonie' },
    ],
  },
};

/** Fournisseurs de services communs à tous les secteurs (comptes 61 : subdivisions libres du PCMN). */
export const COMMON_SERVICES = {
  rent: { name: 'Immo {nom}', account: '610' },
  telecom: { names: ['MeuseTel Pro', 'WalCom Entreprises', 'Connectis Belgique'] as const, account: '612' },
  accountingFirm: { names: ['Fiduciaire Lambert', 'Compta Conseil Meuse', 'Fiduciaire du Centre'] as const, account: '613' },
  cleaning: { names: ['Nettoyage Pro Namur', 'Clean Service Wallonie'] as const, account: '611' },
  restaurants: ['Restaurant La Meuse Gourmande', 'Brasserie du Beffroi', 'Le Comptoir des Saveurs', 'Trattoria Da Marco'] as const,
};

export const SECTOR_IDS = Object.keys(SECTORS) as SectorId[];
