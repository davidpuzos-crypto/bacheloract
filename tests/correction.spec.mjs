// 5. Corrections sans mot de passe. Chacune s’affiche dès que l’équipe a
// envoyé son travail, d’un clic (porte.js). Le relais est simulé ici pour ne
// pas dépendre des autres tests qui utilisent le faux relais du serveur.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PAGES, ouvrir, saisir, etat, relaisSimule } from './aides.mjs';

test('aucune page étudiante ne demande de mot de passe', async ({ request }) => {
  for (const p of PAGES.filter((x) => !x.startsWith('prof/'))) {
    const html = await (await request.get(p)).text();
    expect(html, p).not.toContain('type="password"');
    expect(html.toLowerCase(), p).not.toContain('mot de passe');
  }
});

test('les corrections sont publiées en clair, derrière le bouton d’envoi', async ({ request }) => {
  const definir = await (await request.get('seance-09/5b-correction-definir.html')).text();
  expect(definir).toContain('data-porte="citer"');
  expect(definir).toContain('Marianne Blidon est');
  const etude = await (await request.get('seance-09/7-correction.html')).text();
  expect(etude).toContain('data-porte="lire"');
  expect(etude).toContain('data-voir-passage');
});

test('sans réponse à envoyer (aperçu de l’enseignant), la correction s’affiche directement', async ({ page }) => {
  await ouvrir(page, 'seance-09/5b-correction-definir.html', '09:36');
  await expect(page.locator('[data-porte]')).toBeHidden();
  await expect(page.locator('.carte-correction')).toHaveCount(7);
  await expect(page.locator('.carte-correction').first()).toBeVisible();
  await ouvrir(page, 'seance-09/7-correction.html', '11:02');
  await expect(page.locator('[data-porte]')).toBeHidden();
  await expect(page.locator('#c-l1 .modele')).toBeVisible();
});

test('correction de Définir et Citer : un clic envoie les réponses et ouvre la correction', async ({ page }) => {
  const envois = await relaisSimule(page);
  await ouvrir(page, 'seance-09/3-chercher.html', '09:10');
  await saisir(page, 'a2', 'La page attribue la définition à Blidon, géographe.');
  await ouvrir(page, 'seance-09/5b-correction-definir.html', '09:36');
  const porte = page.locator('[data-porte]');
  await expect(porte).toBeVisible();
  await expect(porte.locator('h2')).toHaveText('D’abord, envoyez votre travail');
  await expect(page.locator('.carte-correction').first()).toBeHidden();
  await expect(page.locator('main .rail')).toHaveCount(0);
  // Le pied de page reste utilisable.
  await expect(page.locator('.pager')).toContainText('Ouvrir l’étude de l’Insee');
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations.map((v) => v.id)).toEqual([]);

  const avant = envois.length;
  await page.getByRole('button', { name: 'Envoyer et voir la correction' }).click();
  await expect(page.locator('[data-porte-note]')).toContainText('Votre travail a été envoyé à l’enseignant');
  await expect(page.locator('[data-porte-note]')).toBeFocused();
  expect(envois.length).toBeGreaterThan(avant);
  await expect(porte).toBeHidden();
  await expect(page.locator('h1')).toHaveText('Correction, définir et citer');
  await expect(page.locator('.entete .phase-nom')).toHaveText('Correction, définir et citer');
  await expect(page.locator('.carte-correction')).toHaveCount(7);
  await expect(page.locator('#c-a2 [data-votre-reponse]')).toContainText('Blidon, géographe');
  await expect(page.locator('#c-a2 .modele')).toContainText('Marianne Blidon est une géographe française');
  await expect(page.locator('#c-a3 .conseils-methode')).toContainText('Conseils de méthode');
  await expect(page.locator('#c-a3 .modele')).toContainText('Une dimension spatiale');
  await expect(page.locator('#c-c2 .tag-bonus')).toHaveText('Bonus');
  // Le sommaire de la page apparaît avec la correction.
  await expect(page.locator('main .rail')).toHaveCount(1);
  await page.getByRole('button', { name: 'J’ai lu la correction' }).click();
  await page.waitForTimeout(450);
  const e = await etat(page);
  expect(e.lu['porte-citer']).toBeTruthy();
  expect(e.lu['correction-definir']).toBeTruthy();

  // Une fois ouverte, la correction ne redemande rien.
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(porte).toBeHidden();
  await expect(page.locator('.carte-correction').first()).toBeVisible();
});

test('correction de l’étude : ouverte d’emblée quand le dépôt est fait', async ({ page }) => {
  await ouvrir(page, 'seance-09/6-lire.html#analyser', '09:10');
  await saisir(page, 'l1', 'Notre fiche d’identité du document, assez longue.');
  const [fichier] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-depot="parcours"] [data-action="telecharger"]').click()
  ]);
  expect(fichier.suggestedFilename()).toMatch(/\.txt$/);
  await ouvrir(page, 'seance-09/7-correction.html', '11:02');
  await expect(page.locator('[data-porte]')).toBeHidden();
  await expect(page.locator('h1')).toHaveText('Correction de l’étude de l’Insee');
  await expect(page.locator('.entete .phase-nom')).toHaveText('Correction de l’étude');
  await expect(page.locator('.carte-correction')).toHaveCount(6);
  // Tout est visible d’emblée, sans chercher d’indice.
  const l1 = page.locator('#c-l1');
  await expect(l1.locator('.question-corr')).toContainText('Qui a publié ce document');
  await expect(l1.locator('[data-votre-reponse]')).toContainText('Notre fiche d’identité du document');
  await expect(l1.locator('.modele')).toBeVisible();
  await expect(l1.locator('.conseils-methode')).toContainText('mention Champ');
  // « Voir le passage » surligne les deux mentions Champ.
  await l1.locator('[data-voir-passage]').click();
  await expect(page.locator('.passage-surligne')).toHaveCount(2);
  await expect(page.locator('[data-z="leg1-champ"]')).toHaveClass(/passage-surligne/);
  await expect(l1.locator('[data-voir-passage]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#c-l6 [data-voir-passage]').click();
  await expect(page.locator('[data-z="genre-2"]')).toHaveClass(/passage-surligne/);
  await expect(page.locator('[data-z="leg1-champ"]')).not.toHaveClass(/passage-surligne/);
  await page.getByRole('button', { name: 'J’ai lu la correction' }).click();
  await page.waitForTimeout(450);
  const e = await etat(page);
  expect(e.lu.correction).toBeTruthy();
  // l1 (10) + lecture de la correction (10)
  await expect(page.locator('.pastille-equipe .points')).toHaveText(/^20\s*pts$/);
});

test('correction de l’étude : sans dépôt, le clic fait le dépôt puis ouvre la correction', async ({ page }) => {
  const envois = await relaisSimule(page);
  await ouvrir(page, 'seance-09/6-lire.html#analyser', '09:10');
  await saisir(page, 'l1', 'Notre fiche d’identité du document, assez longue.');
  await ouvrir(page, 'seance-09/7-correction.html', '11:02');
  await expect(page.locator('[data-porte]')).toBeVisible();
  await expect(page.locator('#c-l1')).toBeHidden();
  await page.getByRole('button', { name: 'Envoyer et voir la correction' }).click();
  await expect(page.locator('[data-porte-note]')).toContainText('Votre travail a été envoyé à l’enseignant');
  expect(envois.length).toBeGreaterThan(0);
  await expect(page.locator('#c-l1 .modele')).toBeVisible();
  // Le tableau de l’étude, apparu après le clic, reste atteignable au clavier.
  await expect(page.locator('.doc .table-defile')).toHaveAttribute('tabindex', '0');
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations.map((v) => v.id)).toEqual([]);
  await page.locator('#c-l1 [data-voir-passage]').click();
  await expect(page.locator('[data-z="leg1-champ"]')).toHaveClass(/passage-surligne/);
  // L’état est enregistré avec un léger différé.
  await expect.poll(async () => ((await etat(page)).depots || {}).parcours?.via).toBe('envoi');
  expect((await etat(page)).lu['porte-lire']).toBeTruthy();
});

test('envoi en échec : la correction s’affiche quand même, avec un avertissement', async ({ page }) => {
  await relaisSimule(page, { echec: 'reseau' });
  await ouvrir(page, 'seance-09/6-lire.html#analyser', '09:10');
  await saisir(page, 'l1', 'Notre fiche d’identité du document, assez longue.');
  await ouvrir(page, 'seance-09/7-correction.html', '11:02');
  await page.getByRole('button', { name: 'Envoyer et voir la correction' }).click();
  const note = page.locator('[data-porte-note]');
  await expect(note).toContainText('L’envoi n’a pas abouti');
  await expect(note).toContainText('Téléchargez le récapitulatif');
  await expect(note).toHaveClass(/alerte/);
  await expect(page.locator('#c-l1 .modele')).toBeVisible();
  // Le dépôt n’est pas compté comme fait, mais la correction reste ouverte.
  await expect.poll(async () => !!((await etat(page)).lu || {})['porte-lire']).toBe(true);
  expect((await etat(page)).depots.parcours).toBeUndefined();
});

test('envoi désactivé par l’enseignant : la correction s’ouvre sans attendre', async ({ page }) => {
  await page.route('**/data/config.json', async (route) => {
    const r = await route.fetch();
    const c = await r.json();
    c.collecte.actif = false;
    await route.fulfill({ response: r, body: JSON.stringify(c) });
  });
  await ouvrir(page, 'seance-09/3-chercher.html', '09:10');
  await saisir(page, 'a2', 'La page attribue la définition à Blidon, géographe.');
  await ouvrir(page, 'seance-09/5b-correction-definir.html', '09:36');
  await expect(page.locator('[data-porte]')).toBeHidden();
  await expect(page.locator('#c-a2 .modele')).toBeVisible();
});
