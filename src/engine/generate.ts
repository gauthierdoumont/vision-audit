// Pipeline de génération : graine + paramètres → entreprise → comptabilité → anomalies → documents → niveau.
// Audit Detective — créé par Gauthier Doumont.
import { ANOMALY_TEXTS, GENERIC_TOPICS } from '../content/anomaly-texts';
import { SECTORS } from '../content/sectors';
import type { Level, Procedure } from '../content/types';
import { injectAnomaly, type AnomalyType, type Injection, type TraceRef } from './anomalies';
import { partyBalance } from './balance';
import { generateCompany } from './company';
import { ACCOUNTANT_ID, buildDocuments } from './documents';
import { generateBooks } from './ledger';
import { euros, formatAmount, roundTo, toEuros, type Cents } from './money';
import { createRng } from './rng';
import type { Books, Company, SectorId } from './types';

export type LevelSpec = {
  number: number;
  seed: string;
  difficulty: number;
  sector: SectorId;
  anomalies: AnomalyType[];
};

export type GeneratedCase = { level: Level; company: Company; truth: Books; books: Books; injections: Injection[] };

/** Marge du budget sur le chemin optimal : ×2 en difficulté 1, ×1,2 en difficulté 10. */
export function budgetFactor(difficulty: number): number {
  return 2 - ((difficulty - 1) * 0.8) / 9;
}

function revealingHours(procedures: Procedure[], clueIds: string[]): number {
  const documentIds = new Set(clueIds.map((id) => id.split('#')[0]));
  const costs = procedures
    .filter((p) => [...p.reveals, ...(p.sampling?.pool ?? [])].some((d) => documentIds.has(d)))
    .map((p) => p.hours);
  return costs.length === 0 ? Infinity : Math.min(...costs);
}

export function generateCase(spec: LevelSpec): GeneratedCase {
  const rng = createRng(spec.seed);
  const sector = SECTORS[spec.sector];
  const { books: truth, company, revenue } = generateBooks(rng.fork('ledger'), generateCompany(rng.fork('company'), spec.sector), spec.difficulty);
  const books = structuredClone(truth);
  const injections = spec.anomalies.map((type, i) => injectAnomaly(type, rng.fork(`anomaly-${i}`), books, company));

  // Fournisseurs à circulariser : l'éventuel fournisseur concerné et les plus gros soldes.
  const bySize = books.parties
    .filter((p) => p.kind === 'supplier')
    .sort((a, b) => partyBalance(books.entries, '440', a.id) - partyBalance(books.entries, '440', b.id))
    .map((p) => p.id);
  const confirmedSuppliers = [...new Set([...injections.flatMap((i) => (i.partyId ? [i.partyId] : [])), ...bySize])].slice(0, 3);

  const docs = buildDocuments({ rng: rng.fork('documents'), company, truth, books, confirmedSuppliers });
  const texts = injections.map((i) => ANOMALY_TEXTS[i.type]);
  const topicId = (index: number) => `anomalie-${index}`;
  const traces = (traceRefs: TraceRef[], index: number) => traceRefs.map((ref) => docs.clueOf(ref, topicId(index)));

  // Seuil de signification : 0,5 à 1 % du chiffre d'affaires (repère usuel, À VÉRIFIER), loin des montants en jeu.
  const flavor = rng.fork('flavor');
  const biggest = Math.max(...injections.map((i) => Math.max(...i.accounts.map((a) => a.amount))));
  let materiality: Cents = roundTo(Math.round((revenue * flavor.int(5, 10)) / 1000), euros(500));
  if (Math.abs(biggest - materiality) < materiality * 0.2) materiality = roundTo(Math.round(biggest * (biggest > materiality ? 0.7 : 1.4)), euros(100));
  const clientCorrects = spec.difficulty < 3 || !flavor.chance(0.35);
  const material = biggest >= materiality;
  const opinion = !clientCorrects && material ? 'avec-reserve' : 'sans-reserve';

  const optimalHours = injections.reduce((sum, injection, i) => sum + revealingHours(docs.procedures, traces(injection.traces, i)), 0);
  // Plancher de 2,5 h : il faut aussi le temps de lire le dossier et de recouper avant de conclure.
  const budgetHours = Math.ceil(Math.max(optimalHours, 2.5) * budgetFactor(spec.difficulty) * 2) / 2;

  const accountantName = `${company.accountant.firstName} ${company.accountant.lastName}`;
  const managerName = `${company.manager.firstName} ${company.manager.lastName}`;
  const genericTopics = flavor.shuffle(GENERIC_TOPICS).slice(0, 2);

  const level: Level = {
    id: `level-${String(spec.number).padStart(3, '0')}`,
    number: spec.number,
    title: levelTitle(spec),
    format: 'court',
    difficulty: spec.difficulty,
    client: { name: company.name, sector: sector.label, city: company.city, legalForm: company.legalForm },
    materiality: toEuros(materiality),
    budgetHours,
    optimalHours,
    briefing: {
      from: 'Hélène Vasseur, associée',
      subject: `Dossier ${company.name}`,
      body: [
        `Nouveau dossier : ${company.name}, à ${company.city}. ${sector.label}, ${company.staff} salarié(s).`,
        flavor.pick([
          `La banque veut des comptes ${company.fiscalYear} contrôlés avant de renouveler sa ligne de crédit.`,
          `${managerName} veut des comptes contrôlés pour rassurer un futur associé.`,
          'Mission de contrôle volontaire : la gérance veut un avis indépendant sur ses comptes.',
        ]),
        `Comptable : ${accountantName}. Seuil de signification : ${formatAmount(materiality)} €. Budget : ${String(budgetHours).replace('.', ',')} h.`,
        clientCorrects
          ? 'La gérance s’est engagée à corriger tout ce qu’on trouvera.'
          : `Attention : ${managerName} refuse d’avance de modifier des comptes déjà arrêtés.`,
        spec.difficulty <= 2 ? `Commence par ${texts[0]!.focus}.` : 'À toi de voir où creuser.',
        flavor.pick(['Épingle tes preuves.', 'Pas d’accusation sans preuve.', 'Et ne dépasse pas le budget.']),
      ],
    },
    documents: docs.documents,
    initialDocuments: docs.initialDocuments,
    procedures: docs.procedures,
    characters: [
      {
        id: ACCOUNTANT_ID,
        name: accountantName,
        role: 'Comptable',
        profile: 'cooperatif',
        topics: flavor.shuffle([
          ...genericTopics.map((t, i) => ({ id: `general-${i}`, question: t.question, answer: [...t.answer] })),
          ...injections.map((injection, i) => ({
            id: topicId(i),
            question: texts[i]!.topic.question(injection.params),
            answer: texts[i]!.topic.answer(injection.params, injection.variant),
          })),
        ]),
      },
    ],
    anomalies: injections.map((injection, i) => ({
      id: `${injection.type}-${i}`,
      title: texts[i]!.title(injection.params),
      cycle: injection.cycle,
      accounts: injection.accounts.map((a) => ({ account: a.account, amount: toEuros(a.amount) })),
      assertion: injection.assertion,
      qualification: injection.qualification,
      correction: injection.correction.map((l) => ({ account: l.account, debit: toEuros(l.debit), credit: toEuros(l.credit) })),
      traces: traces(injection.traces, i),
      isa: texts[i]!.isa,
      explanation: texts[i]!.explanation(injection.params, injection.variant),
    })),
    expectedOpinion: {
      opinion,
      continuity: false,
      explanation: [
        `L’anomalie la plus importante (${formatAmount(biggest)} €) ${material ? 'dépasse' : 'reste sous'} le seuil de signification (${formatAmount(materiality)} €).`,
        clientCorrects
          ? 'Le client corrige : une fois l’écriture passée, les comptes donnent une image fidèle. Opinion sans réserve.'
          : material
            ? 'Le client refuse de corriger une anomalie significative mais non diffuse : opinion avec réserve.'
            : 'Le client refuse de corriger, mais l’anomalie n’est pas significative : opinion sans réserve. On la mentionne quand même à la gérance.',
        'Rien n’indique un problème de continuité : pas de paragraphe d’observation.',
      ],
    },
    hint: texts.flatMap((t) => t.hint),
  };

  return { level, company, truth, books, injections };
}

/** Titre du niveau, tiré d'un sous-générateur dédié pour pouvoir l'afficher sans générer tout le cas. */
export function levelTitle(spec: LevelSpec): string {
  return createRng(spec.seed).fork('title').pick(ANOMALY_TEXTS[spec.anomalies[0]!].levelTitles);
}

/** Nom du client, calculé avec le même sous-générateur que generateCase. */
export function levelClientName(spec: LevelSpec): string {
  return generateCompany(createRng(spec.seed).fork('company'), spec.sector).name;
}

export function generateLevel(spec: LevelSpec): Level {
  return generateCase(spec).level;
}
