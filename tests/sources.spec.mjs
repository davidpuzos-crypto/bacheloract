// Sources proposées pour la seconde définition : l’article « Genre (gender) »
// du lexique Socius (Séverine Sofio) remplace le Dictionnaire de sociologie
// clinique, sur Chercher, sur Citer et dans la correction.
import { test, expect } from '@playwright/test';
import { ouvrir, etat } from './aides.mjs';

const SOCIUS = 'https://ressources-socius.info/index.php/lexique/21-lexique/65-genre-gender';

test('Chercher : la première porte ouvre l’article de Socius', async ({ page }) => {
  await ouvrir(page, 'seance-09/3-chercher.html', '09:10');
  const porte = page.locator('.portes .porte').first();
  await expect(porte.locator('h3')).toHaveText('Le lexique Socius');
  await expect(porte).toContainText('Séverine Sofio');
  await expect(porte.getByRole('link', { name: 'Ouvrir l’article « Genre (gender) »' })).toHaveAttribute('href', SOCIUS);
  await page.check('#b0-socius');
  await page.waitForTimeout(450);
  expect((await etat(page)).radios.b0).toBe('socius');
});

test('Citer : le lien rapide mène à Socius, plus au dictionnaire', async ({ page }) => {
  await ouvrir(page, 'seance-09/5-citer-pratique.html', '09:27');
  await expect(page.locator('.sources-rapides a[data-lien="sociusGenre"]')).toHaveAttribute('href', SOCIUS);
});

test('plus aucune mention du Dictionnaire de sociologie clinique', async ({ request }) => {
  for (const p of ['seance-09/1-cadre.html', 'seance-09/3-chercher.html', 'seance-09/5-citer-pratique.html', 'seance-09/5b-correction-definir.html', 'prof/deroule.html', 'data/config.json']) {
    const texte = await (await request.get(p)).text();
    expect(texte, p).not.toContain('sociologie clinique');
    expect(texte, p).not.toContain('dictionnaireSociologieClinique');
  }
});

test('correction de B1 : la définition de Sofio et le piège de la citation de seconde main', async ({ page }) => {
  await ouvrir(page, 'seance-09/5b-correction-definir.html', '09:36');
  const b1 = page.locator('#c-b1');
  await expect(b1.locator('.modele')).toContainText('Le concept de genre est fondé sur l’idée que le sexe n’est pas qu’affaire de biologie');
  await expect(b1.locator('.modele')).toContainText('(Sofio, s. d.');
  await expect(b1.locator('.conseils-methode')).toContainText('Bereni et ses coauteurs (2012, p. 10)');
  await expect(page.locator('#c-c1 .modele')).toContainText('Sofio (s. d., par. 1)');
});
