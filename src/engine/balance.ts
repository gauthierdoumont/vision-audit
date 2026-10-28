// Grand livre et balance à partir des écritures.
import type { Cents } from './money';
import type { Entry, EntryLine, TrialBalance } from './types';

export function isEntryBalanced(lines: EntryLine[]): boolean {
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  return debit === credit && debit > 0;
}

export function trialBalance(entries: Entry[]): TrialBalance {
  const balance: TrialBalance = new Map();
  for (const entry of entries) {
    for (const l of entry.lines) {
      const current = balance.get(l.account) ?? { debit: 0, credit: 0 };
      balance.set(l.account, { debit: current.debit + l.debit, credit: current.credit + l.credit });
    }
  }
  return balance;
}

/** Solde débiteur (positif) ou créditeur (négatif) d'un compte ; un préfixe regroupe les sous-comptes. */
export function accountBalance(entries: Entry[], account: string, filter?: (entry: Entry) => boolean): Cents {
  return entries
    .filter((e) => !filter || filter(e))
    .flatMap((e) => e.lines)
    .filter((l) => l.account.startsWith(account))
    .reduce((s, l) => s + l.debit - l.credit, 0);
}

export function partyBalance(entries: Entry[], account: string, partyId: string): Cents {
  return accountBalance(entries, account, (e) => e.partyId === partyId);
}
