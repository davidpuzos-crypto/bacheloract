// Build du site : contrôle éditorial, budgets de temps, puis chiffrement des
// deux corrections avec StatiCrypt, chacune avec son mot de passe.
//
//   node scripts/build.mjs                       contrôle puis chiffre les corrections
//   node scripts/build.mjs --sans-lint           chiffre sans relancer le contrôle
//   node scripts/build.mjs --verifier-seulement  vérifie que docs/ ne contient aucune correction en clair
//
// Mots de passe : variables d’environnement, ou fichier .env.local (ignoré par Git).
//   CORRECTION_DEFINIR_PASSWORD=...   correction de Définir et Citer (annoncé vers 9 h 40)
//   CORRECTION_PASSWORD=...           correction de l’étude de l’Insee (annoncé après le dépôt)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RACINE } from './lib/pages.mjs';
import { controler } from './lint-copy.mjs';

const MODELE = path.join(RACINE, 'scripts', 'staticrypt-modele.html');
const CONFIG_SEL = 'scripts/staticrypt.json';

// Témoins : textes qui n’apparaissent que dans les corrections en clair.
export const CORRECTIONS = [
  {
    nom: 'Correction de Définir et Citer',
    fichier: '5b-correction-definir.html',
    variable: 'CORRECTION_DEFINIR_PASSWORD',
    temoins: ['Conseils de méthode', 'Réponse proposée', 'La forme attendue', 'Marianne Blidon est']
  },
  {
    nom: 'Correction de l’étude',
    fichier: '7-correction.html',
    variable: 'CORRECTION_PASSWORD',
    temoins: ['Conseils de méthode', 'Réponse proposée', 'data-voir-passage', 'construction sociale de la différence']
  }
];

const source = (c) => path.join(RACINE, 'private', 'seance-09', c.fichier);
const cible = (c) => path.join(RACINE, 'docs', 'seance-09', c.fichier);
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

function chiffrementActif() {
  const config = JSON.parse(fs.readFileSync(path.join(RACINE, 'docs', 'data', 'config.json'), 'utf8'));
  return !config.options || config.options.chiffrerCorrection !== false;
}

function verifierCible(c) {
  const f = cible(c);
  if (!fs.existsSync(f)) { return { ok: false, message: 'docs/seance-09/' + c.fichier + ' est absent.' }; }
  const html = fs.readFileSync(f, 'utf8');
  const chiffrer = chiffrementActif();
  const fuites = c.temoins.filter((t) => html.includes(t));
  if (chiffrer && fuites.length) {
    return { ok: false, message: c.nom + ' : texte en clair dans la page publiée (' + fuites.join(', ') + '). Relancez le build avec le mot de passe.' };
  }
  if (chiffrer && !/staticryptConfig/.test(html)) {
    return { ok: false, message: c.nom + ' : la page publiée ne semble pas chiffrée.' };
  }
  return { ok: true, message: c.nom + (chiffrer ? ' publiée chiffrée, aucun texte en clair détecté.' : ' publiée en clair (chiffrerCorrection: false).') };
}

function verifierTout() {
  let ok = true;
  CORRECTIONS.forEach((c) => {
    const v = verifierCible(c);
    console.log(v.message);
    ok = ok && v.ok;
  });
  return ok;
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(RACINE, 'scripts', 'build.mjs');
if (direct) {
  if (args.has('--verifier-seulement')) { process.exit(verifierTout() ? 0 : 1); }

  // 1. Contrôle éditorial et budgets
  if (!args.has('--sans-lint')) {
    const bilan = await controler({ silencieux: false });
    if (!bilan.ok) { sortir('\nBuild arrêté : corrigez les erreurs du contrôle éditorial ci-dessus.'); }
  }

  // 2. Corrections
  const chiffrer = chiffrementActif();
  lireEnvLocal();
  const bin = path.join(RACINE, 'node_modules', '.bin', process.platform === 'win32' ? 'staticrypt.cmd' : 'staticrypt');
  console.log('');
  for (const c of CORRECTIONS) {
    if (!fs.existsSync(source(c))) {
      console.warn('Attention : private/seance-09/' + c.fichier + ' est absent. La page publiée n’est pas modifiée.');
      console.warn('Restaurez le dossier private/ depuis votre sauvegarde (voir le README).');
      continue;
    }
    if (!chiffrer) {
      fs.copyFileSync(source(c), cible(c));
      console.log(c.nom + ' copiée en clair dans docs/ (option chiffrerCorrection: false). À réserver à un dépôt privé.');
      continue;
    }
    const motDePasse = process.env[c.variable];
    if (!motDePasse) {
      sortir('Mot de passe absent pour « ' + c.nom + ' ». Ajoutez au fichier .env.local la ligne\n' + c.variable + '=votre-mot-de-passe\npuis relancez : npm run build');
    }
    if (!fs.existsSync(bin)) { sortir('StatiCrypt n’est pas installé. Lancez d’abord : npm install'); }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fabrique-'));
    const res = spawnSync(bin, [
      source(c),
      '--short',
      '--remember', '30',
      '--template', MODELE,
      '--template-error', 'Mot de passe incorrect.',
      '--config', CONFIG_SEL,
      '--directory', tmp
    ], { cwd: RACINE, env: Object.assign({}, process.env, { STATICRYPT_PASSWORD: motDePasse }), encoding: 'utf8' });
    if (res.status !== 0) { sortir('Le chiffrement a échoué (' + c.nom + ').\n' + (res.stderr || res.stdout || '')); }
    const produit = path.join(tmp, c.fichier);
    if (!fs.existsSync(produit)) { sortir('Fichier chiffré introuvable dans ' + tmp); }
    fs.copyFileSync(produit, cible(c));
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('Écrit : docs/seance-09/' + c.fichier);
  }
  if (chiffrer) {
    const a = process.env.CORRECTION_DEFINIR_PASSWORD;
    const b = process.env.CORRECTION_PASSWORD;
    if (a && b && a === b) { console.warn('Attention : les deux corrections ont le même mot de passe. La correction de l’étude serait lisible dès 9 h 40.'); }
  }
  process.exit(verifierTout() ? 0 : 1);
}
