// Montants en centimes (entiers) pour éviter les erreurs d'arrondi, et dates de l'exercice.

export type Cents = number;

export function euros(amount: number): Cents {
  return Math.round(amount * 100);
}

export function toEuros(cents: Cents): number {
  return cents / 100;
}

/** TVA d'une base au taux donné en pourcentage (6, 12, 21…), arrondie au centime. */
export function vatOf(base: Cents, ratePercent: number): Cents {
  return Math.round((base * ratePercent) / 100);
}

/** Montant à la belge : « 3 392,00 » (espaces insécables), « −120,50 » si négatif. */
export function formatAmount(cents: Cents): string {
  const sign = cents < 0 ? '−' : '';
  const abs = Math.abs(Math.round(cents));
  const units = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${units},${(abs % 100).toString().padStart(2, '0')}`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace('.', ',')} %`;
}

/** Arrondit à la « belle » valeur la plus proche (ex. : 3 870,12 → 3 900 pour step = 100 €). */
export function roundTo(cents: Cents, step: Cents): Cents {
  return Math.round(cents / step) * step;
}

// ---------- Dates (format ISO AAAA-MM-JJ, sans fuseau horaire) ----------

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

export function quarterOf(date: string): number {
  return Math.ceil(monthOf(date) / 3);
}

/** « 14/11 » ou « 14/11/2025 ». */
export function formatDate(date: string, withYear = false): string {
  const [y, m, d] = date.split('-');
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}
