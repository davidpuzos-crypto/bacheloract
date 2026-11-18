// 4. Récapitulatif : contenu, ordre, manques signalés, téléchargement et copie.
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { ouvrir, saisir, etat, LONG } from './aides.mjs';

test('récapitulatif du parcours', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await ouvrir(page, 'seance-09/1-cadre.html', '10:40');
  await saisir(page, 'equipe', 'Les Curieuses');
  await saisir(page, 'nom1', 'Camille Martin');
  await saisir(page, 'nom2', 'Sacha Durand');
  await ouvrir(page, 'seance-09/3-chercher.html');
  await saisir(page, 'a1', 'Citation A1 de test, assez longue pour compter.');
  await page.check('#b0-sophia');
  await saisir(page, 'b4', 'Trace SophIA de test, assez longue pour compter.');
  await saisir(page, 'a6', 'Bonus A6 de test, assez long pour être compté comme bonus.');
  await ouvrir(page, 'seance-09/5-citer-pratique.html');
  await saisir(page, 'c1', 'Deux citations de test pour C1, assez longues.');
  await page.check('#qcm-C-Q1-a');
  await ouvrir(page, 'seance-09/6-lire.html#depot');
  await saisir(page, 'l6', LONG);
  await page.check('#u-sophia');
  await saisir(page, 'verif', 'Nous avons vérifié la référence dans l’article.');

  const zone = page.locator('[data-depot="parcours"]');
  await zone.locator('summary').click();
  const ta = zone.locator('[data-recap-texte]');
  await expect(ta).toHaveValue(/Parcours « Définir, citer, lire une étude »/);
  const texte = await ta.inputValue();
  expect(texte).toContain('Équipe. Les Curieuses');
  expect(texte).toContain('Binôme. Camille Martin et Sacha Durand');
  expect(texte).toMatch(/Temps passé par page, en minutes\./);
  expect(texte).toMatch(/Points d’expérience\. \d+, niveau /);
  expect(texte).toContain('Réponse. Citation A1 de test, assez longue pour compter.');
  expect(texte).toContain('B4. Vous avez utilisé SophIA.');
  expect(texte).toContain('A6 (bonus). Bonus facultatif.');
  expect(texte).toContain('B0. Quelle seconde source avez-vous choisie ?');
  expect(texte).toContain('Réponse. SophIA, puis un article ouvert sur Cairn');
  // Ordre des pages : Chercher, puis Citer, puis Lire.
  expect(texte.indexOf('A1.')).toBeLessThan(texte.indexOf('C1.'));
  expect(texte.indexOf('C1.')).toBeLessThan(texte.indexOf('L1.'));
  // Manques signalés
  expect(texte).toMatch(/Il manque encore .*A2/);
  expect(texte).toContain('Réponse. (pas de réponse)');
  // Détail des QCM et déclaration
  expect(texte).toContain('DÉTAIL DES QUESTIONS À CHOIX MULTIPLE');
  expect(texte).toMatch(/Q1 \(C-Q1\)\. première réponse A \(fausse\), réponse finale A \(fausse\), 1 essai/);
  expect(texte).toContain('M1. pas de réponse');
  expect(texte).toContain('DÉCLARATION D’USAGE DE L’IA');
  expect(texte).toContain('Nous avons utilisé SophIA.');
  expect(texte).toContain('Précision. Nous avons vérifié la référence dans l’article.');
  await expect(zone.locator('[data-recap-progres]')).toContainText('Il manque encore');

  // Téléchargement
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    zone.locator('[data-action="telecharger"]').click()
  ]);
  expect(telechargement.suggestedFilename()).toBe('s09_les-curieuses_parcours.txt');
  const contenu = fs.readFileSync(await telechargement.path(), 'utf8');
  expect(contenu).toContain('Binôme. Camille Martin et Sacha Durand');

  // Copie
  await zone.locator('[data-action="copier"]').click();
  await expect(zone.locator('[data-recap-statut]')).toHaveText('Récapitulatif copié. Collez-le dans le dépôt Moodle.');
  const presse = await page.evaluate(() => navigator.clipboard.readText());
  expect(presse).toContain('Binôme. Camille Martin et Sacha Durand');
  await page.waitForTimeout(450);
  const e = await etat(page);
  expect(e.depots.parcours.via).toBe('copie');
});

test('récapitulatif de la vidéo et dépôt express', async ({ page }) => {
  await ouvrir(page, 'seance-09/8-notes.html', '11:12');
  await page.click('[data-conseil="2"]');
  await page.click('[data-conseil="5"]');
  await ouvrir(page, 'seance-09/9-video.html#questions');
  await saisir(page, 's1', 'Trois phrases de test sur la vidéo, assez longues.');
  await page.check('#vu-3');
  const zone = page.locator('#questions [data-depot="video"]');
  await zone.locator('summary').click();
  await expect(zone.locator('[data-recap-texte]')).toHaveValue(/Conseils repérés dans les notes de l’autre\. 03/);
  const texte = await zone.locator('[data-recap-texte]').inputValue();
  expect(texte).toContain('Partie vidéo et prise de notes');
  expect(texte).toMatch(/02\. Écouter d’abord, écrire ensuite, avec ses propres mots\./);
  expect(texte).toContain('Notes. (notes prises sur papier)');
  expect(texte).toContain('Conseils repérés dans les notes de l’autre. 03');
  expect(texte).toContain('S1. Écrivez trois phrases sur la vidéo.');
  expect(texte).toMatch(/Il manque encore .*BP/);
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    zone.locator('[data-action="telecharger"]').click()
  ]);
  expect(telechargement.suggestedFilename()).toBe('s09_equipe_video.txt');
});
