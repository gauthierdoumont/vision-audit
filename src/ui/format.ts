const euro = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' });
const hours = new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 1 });

export function formatEuro(amount: number): string {
  return euro.format(amount);
}

export function formatHours(value: number): string {
  return `${hours.format(value)} h`;
}

/** Lit un montant saisi à la belge (« 3 392,00 » ou « 3392.5 »). Renvoie NaN si illisible. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[\s  €]/g, '').replace(/−/g, '-');
  if (cleaned === '') return NaN;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  return /^[-+]?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}
