// Formulaire d'un constat : compte, assertion, montant, qualification, écriture de correction et indices.
import { useState } from 'react';
import { ASSERTION_LABELS, QUALIFICATION_LABELS } from '../../content/labels';
import { findAccount, PCMN } from '../../content/pcmn';
import type { Assertion, Level, Qualification } from '../../content/types';
import { describeClue } from '../../game/clues';
import { isBalanced } from '../../game/scoring';
import type { Finding } from '../../game/state';
import { formatEuro, parseAmount } from '../format';

type Line = { account: string; debit: string; credit: string };
const emptyLine = (): Line => ({ account: '', debit: '', credit: '' });
const toNumber = (value: string) => (value.trim() === '' ? 0 : parseAmount(value));

type Props = { level: Level; pins: string[]; onAdd: (finding: Finding) => void; onCancel: () => void };

export function FindingForm({ level, pins, onAdd, onCancel }: Props) {
  const [account, setAccount] = useState('');
  const [assertion, setAssertion] = useState<Assertion | ''>('');
  const [amount, setAmount] = useState('');
  const [qualification, setQualification] = useState<Qualification | ''>('');
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [clues, setClues] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const entry = lines.map((l) => ({ account: l.account.trim(), debit: toNumber(l.debit), credit: toNumber(l.credit) }));
  const totalDebit = entry.reduce((s, l) => s + (Number.isNaN(l.debit) ? 0 : l.debit), 0);
  const totalCredit = entry.reduce((s, l) => s + (Number.isNaN(l.credit) ? 0 : l.credit), 0);

  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  function submit() {
    const used = entry.filter((l) => l.account !== '' || l.debit !== 0 || l.credit !== 0);
    const problems: string[] = [];
    if (!findAccount(account)) problems.push('Choisis un compte PCMN existant pour le compte touché.');
    if (!assertion) problems.push('Choisis une assertion.');
    if (!(parseAmount(amount) > 0)) problems.push('Indique un montant positif.');
    if (!qualification) problems.push('Qualifie le constat : erreur ou fraude.');
    if (used.some((l) => !findAccount(l.account) || Number.isNaN(l.debit) || Number.isNaN(l.credit)))
      problems.push('Chaque ligne d’écriture doit avoir un compte PCMN et des montants valides.');
    else if (!isBalanced(used)) problems.push('L’écriture de correction doit être équilibrée (débit = crédit).');
    if (clues.length === 0) problems.push('Appuie le constat sur au moins un indice épinglé.');
    setErrors(problems);
    if (problems.length > 0 || !assertion || !qualification) return;

    onAdd({
      id: `constat-${Date.now()}`,
      account: account.trim(),
      assertion,
      amount: parseAmount(amount),
      qualification,
      correction: used,
      clues,
    });
  }

  return (
    <form
      className="card static finding-form"
      // Les erreurs disparaissent dès que le joueur corrige un champ.
      onChange={() => errors.length > 0 && setErrors([])}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <datalist id="pcmn-list">
        {PCMN.map((a) => (
          <option key={a.code} value={a.code}>{`${a.code} ${a.label}`}</option>
        ))}
      </datalist>

      <label>
        Compte touché (PCMN)
        <input list="pcmn-list" inputMode="numeric" value={account} onChange={(e) => setAccount(e.target.value)} />
        <small className="muted">{findAccount(account)?.label ?? 'Tape un numéro de compte'}</small>
      </label>

      <label>
        Assertion
        <select value={assertion} onChange={(e) => setAssertion(e.target.value as Assertion)}>
          <option value="">—</option>
          {Object.entries(ASSERTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label>
        Montant de l'anomalie (€)
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
      </label>

      <fieldset>
        <legend>Qualification</legend>
        {Object.entries(QUALIFICATION_LABELS).map(([value, label]) => (
          <label key={value} className="inline">
            <input
              type="radio"
              name="qualification"
              checked={qualification === value}
              onChange={() => setQualification(value as Qualification)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Écriture de correction</legend>
        <div className="entry-grid">
          <span>Compte</span>
          <span>Débit</span>
          <span>Crédit</span>
          {lines.map((line, i) => (
            <div key={i} className="entry-line">
              <input
                list="pcmn-list"
                inputMode="numeric"
                aria-label={`Compte ligne ${i + 1}`}
                value={line.account}
                onChange={(e) => updateLine(i, { account: e.target.value })}
              />
              <input
                inputMode="decimal"
                aria-label={`Débit ligne ${i + 1}`}
                value={line.debit}
                onChange={(e) => updateLine(i, { debit: e.target.value })}
              />
              <input
                inputMode="decimal"
                aria-label={`Crédit ligne ${i + 1}`}
                value={line.credit}
                onChange={(e) => updateLine(i, { credit: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="entry-actions">
          <button type="button" className="link-button" onClick={() => setLines([...lines, emptyLine()])}>
            + Ligne
          </button>
          {lines.length > 2 && (
            <button type="button" className="link-button" onClick={() => setLines(lines.slice(0, -1))}>
              − Ligne
            </button>
          )}
        </div>
        <p className={Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0 ? 'ok' : 'warning'}>
          Débit {formatEuro(totalDebit)} · Crédit {formatEuro(totalCredit)}
        </p>
      </fieldset>

      <fieldset>
        <legend>Indices à l'appui</legend>
        {pins.length === 0 && <p className="muted">Épingle d'abord des indices dans le Dossier ou les Entretiens.</p>}
        {pins.map((clueId) => {
          const clue = describeClue(level, clueId);
          if (!clue) return null;
          return (
            <label key={clueId} className="inline clue-option">
              <input
                type="checkbox"
                checked={clues.includes(clueId)}
                onChange={() => setClues(clues.includes(clueId) ? clues.filter((c) => c !== clueId) : [...clues, clueId])}
              />
              <span>
                <strong>{clue.source}</strong> — {clue.text}
              </span>
            </label>
          );
        })}
      </fieldset>

      {errors.length > 0 && (
        <ul className="errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>Annuler</button>
        <button type="submit" className="primary">Ajouter le constat</button>
      </div>
    </form>
  );
}
