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

function variableLocale(nom) {
  if (process.env[nom]) { return process.env[nom]; }
  const p = path.join(RACINE, '.env.local');
  if (!fs.existsSync(p)) { return null; }
  const m = new RegExp('^\\s*' + nom + '\\s*=\\s*(.*)\\s*$', 'm').exec(fs.readFileSync(p, 'utf8'));
  return m ? m[1].replace(/^["']|["']$/g, '') : null;
}

// Mots de passe des corrections (variables d’environnement ou .env.local).
export function motDePasse() { return variableLocale('CORRECTION_PASSWORD'); }
export function motDePasseDefinir() { return variableLocale('CORRECTION_DEFINIR_PASSWORD'); }
export function motDePassePour(chemin) {
  if (chemin.includes('5b-correction-definir')) { return motDePasseDefinir(); }
  if (chemin.includes('7-correction')) { return motDePasse(); }
  return null;
}

// Heure « HH:MM:SS » à partir d’une minute de séance (départ 9 h 00).
export function heure(minute, secondes = 0) {
  const total = 9 * 3600 + Math.round(minute * 60) + secondes;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// Ouvre une page à une heure simulée et attend que les modules soient prêts.
export async function ouvrir(page, chemin, now) {
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
