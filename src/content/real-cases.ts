// Fiches « L'affaire réelle », révélées au débrief des niveaux 81-100.
// Faits recoupés auprès des sources citées ; À VÉRIFIER par Gauthier avant de lever la mention.
// Audit Detective — créé par Gauthier Doumont.

export type RealCaseId = 'lernout-hauspie' | 'parmalat' | 'wirecard' | 'ahold' | 'enron' | 'worldcom' | 'satyam';

export type RealCase = { id: RealCaseId; name: string; lines: string[]; sources: string[]; verified: boolean };

export const REAL_CASES: Record<RealCaseId, RealCase> = {
  'lernout-hauspie': {
    id: 'lernout-hauspie',
    name: 'Lernout & Hauspie (Belgique, 2000)',
    lines: [
      'Champion belge de la reconnaissance vocale, basé à Ypres, L&H affichait une croissance spectaculaire, notamment en Corée du Sud.',
      'En août 2000, le Wall Street Journal révèle que des ventes coréennes sont douteuses : une partie du chiffre d’affaires provenait d’entités liées au groupe.',
      'La SEC décrit des opérations avec quatre banques coréennes présentées comme des cessions de créances sans recours, alors que des accords annexes imposaient des dépôts bloqués.',
      'Environ 100 millions de dollars manquaient dans la filiale coréenne ; la société demande la protection contre les faillites fin 2000.',
      'Les fondateurs et l’ancien CEO sont arrêtés en avril 2001.',
      'Leçon : identifier les parties liées, confirmer directement auprès des clients et des banques, chercher les accords annexes.',
    ],
    sources: ['https://www.sec.gov/litigation/litreleases/lr17782.htm', 'https://www.computerworld.com/article/1357134/update-l-h-says-100m-missing-from-korean-unit.html'],
    verified: false,
  },
  parmalat: {
    id: 'parmalat',
    name: 'Parmalat (Italie, 2003)',
    lines: [
      'Le géant laitier italien affichait 3,95 milliards d’euros de liquidités et titres sur un compte de sa filiale caïmanaise Bonlat chez Bank of America.',
      'En décembre 2003, Bank of America déclare que le document qui attestait ce compte n’est pas authentique.',
      'Selon la SEC, les comptes 2002 de Bonlat avaient été certifiés sur la base d’une confirmation bancaire falsifiée : ni le compte ni les actifs n’existaient.',
      'Leçon : une confirmation bancaire doit être demandée et reçue directement par le réviseur (ISA 505), jamais transmise par le client.',
    ],
    sources: ['https://www.sec.gov/litigation/litreleases/lr18527.htm', 'https://www.nbcnews.com/news/amp/wbna4586882'],
    verified: false,
  },
  wirecard: {
    id: 'wirecard',
    name: 'Wirecard (Allemagne, 2020)',
    lines: [
      'Le spécialiste allemand des paiements déclarait environ 1,9 milliard d’euros sur des comptes fiduciaires, soit près d’un quart de son bilan.',
      'En juin 2020, l’auditeur EY refuse de signer les comptes 2019 faute de pouvoir confirmer ces fonds.',
      'Les deux banques philippines censées les détenir déclarent les documents falsifiés et n’avoir aucune relation avec Wirecard.',
      'Le 22 juin 2020, Wirecard admet que ces 1,9 milliard n’existent probablement pas.',
      'Leçon : pour des fonds détenus par un tiers, la confirmation directe auprès de la banque elle-même est indispensable.',
    ],
    sources: ['https://business.inquirer.net/300457/bpi-bdo-wirecard-claims-based-on-falsified-docs', 'https://www.philstar.com/business/2020/06/22/2022734/scandal-hit-wirecard-says-missing-19-billion-euros-likely-gone'],
    verified: false,
  },
  ahold: {
    id: 'ahold',
    name: 'Ahold / U.S. Foodservice (Pays-Bas, États-Unis, 2003)',
    lines: [
      'En février 2003, le distributeur néerlandais Ahold annonce que sa filiale U.S. Foodservice a surévalué ses résultats 2001 et 2002 d’au moins 500 millions de dollars.',
      'Le mécanisme : des « remises promotionnelles » des fournisseurs comptabilisées pour des montants gonflés, ce qui réduisait le coût des ventes.',
      'Selon la SEC, des dirigeants ont obtenu de fournisseurs qu’ils envoient de fausses confirmations aux auditeurs.',
      'En 2007, des employés de fournisseurs sont poursuivis pour avoir aidé à la fraude.',
      'Leçon : rapprocher les remises des contrats et rester critique, même face à une confirmation qui semble externe.',
    ],
    sources: ['https://www.sec.gov/news/press/2004-144.htm', 'https://www.sec.gov/enforcement-litigation/litigation-releases/lr-18797'],
    verified: false,
  },
  enron: {
    id: 'enron',
    name: 'Enron (États-Unis, 2001)',
    lines: [
      'Le géant américain de l’énergie utilisait des entités ad hoc (Chewco, JEDI, LJM) restées hors de son bilan.',
      'Les règles de l’époque permettaient de ne pas consolider une telle entité si des investisseurs extérieurs détenaient au moins 3 % de son capital.',
      'Le 8 novembre 2001, Enron annonce le retraitement de ses comptes 1997-2001 : ces entités auraient dû être consolidées, et ses dettes augmentent.',
      'Enron demande la protection contre les faillites le 2 décembre 2001.',
      'Leçon : suivre les parties liées et les garanties données ; une dette ne disparaît pas parce qu’elle change de société.',
    ],
    sources: ['https://www.sec.gov/Archives/edgar/data/0001024401/000095012901504218/h92492e10-q.txt'],
    verified: false,
  },
  worldcom: {
    id: 'worldcom',
    name: 'WorldCom (États-Unis, 2002)',
    lines: [
      'Le 25 juin 2002, l’opérateur WorldCom reconnaît avoir classé plus de 3,8 milliards de dollars de coûts de lignes en investissements au lieu de charges.',
      'L’audit interne, dirigé par Cynthia Cooper, découvre ces écritures et alerte le président du comité d’audit, qui saisit l’auditeur externe.',
      'Les enquêtes suivantes portent la surévaluation totale à plus de 11 milliards de dollars.',
      'Leçon : une charge récurrente ne devient pas un investissement ; les mouvements inhabituels des immobilisations se vérifient pièce par pièce.',
    ],
    sources: ['https://www.everycrsreport.com/reports/RS21253.html'],
    verified: false,
  },
  satyam: {
    id: 'satyam',
    name: 'Satyam (Inde, 2009)',
    lines: [
      'Le 7 janvier 2009, une lettre attribuée au président de Satyam, B. Ramalinga Raju, révèle des années de comptes falsifiés.',
      'Elle chiffre à 5 040 crores de roupies les liquidités et soldes bancaires fictifs au 30 septembre 2008, sur 5 361 crores inscrits.',
      'Elle mentionne aussi des intérêts courus inexistants et des créances clients surévaluées. Raju contestera ensuite en être l’auteur.',
      'Il est condamné en avril 2015 à sept ans de prison.',
      'Leçon : les soldes bancaires se confirment directement, et une trésorerie abondante qui ne rapporte rien doit intriguer.',
    ],
    sources: ['https://www.sec.gov/Archives/edgar/data/1106056/000114554909000025/u00107exv99w2.htm', 'https://www.thenewsminute.com/news/confession-letter-ramalinga-raju-wrote-2009-and-later-denied-23332'],
    verified: false,
  },
};
