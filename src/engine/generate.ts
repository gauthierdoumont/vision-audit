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
import { expectedOpinion, injectDecoy, injectGoingConcern, type DecoyType, type GoingConcern, type Limitation } from './scenarios';
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
  decoys?: DecoyType[];
  limitation?: Limitation;
  goingConcern?: GoingConcern;
  /** Le client corrige-t-il les anomalies ? Par défaut : tiré au hasard dès la difficulté 3. */
  clientCorrects?: boolean;
};

export type GeneratedCase = { level: Level; company: Company; truth: Books; books: Books; injections: Injection[]; continuityTraces: string[] };

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
  const { books: truth, company, revenue } = generateBooks(rng.fork('ledger'), generateCompany(rng.fork('company'), spec.sector), spec.difficulty, {
    lateHire: spec.decoys?.includes('late-hire'),
  });
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
  const decoys = (spec.decoys ?? []).map((type, i) => injectDecoy(type, { ...context, rng: rng.fork(`fausse-piste-${i}`) }));
  const continuity = spec.goingConcern ? injectGoingConcern({ ...context, rng: rng.fork('continuite') }, spec.goingConcern) : undefined;
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
      ...(spec.decoys?.includes('revenue-growth') ? { analyticGrowth: { '700': rng.fork('croissance').int(18, 26) } } : {}),
      ...(spec.limitation === 'inventory' ? { unavailable: ['inventaire'] } : {}),
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
  // Montant de chaque anomalie pour l'opinion (une information manquante en annexe n'a pas de montant à corriger).
  const amounts = injections.filter((i) => !i.disclosureOnly).map((i) => Math.max(...i.accounts.map((a) => a.amount)));
  const biggest = Math.max(0, ...amounts);
  let materiality: Cents = roundTo(Math.round((revenue * flavor.int(5, 10)) / 1000), euros(500));
  const total = amounts.reduce((s, a) => s + a, 0);
  // On écarte le seuil des montants en jeu pour éviter les cas ambigus (anomalie ou total à ±20 % du seuil).
  for (const value of [biggest, total]) {
    if (value > 0 && Math.abs(value - materiality) < materiality * 0.2) materiality = roundTo(Math.round(value * (value > materiality ? 0.7 : 1.4)), euros(100));
  }
  const clientCorrects = spec.clientCorrects ?? (spec.difficulty < 3 || !flavor.chance(0.35));
  const disclosures = injections.filter((i) => i.disclosureOnly).length;
  const opinion = expectedOpinion({ amounts, disclosures, materiality, clientCorrects, limitation: spec.limitation, goingConcern: spec.goingConcern });

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
    ...(spec.limitation === 'inventory' ? ['Nous avons été nommés en février : impossible d’assister à l’inventaire du 31/12, ni de le refaire.'] : []),
    ...(spec.limitation === 'representation-letter' ? [`Dernière nouvelle : ${managerName} refuse de signer la lettre d’affirmation.`] : []),
    ...(spec.decoys && spec.decoys.length > 0 && spec.difficulty <= 6 ? ['Méfie-toi des apparences : tout ce qui est inhabituel n’est pas une anomalie.'] : []),
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
      ...(injection.disclosureOnly ? { disclosureOnly: true } : {}),
    })),
    expectedOpinion: opinion,
    ...(decoys.length > 0
      ? {
          decoys: decoys.map((decoy) => ({
            title: decoy.title,
            explanation: decoy.explanation,
            suspicious: docClues(decoy.suspicious),
            justification: docClues(decoy.justification),
          })),
        }
      : {}),
    hint: texts.flatMap((t) => t.hint),
    grade: gradeFor(spec.number),
    firm: { ...(maximeBet ? { maximeBet } : {}), ...(ines ? { ines } : {}) },
  };

  return { level, company, truth, books, injections, continuityTraces: continuity ? docClues(continuity.traces) : [] };
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
