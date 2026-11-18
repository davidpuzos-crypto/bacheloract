// Build du site : contrôle éditorial, budgets de temps, puis chiffrement de la
// correction avec StatiCrypt.
//
//   node scripts/build.mjs                    contrôle puis chiffre la correction
//   node scripts/build.mjs --sans-lint        chiffre sans relancer le contrôle
//   node scripts/build.mjs --verifier-seulement  contrôle que docs/ ne contient pas la correction en clair
//
// Le mot de passe est lu dans la variable d’environnement CORRECTION_PASSWORD,
// ou dans le fichier .env.local (ignoré par Git) : CORRECTION_PASSWORD=...

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RACINE } from './lib/pages.mjs';
import { controler } from './lint-copy.mjs';

const SOURCE = path.join(RACINE, 'private', 'seance-09', '7-correction.html');
const CIBLE = path.join(RACINE, 'docs', 'seance-09', '7-correction.html');
const MODELE = path.join(RACINE, 'scripts', 'staticrypt-modele.html');
const CONFIG_SEL = 'scripts/staticrypt.json';
const TEMOINS = ['Pièges fréquents', 'Ce qu’on attend', 'Réponse proposée', 'qcm-K1'];

const args = new Set(process.argv.slice(2));

function lireEnvLocal() {
  const p = path.join(RACINE, '.env.local');
  if (!fs.existsSync(p)) { return; }
  for (const ligne of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(ligne);
    if (m && !process.env[m[1]]) { process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
  }
}

function sortir(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function verifierCible() {
  if (!fs.existsSync(CIBLE)) { return { ok: false, message: 'docs/seance-09/7-correction.html est absent.' }; }
  const html = fs.readFileSync(CIBLE, 'utf8');
  const fuites = TEMOINS.filter((t) => html.includes(t));
  const config = JSON.parse(fs.readFileSync(path.join(RACINE, 'docs', 'data', 'config.json'), 'utf8'));
  const chiffrer = !config.options || config.options.chiffrerCorrection !== false;
  if (chiffrer && fuites.length) {
    return { ok: false, message: 'La correction publiée contient du texte en clair (' + fuites.join(', ') + '). Relancez le build avec le mot de passe.' };
  }
  if (chiffrer && !/staticryptConfig/.test(html)) {
    return { ok: false, message: 'La correction publiée ne semble pas chiffrée.' };
  }
  return { ok: true, message: chiffrer ? 'Correction publiée chiffrée, aucun texte en clair détecté.' : 'Correction publiée en clair (chiffrerCorrection: false).' };
}

if (args.has('--verifier-seulement')) {
  const v = verifierCible();
  console.log(v.message);
  process.exit(v.ok ? 0 : 1);
}

// 1. Contrôle éditorial et budgets
if (!args.has('--sans-lint')) {
  const bilan = await controler({ silencieux: false });
  if (!bilan.ok) { sortir('\nBuild arrêté : corrigez les erreurs du contrôle éditorial ci-dessus.'); }
}

// 2. Correction
const config = JSON.parse(fs.readFileSync(path.join(RACINE, 'docs', 'data', 'config.json'), 'utf8'));
const chiffrer = !config.options || config.options.chiffrerCorrection !== false;

if (!fs.existsSync(SOURCE)) {
  console.warn('\nAttention : private/seance-09/7-correction.html est absent. La correction publiée n’est pas modifiée.');
  console.warn('Restaurez le dossier private/ depuis votre sauvegarde (voir le README).');
  const v = verifierCible();
  console.log(v.message);
  process.exit(v.ok ? 0 : 1);
}

if (!chiffrer) {
  fs.copyFileSync(SOURCE, CIBLE);
  console.log('\nCorrection copiée en clair dans docs/ (option chiffrerCorrection: false).');
  console.log('À réserver à un dépôt privé : sinon, tout le monde peut la lire.');
  process.exit(0);
}

lireEnvLocal();
const motDePasse = process.env.CORRECTION_PASSWORD;
if (!motDePasse) {
  sortir('\nMot de passe absent. Créez un fichier .env.local contenant la ligne\nCORRECTION_PASSWORD=votre-mot-de-passe\npuis relancez : npm run build');
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fabrique-'));
const bin = path.join(RACINE, 'node_modules', '.bin', process.platform === 'win32' ? 'staticrypt.cmd' : 'staticrypt');
if (!fs.existsSync(bin)) { sortir('StatiCrypt n’est pas installé. Lancez d’abord : npm install'); }

const res = spawnSync(bin, [
  SOURCE,
  '--short',
  '--remember', '30',
  '--template', MODELE,
  '--template-error', 'Mot de passe incorrect.',
  '--config', CONFIG_SEL,
  '--directory', tmp
], { cwd: RACINE, env: Object.assign({}, process.env, { STATICRYPT_PASSWORD: motDePasse }), encoding: 'utf8' });

if (res.status !== 0) {
  sortir('Le chiffrement a échoué.\n' + (res.stderr || res.stdout || ''));
}

const produit = path.join(tmp, path.basename(SOURCE));
if (!fs.existsSync(produit)) { sortir('Fichier chiffré introuvable dans ' + tmp); }
fs.copyFileSync(produit, CIBLE);
fs.rmSync(tmp, { recursive: true, force: true });

const v = verifierCible();
console.log('\n' + v.message);
console.log('Écrit : docs/seance-09/7-correction.html');
process.exit(v.ok ? 0 : 1);
