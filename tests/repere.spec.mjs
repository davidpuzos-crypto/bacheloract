// Repère horaire « vous devriez en être là », d’après les repères de
// data/schedule.json.
import { test, expect } from '@playwright/test';
import { ouvrir, saisir, LONG } from './aides.mjs';

test('repère : question visée, retard puis « dans les temps », lien vers la question', async ({ page }) => {
  // Chercher commence à 9 h 08. À 9 h 16, le repère est B1.
  await ouvrir(page, 'seance-09/3-chercher.html', '09:16');
  const barre = page.locator('.repere-barre');
  await expect(barre).toBeVisible();
  await expect(barre).toContainText('vous devriez en être à la question B1');
  await expect(barre).toContainText('Vous avez du retard');
  await expect(barre).toHaveAttribute('data-etat', 'retard');
  await expect(page.locator('.q[data-q="b1"]')).toHaveClass(/q-repere/);
  await expect(page.locator('.drapeau-repere')).toHaveCount(1);

  for (const id of ['a1', 'a2']) { await saisir(page, id, LONG); }
  await page.check('#qcm-A3-b');
  await page.check('#b0-ses');
  await expect(barre).toContainText('Vous êtes dans les temps.');
  await expect(barre).toHaveAttribute('data-etat', 'ok');

  await page.locator('.repere-lien').click();
  await expect(page.locator('#f-b1')).toBeFocused();
});

test('repère : en retard, la ligne dit où être ; sur une page sans repère, rien', async ({ page }) => {
  // À 9 h 16, la séance en est à Chercher : la page Méthode est en retard.
  await ouvrir(page, 'seance-09/2-methode.html', '09:16');
  const barre = page.locator('.repere-barre');
  await expect(barre).toHaveAttribute('data-etat', 'ailleurs');
  await expect(barre.locator('.repere-heure')).toHaveText(/Il est 9\s*h\s*16\./);
  await expect(barre.locator('.repere-texte')).toHaveText(/Vous devriez être sur «\s*Chercher\s*», jusqu’à 9\s*h\s*22\./);
  // L’heure n’est pas dans la zone annoncée aux lecteurs d’écran.
  await expect(barre.locator('[aria-live] .repere-heure')).toHaveCount(0);
  await expect(barre.locator('.repere-lien')).toHaveAttribute('href', /3-chercher\.html/);
  await expect(page.locator('.drapeau-repere')).toHaveCount(0);
  // Bonne page, mais phase sans repère : la ligne se tait.
  await ouvrir(page, 'seance-09/4-citer-lecture.html', '09:23');
  await expect(barre).toBeHidden();
});
