// Contrôle des liens.
// Liens internes : le fichier (et l’ancre) doivent exister, sinon échec.
// Liens externes : signalés s’ils ne répondent pas, sans faire échouer le
// contrôle, car certains sites bloquent les robots.
// Usage : node scripts/check-links.mjs [--sans-externes]

import fs from 'node:fs';
import path from 'node:path';
import { RACINE, DOCS, PRIVE, listerHTML, lire, estChiffree, cheminRelatif } from './lib/pages.mjs';

const sansExternes = process.argv.includes('--sans-externes');
const erreurs = [];
const externes = new Map();

function noter(url, source) {
  if (!externes.has(url)) { externes.set(url, new Set()); }
  externes.get(url).add(source);
}

const fichiers = [...listerHTML(DOCS), ...listerHTML(PRIVE)];
const cacheAncres = new Map();
function ancres(fichier) {
  if (cacheAncres.has(fichier)) { return cacheAncres.get(fichier); }
  let ids = new Set();
  if (fs.existsSync(fichier)) {
    const { html, document } = lire(fichier);
    // Page chiffrée : on lit les ancres dans la source en clair si elle est là.
    if (estChiffree(html)) {
      const source = path.join(PRIVE, path.relative(DOCS, fichier));
      if (fs.existsSync(source)) { return ancres(source); }
    }
    document.querySelectorAll('[id]').forEach((el) => ids.add(el.getAttribute('id')));
  }
  cacheAncres.set(fichier, ids);
  return ids;
}

for (const f of fichiers) {
  const { html, document } = lire(f);
  if (estChiffree(html)) { continue; }
  // La source privée de la correction est publiée dans docs/seance-09/.
  const base = f.startsWith(PRIVE) ? path.join(DOCS, path.relative(PRIVE, f)) : f;
  const liens = [...document.querySelectorAll('a[href], link[href], script[src], img[src], use[href]')];
  for (const el of liens) {
    const valeur = el.getAttribute('href') || el.getAttribute('src');
    if (!valeur || valeur === '#') { continue; }
    if (/^https?:\/\//.test(valeur)) { noter(valeur, cheminRelatif(f)); continue; }
    if (/^(mailto|tel|data|javascript):/.test(valeur)) { continue; }
    const [chemin, ancre] = valeur.split('#');
    const cible = chemin ? path.resolve(path.dirname(base), chemin.split('?')[0]) : base;
    if (!cible.startsWith(DOCS)) { erreurs.push(cheminRelatif(f) + ' : lien hors du site « ' + valeur + ' »'); continue; }
    if (!fs.existsSync(cible)) { erreurs.push(cheminRelatif(f) + ' : fichier introuvable « ' + valeur + ' »'); continue; }
    if (ancre && cible.endsWith('.html') && !ancres(cible).has(ancre)) {
      erreurs.push(cheminRelatif(f) + ' : ancre introuvable « ' + valeur + ' »');
    }
    if (ancre && cible.endsWith('.svg')) {
      const svg = fs.readFileSync(cible, 'utf8');
      if (!svg.includes('id="' + ancre + '"')) { erreurs.push(cheminRelatif(f) + ' : icône introuvable « ' + valeur + ' »'); }
    }
  }
}

// Pages du déroulé
const programme = JSON.parse(fs.readFileSync(path.join(DOCS, 'data', 'schedule.json'), 'utf8'));
for (const p of programme.phases) {
  const [fichier, ancre] = p.page.split('#');
  const cible = path.join(DOCS, 'seance-09', fichier);
  if (!fs.existsSync(cible)) { erreurs.push('docs/data/schedule.json : page introuvable « ' + p.page + ' »'); continue; }
  if (ancre && !ancres(cible).has(ancre)) { erreurs.push('docs/data/schedule.json : ancre introuvable « ' + p.page + ' »'); }
}

// Liens de config.json
const config = JSON.parse(fs.readFileSync(path.join(DOCS, 'data', 'config.json'), 'utf8'));
for (const [cle, v] of Object.entries(config.liens || {})) {
  if (v) { noter(v, 'docs/data/config.json (' + cle + ')'); }
}

console.log('Liens internes : ' + (erreurs.length ? erreurs.length + ' problème(s)' : 'tous valides') + '.');
erreurs.forEach((e) => console.log('  ✗ ' + e));

if (!sansExternes) {
  console.log('\nLiens externes (' + externes.size + ') : contrôle indicatif, sans échec.');
  const resultats = await Promise.all([...externes.keys()].map(async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      let r = await fetch(u, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (verification de liens)' } });
      if (r.status >= 400) { r = await fetch(u, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (verification de liens)' } }); }
      return [u, String(r.status)];
    } catch (e) {
      return [u, 'injoignable (' + (e.name === 'AbortError' ? 'délai dépassé' : e.message) + ')'];
    } finally {
      clearTimeout(t);
    }
  }));
  for (const [u, statut] of resultats) {
    const ok = /^2\d\d$/.test(statut);
    console.log('  ' + (ok ? '✓' : '!') + ' ' + statut.padEnd(6) + ' ' + u);
  }
}

process.exit(erreurs.length ? 1 : 0);
