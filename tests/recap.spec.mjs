// 4. Récapitulatif : contenu, ordre, manques signalés, téléchargement et copie.
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { ouvrir, saisir, etat, LONG } from './aides.mjs';

test('récapitulatif du parcours', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // Avant le premier point d’arrêt, toutes les pages restent accessibles.
  await ouvrir(page, 'seance-09/1-cadre.html', '09:10');
  await saisir(page, 'equipe', 'Les Curieuses');
  await saisir(page, 'nom1', 'Camille Martin');
  await saisir(page, 'nom2', 'Sacha Durand');
  await saisir(page, 'nom3', 'Lou Petit');
  await ouvrir(page, 'seance-09/3-chercher.html');
  await saisir(page, 'a1', 'Citation A1 de test, assez longue pour compter.');
  await page.check('#b0-sophia');
  await page.check('#qcm-A3-a');
  await saisir(page, 'a6', 'Bonus A6 de test, assez long pour être compté comme bonus.');
  await ouvrir(page, 'seance-09/5-citer-pratique.html');
  await saisir(page, 'c1', 'Deux citations de test pour C1, assez longues.');
  await page.check('#qcm-C-Q1-a');
  await ouvrir(page, 'seance-09/6-lire.html#depot');
  await saisir(page, 'l6', LONG);

  const zone = page.locator('[data-depot="parcours"]');
  await zone.locator('summary').click();
  const ta = zone.locator('[data-recap-texte]');
  await expect(ta).toHaveValue(/Parcours « Définir, citer, lire une étude »/);
  const texte = await ta.inputValue();
  expect(texte).toContain('Équipe. Les Curieuses');
  expect(texte).toContain('Membres. Camille Martin, Sacha Durand et Lou Petit');
  expect(texte).toMatch(/Temps passé par page, en minutes\./);
  expect(texte).toMatch(/Points d’enquête\. \d+\. Badges\. /);
  expect(texte).not.toMatch(/niveau|Stagiaire/i);
  expect(texte).toContain('Réponse. Citation A1 de test, assez longue pour compter.');
  expect(texte).toMatch(/A3\. première réponse A \(fausse\)/);
  expect(texte).toContain('A6 (bonus). Bonus facultatif.');
  expect(texte).toContain('B0. Quelle seconde source avez-vous choisie ?');
  expect(texte).toContain('Réponse. SophIA, puis un article ouvert sur Cairn');
  // Ordre des pages : Chercher, puis Citer, puis Lire.
  expect(texte.indexOf('A1.')).toBeLessThan(texte.indexOf('C1.'));
  expect(texte.indexOf('C1.')).toBeLessThan(texte.indexOf('L1.'));
  // Manques signalés
  expect(texte).toMatch(/Il manque encore .*B1/);
  expect(texte).toContain('Réponse. (pas de réponse)');
  // Détail des QCM et déclaration
  expect(texte).toContain('DÉTAIL DES QUESTIONS À CHOIX MULTIPLE');
  expect(texte).toMatch(/Q1 \(C-Q1\)\. première réponse A \(fausse\), réponse finale A \(fausse\), 1 essai/);
  expect(texte).toContain('M1. pas de réponse');
  expect(texte).not.toContain('DÉCLARATION D’USAGE DE L’IA');
  await expect(zone.locator('[data-recap-progres]')).toContainText('Il manque encore');

  // Téléchargement
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    zone.locator('[data-action="telecharger"]').click()
  ]);
  expect(telechargement.suggestedFilename()).toBe('s09_les-curieuses_parcours.txt');
  const contenu = fs.readFileSync(await telechargement.path(), 'utf8');
  expect(contenu).toContain('Membres. Camille Martin, Sacha Durand et Lou Petit');

  // Copie
  await zone.locator('[data-action="copier"]').click();
  await expect(zone.locator('[data-recap-statut]')).toHaveText('Récapitulatif copié. Collez-le dans un document pour le garder.');
  const presse = await page.evaluate(() => navigator.clipboard.readText());
  expect(presse).toContain('Membres. Camille Martin, Sacha Durand et Lou Petit');
  await page.waitForTimeout(450);
  const e = await etat(page);
  expect(e.depots.parcours.via).toBe('copie');
});
