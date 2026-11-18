// 6. Gamification : points d’enquête, indices, badges, anneaux, phrase
// mystère, mode sobre et prefers-reduced-motion. Aucun niveau affiché.
import { test, expect } from '@playwright/test';
import { ouvrir, CLE } from './aides.mjs';

const T = 'Réponse complète de test, bien plus longue que quarante caractères au total.';
const champs = {};
['a1', 'a3', 'b1', 'b2', 'c1', 'c2', 'c3', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'bp', 's1', 'g1', 'a6', 'g2', 'g3', 'g4']
  .forEach((id) => { champs[id] = T + ' ' + T; });
champs.equipe = 'Les Curieuses';
champs.nom1 = 'Camille Martin';
champs.nom2 = 'Sacha Durand';
const juste = { premier: 'x', dernier: 'x', essais: 1, juste: true, premierJuste: true };
const qcm = {};
['M1', 'M2', 'M3', 'C-Q1', 'C-Q2', 'C-Q4', 'L-Q1', 'L-Q2', 'R1', 'F-Q1', 'F-Q2', 'R2', 'R3', 'F-Q3', 'R4', 'V4', 'V5', 'V6']
  .forEach((id) => { qcm[id] = Object.assign({}, juste); });

const indice = { trouve: true, montre: false, essais: 1, trouves: ['x'] };
const indices = {};
['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].forEach((id) => { indices[id] = Object.assign({}, indice); });

const ETAT_COMPLET = {
  v: 1, champs, radios: { b0: 'ses', usage: 'non', icone: 'plume' }, cases: { tips_vus: ['1', '2', '3'] }, qcm, indices,
  temps: {}, lu: { citer: 1, correction: 1 }, conseils: [1, 4, 5],
  quetes: { definir: { fin: 20 }, citer: { fin: 40 }, lire: { fin: 130 }, noter: { fin: 175 } },
  etapes: { chercher: { fin: 20 }, pratique: { fin: 40 }, analyser: { fin: 115 } },
  badges: {}, arrets: {}, depots: { parcours: { le: 1, via: 'copie' } }, drapeau: 'ok',
  options: { sobre: false, theme: 'auto', horloge: {} }
};

test('enquête complète : 445 points, huit badges, phrase entière', async ({ page }) => {
  await page.addInitScript(([cle, e]) => { if (!localStorage.getItem(cle)) { localStorage.setItem(cle, JSON.stringify(e)); } }, [CLE, ETAT_COMPLET]);
  await ouvrir(page, 'seance-09/10-fin.html', '12:05');
  // 15 champs × 10 + 18 QCM × 5 + 5 bonus × 15 + 4 quêtes à l’heure × 20
  // + 2 lectures × 10 + 6 indices × 5
  await expect(page.locator('.pastille-equipe .points')).toHaveText(/^445\s*pts$/);
  const carnet = page.locator('main [data-carnet]');
  await expect(carnet.locator('.score .valeur')).toHaveText('445');
  await expect(carnet.locator('.score .niveau')).toHaveCount(0);
  await expect(carnet.locator('.score')).toContainText('6 indices sur 6');
  await expect(carnet.locator('.badge[data-obtenu="1"]')).toHaveCount(8);
  await expect(carnet.locator('.quete[data-etat="terminee"]')).toHaveCount(4);
  await expect(carnet.locator('.anneau .pc')).toHaveText(['100 %', '100 %', '100 %', '100 %']);
  await expect(page.locator('[data-phrase] .phrase-mystere')).toHaveClass(/complete/);
  await expect(page.locator('[data-phrase]')).toContainText('Ce qui semble le plus personnel est souvent le plus social.');
});

test('les points ne descendent jamais sous zéro et la phrase reste partielle', async ({ page }) => {
  await ouvrir(page, 'seance-09/pause.html', '10:10');
  await expect(page.locator('.pastille-equipe .points')).toHaveText(/^0\s*pts$/);
  await expect(page.locator('main [data-carnet] .phrase-mystere .cache')).toHaveCount(4);
  await expect(page.locator('main [data-carnet] .score .niveau')).toHaveCount(0);
  await expect(page.locator('main [data-carnet]')).not.toContainText('Stagiaire');
});

test('quête terminée : tampon, annonce et confettis', async ({ page }) => {
  const presque = JSON.parse(JSON.stringify(ETAT_COMPLET));
  presque.quetes = {};
  presque.etapes = {};
  delete presque.qcm.M3;
  await page.addInitScript(([cle, e]) => { if (!localStorage.getItem(cle)) { localStorage.setItem(cle, JSON.stringify(e)); } }, [CLE, presque]);
  await ouvrir(page, 'seance-09/2-methode.html', '09:08');
  await page.check('#qcm-M3-b');
  await expect(page.locator('.annonce').first()).toContainText('Quête Définir résolue.');
  await expect(page.locator('canvas.confettis')).toHaveCount(1);
  await page.click('.pastille-equipe');
  await expect(page.locator('#tiroir-carnet .quete[data-c="definir"] .tampon')).toBeVisible();
});

test('prefers-reduced-motion : pas de confettis', async ({ browser }) => {
  const contexte = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await contexte.newPage();
  const presque = JSON.parse(JSON.stringify(ETAT_COMPLET));
  presque.quetes = {};
  presque.etapes = {};
  delete presque.qcm.M3;
  await page.addInitScript(([cle, e]) => { if (!localStorage.getItem(cle)) { localStorage.setItem(cle, JSON.stringify(e)); } }, [CLE, presque]);
  await page.goto('http://localhost:4173/fabrique/seance-09/2-methode.html?now=09:08');
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await page.check('#qcm-M3-b');
  await expect(page.locator('.annonce').first()).toContainText('Quête Définir résolue.');
  await page.waitForTimeout(200);
  await expect(page.locator('canvas.confettis')).toHaveCount(0);
  await contexte.close();
});

test('mode sobre : points comptés, badges et animations masqués', async ({ page }) => {
  await page.addInitScript(([cle, e]) => { if (!localStorage.getItem(cle)) { localStorage.setItem(cle, JSON.stringify(e)); } }, [CLE, ETAT_COMPLET]);
  await ouvrir(page, 'seance-09/10-fin.html', '12:05');
  await page.click('.bouton-menu');
  await page.click('[data-sobre-bouton]');
  await expect(page.locator('html')).toHaveAttribute('data-sobre', '1');
  await page.keyboard.press('Escape');
  await expect(page.locator('main [data-carnet] .badges')).toBeHidden();
  await expect(page.locator('.pastille-equipe .points')).toHaveText(/^445\s*pts$/);
});

test('drapeau d’équipe : texte et icône, pas seulement la couleur', async ({ page }) => {
  await ouvrir(page, 'seance-09/3-chercher.html', '09:20');
  const d = page.locator('.drapeau');
  await expect(d).toHaveText('On avance');
  await d.click();
  await expect(d).toHaveText('Besoin d’un coup de main');
  await expect(d).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-drapeau', 'aide');
  await expect(page.locator('.bandeau-aide')).toBeVisible();
});
