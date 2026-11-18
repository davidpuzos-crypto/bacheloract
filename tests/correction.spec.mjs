// 5. Correction chiffrée : rien en clair dans le HTML servi, erreur avec un
// mauvais mot de passe, contenu et scripts partagés opérationnels avec le bon.
import { test, expect } from '@playwright/test';
import { ouvrir, motDePasse, saisir, etat } from './aides.mjs';

test('le HTML servi ne contient pas la correction en clair', async ({ request }) => {
  const rep = await request.get('seance-09/7-correction.html');
  expect(rep.ok()).toBeTruthy();
  const html = await rep.text();
  for (const temoin of ['Pièges fréquents', 'Ce qu’on attend', 'Réponse proposée', 'construction sociale de la différence', 'data-indice', 'Le détail qui compte']) {
    expect(html).not.toContain(temoin);
  }
  expect(html).toContain('staticryptConfig');
  expect(html).toContain('Entrez le mot de passe donné en séance.');
});

test('mauvais mot de passe : message d’erreur', async ({ page }) => {
  await page.goto('seance-09/7-correction.html');
  await expect(page.locator('#staticrypt-password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ouvrir la correction' })).toBeVisible();
  await page.fill('#staticrypt-password', 'ce-n-est-pas-le-bon');
  await page.getByRole('button', { name: 'Ouvrir la correction' }).click();
  await expect(page.locator('#erreur-mdp')).toHaveText('Mot de passe incorrect.');
});

test('bon mot de passe : chasse aux indices, réponses proposées et scripts partagés', async ({ page }) => {
  const mdp = motDePasse();
  test.skip(!mdp, 'Mot de passe inconnu (CORRECTION_PASSWORD ou .env.local).');
  await ouvrir(page, 'seance-09/3-chercher.html', '09:10');
  await saisir(page, 'a1', 'Ma citation de test pour A1, assez longue.');
  await ouvrir(page, 'seance-09/6-lire.html#analyser');
  await saisir(page, 'l1', 'Notre fiche d’identité du document, assez longue.');
  await page.goto('seance-09/7-correction.html?now=11:06');
  await page.fill('#staticrypt-password', mdp);
  await page.getByRole('button', { name: 'Ouvrir la correction' }).click();
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(page.locator('h1')).toHaveText('La correction, pièces à l’appui');
  await expect(page.locator('.entete .phase-nom')).toHaveText('Correction');
  await expect(page.locator('.carte-indice')).toHaveCount(6);
  await expect(page.locator('details.corr')).toHaveCount(8);
  await expect(page.locator('[data-doc-chasse] [data-z]')).toHaveCount(75);

  // L1 est l’indice en cours, sa réponse proposée reste cachée.
  const l1 = page.locator('#indice-l1');
  await expect(l1).toHaveAttribute('data-etat', 'actif');
  await expect(l1.locator('.corrige')).toBeHidden();
  await expect(page.locator('[data-consigne-chasse]')).toContainText('Indice L1.');

  // Deux passages ratés : message, puis aide.
  await page.click('[data-z="s1"]');
  await expect(page.locator('[data-annonce-chasse]')).toContainText('Pas ici.');
  await expect(l1.locator('[data-aide-indice]')).toBeHidden();
  await page.click('[data-z="s2"]');
  await expect(l1.locator('[data-aide-indice]')).toBeVisible();

  // Le bon passage : réponse proposée et réponse de l’équipe côte à côte.
  await page.click('[data-z="leg2-champ"]');
  await expect(l1).toHaveAttribute('data-etat', 'trouve');
  await expect(l1.locator('.corrige')).toBeVisible();
  await expect(l1.locator('[data-votre-reponse]')).toContainText('Notre fiche d’identité du document');
  await expect(page.locator('[data-z="leg2-champ"]')).toHaveClass(/indice-pose/);
  await expect(page.locator('#indice-l2')).toHaveAttribute('data-etat', 'actif');

  // « Montrer l’indice » : surligné, sans points.
  await page.click('#indice-l2 [data-montrer]');
  await expect(page.locator('#indice-l2')).toHaveAttribute('data-etat', 'montre');
  await expect(page.locator('[data-z="sous-titre"]')).toHaveClass(/indice-pose/);

  // L3 au clavier, avec deux passages à trouver.
  await page.focus('[data-z="grp-taille"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-annonce-chasse]')).toContainText('Encore 1 passage');
  await page.focus('[data-z="grp-secteur"]');
  await page.keyboard.press(' ');
  await expect(page.locator('#indice-l3')).toHaveAttribute('data-etat', 'trouve');

  // Choisir un autre indice que le suivant.
  await page.click('#indice-l6 [data-chercher]');
  await expect(page.locator('#indice-l6')).toHaveAttribute('data-etat', 'actif');
  await expect(page.locator('#indice-l4')).toHaveAttribute('data-etat', 'a-chercher');

  // Partie Définir et citer : la réponse de l’équipe est rappelée.
  await page.click('#c-a1 > summary');
  await expect(page.locator('#c-a1 [data-votre-reponse]')).toContainText('Ma citation de test pour A1');
  await page.getByRole('button', { name: 'J’ai lu la correction' }).click();
  await page.waitForTimeout(450);
  const e = await etat(page);
  expect(e.indices.L1.trouve).toBe(true);
  expect(e.indices.L1.essais).toBe(3);
  expect(e.indices.L2.montre).toBe(true);
  expect(e.indices.L2.trouve).toBe(false);
  expect(e.indices.L3.trouves).toEqual(['grp-taille', 'grp-secteur']);
  expect(e.lu.correction).toBeTruthy();
  // a1 et l1 (2 × 10) + deux indices trouvés sans aide (2 × 5) + lecture (10)
  await expect(page.locator('.pastille-equipe .points')).toHaveText(/^40\s*pts$/);

  // Option « se souvenir » : pas de nouvelle demande, chasse restaurée.
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(page.locator('h1')).toHaveText('La correction, pièces à l’appui');
  await expect(l1).toHaveAttribute('data-etat', 'trouve');
  await expect(page.locator('[data-z="grp-secteur"]')).toHaveClass(/indice-pose/);
  await expect(page.locator('[data-z="sous-titre"]')).toHaveClass(/indice-pose/);
  await expect(page.locator('#indice-l4')).toHaveAttribute('data-etat', 'actif');
});
