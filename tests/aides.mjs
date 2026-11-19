// Outils communs aux tests.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
export const RACINE = path.resolve(ici, '..');
export const PROGRAMME = JSON.parse(fs.readFileSync(path.join(RACINE, 'docs', 'data', 'schedule.json'), 'utf8'));
export const CLE = 'fabrique:s09:v1';

export const PAGES = [
  'index.html',
  'seance-09/index.html',
  'seance-09/1-cadre.html',
  'seance-09/2-methode.html',
  'seance-09/3-chercher.html',
  'seance-09/4-citer-lecture.html',
  'seance-09/5-citer-pratique.html',
  'seance-09/5b-correction-definir.html',
  'seance-09/pause.html',
  'seance-09/6-lire.html',
  'seance-09/7-correction.html',
  'seance-09/8-notes.html',
  'seance-09/9-video.html',
  'seance-09/aller-plus-loin.html',
  'seance-09/10-fin.html',
  'prof/projecteur.html',
  'prof/deroule.html',
  'prof/reponses.html'
];

// Heure « HH:MM:SS » à partir d’une minute de séance (départ 9 h 00).
export function heure(minute, secondes = 0) {
  const total = 9 * 3600 + Math.round(minute * 60) + secondes;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// Ouvre une page à une heure simulée et attend que les modules soient prêts.
// Les envois partent vers un relais simulé, propre à la page : seuls les tests
// de collecte.spec.mjs utilisent le faux relais partagé du serveur de test.
export async function ouvrir(page, chemin, now) {
  if (!page.__relaisSimule) { await relaisSimule(page); }
  const sep = chemin.includes('?') ? '&' : '?';
  const ancre = chemin.includes('#') ? chemin.slice(chemin.indexOf('#')) : '';
  const base = ancre ? chemin.slice(0, chemin.indexOf('#')) : chemin;
  await page.goto(base + (now ? sep + 'now=' + now : '') + ancre);
  await page.waitForFunction(() => document.documentElement.classList.contains('js-pret'));
}

export async function etat(page) {
  return page.evaluate((cle) => JSON.parse(localStorage.getItem(cle) || '{}'), CLE);
}

// Saisit un texte dans un champ et attend l’écriture différée.
export async function saisir(page, id, texte) {
  await page.fill('[data-id="' + id + '"]', texte);
  await page.waitForTimeout(450);
}

export const LONG = 'Réponse de test suffisamment longue pour valider le champ requis.';

// Intercepte les envois au relais. echec : 'reseau' (connexion coupée) ou un statut HTTP.
export async function relaisSimule(page, { echec = null } = {}) {
  page.__relaisSimule = true;
  const envois = [];
  await page.route('**/faux-relais/**', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    envois.push(route.request().postData() || '');
    if (echec === 'reseau') { await route.abort('connectionfailed'); return; }
    if (echec) { await route.fulfill({ status: echec, contentType: 'application/json', body: '{"error":"test"}' }); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"id":"test","event":"message"}' });
  });
  return envois;
}

// Passe la porte d’une page (« Envoyer et ouvrir… ») si elle est affichée.
export async function passerPorte(page) {
  const porte = page.locator('[data-porte]');
  if (await porte.isVisible()) {
    await porte.locator('[data-porte-ouvrir]').click();
    await porte.waitFor({ state: 'hidden' });
  }
}
