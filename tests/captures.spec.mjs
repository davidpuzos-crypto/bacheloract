// 8. Captures d’écran de chaque page, en 390×844 et 1440×900, sombre et clair.
// Lancer : npm run captures   (les images vont dans tests/captures/, ignoré par Git)
import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { PAGES, RACINE } from './aides.mjs';

const DOSSIER = path.join(RACINE, 'tests', 'captures');
const TAILLES = [[390, 844], [1440, 900]];

test.skip(!process.env.CAPTURES, 'Captures lancées seulement avec npm run captures.');

for (const theme of ['dark', 'light']) {
  for (const [l, h] of TAILLES) {
    test('captures ' + theme + ' ' + l + 'x' + h, async ({ browser }) => {
      fs.mkdirSync(DOSSIER, { recursive: true });
      const contexte = await browser.newContext({ colorScheme: theme, viewport: { width: l, height: h } });
      const page = await contexte.newPage();
      for (const p of PAGES) {
        await page.goto('http://localhost:4173/fabrique/' + p + '?now=09:20');
        await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
        await page.waitForTimeout(400);
        const nom = p.replace(/\//g, '_').replace('.html', '') + '_' + l + 'x' + h + '_' + theme + '.png';
        await page.screenshot({ path: path.join(DOSSIER, nom), fullPage: false });
      }
      await contexte.close();
    });
  }
}
