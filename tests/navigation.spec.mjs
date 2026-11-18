// 1. Navigation complète du hub au bilan, état conservé d’une page à l’autre.
import { test, expect } from '@playwright/test';
import { ouvrir, saisir, etat, LONG } from './aides.mjs';

test('parcours du hub au bilan avec un état partagé', async ({ page }) => {
  const erreurs = [];
  page.on('console', (m) => { if (m.type() === 'error') { erreurs.push(m.text()); } });
  page.on('pageerror', (e) => erreurs.push(e.message));

  await ouvrir(page, 'seance-09/index.html', '09:20');
  await page.locator('.tete-page').getByRole('link', { name: 'Lancer l’enquête' }).click();
  await expect(page).toHaveURL(/1-cadre\.html/);

  await saisir(page, 'equipe', 'Les Curieuses');
  await page.check('#ic-boussole');
  await saisir(page, 'nom1', 'Camille Martin');
  await saisir(page, 'nom2', 'Sacha Durand');
  await expect(page.locator('.pastille-equipe')).toContainText('Les Curieuses');

  await page.locator('.pager').getByRole('link', { name: 'Lancer l’enquête' }).click();
  await expect(page).toHaveURL(/2-methode\.html/);
  await expect(page.locator('.pastille-equipe')).toContainText('Les Curieuses');
  await page.check('#qcm-M1-b');

  await page.getByRole('link', { name: 'Passer à Chercher' }).click();
  await expect(page).toHaveURL(/3-chercher\.html/);
  await saisir(page, 'a1', LONG);

  const suite = [
    ['Passer à la lecture', /4-citer-lecture\.html/],
    ['Passer à la pratique', /5-citer-pratique\.html/],
    ['Voir la pause', /pause\.html/],
    ['Passer à la lecture de l’étude', /6-lire\.html/],
    ['Ouvrir la correction', /7-correction\.html/],
    ['Passer aux conseils de prise de notes', /8-notes\.html/],
    ['Ouvrir la feuille de notes', /9-video\.html/],
    ['Voir le bilan', /10-fin\.html/]
  ];
  for (const [lien, url] of suite) {
    if (/7-correction/.test(page.url())) {
      // Page chiffrée : on passe par l’adresse de la page suivante.
      await ouvrir(page, 'seance-09/8-notes.html');
      continue;
    }
    await page.locator('.pager').getByRole('link', { name: lien }).click();
    await expect(page).toHaveURL(url);
    await page.waitForFunction(() => document.documentElement.classList.contains('js-pret') || !!document.getElementById('staticrypt-form'));
  }
  await expect(page.locator('h1')).toHaveText('Le bilan de votre enquête');
  await expect(page.locator('.pastille-equipe')).toContainText('Les Curieuses');

  // Retour en arrière : la saisie est toujours là.
  await ouvrir(page, 'seance-09/3-chercher.html');
  await expect(page.locator('[data-id="a1"]')).toHaveValue(LONG);
  const e = await etat(page);
  expect(e.champs.equipe).toBe('Les Curieuses');
  expect(e.radios.icone).toBe('boussole');
  expect(e.qcm.M1.premier).toBe('b');
  expect(Object.keys(e.temps).length).toBeGreaterThan(0);
  expect(erreurs).toEqual([]);
});

test('chaque page affiche l’en-tête partagé et le menu des pages', async ({ page }) => {
  for (const p of ['seance-09/index.html', 'seance-09/2-methode.html', 'seance-09/6-lire.html', 'seance-09/9-video.html', 'seance-09/10-fin.html']) {
    await ouvrir(page, p, '09:20');
    await expect(page.locator('.entete .phase-nom')).toHaveText('Chercher');
    await page.click('.bouton-menu');
    await expect(page.locator('#tiroir-menu')).toBeVisible();
    await expect(page.locator('#tiroir-menu .menu-pages li')).toHaveCount(15);
    await expect(page.locator('#tiroir-menu .menu-pages li.en-cours')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('#tiroir-menu')).toBeHidden();
  }
});
