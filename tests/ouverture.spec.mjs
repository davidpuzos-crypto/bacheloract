// Page « Pour aller plus loin » (approches intersectionnelles) et colonne
// « Sur cette page ».
import { test, expect } from '@playwright/test';
import { ouvrir, saisir, etat, LONG, PROGRAMME, heure } from './aides.mjs';

const OUVERTURE = PROGRAMME.phases.find((p) => p.id === 'ouverture');

test('la page d’ouverture est la dernière phase, dix minutes avant la fin', async () => {
  const fin = PROGRAMME.phases[PROGRAMME.phases.length - 1];
  expect(OUVERTURE.duree).toBe(10);
  expect(OUVERTURE.debut + OUVERTURE.duree).toBe(fin.debut);
  expect(fin.debut).toBe(180);
});

test('lecture d’ouverture : contenu, questions corrigées, lecture terminée', async ({ page }) => {
  await ouvrir(page, 'seance-09/aller-plus-loin.html', heure(OUVERTURE.debut + 2));
  await expect(page.locator('h1')).toHaveText('Les approches intersectionnelles');
  await expect(page.locator('.entete .phase-nom')).toHaveText('Pour aller plus loin');
  // Le tableau reprend quatre chiffres de la figure 2 de l’Insee.
  const tableau = page.locator('.croisement table');
  await expect(tableau).toContainText('4 180 euros');
  await expect(tableau).toContainText('2 096 euros');
  await expect(page.locator('.schema-carrefour svg')).toHaveAttribute('role', 'img');
  await expect(page.locator('.definition')).toHaveCount(3);
  // La vidéo qui a servi de support n’est pas citée.
  await expect(page.locator('main')).not.toContainText(/capsule|vidéo de|youtube/i);

  await page.check('#qcm-O1-a');
  await expect(page.locator('[data-qcm="O1"] .fb')).toContainText('Pas tout à fait.');
  await page.check('#qcm-O1-b');
  await expect(page.locator('[data-qcm="O1"] .fb')).toContainText('Bonne réponse.');
  await page.check('#qcm-O2-b');
  await page.check('#qcm-O3-b');
  await expect(page.locator('[data-qcm="O3"] .fb')).toContainText('citation de seconde main');
  await page.getByRole('button', { name: 'J’ai tout lu' }).click();
  await page.waitForTimeout(450);
  const e = await etat(page);
  expect(e.lu.ouverture).toBeTruthy();
  expect(e.qcm.O2.premierJuste).toBe(true);
  // 2 + 5 + 5 points de QCM, 10 points de lecture
  await expect(page.locator('.pastille-equipe .points')).toHaveText(/^22\s*pts$/);

  await page.locator('details.references summary').click();
  await expect(page.locator('.liste-references li')).toHaveCount(7);
  await page.locator('.pager').getByRole('link', { name: 'Voir le bilan' }).click();
  await expect(page).toHaveURL(/10-fin\.html/);
});

test('la page d’ouverture est accessible depuis l’accueil et le menu', async ({ page }) => {
  await ouvrir(page, 'seance-09/index.html', '09:20');
  await expect(page.locator('.carte-ouverture')).toContainText('Les approches intersectionnelles');
  await page.click('.bouton-menu');
  await expect(page.locator('#tiroir-menu .menu-pages')).toContainText('Pour aller plus loin');
  await page.keyboard.press('Escape');
  await page.locator('.carte-ouverture').click();
  await expect(page).toHaveURL(/aller-plus-loin\.html/);
});

test('colonne « Sur cette page » : sommaire, avancement et repère, sur grand écran', async ({ page }) => {
  await ouvrir(page, 'seance-09/3-chercher.html', '09:16');
  const rail = page.getByRole('navigation', { name: 'Sur cette page' });
  await expect(rail).toBeVisible();
  await expect(rail).toContainText('Prévue de 9 h 08 à 9 h 22');
  await expect(rail.locator('.rail-q')).toHaveText([/A1/, /A2/, /A3/, /B0/, /B1/, /A4/]);
  await expect(rail.locator('[data-rail-bilan]')).toHaveText('0 réponse sur 5');
  await expect(rail.locator('.rail-q.repere')).toHaveText(/B1/);
  await saisir(page, 'a1', LONG);
  await page.check('#qcm-A3-b');
  await expect(rail.locator('.rail-q[data-bloc="bloc-a1"]')).toHaveAttribute('data-etat', 'fait');
  await expect(rail.locator('.rail-q[data-bloc="bloc-a3"]')).toHaveAttribute('data-etat', 'fait');
  await expect(rail.locator('[data-rail-bilan]')).toHaveText('2 réponses sur 5');
  // Le bonus ne compte pas dans le bilan.
  await expect(rail.locator('.rail-q.bonus')).toHaveText(/A4/);
  await rail.locator('.rail-q[data-bloc="bloc-b1"]').click();
  await expect(page.locator('.q[data-q="b1"]')).toBeInViewport();
});

test('colonne « Sur cette page » : absente sur téléphone et sur les pages larges', async ({ browser }) => {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pm = await mobile.newPage();
  await pm.goto('http://localhost:4173/fabrique/seance-09/3-chercher.html?now=09:16');
  await pm.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(pm.locator('.rail')).toBeHidden();
  expect(await pm.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await mobile.close();
  const bureau = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await bureau.newPage();
  for (const chemin of ['seance-09/6-lire.html', 'seance-09/5-citer-pratique.html']) {
    await p.goto('http://localhost:4173/fabrique/' + chemin + '?now=09:16');
    await p.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
    await expect(p.locator('.rail')).toHaveCount(0);
  }
  await bureau.close();
});

test('aucune page ne déborde en largeur', async ({ browser }) => {
  for (const [l, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: l, height: h } });
    const p = await ctx.newPage();
    for (const chemin of ['index.html', 'seance-09/index.html', 'seance-09/2-methode.html', 'seance-09/3-chercher.html', 'seance-09/4-citer-lecture.html',
      'seance-09/5-citer-pratique.html', 'seance-09/6-lire.html', 'seance-09/8-notes.html', 'seance-09/9-video.html', 'seance-09/aller-plus-loin.html', 'seance-09/10-fin.html']) {
      await p.goto('http://localhost:4173/fabrique/' + chemin + '?now=08:30');
      await p.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
      expect(await p.evaluate(() => document.documentElement.scrollWidth), chemin + ' à ' + l + ' px').toBeLessThanOrEqual(l);
    }
    await ctx.close();
  }
});
