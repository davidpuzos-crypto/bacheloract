// Envoi des réponses à l’enseignant et page « Réponses des équipes »,
// avec le faux script Google du serveur de test (scripts/serve.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { RACINE } from './aides.mjs';

const BASE = 'http://localhost:4173/fabrique/';
const CONFIG = JSON.parse(fs.readFileSync(path.join(RACINE, 'docs', 'data', 'config.json'), 'utf8'));
CONFIG.collecte.actif = true;
CONFIG.collecte.endpoint = 'http://localhost:4173/faux-script';
CONFIG.collecte.horlogeSecondes = 10;

async function contexte(browser) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await c.route('**/data/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  return c;
}
async function ouvrir(page, chemin) {
  await page.goto(BASE + chemin);
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
}
async function connecterEnseignant(page, cle = 'cle-test') {
  await ouvrir(page, 'prof/reponses.html');
  await page.fill('#cle-enseignant', cle);
  await page.getByRole('button', { name: 'Afficher les réponses' }).click();
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await request.get('http://localhost:4173/faux-script?action=remise-a-zero');
});

test('envoi automatique, drapeau, dépôt et lecture par l’enseignant', async ({ browser }) => {
  const eleves = await contexte(browser);
  const p = await eleves.newPage();
  await ouvrir(p, 'seance-09/1-cadre.html?now=09:20');
  await expect(p.locator('.avis-collecte')).toBeVisible();
  await p.fill('[data-id="equipe"]', 'Les Curieuses');
  await p.fill('[data-id="nom1"]', 'Camille Martin');
  await p.fill('[data-id="nom2"]', 'Sacha Durand');
  await p.waitForTimeout(450);
  await ouvrir(p, 'seance-09/3-chercher.html');
  await p.fill('[data-id="a1"]', 'Citation de test pour A1, envoyée à l’enseignant.');
  await p.click('.drapeau');
  await p.waitForTimeout(800);
  await ouvrir(p, 'seance-09/6-lire.html#depot');
  const depot = p.locator('[data-depot="parcours"]');
  await expect(depot.locator('[data-action="envoyer"]')).toBeVisible();
  await p.check('#u-non');
  await depot.locator('[data-action="envoyer"]').click();
  await expect(depot.locator('[data-recap-statut]')).toContainText('Récapitulatif envoyé à l’enseignant');

  const prof = await contexte(browser);
  const pp = await prof.newPage();
  await connecterEnseignant(pp);
  await expect(pp.locator('[data-connexion]')).toBeHidden();
  const ligne = pp.locator('.tableau-equipes tbody tr').filter({ hasText: 'Les Curieuses' });
  await expect(ligne).toContainText('Besoin d’aide');
  await expect(ligne).toContainText('Camille Martin et Sacha Durand');
  await expect(ligne).toContainText('envoyé');
  await expect(pp.locator('[data-resume]')).toContainText('1 demande de l’aide');

  await pp.click('#onglet-question');
  await pp.selectOption('[data-choix-question]', 'a1');
  await expect(pp.locator('[data-contenu-question]')).toContainText('Citation de test pour A1');

  await pp.click('#onglet-equipe');
  await expect(pp.locator('[data-contenu-equipe]')).toContainText('Récapitulatif du parcours envoyé');
  await pp.locator('[data-contenu-equipe] summary').filter({ hasText: 'Récapitulatif du parcours' }).click();
  await expect(pp.locator('[data-contenu-equipe] .recap-recu')).toContainText('Binôme. Camille Martin et Sacha Durand');
  await eleves.close();
  await prof.close();
});

test('page des réponses accessible, avec des données, en mode sombre et clair', async ({ browser }) => {
  const eleves = await contexte(browser);
  const p = await eleves.newPage();
  await ouvrir(p, 'seance-09/1-cadre.html?now=09:20');
  await p.fill('[data-id="equipe"]', 'Équipe accessible');
  await p.waitForTimeout(3800);
  await eleves.close();
  for (const theme of ['dark', 'light']) {
    const prof = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
    await prof.route('**/data/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
    const pp = await prof.newPage();
    await connecterEnseignant(pp);
    await expect(pp.locator('.tableau-equipes')).toBeVisible();
    for (const onglet of ['#onglet-ensemble', '#onglet-question', '#onglet-equipe']) {
      await pp.click(onglet);
      const r = await new AxeBuilder({ page: pp }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(r.violations.map((v) => v.id + ' ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | '))).toEqual([]);
    }
    await prof.close();
  }
});

test('mauvaise clé : rien ne s’affiche', async ({ browser }) => {
  const prof = await contexte(browser);
  const pp = await prof.newPage();
  await connecterEnseignant(pp, 'pas-la-bonne');
  await expect(pp.locator('[data-erreur-cle]')).toHaveText('Clé incorrecte.');
  await expect(pp.locator('[data-tableau]')).toBeHidden();
  await prof.close();
});

test('les textes des étudiant·es s’affichent comme du texte, jamais comme du HTML', async ({ browser }) => {
  const eleves = await contexte(browser);
  const p = await eleves.newPage();
  await ouvrir(p, 'seance-09/1-cadre.html?now=09:20');
  await p.fill('[data-id="equipe"]', '<img src=x onerror="window.piege=1">');
  await p.waitForTimeout(450);
  await ouvrir(p, 'seance-09/3-chercher.html');
  await p.fill('[data-id="b2"]', '<script>window.piege=2</script> Réponse piégée assez longue.');
  await p.waitForTimeout(450);
  await ouvrir(p, 'seance-09/2-methode.html');
  await p.waitForTimeout(3500);

  const prof = await contexte(browser);
  const pp = await prof.newPage();
  await connecterEnseignant(pp);
  await expect(pp.locator('.tableau-equipes')).toContainText('<img src=x onerror="window.piege=1">');
  await pp.click('#onglet-question');
  await pp.selectOption('[data-choix-question]', 'b2');
  await expect(pp.locator('[data-contenu-question]')).toContainText('<script>window.piege=2</script>');
  expect(await pp.evaluate(() => window.piege)).toBeUndefined();
  expect(await pp.locator('[data-panneau] img').count()).toBe(0);
  await eleves.close();
  await prof.close();
});

test('l’heure de départ diffusée par l’enseignant s’applique aux élèves', async ({ browser }) => {
  const prof = await contexte(browser);
  const pp = await prof.newPage();
  await connecterEnseignant(pp);
  await pp.locator('.horloge-classe summary').click();
  await pp.fill('#depart-classe', '10:00');
  await pp.click('[data-diffuser]');
  await expect(pp.locator('[data-statut-horloge]')).toContainText('Départ à 10');

  const eleves = await contexte(browser);
  const p = await eleves.newPage();
  await ouvrir(p, 'seance-09/index.html?now=10:05');
  await expect(p.locator('.entete .phase-nom')).toHaveText('Méthode');
  // Retour à l’horaire du fichier
  await pp.click('[data-annuler-depart]');
  await expect(pp.locator('[data-statut-horloge]')).toContainText('Retour à l’horaire du fichier');
  await eleves.close();
  await prof.close();
});

test('sans envoi branché : téléchargement en premier, pas de bouton d’envoi', async ({ browser }) => {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await c.newPage();
  await ouvrir(p, 'seance-09/6-lire.html?now=10:40#depot');
  const depot = p.locator('[data-depot="parcours"]');
  await expect(depot.locator('[data-action="envoyer"]')).toBeHidden();
  await expect(depot.locator('[data-action="telecharger"]')).not.toHaveClass(/secondaire/);
  await expect(depot.locator('[data-sans-collecte]')).toBeVisible();
  await expect(depot.locator('[data-si-collecte]')).toBeHidden();
  await ouvrir(p, 'index.html');
  await expect(p.locator('main')).toContainText('Les réponses saisies sur ce site restent dans votre navigateur.');
  await ouvrir(p, 'prof/reponses.html');
  await expect(p.locator('[data-sans-collecte]')).toContainText('L’envoi des réponses n’est pas encore branché');
  await expect(p.locator('[data-connexion]')).toBeHidden();
  await c.close();
});
