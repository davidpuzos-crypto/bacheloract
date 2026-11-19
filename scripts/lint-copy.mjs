// Contrôle éditorial automatique des textes visibles par les étudiant·es
// (section 12 du cahier des charges). Le build échoue si une règle est violée.
// Usage : node scripts/lint-copy.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RACINE, DOCS, listerHTML, lire, cheminRelatif } from './lib/pages.mjs';
import { calculerBudgets, ecrireMarkdown } from './budget.mjs';

const IGNORER = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'KBD', 'SAMP', 'SVG', 'TEMPLATE']);
const ATTRIBUTS = ['aria-label', 'title', 'placeholder', 'alt'];
const FLECHES = /[→←↑↓⟶⟵➜➔➝⇒⇐]|->|<-/;
const DEUX_POINTS_MAX = 1;

function ancetres(n) {
  const l = [];
  for (let p = n.parentNode; p && p.nodeType === 1; p = p.parentNode) { l.push(p); }
  return l;
}
function dans(n, test) { return ancetres(n).some(test); }
function aClasse(el, c) { return el.classList && el.classList.contains(c); }
function lint(el, valeur) { return el.getAttribute && (el.getAttribute('data-lint') || '').split(/\s+/).includes(valeur); }

function noeudsTexte(racine) {
  const sortie = [];
  (function parcourir(n) {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) { sortie.push(c); } else if (c.nodeType === 1 && !IGNORER.has(c.nodeName.toUpperCase())) { parcourir(c); }
    }
  })(racine);
  return sortie;
}

function extrait(t) {
  const s = t.replace(/\s+/g, ' ').trim();
  return s.length > 90 ? s.slice(0, 87) + '…' : s;
}

function controlerTexte(t, ou, ctx) {
  const { erreur, avertir, exemptTirets, exemptDeuxPoints, exemptFleches } = ctx;
  if (/'/.test(t)) { erreur(ou, 'apostrophe droite', t); }
  if (!exemptTirets && /[–—]/.test(t)) { erreur(ou, 'tiret long ou demi-cadratin', t); }
  if (/cours magistral/i.test(t)) { erreur(ou, '« cours magistral » est à proscrire', t); }
  if (/[^\s.!?…«]\s+Académique/.test(t)) { erreur(ou, '« académique » s’écrit en minuscule', t); }
  if (/\bco-(fondat|direct)/i.test(t)) { erreur(ou, 'pas de trait d’union dans cofondateur ou codirecteur', t); }
  if (/\S {2,}\S/.test(t)) { erreur(ou, 'double espace', t); }
  if (!exemptFleches && FLECHES.test(t)) { erreur(ou, 'flèche décorative', t); }
  if (/(?<![\p{L}’'])(tu|toi|ton|tes)(?![\p{L}’'])/iu.test(t)) { erreur(ou, 'tutoiement', t); }
  if (!exemptTirets && /(?<![\p{L}])(étudiants|les auteurs)(?![\p{L}])/u.test(t)) { avertir(ou, 'écriture inclusive attendue (étudiant·es, auteur·es)', t); }
  if (!exemptDeuxPoints) {
    const sansCitations = t.replace(/«[^»]*»/g, '').replace(/\d:\d/g, '');
    const n = (sansCitations.match(/:/g) || []).length;
    return n;
  }
  return 0;
}

export function controlerDocument(document, fichier, erreur, avertir) {
  let deuxPoints = 0;
  const lieux = [];
  for (const n of noeudsTexte(document)) {
    const t = n.nodeValue;
    if (!t || !t.trim()) { continue; }
    const parent = n.parentNode;
    const exemptTirets = dans(n, (e) => lint(e, 'citation'));
    const exemptVerbatim = dans(n, (e) => lint(e, 'verbatim') || lint(e, 'citation'));
    const exemptDeuxPoints = exemptVerbatim || dans(n, (e) => aClasse(e, 'leg') || aClasse(e, 'modele') || aClasse(e, 'signature')
      || ['TABLE', 'ABBR', 'CITE', 'TITLE', 'TEXTAREA'].includes(e.nodeName.toUpperCase()));
    const exemptFleches = exemptVerbatim || dans(n, (e) => e.hasAttribute && e.hasAttribute('data-symbole'));
    const n2 = controlerTexte(t, fichier, { erreur, avertir, exemptTirets, exemptDeuxPoints, exemptFleches });
    if (n2) { deuxPoints += n2; lieux.push(extrait(t)); }
    if (parent && ['BUTTON', 'A'].includes(parent.nodeName.toUpperCase()) && FLECHES.test(t) && !exemptFleches) {
      erreur(fichier, 'flèche dans un libellé de bouton ou de lien', t);
    }
  }
  if (deuxPoints > DEUX_POINTS_MAX) {
    erreur(fichier, deuxPoints + ' deux-points dans le texte rédigé (au plus ' + DEUX_POINTS_MAX + ')', lieux.join(' | '));
  }
  // Attributs visibles ou lus par les lecteurs d’écran
  document.querySelectorAll('[aria-label],[title],[placeholder],[alt]').forEach((el) => {
    for (const a of ATTRIBUTS) {
      const v = el.getAttribute(a);
      if (!v) { continue; }
      if (/'/.test(v)) { erreur(fichier, 'apostrophe droite dans l’attribut ' + a, v); }
      if (/[–—]/.test(v)) { erreur(fichier, 'tiret long dans l’attribut ' + a, v); }
    }
  });
  const desc = document.querySelector('meta[name="description"]');
  if (desc && /'|[–—]/.test(desc.getAttribute('content') || '')) { erreur(fichier, 'apostrophe droite ou tiret dans la description', desc.getAttribute('content')); }
  // Pas de listes à puces dans les consignes
  document.querySelectorAll('ul, ol').forEach((l) => {
    const cls = (l.getAttribute('class') || '').trim();
    const dansConsigne = dans(l, (e) => aClasse(e, 'q') || aClasse(e, 'indice') || aClasse(e, 'consigne') || aClasse(e, 'prose'));
    if (!cls || dansConsigne) { erreur(fichier, 'liste à puces dans une consigne ou liste sans composant', extrait(l.textContent)); }
  });
  // Langue
  const html = document.documentElement;
  if (html && html.getAttribute('lang') !== 'fr') { erreur(fichier, 'attribut lang="fr" manquant', ''); }
}

function controlerJS(erreur) {
  const dossier = path.join(DOCS, 'assets', 'js');
  for (const nom of fs.readdirSync(dossier)) {
    if (!nom.endsWith('.js')) { continue; }
    const p = path.join(dossier, nom);
    const src = fs.readFileSync(p, 'utf8');
    const chaines = src.match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) || [];
    for (const c of chaines) {
      if (/[–—]/.test(c)) { erreur(cheminRelatif(p), 'tiret long dans un texte', c); }
      if (/cours magistral/i.test(c)) { erreur(cheminRelatif(p), '« cours magistral »', c); }
      if (FLECHES.test(c) && !/=>/.test(c)) { erreur(cheminRelatif(p), 'flèche dans un texte', c); }
    }
  }
}

function controlerDonnees(erreur) {
  const p = path.join(DOCS, 'data', 'schedule.json');
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const ph of d.phases) {
    for (const k of ['label', 'stopMot', 'stopTexte', 'stopBouton']) {
      const v = ph[k];
      if (!v) { continue; }
      if (/'/.test(v)) { erreur('docs/data/schedule.json', 'apostrophe droite (' + ph.id + '.' + k + ')', v); }
      if (/[–—]/.test(v)) { erreur('docs/data/schedule.json', 'tiret long (' + ph.id + '.' + k + ')', v); }
      if (FLECHES.test(v)) { erreur('docs/data/schedule.json', 'flèche (' + ph.id + '.' + k + ')', v); }
    }
  }
}

export async function controler({ silencieux = false } = {}) {
  const erreurs = [];
  const avertissements = [];
  const erreur = (f, regle, t) => erreurs.push({ f, regle, t: extrait(String(t || '')) });
  const avertir = (f, regle, t) => avertissements.push({ f, regle, t: extrait(String(t || '')) });

  const fichiers = listerHTML(DOCS);
  let controles = 0;
  for (const f of fichiers) {
    const { document } = lire(f);
    controlerDocument(document, cheminRelatif(f), erreur, avertir);
    controles += 1;
  }
  controlerJS(erreur);
  controlerDonnees(erreur);

  const budgets = calculerBudgets();
  for (const b of budgets) {
    if (b.absent) { avertir(b.ph.fichier, 'fichier absent, budget non calculé', ''); continue; }
    b.alertes.forEach((a) => erreur(b.ph.fichier, 'budget de la phase « ' + b.ph.titre + ' » dépassé', a));
  }
  fs.mkdirSync(path.join(RACINE, 'docs-internes'), { recursive: true });
  fs.writeFileSync(path.join(RACINE, 'docs-internes', 'budget-temps.md'), ecrireMarkdown(budgets));

  if (!silencieux) {
    console.log('Contrôle éditorial : ' + controles + ' pages, scripts et données.');
    for (const a of avertissements) { console.log('  ! ' + a.f + ' : ' + a.regle + (a.t ? ' « ' + a.t + ' »' : '')); }
    for (const e of erreurs) { console.log('  ✗ ' + e.f + ' : ' + e.regle + (e.t ? ' « ' + e.t + ' »' : '')); }
    console.log(erreurs.length ? erreurs.length + ' erreur(s).' : 'Aucune erreur. Budgets de temps respectés (docs-internes/budget-temps.md).');
  }
  return { ok: erreurs.length === 0, erreurs, avertissements };
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const r = await controler();
  process.exit(r.ok ? 0 : 1);
}
