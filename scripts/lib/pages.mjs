// Outils partagés par les scripts : liste des pages, lecture du HTML,
// extraction du texte visible et comptage des mots.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';

const ici = path.dirname(fileURLToPath(import.meta.url));
export const RACINE = path.resolve(ici, '..', '..');
export const DOCS = path.join(RACINE, 'docs');

export function cheminRelatif(p) { return path.relative(RACINE, p); }

export function listerHTML(dossier) {
  const sortie = [];
  if (!fs.existsSync(dossier)) { return sortie; }
  for (const nom of fs.readdirSync(dossier)) {
    const p = path.join(dossier, nom);
    const st = fs.statSync(p);
    if (st.isDirectory()) { sortie.push(...listerHTML(p)); } else if (nom.endsWith('.html')) { sortie.push(p); }
  }
  return sortie.sort();
}

export function lire(p) {
  const html = fs.readFileSync(p, 'utf8');
  const { document } = parseHTML(html);
  return { html, document };
}

export function mots(texte) {
  return (String(texte || '').match(/[\p{L}\p{N}][\p{L}\p{N}’'·.,\-]*/gu) || []).length;
}

export function texte(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

// Retire d’un clone ce qui n’est pas lu par défaut ou qui est compté à part.
export function texteDeLecture(racine, options = {}) {
  if (!racine) { return ''; }
  const clone = racine.cloneNode(true);
  const retirer = [
    'script', 'style', 'template', '[hidden]', '.notes-cachees', '.fbs', '.fb',
    '.pager', 'nav', 'footer', 'header', '.visuellement-cache', 'textarea', 'input',
    '.qcm', '.q', '.depot', '[data-carnet]', '[data-carte-quetes]', '[data-phrase]',
    '[data-deroule]', '.compteur-quete', '.boite-note', '.rangee-boutons', 'button'
  ].concat(options.retirer || []);
  clone.querySelectorAll(retirer.join(',')).forEach((n) => n.remove());
  // Les blocs repliés ne comptent que pour leur titre.
  clone.querySelectorAll('details:not([open])').forEach((d) => {
    [...d.children].forEach((c) => { if (c.tagName !== 'SUMMARY') { c.remove(); } });
  });
  return texte(clone);
}
