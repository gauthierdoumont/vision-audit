import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, FONT_SCALES, loadSettings, saveSettings, type Settings, type Theme } from '../settings';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Comme l’appareil' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };
  return (
    <section className="screen">
      <button type="button" className="link-button back" onClick={onBack}>
        ← Retour
      </button>
      <h1>Réglages</h1>
      <fieldset className="card static">
        <legend>Thème</legend>
        {THEMES.map((t) => (
          <label key={t.value} className="inline choice">
            <input type="radio" name="theme" checked={settings.theme === t.value} onChange={() => update({ theme: t.value })} />
            {t.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="card static">
        <legend>Taille du texte</legend>
        {FONT_SCALES.map((f) => (
          <label key={f.value} className="inline choice">
            <input type="radio" name="font" checked={settings.fontScale === f.value} onChange={() => update({ fontScale: f.value })} />
            {f.label}
          </label>
        ))}
      </fieldset>
    </section>
  );
}
