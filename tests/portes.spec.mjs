// Envoyer pour passer : chaque quête s’ouvre quand le travail de la
// précédente est envoyé à l’enseignant, d’un clic, sans mot de passe.
import { test, expect } from '@playwright/test';
import { ouvrir, saisir, etat, LONG, relaisSimule } from './aides.mjs';

test('quête 2 : la porte demande d’envoyer le travail de la quête 1', async ({ page }) => {
  const envois = await relaisSimule(page);
  await ouvrir(page, 'seance-09/3-chercher.html', '09:12');
  await saisir(page, 'a2', LONG);
  // Arrivée par le menu, sans passer par le bouton d’envoi, hors des deux
  // minutes qui suivent le passage de 9 h 22 (pas d’envoi automatique).
  await ouvrir(page, 'seance-09/4-citer-lecture.html', '09:25');
  const porte = page.locator('[data-porte="definir"]');
  await expect(porte).toBeVisible();
  await expect(porte).toContainText('La quête 2, Citer, s’ouvre quand votre travail de la quête 1, Définir, est envoyé');
  await expect(page.locator('main [data-porte-masque]').first()).toBeHidden();
  await expect(page.locator('.pager')).toBeVisible();
  await porte.getByRole('button', { name: 'Envoyer et ouvrir la quête 2' }).click();
  const note = page.locator('[data-porte-note]');
  await expect(note).toContainText('Votre travail a été envoyé à l’enseignant');
  await expect(note).toContainText('Quête 2 débloquée.');
  await expect(porte).toBeHidden();
  await expect(page.locator('main [data-porte-masque]')).toHaveCount(0);
  expect(envois.length).toBeGreaterThan(0);
  await expect.poll(async () => !!((await etat(page)).lu || {})['porte-definir']).toBe(true);
});

test('le bouton de fin de quête envoie le travail, puis ouvre la quête suivante', async ({ page }) => {
  const envois = await relaisSimule(page);
  await ouvrir(page, 'seance-09/3-chercher.html', '09:12');
  await saisir(page, 'a2', LONG);
  await page.locator('.pager').getByRole('link', { name: 'Envoyer et passer à Citer' }).click();
  await expect(page).toHaveURL(/4-citer-lecture\.html/);
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  expect(envois.length).toBeGreaterThan(0);
  await expect(page.locator('[data-porte="definir"]')).toBeHidden();
  await expect(page.locator('[data-porte-note]')).toContainText('Quête 2 débloquée.');

  // Rien de nouveau depuis l’envoi : la quête 3 s’ouvre seule.
  await ouvrir(page, 'seance-09/6-lire.html', '09:41');
  await expect(page.locator('[data-porte="citer"]')).toBeHidden();
  await expect(page.locator('#doc-titre, .lecture-split').first()).toBeVisible();
  await expect.poll(async () => !!((await etat(page)).lu || {})['porte-citer']).toBe(true);
});

test('quête 4 : la porte fait le dépôt de l’étude', async ({ page }) => {
  const envois = await relaisSimule(page);
  await ouvrir(page, 'seance-09/6-lire.html#analyser', '10:40');
  await saisir(page, 'l1', LONG);
  await ouvrir(page, 'seance-09/8-notes.html', '11:10');
  const porte = page.locator('[data-porte="lire"]');
  await expect(porte).toBeVisible();
  await expect(porte).toContainText('La quête 4, Noter');
  await porte.getByRole('button', { name: 'Envoyer et ouvrir la quête 4' }).click();
  await expect(page.locator('[data-porte-note]')).toContainText('Quête 4 débloquée.');
  await expect(page.locator('.conseils')).toBeVisible();
  expect(envois.length).toBeGreaterThan(0);
  await expect.poll(async () => (((await etat(page)).depots || {}).parcours || {}).via).toBe('envoi');
});

test('recharger une page de la quête en cours ne ferme rien', async ({ page }) => {
  await ouvrir(page, 'seance-09/5-citer-pratique.html', '09:28');
  await saisir(page, 'c1', LONG);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
  await expect(page.locator('[data-porte]')).toBeHidden();
  await expect(page.locator('[data-id="c1"]')).toBeVisible();
});

test('une équipe sans travail dans la quête précédente passe librement', async ({ page }) => {
  for (const [chemin, heure] of [['seance-09/4-citer-lecture.html', '09:23'], ['seance-09/6-lire.html', '09:41'], ['seance-09/9-video.html', '11:20']]) {
    await ouvrir(page, chemin, heure);
    await expect(page.locator('[data-porte]')).toBeHidden();
    await expect(page.locator('main [data-porte-masque]')).toHaveCount(0);
  }
});

test('la porte s’ouvre seule quand l’envoi automatique du passage aboutit', async ({ page }) => {
  const envois = await relaisSimule(page);
  await ouvrir(page, 'seance-09/3-chercher.html', '09:12');
  await saisir(page, 'a2', LONG);
  // Juste après le passage de 9 h 22 : les réponses partent toutes seules.
  await ouvrir(page, 'seance-09/4-citer-lecture.html', '09:22:30');
  await expect(page.locator('[data-porte="definir"]')).toBeHidden();
  await expect(page.locator('main [data-porte-masque]')).toHaveCount(0);
  expect(envois.length).toBeGreaterThan(0);
  await expect.poll(async () => !!((await etat(page)).lu || {})['porte-definir']).toBe(true);
});

test('un téléchargement ne suffit pas pour ouvrir la correction de l’étude', async ({ page }) => {
  await relaisSimule(page);
  await ouvrir(page, 'seance-09/6-lire.html#analyser', '10:40');
  await saisir(page, 'l1', LONG);
  await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-depot="parcours"] [data-action="telecharger"]').click()
  ]);
  await ouvrir(page, 'seance-09/7-correction.html', '11:05');
  await expect(page.locator('[data-porte="lire"]')).toBeVisible();
  await page.getByRole('button', { name: 'Envoyer et voir la correction' }).click();
  await expect(page.locator('#c-l1 .modele')).toBeVisible();
  await expect.poll(async () => (((await etat(page)).depots || {}).parcours || {}).via).toBe('envoi');
});
