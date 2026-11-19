// Crée (ou change) le code enseignant de la page « Réponses des équipes ».
// Usage :
//   node scripts/code-enseignant.mjs                      nouvelles clés, code tiré au hasard
//   node scripts/code-enseignant.mjs "mon code"           nouvelles clés, code choisi
//   node scripts/code-enseignant.mjs "mon code" --ancien-code "code actuel"
//                                                         change seulement le code : les clés
//                                                         restent, les réponses déjà envoyées
//                                                         restent lisibles
//   node scripts/code-enseignant.mjs --nouveaux-sujets    change aussi les sujets du relais
//
// Le script écrit dans docs/data/config.json les clés publiques et le coffre
// qui protège les clés privées. Le code n’est écrit nulle part : notez-le.
// Avec de nouvelles clés, les réponses envoyées avant ne sont plus lisibles :
// changez de clés entre deux séances, pas pendant.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerCles, changerCodeCoffre, nouveauCode, normaliserCode } from '../docs/assets/js/chiffre.js';

const ici = path.dirname(fileURLToPath(import.meta.url));
const FICHIER = path.resolve(ici, '..', 'docs', 'data', 'config.json');

function sujetAleatoire() {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';
  const o = globalThis.crypto.getRandomValues(new Uint8Array(14));
  return 'fabrique-s09-' + [...o].map((x) => a[x % a.length]).join('');
}

const args = process.argv.slice(2);
const nouveauxSujets = args.includes('--nouveaux-sujets');
const iAncien = args.indexOf('--ancien-code');
const ancien = iAncien >= 0 ? args[iAncien + 1] : null;
const choisi = args.find((a, i) => !a.startsWith('--') && i !== iAncien + 1);
if (choisi && normaliserCode(choisi).length < 4) {
  console.error('Code trop court : 4 caractères au moins.');
  process.exit(1);
}
if (choisi && normaliserCode(choisi).length < 12) {
  console.warn('Attention : un code court se devine plus facilement.');
}
const code = choisi || nouveauCode();
const config = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
const c = config.collecte || {};

if (ancien) {
  const coffre = await changerCodeCoffre(c.coffre, ancien, code);
  if (!coffre) { console.error('L’ancien code n’ouvre pas le coffre de docs/data/config.json. Rien n’a changé.'); process.exit(1); }
  config.collecte.coffre = coffre;
  fs.writeFileSync(FICHIER, JSON.stringify(config, null, 2) + '\n');
  console.log('Code changé, clés conservées : les réponses déjà envoyées restent lisibles.');
  console.log('Nouveau code : ' + code);
  process.exit(0);
}

const cles = await creerCles(code);
const sujet = (!nouveauxSujets && c.sujet) || sujetAleatoire();
config.collecte = {
  actif: c.actif !== false,
  relais: c.relais || 'https://ntfy.sh',
  sujet,
  sujetHorloge: (!nouveauxSujets && c.sujetHorloge) || sujet + '-horloge',
  clePublique: cles.clePublique,
  cleSignature: cles.cleSignature,
  coffre: cles.coffre,
  premierEnvoiSecondes: c.premierEnvoiSecondes || 20,
  relanceMinutes: c.relanceMinutes || 15,
  etalementSecondes: c.etalementSecondes ?? 20,
  horlogeMinutes: c.horlogeMinutes || 6,
  lectureSecondes: c.lectureSecondes || 40
};
fs.writeFileSync(FICHIER, JSON.stringify(config, null, 2) + '\n');
console.log('docs/data/config.json mis à jour.');
console.log('Code enseignant, à noter (il ne sera plus affiché) : ' + code);
