// Envoi des réponses à l’enseignant par le relais chiffré, et page « Réponses
// des équipes ». Le serveur de test (scripts/serve.mjs) remplace ntfy.sh par
// un faux relais local et sert des clés de test (code enseignant : code-test).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PROGRAMME, heure } from './aides.mjs';

const BASE = 'http://localhost:4173/fabrique/';
const RELAIS = 'http://localhost:4173/faux-relais';

async function contexte(browser, options = {}) {
  return browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 } }, options));
}
// Variante de data/config.json pour un test (sur la base de celle du serveur de test).
async function modifierConfig(ctx, modif) {
  await ctx.route('**/data/config.json', async (route) => {
    const r = await route.fetch();
    const c = await r.json();
    modif(c);
    await route.fulfill({ response: r, body: JSON.stringify(c) });
  });
}
async function ouvrir(page, chemin) {
  await page.goto(BASE + chemin);
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
}
async function connecterEnseignant(page, code = 'code-test') {
  await ouvrir(page, 'prof/reponses.html');
  await page.fill('#code-enseignant', code);
  await page.getByRole('button', { name: 'Afficher les réponses' }).click();
}
async function messages(request, sujet = 'test-reponses') {
  const r = await request.get(RELAIS + '/' + sujet + '/json?poll=1&since=all');
  return (await r.text()).split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
async function attendreMessages(request, n) {
  await expect.poll(async () => (await messages(request)).length, { timeout: 15000 }).toBeGreaterThanOrEqual(n);
}

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ request }) => {
  await request.get(RELAIS + '/remise-a-zero');
});

test('envoi chiffré aux moments clés, puis lecture avec le code', async ({ browser, request }) => {
  const eleves = await contexte(browser);
  const p = await eleves.newPage();
  await ouvrir(p, 'seance-09/1-cadre.html?now=09:20');
  await expect(p.locator('.avis-collecte')).toBeVisible();
  await p.fill('[data-id="equipe"]', 'Les Curieuses');
  await p.fill('[data-id="nom1"]', 'Camille Martin');
  await p.fill('[data-id="nom2"]', 'Sacha Durand');
  await p.fill('[data-id="nom3"]', 'Lou Petit');
  // Premier envoi peu après la saisie des noms (1 seconde sur le serveur de test).
  await attendreMessages(request, 1);
  const premiers = await messages(request);
  expect(premiers[0].message.startsWith('f1.')).toBe(true);
  expect(premiers[0].message).not.toContain('Curieuses');
  expect(premiers[0].message).not.toContain('Camille');

  // Une réponse longue est découpée en plusieurs messages de moins de 4 Ko.
  const lettres = 'abcdefghijklmnopqrstuvwxyz ';
  const long = [...crypto.getRandomValues(new Uint8Array(7000))].map((x) => lettres.charAt(x % 27)).join('');
  await ouvrir(p, 'seance-09/3-chercher.html');
  await p.fill('[data-id="a1"]', 'Citation de test pour A1, envoyée à l’enseignant. ' + long);
  await p.waitForTimeout(450);
  const avantDrapeau = (await messages(request)).length;
  await p.click('.drapeau');
  await attendreMessages(request, avantDrapeau + 2);

  await ouvrir(p, 'seance-09/6-lire.html#depot');
  const depot = p.locator('[data-depot="parcours"]');
  await expect(depot.locator('[data-action="envoyer"]')).toBeVisible();
  await depot.locator('[data-action="envoyer"]').click();
  await expect(depot.locator('[data-recap-statut]')).toContainText('Récapitulatif envoyé à l’enseignant');
  // Peu d’envois : noms, drapeau (découpé), dépôt.
  const tous = await messages(request);
  expect(tous.length).toBeLessThanOrEqual(8);
  tous.forEach((m) => expect(Buffer.byteLength(m.message)).toBeLessThanOrEqual(4096));

  const prof = await contexte(browser);
  const pp = await prof.newPage();
  await connecterEnseignant(pp);
  await expect(pp.locator('[data-connexion]')).toBeHidden();
  const ligne = pp.locator('.tableau-equipes tbody tr').filter({ hasText: 'Les Curieuses' });
  await expect(ligne).toContainText('Besoin d’aide');
  await expect(ligne).toContainText('Camille Martin, Sacha Durand et Lou Petit');
  await expect(ligne).toContainText('envoyé');
  await expect(pp.locator('[data-resume]')).toContainText('1 demande de l’aide');
  await expect(pp.locator('[data-maj]')).toContainText('messages reçus');

  await pp.click('#onglet-question');
  await pp.selectOption('[data-choix-question]', 'a1');
  await expect(pp.locator('[data-contenu-question]')).toContainText('Citation de test pour A1');
  await expect(pp.locator('[data-contenu-question]')).toContainText(long.slice(3000, 3100));

  await pp.click('#onglet-equipe');
  await expect(pp.locator('[data-contenu-equipe]')).toContainText('Dépôt du parcours,');
  await expect(pp.locator('[data-contenu-equipe]')).toContainText('envoyé.');

  const [fichier] = await Promise.all([pp.waitForEvent('download'), pp.click('[data-exporter-texte]')]);
  expect(fichier.suggestedFilename()).toBe('s09_reponses_equipes.txt');
  const texte = await (await import('node:fs')).promises.readFile(await fichier.path(), 'utf8');
  expect(texte).toContain('==== Les Curieuses (Camille Martin, Sacha Durand et Lou Petit)');
  expect(texte).toContain('Citation de test pour A1');

  // Le relais efface les messages au bout de 12 heures : la copie gardée
  // dans le navigateur de l’enseignant reste lisible.
  await request.get(RELAIS + '/remise-a-zero');
  await pp.reload();
  await pp.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(pp.locator('.tableau-equipes')).toContainText('Les Curieuses');
  await eleves.close();
  await prof.close();
});

test('point d’arrêt : un envoi, puis rien de plus sans nouveauté', async ({ browser, request }) => {
  const eleves = await contexte(browser);
  const p = await eleves.newPage();
  const chercher = PROGRAMME.phases.find((x) => x.id === 'chercher');
  await ouvrir(p, 'seance-09/3-chercher.html?now=' + heure(chercher.debut + chercher.duree, -8));
  await p.fill('[data-id="a1"]', 'Réponse écrite juste avant la fin de la phase Chercher.');
  await expect(p.locator('.stop-bandeau')).toBeVisible({ timeout: 15000 });
  await attendreMessages(request, 1);
  const n = (await messages(request)).length;
  // Nouvelle page dans la même phase : l’arrêt est déjà traité.
  await ouvrir(p, 'seance-09/4-citer-lecture.html');
  await p.waitForTimeout(2500);
  expect((await messages(request)).length).toBe(n);
  await eleves.close();
});

test('relance : une modification restée sans envoi part au bout du délai', async ({ browser, request }) => {
  const eleves = await contexte(browser);
  await modifierConfig(eleves, (c) => { c.collecte.relanceMinutes = 0.05; c.collecte.premierEnvoiSecondes = 60; });
  const p = await eleves.newPage();
  await ouvrir(p, 'seance-09/5-citer-pratique.html?now=09:35');
  await p.fill('[data-id="c1"]', 'Deux citations de test, envoyées par la relance.');
  await attendreMessages(request, 1);
  await eleves.close();
});

test('mauvais code : rien ne s’affiche', async ({ browser }) => {
  const prof = await contexte(browser);
  const pp = await prof.newPage();
  await connecterEnseignant(pp, 'pas-le-bon-code');
  await expect(pp.locator('[data-erreur-cle]')).toHaveText('Code incorrect.');
  await expect(pp.locator('[data-tableau]')).toBeHidden();
  await prof.close();
});

test('les textes des étudiant·es s’affichent comme du texte, jamais comme du HTML', async ({ browser, request }) => {
  const eleves = await contexte(browser);
  const p = await eleves.newPage();
  await ouvrir(p, 'seance-09/1-cadre.html?now=09:20');
  await p.fill('[data-id="equipe"]', '<img src=x onerror="window.piege=1">');
  await ouvrir(p, 'seance-09/3-chercher.html');
  await p.fill('[data-id="b2"]', '<script>window.piege=2</script> Réponse piégée assez longue.');
  await p.waitForTimeout(450);
  await p.click('.drapeau');
  await attendreMessages(request, 1);
  await p.waitForTimeout(800);

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

test('page des réponses accessible, avec des données, en mode sombre et clair', async ({ browser, request }) => {
  const eleves = await contexte(browser);
  const p = await eleves.newPage();
  await ouvrir(p, 'seance-09/1-cadre.html?now=09:20');
  await p.fill('[data-id="equipe"]', 'Équipe accessible');
  await attendreMessages(request, 1);
  await eleves.close();
  for (const theme of ['dark', 'light']) {
    const prof = await contexte(browser, { colorScheme: theme });
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

test('l’heure de départ diffusée et signée par l’enseignant s’applique aux élèves', async ({ browser, request }) => {
  const prof = await contexte(browser);
  const pp = await prof.newPage();
  await connecterEnseignant(pp);
  await pp.locator('.horloge-classe summary').click();
  await pp.fill('#depart-classe', '10:00');
  await pp.click('[data-diffuser]');
  await expect(pp.locator('[data-statut-horloge]')).toContainText('Départ à 10');
  await expect(pp.locator('[data-depart-actuel]')).toContainText('10 h 00');

  // Une heure non signée par l’enseignant est ignorée.
  const faux = Buffer.from(JSON.stringify({ depart: '11:00', t: Date.now() + 60000 })).toString('base64url');
  await request.post(RELAIS + '/test-horloge', { data: 'h1.' + faux + '.AAAA' });

  const eleves = await contexte(browser);
  const p = await eleves.newPage();
  await ouvrir(p, 'seance-09/index.html?now=10:05');
  await expect(p.locator('.entete .phase-nom')).toHaveText('Méthode');

  await pp.click('[data-annuler-depart]');
  await expect(pp.locator('[data-statut-horloge]')).toContainText('Retour à l’horaire du fichier');
  await p.waitForTimeout(3500);
  await p.reload();
  await p.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(p.locator('.entete .phase-nom')).not.toHaveText('Méthode');
  await eleves.close();
  await prof.close();
});

test('relais saturé : message clair et téléchargement conseillé', async ({ browser, request }) => {
  await request.get(RELAIS + '/limite?etat=1');
  const eleves = await contexte(browser);
  const p = await eleves.newPage();
  await ouvrir(p, 'seance-09/6-lire.html?now=09:20#depot');
  const depot = p.locator('[data-depot="parcours"]');
  await depot.locator('[data-action="envoyer"]').click();
  await expect(depot.locator('[data-recap-statut]')).toContainText('Le relais refuse les envois pour l’instant');
  await p.click('.bouton-menu');
  await expect(p.locator('[data-texte-donnees]')).toContainText('Le relais est saturé');
  await request.get(RELAIS + '/limite?etat=0');
  await eleves.close();
});

test('envoi désactivé : téléchargement en premier, pas de bouton d’envoi', async ({ browser }) => {
  const c = await contexte(browser);
  await modifierConfig(c, (cfg) => { cfg.collecte.actif = false; });
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
  await expect(p.locator('[data-sans-collecte]')).toContainText('L’envoi des réponses est désactivé');
  await expect(p.locator('[data-connexion]')).toBeHidden();
  await c.close();
});
