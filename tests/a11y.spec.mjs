// Accessibilité : audit axe-core (règles WCAG 2.1 A et AA) sur chaque page,
// en mode sombre et en mode clair.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PAGES, motDePasse } from './aides.mjs';

for (const theme of ['dark', 'light']) {
  for (const p of PAGES) {
    test('axe ' + theme + ' ' + p, async ({ browser }) => {
      const contexte = await browser.newContext({ colorScheme: theme, viewport: { width: 1440, height: 900 } });
      const page = await contexte.newPage();
      await page.goto('http://localhost:4173/fabrique/' + p + '?now=09:20');
      if (p.includes('7-correction')) {
        const mdp = motDePasse();
        if (mdp) {
          await page.fill('#staticrypt-password', mdp);
          await page.getByRole('button', { name: 'Ouvrir la correction' }).click();
        }
      }
      await page.waitForFunction(() => document.documentElement.classList.contains('js-pret') || !!document.getElementById('staticrypt-form'));
      await page.waitForTimeout(300);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const resume = r.violations.map((v) => v.id + ' (' + v.nodes.length + ') ' + v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | '));
      expect(resume).toEqual([]);
      await contexte.close();
    });
  }
}
