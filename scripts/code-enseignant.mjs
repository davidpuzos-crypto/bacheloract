// Crée (ou change) le code enseignant de la page « Réponses des équipes ».
// Usage :
//   node scripts/code-enseignant.mjs                 nouveau code tiré au hasard
//   node scripts/code-enseignant.mjs "mon code"      code choisi (16 caractères au moins)
//   node scripts/code-enseignant.mjs --nouveaux-sujets   change aussi les sujets du relais
//
// Le script écrit dans docs/data/config.json les clés publiques et le coffre
// qui protège les clés privées. Le code n’est écrit nulle part : il s’affiche
// une seule fois, notez-le. Après un changement de code, les réponses déjà
// envoyées ne sont plus lisibles avec le nouveau code : changez-le entre deux
// séances, pas pendant.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerCles, nouveauCode, normaliserCode } from '../docs/assets/js/chiffre.js';

const ici = path.dirname(fileURLToPath(import.meta.url));
const FICHIER = path.resolve(ici, '..', 'docs', 'data', 'config.json');

function sujetAleatoire() {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';
  const o = globalThis.crypto.getRandomValues(new Uint8Array(14));
  return 'fabrique-s09-' + [...o].map((x) => a[x % a.length]).join('');
}

const args = process.argv.slice(2);
const nouveauxSujets = args.includes('--nouveaux-sujets');
const choisi = args.find((a) => !a.startsWith('--'));
if (choisi && normaliserCode(choisi).length < 16) {
  console.error('Code trop court : 16 caractères au moins (espaces et tirets non comptés).');
  process.exit(1);
}
const code = choisi || nouveauCode();
const config = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
const c = config.collecte || {};
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
