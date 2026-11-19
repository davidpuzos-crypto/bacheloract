// Partie vidéo : chacun·e prend ses notes à sa façon, hors du site, puis
// l’équipe compare ses notes à l’oral et fait un QCM de trois questions.
import { test, expect } from '@playwright/test';
import { ouvrir, etat, PROGRAMME } from './aides.mjs';

test('la page vidéo ne demande rien à écrire, seulement le QCM', async ({ page }) => {
  await ouvrir(page, 'seance-09/9-video.html', '11:20');
  await expect(page.locator('main textarea')).toHaveCount(0);
  await expect(page.locator('main [data-depot]')).toHaveCount(0);
  await expect(page.locator('#pendant')).toContainText('sur une feuille, sur son ordinateur ou autrement');
  await expect(page.locator('#pendant')).toContainText('Ce site ne sert pas à prendre les notes');
  await expect(page.locator('#comparer h2')).toHaveText('Comparez vos notes, en équipe');
  await expect(page.locator('#comparer .reflexes li')).toHaveCount(4);
  // Le plan de la vidéo est visible d’emblée pour comparer la structure des notes.
  await expect(page.locator('#comparer .plan-video')).toBeVisible();
  await expect(page.locator('#questions h2')).toHaveText('Le QCM, en équipe');
  await expect(page.locator('#questions fieldset.qcm')).toHaveCount(3);
  // Sur grand écran, la colonne « Sur cette page » suit les trois questions.
  await expect(page.locator('main .rail .rail-q')).toHaveCount(3);
});

test('horaire : huit minutes pour comparer, quatre pour le QCM', async () => {
  const froid = PROGRAMME.phases.find((p) => p.id === 'froid');
  const qcm = PROGRAMME.phases.find((p) => p.id === 'questions');
  expect([froid.label, froid.debut, froid.duree]).toEqual(['Comparer vos notes', 158, 8]);
  expect([qcm.label, qcm.debut, qcm.duree]).toEqual(['QCM sur la vidéo', 166, 4]);
  expect(qcm.debut + qcm.duree).toBe(PROGRAMME.phases.find((p) => p.id === 'ouverture').debut);
});

test('trois conseils et le QCM suffisent pour la quête Noter', async ({ page }) => {
  await ouvrir(page, 'seance-09/8-notes.html', '11:10');
  await expect(page.locator('.tete-page')).toContainText('Pas sur ce site');
  for (const n of ['2', '5', '7']) { await page.click('[data-conseil="' + n + '"]'); }
  await ouvrir(page, 'seance-09/9-video.html#questions', '11:47');
  await expect(page.locator('[data-mes-conseils] li')).toHaveCount(3);
  await page.check('#qcm-V4-a');
  await page.check('#qcm-V5-b');
  await page.check('#qcm-V6-b');
  await expect.poll(async () => !!((await etat(page)).quetes || {}).noter).toBe(true);
  const e = await etat(page);
  expect(e.qcm.V6.juste).toBe(true);
  // Badge Stratège : trois conseils choisis et le QCM juste.
  expect(e.badges.stratege).toBeTruthy();
});

test('le bilan ne propose plus de dépôt de la vidéo', async ({ page }) => {
  await ouvrir(page, 'seance-09/10-fin.html', '12:05');
  await expect(page.locator('main [data-depot]')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Dépôt express');
});
