// Réglages d'affichage : thème et taille du texte, appliqués à la racine du document.
import { loadMeta, saveMeta } from '../storage/db';

export type Theme = 'system' | 'light' | 'dark';
export type Settings = { theme: Theme; fontScale: number };

export const DEFAULT_SETTINGS: Settings = { theme: 'system', fontScale: 1 };
export const FONT_SCALES = [
  { value: 1, label: 'Normale' },
  { value: 1.15, label: 'Grande' },
  { value: 1.3, label: 'Très grande' },
] as const;

export function applySettings({ theme, fontScale }: Settings): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  root.style.setProperty('--font-scale', String(fontScale));
}

export async function loadSettings(): Promise<Settings> {
  try {
    return { ...DEFAULT_SETTINGS, ...((await loadMeta<Settings>('settings')) ?? {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  applySettings(settings);
  await saveMeta('settings', settings).catch(() => undefined);
}
