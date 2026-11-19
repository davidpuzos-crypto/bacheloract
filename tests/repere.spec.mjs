// Repère horaire « vous devriez en être là », d’après les repères de
// data/schedule.json.
import { test, expect } from '@playwright/test';
import { ouvrir, saisir, LONG } from './aides.mjs';

test('repère : question visée, retard puis « dans les temps », lien vers la question', async ({ page }) => {
  // Chercher commence à 9 h 08. À 9 h 16, le repère est B1.
  await ouvrir(page, 'seance-09/3-chercher.html', '09:16');
  const barre = page.locator('.repere-barre');
  await expect(barre).toBeVisible();
  await expect(barre).toContainText('vous devriez en être à la question B1');
  await expect(barre).toContainText('Vous avez du retard');
  await expect(barre).toHaveAttribute('data-etat', 'retard');
  await expect(page.locator('.q[data-q="b1"]')).toHaveClass(/q-repere/);
  await expect(page.locator('.drapeau-repere')).toHaveCount(1);

  for (const id of ['a1', 'a2']) { await saisir(page, id, LONG); }
  await page.check('#qcm-A3-b');
  await page.check('#b0-ses');
  await expect(barre).toContainText('Vous êtes dans les temps.');
  await expect(barre).toHaveAttribute('data-etat', 'ok');

  await page.locator('.repere-lien').click();
  await expect(page.locator('#f-b1')).toBeFocused();
});

test('repère : rien sur une page sans repère ou hors de la phase en cours', async ({ page }) => {
  await ouvrir(page, 'seance-09/2-methode.html', '09:16');
  await expect(page.locator('.repere-barre')).toBeHidden();
  await ouvrir(page, 'seance-09/4-citer-lecture.html', '09:26');
  await expect(page.locator('.repere-barre')).toBeHidden();
});
