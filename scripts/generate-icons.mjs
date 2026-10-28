// Génère les icônes PNG de la PWA à partir de public/favicon.svg.
// Outil de développement uniquement (utilise le Chromium de Playwright). Créé par Gauthier Doumont.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// CommonJS : permet d'utiliser un Playwright installé globalement (NODE_PATH).
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const targets = [
  { file: 'pwa-192.png', size: 192, padding: 0 },
  { file: 'pwa-512.png', size: 512, padding: 0 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0 },
  // Zone de sécurité « maskable » : l'icône occupe ~80 % du carré.
  { file: 'pwa-maskable-512.png', size: 512, padding: 52 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, padding } of targets) {
  const inner = size - padding * 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;background:#0f1b2d;display:grid;place-items:center;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`,
  );
  await page.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname });
  console.log(`public/${file}`);
}
await browser.close();
