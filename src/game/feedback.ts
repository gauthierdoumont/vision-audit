// Explication des erreurs au débrief : ta réponse, la réponse attendue et le pourquoi, critère par critère.
// Fonctions pures. Audit Detective — créé par Gauthier Doumont.
import { ASSERTIONS_GLOSSARY } from '../content/glossary';
import { ASSERTION_LABELS, OPINION_LABELS, QUALIFICATION_LABELS } from '../content/labels';
import { accountLabel } from '../content/pcmn';
import type { Anomaly, Assertion, EntryLine, Level, Opinion } from '../content/types';
import { accountMatches, amountMatches, isBalanced, relatesTo, type AnomalyResult } from './scoring';
import type { Finding, GameState } from './state';

export type CriterionFeedback = { label: string; ok: boolean; yours: string; expected: string; why: string[] };

const euro = (amount: number) => `${amount.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const account = (code: string) => `${code} (${accountLabel(code) || 'compte inconnu'})`;
const definition = (assertion: Assertion) => ASSERTIONS_GLOSSARY.find((g) => g.term === ASSERTION_LABELS[assertion])?.definition ?? '';
const line = (l: EntryLine) => `${l.account} ${l.debit ? `D ${euro(l.debit)}` : `C ${euro(l.credit)}`}`;

/** Comment trancher entre l'assertion choisie et l'assertion attendue. */
const ASSERTION_TIPS: Record<Assertion, string> = {
  existence: 'Question à se poser : ce qui est comptabilisé existe-t-il vraiment ? Ici, quelque chose est en trop (opération fictive, doublon, dépense étrangère à la société).',
  exhaustivite: 'Question à se poser : manque-t-il quelque chose ? Ici, une dette, une charge ou une provision a été oubliée. C’est l’inverse de l’existence.',
  evaluation: 'Question à se poser : l’opération existe, mais son montant ou sa valeur est-il juste ? Taux, dépréciation, amortissement : c’est de l’évaluation.',
  separation: 'Question à se poser : l’opération est-elle rattachée au bon exercice ? Une date de livraison ou de prestation de l’autre côté du 31/12 relève de la séparation des exercices.',
  droits: 'Question à se poser : la société détient-elle vraiment cet actif, doit-elle vraiment cette dette ?',
  presentation: 'Question à se poser : le montant est-il au bon endroit (classement, annexe) ? Le total peut être juste, mais mal présenté.',
};

const QUALIFICATION_TIPS = {
  fraude: 'Il y a une intention : quelqu’un en tire un avantage ou cache quelque chose (argent détourné, mensonge en entretien, montage). C’est une fraude (ISA 240).',
  erreur: 'Rien ne montre une intention de tromper : oubli, faute d’encodage, méconnaissance d’une règle. C’est une erreur. Parler de fraude sans preuve d’intention est une accusation grave.',
} as const;

/** Pourquoi le montant saisi diffère du montant attendu (TVA, autre compte, double…). */
function amountWhy(amount: number, expected: number, anomaly: Anomaly): string[] {
  const why: string[] = [];
  const other = anomaly.accounts.find((a) => a.amount !== expected && amountMatches(amount, a.amount));
  if (other) why.push(`${euro(amount)}, c’est le montant attendu sur le compte ${other.account}. Le montant dépend du compte choisi : garde les deux cohérents.`);
  for (const rate of [21, 12, 6]) {
    const factor = 1 + rate / 100;
    if (amountMatches(amount, expected * factor)) why.push(`Tu as pris un montant TVA comprise (${rate} %). Ce compte s’impute hors TVA : retire la TVA.`);
    else if (amountMatches(amount, expected / factor)) why.push(`Tu as retiré la TVA (${rate} %), mais ce compte porte le montant TVA comprise.`);
  }
  if (why.length > 0) return why;
  if (amountMatches(amount, expected * 2)) return ['Tu as compté le double du montant en jeu.'];
  if (amountMatches(amount, expected / 2)) return ['Tu n’as retenu que la moitié du montant en jeu. Une autre pièce était concernée ?'];
  if (amountMatches(-amount, expected)) return ['Le montant d’une anomalie se saisit toujours en positif.'];
  return [`Écart de ${euro(Math.abs(amount - expected))}. Refais le calcul à partir des traces listées ci-dessous.`];
}

/** Ligne par ligne : ce qui manque, ce qui est en trop, ce qui est dans le mauvais sens. */
export function correctionWhy(actual: EntryLine[], expected: EntryLine[], disclosureOnly = false): string[] {
  const lines = actual.filter((l) => l.debit !== 0 || l.credit !== 0);
  if (disclosureOnly) return lines.length === 0 ? [] : ['Aucune écriture ici : les chiffres sont justes, c’est l’annexe des comptes annuels qu’il faut compléter.'];
  if (lines.length === 0) return ['Tu n’as proposé aucune écriture, alors que les comptes doivent être corrigés.'];
  const why: string[] = [];
  if (!isBalanced(lines)) why.push('Ton écriture n’est pas équilibrée : total des débits ≠ total des crédits.');
  const inverted = expected.every((exp) => lines.some((l) => accountMatches(l.account, exp.account) && amountMatches(l.debit, exp.credit) && amountMatches(l.credit, exp.debit)));
  if (inverted && lines.length === expected.length) {
    return [...why, 'Toute l’écriture est inversée : tu as refait l’erreur au lieu de l’annuler. Une correction contrepasse ce qui est faux.'];
  }
  const remaining = [...lines];
  for (const exp of expected) {
    const index = remaining.findIndex((l) => accountMatches(l.account, exp.account));
    if (index === -1) {
      why.push(`Il manque ${line(exp)}.`);
      continue;
    }
    const mine = remaining.splice(index, 1)[0]!;
    const sameSide = (exp.debit > 0) === (mine.debit > 0);
    if (!sameSide) why.push(`Compte ${exp.account} : il faut le ${exp.debit ? 'débiter' : 'créditer'}, pas le ${exp.debit ? 'créditer' : 'débiter'}.`);
    else if (!amountMatches(mine.debit + mine.credit, exp.debit + exp.credit)) why.push(`Compte ${exp.account} : ${euro(mine.debit + mine.credit)} au lieu de ${euro(exp.debit + exp.credit)}.`);
  }
  for (const extra of remaining) why.push(`Le compte ${account(extra.account)} n’a rien à faire dans cette correction.`);
  return why;
}

/** Retour critère par critère sur un constat rattaché à une anomalie. */
export function criteriaFeedback(result: AnomalyResult): CriterionFeedback[] {
  const { anomaly, finding } = result;
  if (!finding) return [];
  const matched = anomaly.accounts.find((a) => accountMatches(finding.account, a.account));
  const reference = matched ?? anomaly.accounts[0]!;
  const traces = new Set(anomaly.traces);
  const usefulPins = finding.clues.filter((c) => traces.has(c));
  return [
    {
      label: 'Compte',
      ok: result.account,
      yours: account(finding.account),
      expected: anomaly.accounts.map((a) => account(a.account)).join(' ou '),
      why: result.account
        ? []
        : ['Le « compte touché » est un compte dont le solde est faux à cause de l’anomalie. Regarde quels comptes l’écriture de correction fait bouger.'],
    },
    {
      label: 'Assertion',
      ok: result.assertion,
      yours: ASSERTION_LABELS[finding.assertion],
      expected: ASSERTION_LABELS[anomaly.assertion],
      why: result.assertion ? [] : [`${ASSERTION_LABELS[anomaly.assertion]} : ${definition(anomaly.assertion)}`, ASSERTION_TIPS[anomaly.assertion]],
    },
    {
      label: 'Montant',
      ok: result.amount,
      yours: euro(finding.amount),
      expected: matched ? `${euro(matched.amount)} sur le ${matched.account}` : anomaly.accounts.map((a) => `${euro(a.amount)} sur le ${a.account}`).join(' ou '),
      why: result.amount ? [] : amountWhy(finding.amount, reference.amount, anomaly),
    },
    {
      label: 'Qualification',
      ok: result.qualification,
      yours: QUALIFICATION_LABELS[finding.qualification],
      expected: QUALIFICATION_LABELS[anomaly.qualification],
      why: result.qualification ? [] : [QUALIFICATION_TIPS[anomaly.qualification]],
    },
    {
      label: 'Écriture de correction',
      ok: result.correction,
      yours: finding.correction.length === 0 ? 'aucune écriture' : finding.correction.filter((l) => l.debit || l.credit).map(line).join(' · '),
      expected: anomaly.disclosureOnly ? 'aucune écriture (mention dans l’annexe)' : anomaly.correction.map(line).join(' · '),
      why: result.correction ? [] : correctionWhy(finding.correction, anomaly.correction, anomaly.disclosureOnly),
    },
    {
      label: 'Indices',
      ok: result.justified,
      yours: finding.clues.length === 0 ? 'aucun indice joint' : `${finding.clues.length} indice(s), dont ${usefulPins.length} pertinent(s)`,
      expected: 'au moins une des traces listées plus bas',
      why: result.justified
        ? []
        : [
            finding.clues.length === 0
              ? 'Un constat sans preuve ne tient pas devant le client. Épingle la ligne qui prouve l’anomalie, puis joins-la au constat.'
              : 'Tes indices ne prouvent pas cette anomalie. Joins la pièce qui la montre directement (voir les traces plus bas).',
          ],
    },
  ];
}

export type Lead = { procedure: string; hours: number; done: boolean };

/** Procédures (et entretiens) qui révélaient l'anomalie, de la moins chère à la plus chère. */
export function revealingLeads(level: Level, state: GameState, anomaly: Anomaly): { initial: string[]; procedures: Lead[]; interviews: string[] } {
  const docs = new Set(anomaly.traces.filter((t) => !t.startsWith('topic:')).map((t) => t.split('#')[0]!));
  const initial = level.initialDocuments.filter((id) => docs.has(id)).map((id) => level.documents.find((d) => d.id === id)?.title ?? id);
  const procedures = level.procedures
    .filter((p) => [...p.reveals, ...(p.sampling?.pool ?? [])].some((id) => docs.has(id)))
    .map((p) => ({
      procedure: p.sampling ? `${p.name} (la bonne pièce)` : p.name,
      hours: p.hours,
      done: p.sampling ? state.sampledDocuments.some((id) => docs.has(id)) : state.doneProcedures.includes(p.id),
    }))
    .sort((a, b) => a.hours - b.hours);
  const interviews = anomaly.traces
    .filter((t) => t.startsWith('topic:') && !t.endsWith('.aveu'))
    .map((t) => {
      const [characterId, topicId] = t.slice('topic:'.length).split('.');
      const character = level.characters.find((c) => c.id === characterId);
      const topic = character?.topics.find((x) => x.id === topicId);
      return character && topic ? `${character.name} : « ${topic.question} »` : '';
    })
    .filter(Boolean);
  return { initial, procedures, interviews };
}

/** Pourquoi un constat ne correspond à aucune anomalie (fausse piste, doublon, simple erreur de cible). */
export function falsePositiveWhy(level: Level, finding: Finding): string[] {
  const decoy = (level.decoys ?? []).find((d) => finding.clues.some((c) => d.suspicious.includes(c) || d.justification.includes(c)));
  if (decoy) return [`C’était une fausse piste : ${decoy.title}.`, ...decoy.explanation];
  if (level.anomalies.some((a) => relatesTo(finding, a))) return ['Ce constat fait double emploi : l’anomalie qu’il vise est déjà couverte par un autre de tes constats. Un seul constat par anomalie.'];
  return [
    `Aucune anomalie ne touche le compte ${account(finding.account)}.`,
    'Avant d’accuser, cherche une deuxième preuve indépendante : une pièce externe (banque, tiers, registre) ou une contradiction en entretien.',
  ];
}

const OPINION_TIPS: Record<Opinion, string> = {
  'sans-reserve': 'les comptes (après les corrections acceptées) ne contiennent plus d’anomalie significative et rien n’a limité tes travaux.',
  'avec-reserve': 'une anomalie significative non corrigée, ou une limitation, mais localisée. Le reste des comptes est fiable.',
  negative: 'les anomalies non corrigées sont significatives et diffuses. Les comptes ne donnent pas une image fidèle.',
  abstention: 'impossible de réunir des éléments probants suffisants (ex. : lettre d’affirmation refusée, ISA 580), avec un effet diffus.',
};

/** Retour sur l'opinion et le paragraphe de continuité. */
export function opinionFeedback(level: Level, state: GameState): CriterionFeedback[] {
  const expected = level.expectedOpinion;
  const opinionOk = state.opinion === expected.opinion;
  const continuityOk = state.continuity === expected.continuity;
  const yesNo = (value: boolean | null) => (value === null ? 'non choisi' : value ? 'oui' : 'non');
  return [
    {
      label: 'Opinion',
      ok: opinionOk,
      yours: state.opinion ? OPINION_LABELS[state.opinion] : 'non choisie',
      expected: OPINION_LABELS[expected.opinion],
      why: opinionOk
        ? []
        : [
            `${OPINION_LABELS[expected.opinion]} : ${OPINION_TIPS[expected.opinion]}`,
            ...(state.opinion ? [`Ton choix (${OPINION_LABELS[state.opinion].toLowerCase()}) supposait : ${OPINION_TIPS[state.opinion]}`] : []),
          ],
    },
    {
      label: 'Paragraphe sur la continuité',
      ok: continuityOk,
      yours: yesNo(state.continuity),
      expected: yesNo(expected.continuity),
      why: continuityOk
        ? []
        : [
            expected.continuity
              ? 'Une incertitude significative pèse sur la continuité (ISA 570) : pertes, dettes échues, banque qui hésite. Le rapport doit attirer l’attention dessus.'
              : 'Aucune incertitude significative sur la continuité dans ce dossier : pas de paragraphe d’observation (ISA 706).',
          ],
    },
  ];
}
