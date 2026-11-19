// 2. QCM : retour immédiat, réponse modifiable, première réponse enregistrée, points.
import { test, expect } from '@playwright/test';
import { ouvrir, etat } from './aides.mjs';

test('retour immédiat et points +5 puis +2', async ({ page }) => {
  await ouvrir(page, 'seance-09/2-methode.html', '09:05');
  const m1 = page.locator('[data-qcm="M1"]');
  await expect(m1.locator('.fb')).toBeHidden();
  await page.check('#qcm-M1-b');
  await expect(m1.locator('.fb')).toBeVisible();
  await expect(m1.locator('.fb')).toContainText('Bonne réponse.');
  await expect(m1.locator('.fb')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('.pastille-equipe .points')).toHaveText(/^5\s*pts$/);

  const m2 = page.locator('[data-qcm="M2"]');
  await page.check('#qcm-M2-a');
  await expect(m2.locator('.fb')).toContainText('Pas tout à fait.');
  await expect(m2.locator('.fb')).toContainText('Y la cite en 2022');
  await page.check('#qcm-M2-b');
  await expect(m2.locator('.fb')).toContainText('Bonne réponse.');
  await expect(page.locator('.pastille-equipe .points')).toHaveText(/^7\s*pts$/);

  // Changer encore de réponse ne retire ni n’ajoute de points.
  await page.check('#qcm-M2-c');
  await expect(m2.locator('.fb')).toContainText('Pas tout à fait.');
  await page.waitForTimeout(450);
  const e = await etat(page);
  expect(e.qcm.M1).toMatchObject({ premier: 'b', dernier: 'b', essais: 1, premierJuste: true });
  expect(e.qcm.M2).toMatchObject({ premier: 'a', dernier: 'c', essais: 3, premierJuste: false, juste: true });
  await expect(page.locator('.pastille-equipe .points')).toHaveText(/^7\s*pts$/);

  // Après rechargement, la dernière réponse et son retour sont réaffichés.
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(page.locator('#qcm-M2-c')).toBeChecked();
  await expect(m2.locator('.fb')).toContainText('Pas tout à fait.');
});

test('les retours de QCM sont annoncés et utilisables au clavier', async ({ page }) => {
  await ouvrir(page, 'seance-09/6-lire.html', '09:50');
  const q = page.locator('[data-qcm="F-Q3"]');
  await page.focus('#qcm-F-Q3-a');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#qcm-F-Q3-c')).toBeChecked();
  await expect(q.locator('.fb')).toContainText('Bonne réponse.');
  await expect(q.locator('.fb')).toHaveAttribute('role', 'status');
});
