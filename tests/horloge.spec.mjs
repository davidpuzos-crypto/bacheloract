// 3. Horloge : phase, compte à rebours et passages d’une phase à l’autre, à
// chaque heure de data/schedule.json, avec ?now= et ?depart=. Rien n’est
// imposé : la ligne de repère dit où l’équipe devrait être.
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

const arrets = PROGRAMME.phases.map((p, i) => ({ p, suivante: PROGRAMME.phases[i + 1] })).filter((x) => x.p.stop && x.suivante);
const PAUSE = PROGRAMME.phases.find((x) => x.id === 'pause');
const REPRISE = (9 + Math.floor((PAUSE.debut + PAUSE.duree) / 60)) + ' h ' + String((PAUSE.debut + PAUSE.duree) % 60).padStart(2, '0');
const ETATS_AILLEURS = /^(ailleurs|pause|fin)$/;

async function rienDImpose(page) {
  expect(await page.evaluate(() => document.querySelectorAll('[inert], .stop-ecran, .stop-bandeau').length)).toBe(0);
}

for (const { p, suivante } of arrets) {
  const fin = p.debut + p.duree;
  test('après ' + heure(fin) + ' (fin de « ' + p.label + ' ») : rien d’imposé, un repère explicite', async ({ page }) => {
    // L’équipe est restée sur la page de la phase qui vient de finir.
    await ouvrir(page, 'seance-09/' + p.page, heure(fin, 75));
    await rienDImpose(page);
    const barre = page.locator('.repere-barre');
    await expect(barre).toBeVisible();
    const finDeSeance = suivante.duree === 0;
    if (finDeSeance) {
      await expect(barre).toHaveAttribute('data-etat', 'fin');
      await expect(barre.locator('.repere-texte')).toContainText('La séance est terminée.');
      await expect(barre.locator('.repere-lien')).toHaveText('Voir le bilan');
    } else if (suivante.id === 'pause') {
      await expect(barre).toHaveAttribute('data-etat', 'pause');
      await expect(barre.locator('.repere-texte')).toContainText('C’est la pause, jusqu’à');
      await expect(barre.locator('.repere-lien')).toHaveText('Voir la pause');
    } else {
      await expect(barre).toHaveAttribute('data-etat', 'ailleurs');
      await expect(barre.locator('.repere-texte')).toContainText('Vous devriez être sur « ' + suivante.label + ' »');
      const message = p.stopTexte.replace('{reprise}', REPRISE).replace(/^Stop\.\s*/, '');
      await expect(barre.locator('.repere-detail')).toContainText(message);
      await expect(barre.locator('.repere-lien')).toHaveText(p.stopBouton);
    }
    // Un minute plus tard, toujours rien d’imposé.
    await page.waitForTimeout(1200);
    await rienDImpose(page);
    // Le lien mène à la bonne page, et la ligne ne dit plus « ailleurs ».
    await barre.locator('.repere-lien').click();
    const cible = finDeSeance ? '10-fin.html' : suivante.page;
    const [fichier, ancre] = cible.split('#');
    await expect(page).toHaveURL(new RegExp(fichier.replace('.', '\\.') + (ancre ? '.*#' + ancre : '')));
    await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
    await expect(page.locator('.repere-barre')).not.toHaveAttribute('data-etat', ETATS_AILLEURS);
  });
}

const CHERCHER = PROGRAMME.phases.find((x) => x.id === 'chercher');
const FIN_CHERCHER = CHERCHER.debut + CHERCHER.duree;

test('longtemps après un passage, la page reste libre et le repère reste affiché', async ({ page }) => {
  await ouvrir(page, 'seance-09/2-methode.html', heure(FIN_CHERCHER + 3));
  const barre = page.locator('.repere-barre');
  await expect(barre).toHaveAttribute('data-etat', 'ailleurs');
  await expect(barre.locator('.repere-texte')).toContainText('Vous devriez être sur « Lecture, bien citer »');
  await rienDImpose(page);
  // On peut toujours répondre sur la page où l’on est.
  await page.check('#qcm-M1-b');
  await expect(page.locator('[data-qcm="M1"] .fb')).toBeVisible();
});

test('pas de repère « ailleurs » sur la bonne page, ni plus loin', async ({ page }) => {
  await ouvrir(page, 'seance-09/4-citer-lecture.html', heure(FIN_CHERCHER + 1));
  await expect(page.locator('.repere-barre')).not.toHaveAttribute('data-etat', ETATS_AILLEURS);
  await ouvrir(page, 'seance-09/6-lire.html', heure(FIN_CHERCHER + 1));
  await expect(page.locator('.repere-barre')).not.toHaveAttribute('data-etat', ETATS_AILLEURS);
});

test('une section atteinte en faisant défiler compte comme la bonne place', async ({ page }) => {
  await ouvrir(page, 'seance-09/6-lire.html', '10:40');
  const barre = page.locator('.repere-barre');
  await expect(barre).toHaveAttribute('data-etat', 'ailleurs');
  await expect(barre.locator('.repere-texte')).toContainText('Vous devriez être sur « Analyser l’étude »');
  await page.locator('#analyser').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await expect(barre).not.toHaveAttribute('data-etat', ETATS_AILLEURS);
});

test('le temps passé sur la page est compté quand l’onglet est visible', async ({ page }) => {
  await ouvrir(page, 'seance-09/3-chercher.html', heure(12));
  await page.waitForTimeout(11500);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const e = await page.evaluate(() => JSON.parse(localStorage.getItem('fabrique:s09:v1')));
  expect(e.temps.chercher).toBeGreaterThanOrEqual(10);
});
