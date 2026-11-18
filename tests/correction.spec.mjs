// 5. Correction chiffrée : rien en clair dans le HTML servi, erreur avec un
// mauvais mot de passe, contenu et scripts partagés opérationnels avec le bon.
import { test, expect } from '@playwright/test';
import { ouvrir, motDePasse, saisir, etat } from './aides.mjs';

test('le HTML servi ne contient pas la correction en clair', async ({ request }) => {
  const rep = await request.get('seance-09/7-correction.html');
  expect(rep.ok()).toBeTruthy();
  const html = await rep.text();
  for (const temoin of ['Pièges fréquents', 'Ce qu’on attend', 'Réponse proposée', 'construction sociale de la différence', 'qcm-K1']) {
    expect(html).not.toContain(temoin);
  }
  expect(html).toContain('staticryptConfig');
  expect(html).toContain('Entrez le mot de passe donné en séance.');
});

test('mauvais mot de passe : message d’erreur', async ({ page }) => {
  await page.goto('seance-09/7-correction.html');
  await expect(page.locator('#staticrypt-password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ouvrir la correction' })).toBeVisible();
  await page.fill('#staticrypt-password', 'ce-n-est-pas-le-bon');
  await page.getByRole('button', { name: 'Ouvrir la correction' }).click();
  await expect(page.locator('#erreur-mdp')).toHaveText('Mot de passe incorrect.');
});

test('bon mot de passe : contenu visible et scripts partagés actifs', async ({ page }) => {
  const mdp = motDePasse();
  test.skip(!mdp, 'Mot de passe inconnu (CORRECTION_PASSWORD ou .env.local).');
  await ouvrir(page, 'seance-09/3-chercher.html', '09:20');
  await saisir(page, 'a1', 'Ma citation de test pour A1, assez longue.');
  await page.goto('seance-09/7-correction.html?now=11:02');
  await page.fill('#staticrypt-password', mdp);
  await page.getByRole('button', { name: 'Ouvrir la correction' }).click();
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(page.locator('h1')).toHaveText('La correction');
  await expect(page.locator('.entete .phase-nom')).toHaveText('Correction');
  await expect(page.locator('details.corr')).toHaveCount(15);
  await page.click('#c-a1 > summary');
  await expect(page.locator('#c-a1 [data-votre-reponse]')).toContainText('Ma citation de test pour A1');
  await page.check('#qcm-K2-b');
  await expect(page.locator('[data-qcm="K2"] .fb')).toContainText('Bonne réponse.');
  await page.getByRole('button', { name: 'J’ai lu la correction' }).click();
  await page.waitForTimeout(450);
  const e = await etat(page);
  expect(e.qcm.K2.premier).toBe('b');
  expect(e.lu.correction).toBeTruthy();
  await expect(page.locator('.pastille-equipe .points')).toHaveText(/^25\s*pts$/);
  // Option « se souvenir » : pas de nouvelle demande au rechargement.
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(page.locator('h1')).toHaveText('La correction');
});
