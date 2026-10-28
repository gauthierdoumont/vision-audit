// Pipeline de génération : graine + paramètres → entreprise → comptabilité → anomalies → documents → niveau.
// Audit Detective — créé par Gauthier Doumont.
import { ANOMALY_TEXTS } from '../content/anomaly-texts';
import { gradeFor, INES_LINES, MAXIME_BETS, PROMOTIONS } from '../content/firm';
import { SECTORS } from '../content/sectors';
import type { Level, Procedure } from '../content/types';
import { injectAnomaly, type AnomalyType, type InjectContext, type Injection } from './anomalies';
import { partyBalance } from './balance';
import { buildCharacters } from './characters';
import { generateCompany } from './company';
import { buildDocuments, unlockLevelForDifficulty } from './documents';
import type { TraceRef } from './ids';
import { afterClosingEvents, generateBooks } from './ledger';
import { euros, formatAmount, roundTo, toEuros, type Cents } from './money';
import { createRng } from './rng';
import type { Books, Company, SectorId } from './types';

export type LevelSpec = {
  number: number;
  seed: string;
  difficulty: number;
  sector: SectorId;
  anomalies: AnomalyType[];
  format?: Level['format'];
  /** Niveau de campagne équivalent pour les procédures disponibles (par défaut : `number`). */
  unlockLevel?: number;
  /** Identifiant du niveau (par défaut : level-NNN). */
  id?: string;
};

export type GeneratedCase = { level: Level; company: Company; truth: Books; books: Books; injections: Injection[] };

/** Marge du budget sur le chemin optimal : ×2 en difficulté 1, ×1,2 en difficulté 10. */
export function budgetFactor(difficulty: number): number {
  return 2 - ((difficulty - 1) * 0.8) / 9;
}

function revealingHours(procedures: Procedure[], clueIds: string[]): number {
  const documentIds = new Set(clueIds.map((id) => id.split('#')[0]));
  const costs = procedures.filter((p) => [...p.reveals, ...(p.sampling?.pool ?? [])].some((d) => documentIds.has(d))).map((p) => p.hours);
  return costs.length === 0 ? Infinity : Math.min(...costs);
}

const hoursLabel = (hours: number) => `${String(hours).replace('.', ',')} h`;

export function generateCase(spec: LevelSpec): GeneratedCase {
  const rng = createRng(spec.seed);
  const sector = SECTORS[spec.sector];
  const unlockLevel = spec.unlockLevel ?? spec.number;
  const { books: truth, company, revenue } = generateBooks(rng.fork('ledger'), generateCompany(rng.fork('company'), spec.sector), spec.difficulty);
  const books = structuredClone(truth);

  // ---------- Anomalies ----------
  let idCounter = 0;
  const context: Omit<InjectContext, 'rng'> = {
    company,
    sector,
    truth,
    books,
    difficulty: spec.difficulty,
    used: new Set(),
    newId: (prefix) => `${prefix}x${++idCounter}`,
  };
  const injections = spec.anomalies.map((type, i) => injectAnomaly(type, { ...context, rng: rng.fork(`anomalie-${i}`) }));
  afterClosingEvents(truth, company, rng.fork('apres-cloture'));
  books.world.afterClosing = structuredClone(truth.world.afterClosing);

  // ---------- Documents ----------
  const ranked = (kind: 'supplier' | 'client', account: string, sign: number) =>
    books.parties.filter((p) => p.kind === kind).sort((a, b) => sign * (partyBalance(books.entries, account, b.id) - partyBalance(books.entries, account, a.id))).map((p) => p.id);
  const pick = (first: (string | undefined)[], rest: string[]) => [...new Set([...first.filter((x): x is string => !!x), ...rest])].slice(0, 3);
  const docs = buildDocuments(
    {
      rng: rng.fork('documents'),
      company,
      sector,
      truth,
      books,
      confirmedSuppliers: pick(injections.map((i) => i.supplierId), ranked('supplier', '440', -1)),
      confirmedClients: pick(injections.map((i) => i.clientId), ranked('client', '400', 1)),
    },
    unlockLevel,
  );
  const docClues = (refs: TraceRef[]) => refs.filter((r): r is { doc: string; line: string } => 'doc' in r).map(docs.clueOf);
  const cast = buildCharacters(rng.fork('personnages'), company, books.world.employees, injections, (i) => docClues(injections[i]!.contradictedBy ?? []));
  const traces = (injection: Injection, index: number) =>
    injection.traces.map((ref) => ('topic' in ref ? cast.topicClue(index, !!ref.confession) : docs.clueOf(ref)));

  // ---------- Seuil, opinion, budget ----------
  // Seuil de signification : 0,5 à 1 % du chiffre d'affaires (repère usuel, À VÉRIFIER), loin des montants en jeu.
  const flavor = rng.fork('flavor');
  const biggest = Math.max(...injections.map((i) => Math.max(...i.accounts.map((a) => a.amount))));
  let materiality: Cents = roundTo(Math.round((revenue * flavor.int(5, 10)) / 1000), euros(500));
  if (Math.abs(biggest - materiality) < materiality * 0.2) materiality = roundTo(Math.round(biggest * (biggest > materiality ? 0.7 : 1.4)), euros(100));
  const clientCorrects = spec.difficulty < 3 || !flavor.chance(0.35);
  const material = biggest >= materiality;
  const opinion = !clientCorrects && material ? 'avec-reserve' : 'sans-reserve';

  const optimalHours = injections.reduce((sum, injection, i) => sum + revealingHours(docs.procedures, traces(injection, i).filter((t) => !t.startsWith('topic:'))), 0);
  // Plancher de 2,5 h : il faut aussi le temps de lire le dossier et de recouper avant de conclure.
  const budgetHours = Math.ceil(Math.max(optimalHours, 2.5) * budgetFactor(spec.difficulty) * 2) / 2;

  // ---------- Briefing et cabinet ----------
  const texts = injections.map((i) => ANOMALY_TEXTS[i.type]);
  const managerName = `${company.manager.firstName} ${company.manager.lastName}`;
  const accountantName = `${company.accountant.firstName} ${company.accountant.lastName}`;
  const promotion = PROMOTIONS[spec.number];
  const ines = INES_LINES[spec.number];
  const betHours = Math.min(budgetHours, Math.ceil(optimalHours + 1 + flavor.int(0, 2) / 2));
  const maximeBet = spec.number >= 3 ? { hours: betHours, line: flavor.pick(MAXIME_BETS).replace('{heures}', hoursLabel(betHours)) } : undefined;
  const body = [
    ...(promotion ? [promotion] : []),
    `Nouveau dossier : ${company.name}, à ${company.city}. ${sector.label}, ${company.staff} salarié(s).`,
    flavor.pick([
      `La banque veut des comptes ${company.fiscalYear} contrôlés avant de renouveler sa ligne de crédit.`,
      `${managerName} veut des comptes contrôlés pour rassurer un futur associé.`,
      'Mission de contrôle volontaire : la gérance veut un avis indépendant sur ses comptes.',
    ]),
    `Comptable : ${accountantName}. Seuil de signification : ${formatAmount(materiality).replace(/,00$/, '')} €. Budget : ${hoursLabel(budgetHours)}.`,
    clientCorrects ? 'La gérance s’est engagée à corriger tout ce qu’on trouvera.' : `Attention : ${managerName} refuse d’avance de modifier des comptes déjà arrêtés.`,
    spec.difficulty <= 2 ? `Commence par ${texts[0]!.focus}.` : flavor.pick(['À toi de voir où creuser.', 'Épingle tes preuves.', 'Pas d’accusation sans preuve.']),
  ].slice(0, 6);

  const level: Level = {
    id: spec.id ?? `level-${String(spec.number).padStart(3, '0')}`,
    number: spec.number,
    title: levelTitle(spec),
    format: spec.format ?? 'court',
    difficulty: spec.difficulty,
    client: { name: company.name, sector: sector.label, city: company.city, legalForm: company.legalForm },
    materiality: toEuros(materiality),
    budgetHours,
    optimalHours,
    briefing: { from: 'Hélène Vasseur, associée', subject: `Dossier ${company.name}`, body },
    documents: docs.documents,
    initialDocuments: docs.initialDocuments,
    procedures: docs.procedures,
    characters: cast.characters,
    anomalies: injections.map((injection, i) => ({
      id: `${injection.type}-${i}`,
      title: texts[i]!.title(injection.params),
      cycle: injection.cycle,
      accounts: injection.accounts.map((a) => ({ account: a.account, amount: toEuros(a.amount) })),
      assertion: injection.assertion,
      qualification: injection.qualification,
      correction: injection.correction.map((l) => ({ account: l.account, debit: toEuros(l.debit), credit: toEuros(l.credit) })),
      traces: traces(injection, i),
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
    grade: gradeFor(spec.number),
    firm: { ...(maximeBet ? { maximeBet } : {}), ...(ines ? { ines } : {}) },
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

export { unlockLevelForDifficulty };
