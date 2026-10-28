// Contrôles de jouabilité d'un niveau (cahier des charges §8). Utilisé par les tests et `npm run validate-levels`.
// Audit Detective — créé par Gauthier Doumont.
import { findAccount } from '../content/pcmn';
import type { Level } from '../content/types';
import { describeClue } from '../game/clues';
import { isBalanced } from '../game/scoring';
import { accountBalance, isEntryBalanced, partyBalance, trialBalance } from './balance';
import { budgetFactor, type GeneratedCase } from './generate';
import { invoiceTotals } from './invoices';

export function validateLevel(level: Level): string[] {
  const errors: string[] = [];
  const fail = (message: string) => errors.push(`${level.id} : ${message}`);
  const reachable = new Map<string, number>(level.initialDocuments.map((id) => [id, 0]));
  for (const p of level.procedures) {
    for (const id of [...p.reveals, ...(p.sampling?.pool ?? [])]) reachable.set(id, Math.min(reachable.get(id) ?? Infinity, p.hours));
  }

  for (const doc of level.documents) if (!reachable.has(doc.id)) fail(`document inaccessible « ${doc.id} »`);
  for (const id of reachable.keys()) if (!level.documents.some((d) => d.id === id)) fail(`document inexistant « ${id} »`);

  if (level.anomalies.length === 0) fail('aucune anomalie');
  for (const anomaly of level.anomalies) {
    if (!isBalanced(anomaly.correction)) fail(`écriture de correction déséquilibrée (${anomaly.id})`);
    for (const l of [...anomaly.correction, ...anomaly.accounts]) if (!findAccount(l.account)) fail(`compte hors PCMN ${l.account}`);
    for (const a of anomaly.accounts) if (!(a.amount > 0)) fail(`montant nul ou négatif (${anomaly.id})`);
    if (anomaly.traces.length < 2) fail(`moins de 2 traces (${anomaly.id})`);
    for (const trace of anomaly.traces) if (!describeClue(level, trace)) fail(`trace introuvable ${trace}`);
    const viaProcedure = anomaly.traces.some((t) => {
      const cost = reachable.get(t.split('#')[0]!);
      return cost !== undefined && cost > 0 && cost <= level.budgetHours;
    });
    if (!viaProcedure) fail(`aucune procédure du budget ne révèle ${anomaly.id}`);
  }

  if (!(level.optimalHours > 0) || !Number.isFinite(level.optimalHours)) fail('chemin optimal invalide');
  if (level.budgetHours + 1e-9 < level.optimalHours * budgetFactor(level.difficulty)) {
    fail(`budget ${level.budgetHours} h trop serré pour un chemin optimal de ${level.optimalHours} h`);
  }
  if (level.briefing.body.length > 6) fail('briefing trop long (plus de 6 lignes)');
  for (const topic of level.characters.flatMap((c) => c.topics)) {
    if (topic.answer.length < 1 || topic.answer.length > 6) fail(`réplique hors format (${topic.id})`);
  }
  return errors;
}

/** Invariants comptables d'un cas généré (avant et après injection des anomalies). */
export function validateCase({ level, truth, books, injections }: GeneratedCase): string[] {
  const errors: string[] = [];
  const fail = (message: string) => errors.push(`${level.id} : ${message}`);

  for (const [name, b] of [['vérité', truth], ['livres', books]] as const) {
    for (const entry of b.entries) if (!isEntryBalanced(entry.lines)) fail(`écriture déséquilibrée ${entry.id} (${name})`);
    const totals = [...trialBalance(b.entries).values()].reduce((s, a) => ({ debit: s.debit + a.debit, credit: s.credit + a.credit }), { debit: 0, credit: 0 });
    if (totals.debit !== totals.credit) fail(`balance déséquilibrée (${name})`);
  }

  // TVA : avant injection, chaque achat porte exactement la TVA de sa facture.
  for (const entry of truth.entries.filter((e) => e.journal === 'ACH')) {
    const invoice = truth.invoices.find((i) => i.id === entry.invoiceId);
    if (!invoice) {
      fail(`achat sans facture ${entry.id}`);
      continue;
    }
    const { vat, total } = invoiceTotals(invoice);
    const net = (account: string) => entry.lines.filter((l) => l.account === account).reduce((s, l) => s + l.debit - l.credit, 0);
    const sign = invoice.kind === 'credit-note' ? -1 : 1;
    if (net('411') !== sign * (invoice.vatDeductible ? vat : 0) || net('440') !== -sign * total) fail(`TVA incohérente sur ${invoice.number}`);
  }

  // Banque : les anomalies de ce catalogue ne touchent jamais le 550, qui reste égal au relevé.
  if (accountBalance(truth.entries, '550') !== accountBalance(books.entries, '550')) fail('le 550 ne correspond plus au relevé bancaire');

  // Correction : livres + écritures de correction = vérité, compte par compte.
  const corrected = trialBalance([...books.entries, ...injections.map((i, n) => ({ id: `corr-${n}`, journal: 'OD' as const, date: '', label: '', lines: i.correction }))]);
  const reference = trialBalance(truth.entries);
  for (const account of new Set([...corrected.keys(), ...reference.keys()])) {
    const net = (tb: typeof reference) => (tb.get(account)?.debit ?? 0) - (tb.get(account)?.credit ?? 0);
    if (net(corrected) !== net(reference)) fail(`la correction ne rétablit pas le compte ${account}`);
  }
  for (const injection of injections) {
    if (!isEntryBalanced(injection.correction)) fail(`correction déséquilibrée (${injection.type})`);
    if (injection.accounts.some((a) => a.amount <= 0)) fail(`montant d’anomalie nul (${injection.type})`);
  }
  return errors;
}

/** Chaque tiers a un solde cohérent : la somme des soldes par tiers égale le solde du compte collectif. */
export function validatePartyBalances({ level, truth }: GeneratedCase): string[] {
  const errors: string[] = [];
  for (const account of ['440', '400']) {
    const parties = truth.parties.reduce((s, p) => s + partyBalance(truth.entries, account, p.id), 0);
    if (parties !== accountBalance(truth.entries, account)) errors.push(`${level.id} : soldes par tiers du ${account} incohérents`);
  }
  return errors;
}
