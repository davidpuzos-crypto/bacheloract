// 3. Horloge : phase, compte à rebours, points d’arrêt et délai de grâce,
// à chaque heure de data/schedule.json, avec ?now= et ?depart=.
import { test, expect } from '@playwright/test';
import { ouvrir, heure, PROGRAMME } from './aides.mjs';

const phasesActives = PROGRAMME.phases.filter((p) => p.duree > 0);

for (const p of phasesActives) {
  test('phase « ' + p.label + ' » à ' + heure(p.debut, 30), async ({ page }) => {
    await ouvrir(page, 'seance-09/index.html', heure(p.debut, 30));
    await expect(page.locator('.entete .phase-nom')).toHaveText(p.label);
    const reste = await page.locator('.entete .phase-reste').textContent();
    const m = /Reste (\d\d):(\d\d)/.exec(reste);
    expect(m).not.toBeNull();
    const secondes = Number(m[1]) * 60 + Number(m[2]);
    const attendu = p.duree * 60 - 30;
    expect(Math.abs(secondes - attendu)).toBeLessThanOrEqual(3);
  });
}

test('avant 9 h 00 et après 12 h 00', async ({ page }) => {
  await ouvrir(page, 'seance-09/index.html', '08:45');
  await expect(page.locator('.entete .phase-nom')).toHaveText(/La séance commence à 9\s*h\s*00/);
  await ouvrir(page, 'seance-09/index.html', '12:10');
  await expect(page.locator('.entete .phase-nom')).toHaveText('La séance est terminée');
});

test('?depart= et ?decalage= décalent tout le planning', async ({ page }) => {
  await ouvrir(page, 'seance-09/index.html?depart=10:00', '10:05');
  await expect(page.locator('.entete .phase-nom')).toHaveText('Méthode');
  await ouvrir(page, 'seance-09/index.html?depart=defaut&decalage=10', '09:12');
  await expect(page.locator('.entete .phase-nom')).toHaveText('Cadre');
  await ouvrir(page, 'seance-09/index.html?decalage=0', '09:12');
  await expect(page.locator('.entete .phase-nom')).toHaveText('Chercher');
});

const arrets = PROGRAMME.phases.map((p, i) => ({ p, suivante: PROGRAMME.phases[i + 1] })).filter((x) => x.p.stop);

for (const { p, suivante } of arrets) {
  const fin = p.debut + p.duree;
  test('point d’arrêt de ' + heure(fin) + ' (fin de « ' + p.label + ' »)', async ({ page }) => {
    // Pendant le délai de grâce : bandeau, pas de plein écran.
    await ouvrir(page, 'seance-09/index.html', heure(fin, 10));
    await expect(page.locator('.stop-bandeau')).toBeVisible();
    await expect(page.locator('.stop-ecran')).toBeHidden();
    // Après 60 secondes : plein écran avec un seul bouton.
    await ouvrir(page, 'seance-09/index.html', heure(fin, 75));
    const ecran = page.locator('.stop-ecran');
    await expect(ecran).toBeVisible();
    const pause = PROGRAMME.phases.find((x) => x.id === 'pause');
    const repriseMin = pause.debut + pause.duree;
    const reprise = (9 + Math.floor(repriseMin / 60)) + ' h ' + String(repriseMin % 60).padStart(2, '0');
    const texte = p.stopTexte.replace('{reprise}', reprise);
    await expect(ecran.locator('.stop-texte')).toHaveText(texte);
    await expect(ecran.locator('a, button')).toHaveCount(1);
    await expect(ecran.locator('a')).toHaveText(p.stopBouton);
    await ecran.locator('a').click();
    const fichier = suivante.page.split('#')[0].replace('.', '\\.');
    await expect(page).toHaveURL(new RegExp(fichier));
    // Les pages précédentes restent accessibles ensuite, sans nouvel écran STOP.
    await ouvrir(page, 'seance-09/index.html');
    await expect(page.locator('.stop-ecran')).toBeHidden();
    await expect(page.locator('.stop-bandeau')).toBeHidden();
  });
}

const CHERCHER = PROGRAMME.phases.find((x) => x.id === 'chercher');
const FIN_CHERCHER = CHERCHER.debut + CHERCHER.duree;

test('le bandeau devient plein écran à la fin du délai de grâce', async ({ page }) => {
  await ouvrir(page, 'seance-09/2-methode.html', heure(FIN_CHERCHER, 52));
  await expect(page.locator('.stop-bandeau')).toBeVisible();
  await expect(page.locator('.stop-ecran')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.stop-bandeau')).toBeHidden();
});

test('pas d’écran STOP quand la page affichée est déjà la suivante', async ({ page }) => {
  await ouvrir(page, 'seance-09/4-citer-lecture.html', heure(FIN_CHERCHER + 1));
  await expect(page.locator('.stop-ecran')).toBeHidden();
  await expect(page.locator('.stop-bandeau')).toBeHidden();
});

test('le temps passé sur la page est compté quand l’onglet est visible', async ({ page }) => {
  await ouvrir(page, 'seance-09/3-chercher.html', heure(12));
  await page.waitForTimeout(11500);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const e = await page.evaluate(() => JSON.parse(localStorage.getItem('fabrique:s09:v1')));
  expect(e.temps.chercher).toBeGreaterThanOrEqual(10);
});
