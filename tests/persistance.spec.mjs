// 7. Persistance : rechargement de chaque page, effacement en deux temps,
// stockage indisponible.
import { test, expect } from '@playwright/test';
import { ouvrir, saisir, etat, LONG } from './aides.mjs';

const CHAMPS = [
  ['seance-09/1-cadre.html', 'equipe'],
  ['seance-09/3-chercher.html', 'b1'],
  ['seance-09/5-citer-pratique.html', 'c2'],
  ['seance-09/6-lire.html', 'l3'],
  ['seance-09/6-lire.html', 'l5'],
  ['seance-09/9-video.html', 'n1'],
  ['seance-09/9-video.html', 'bp']
];

for (const [p, id] of CHAMPS) {
  test('rechargement de ' + p + ' (' + id + ')', async ({ page }) => {
    const valeur = id === 'equipe' ? 'Les Curieuses du mardi' : LONG;
    await ouvrir(page, p, '09:20');
    await saisir(page, id, valeur);
    await page.reload();
    await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
    await expect(page.locator('[data-id="' + id + '"]')).toHaveValue(valeur);
  });
}

test('écriture immédiate à la fermeture de l’onglet', async ({ page }) => {
  await ouvrir(page, 'seance-09/3-chercher.html', '09:20');
  await page.fill('[data-id="a2"]', LONG);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const e = await etat(page);
  expect(e.champs.a2).toBe(LONG);
});

test('effacement en deux temps, réglages conservés', async ({ page }) => {
  await ouvrir(page, 'seance-09/3-chercher.html', '09:20');
  await saisir(page, 'a1', LONG);
  await page.click('.bouton-menu');
  await page.click('[data-theme-bouton]');
  const bouton = page.locator('[data-effacer]');
  await bouton.click();
  await expect(bouton).toHaveText('Confirmer l’effacement');
  let e = await etat(page);
  expect(e.champs.a1).toBe(LONG);
  await bouton.click();
  await expect(page.locator('[data-statut-reglages]')).toHaveText('Vos réponses ont été effacées de ce navigateur.');
  e = await etat(page);
  expect(e.champs.a1).toBeUndefined();
  expect(e.options.theme).toBe('dark');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-id="a1"]')).toHaveValue('');
});

test('stockage indisponible : message clair', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new Error('quota'); };
  });
  await ouvrir(page, 'seance-09/3-chercher.html', '09:20');
  await expect(page.locator('.avertissement-stockage')).toHaveText('Ce navigateur n’enregistre pas vos réponses, copiez régulièrement le récapitulatif.');
});
