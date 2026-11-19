// 5. Corrections chiffrées : rien en clair dans le HTML servi, erreur avec un
// mauvais mot de passe, et pour chacune avec le bon mot de passe, les
// réponses proposées, les conseils de méthode et les scripts partagés.
// Deux mots de passe : un pour Définir et Citer, un pour l’étude de l’Insee.
import { test, expect } from '@playwright/test';
import { ouvrir, motDePasse, motDePasseDefinir, saisir, etat } from './aides.mjs';

const PAGES = [
  ['seance-09/5b-correction-definir.html', ['Conseils de méthode', 'Réponse proposée', 'La forme attendue', 'Marianne Blidon est']],
  ['seance-09/7-correction.html', ['Conseils de méthode', 'Réponse proposée', 'data-voir-passage', 'construction sociale de la différence']]
];

for (const [chemin, temoins] of PAGES) {
  test('le HTML servi ne contient pas la correction en clair (' + chemin + ')', async ({ request }) => {
    const rep = await request.get(chemin);
    expect(rep.ok()).toBeTruthy();
    const html = await rep.text();
    for (const t of temoins) { expect(html).not.toContain(t); }
    expect(html).toContain('staticryptConfig');
    expect(html).toContain('Entrez le mot de passe donné en séance.');
  });

  test('mauvais mot de passe : message d’erreur (' + chemin + ')', async ({ page }) => {
    await page.goto(chemin);
    await expect(page.locator('#staticrypt-password')).toBeVisible();
    await page.fill('#staticrypt-password', 'ce-n-est-pas-le-bon');
    await page.getByRole('button', { name: 'Ouvrir la correction' }).click();
    await expect(page.locator('#erreur-mdp')).toHaveText('Mot de passe incorrect.');
  });
}

test('correction de Définir et Citer : réponses proposées et conseils, juste après l’exercice', async ({ page }) => {
  const mdp = motDePasseDefinir();
  test.skip(!mdp, 'Mot de passe inconnu (CORRECTION_DEFINIR_PASSWORD ou .env.local).');
  await ouvrir(page, 'seance-09/3-chercher.html', '09:10');
  await saisir(page, 'a2', 'La page attribue la définition à Blidon, géographe.');
  await page.goto('seance-09/5b-correction-definir.html?now=09:36');
  await page.fill('#staticrypt-password', mdp);
  await page.getByRole('button', { name: 'Ouvrir la correction' }).click();
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(page.locator('h1')).toHaveText('Correction, définir et citer');
  await expect(page.locator('.entete .phase-nom')).toHaveText('Correction, définir et citer');
  await expect(page.locator('.carte-correction')).toHaveCount(7);
  await expect(page.locator('#c-a2 [data-votre-reponse]')).toContainText('Blidon, géographe');
  await expect(page.locator('#c-a2 .modele')).toContainText('Marianne Blidon est une géographe française');
  await expect(page.locator('#c-a3 .conseils-methode')).toContainText('Conseils de méthode');
  await expect(page.locator('#c-a3 .modele')).toContainText('Une dimension spatiale');
  await expect(page.locator('#c-c2 .tag-bonus')).toHaveText('Bonus');
  await page.getByRole('button', { name: 'J’ai lu la correction' }).click();
  await page.waitForTimeout(450);
  const e = await etat(page);
  expect(e.lu['correction-definir']).toBeTruthy();
  await expect(page.locator('.pager')).toContainText('Ouvrir l’étude de l’Insee');
});

test('correction de l’étude : question, réponse proposée, conseils et passage surligné', async ({ page }) => {
  const mdp = motDePasse();
  test.skip(!mdp, 'Mot de passe inconnu (CORRECTION_PASSWORD ou .env.local).');
  await ouvrir(page, 'seance-09/6-lire.html#analyser', '09:10');
  await saisir(page, 'l1', 'Notre fiche d’identité du document, assez longue.');
  await page.goto('seance-09/7-correction.html?now=11:02');
  await page.fill('#staticrypt-password', mdp);
  await page.getByRole('button', { name: 'Ouvrir la correction' }).click();
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
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
  // Option « se souvenir » : pas de nouvelle demande au rechargement.
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(page.locator('h1')).toHaveText('Correction de l’étude de l’Insee');
});
