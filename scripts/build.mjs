// Build du site : contrôle éditorial et budgets de temps, puis vérification
// des deux corrections. Ce sont des pages ordinaires de docs/seance-09/, sans
// mot de passe : chacune s’affiche quand l’équipe a envoyé son travail
// (docs/assets/js/porte.js).
//
//   node scripts/build.mjs

import fs from 'node:fs';
import path from 'node:path';
import { RACINE } from './lib/pages.mjs';
import { controler } from './lint-copy.mjs';

export const CORRECTIONS = [
  { nom: 'Correction de Définir et Citer', fichier: '5b-correction-definir.html', porte: 'definir' },
  { nom: 'Correction de l’étude', fichier: '7-correction.html', porte: 'parcours' }
];

function verifierCorrections() {
  let ok = true;
  for (const c of CORRECTIONS) {
    const f = path.join(RACINE, 'docs', 'seance-09', c.fichier);
    if (!fs.existsSync(f)) {
      console.error(c.nom + ' : docs/seance-09/' + c.fichier + ' est absent.');
      ok = false;
      continue;
    }
    const html = fs.readFileSync(f, 'utf8');
    if (!html.includes('data-porte="' + c.porte + '"') || !html.includes('data-porte-contenu')) {
      console.error(c.nom + ' : le bouton « Envoyer et voir la correction » manque.');
      ok = false;
      continue;
    }
    console.log(c.nom + ' : présente, elle s’ouvre après l’envoi du travail.');
  }
  return ok;
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(RACINE, 'scripts', 'build.mjs');
if (direct) {
  const bilan = await controler({ silencieux: false });
  if (!bilan.ok) {
    console.error('\nBuild arrêté : corrigez les erreurs du contrôle éditorial ci-dessus.');
    process.exit(1);
  }
  console.log('');
  process.exit(verifierCorrections() ? 0 : 1);
}
