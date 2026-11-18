// Petit serveur statique pour tester le site en local (sans dépendance).
// Usage : node scripts/serve.mjs [port]   puis ouvrir http://localhost:8080/
// Le site est servi sous /fabrique/ pour imiter l’adresse GitHub Pages
// (https://<compte>.github.io/<depot>/), ce qui vérifie les chemins relatifs.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, '..', 'docs');
const port = Number(process.argv[2] || process.env.PORT || 8080);
const prefixe = '/fabrique';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8'
};

// Faux script Google (même protocole que scripts/apps-script/Code.gs), pour
// tester l’envoi des réponses et la page « Réponses des équipes » en local.
// Clé enseignant de test : cle-test.
const COLONNES = ['id', 'maj', 'equipe', 'noms', 'icone', 'page', 'phase', 'points', 'niveau', 'drapeau',
  'quetes', 'reponses', 'depots', 'depot_parcours', 'depot_video'];
const faux = { lignes: new Map(), depart: '' };
const CLE_TEST = 'cle-test';
function jetonConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(racine, 'data', 'config.json'), 'utf8')).collecte.jeton; } catch (e) { return ''; }
}
function cellule(v) {
  if (v === undefined || v === null) { return ''; }
  return typeof v === 'object' ? JSON.stringify(v) : v;
}
function repondre(res, obj) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function fauxScript(req, res, u) {
  if (req.method === 'GET') {
    const action = u.searchParams.get('action');
    if (action === 'horloge') { repondre(res, { ok: true, depart: faux.depart }); return; }
    if (action === 'remise-a-zero') { faux.lignes.clear(); faux.depart = ''; repondre(res, { ok: true }); return; }
    if (action === 'lire') {
      if (u.searchParams.get('cle') !== CLE_TEST) { repondre(res, { ok: false, erreur: 'cle' }); return; }
      const equipes = [...faux.lignes.values()].map((l) => Object.fromEntries(COLONNES.map((c, k) => [c, l[k]])));
      repondre(res, { ok: true, equipes, maintenant: new Date().toISOString(), depart: faux.depart });
      return;
    }
    repondre(res, { ok: false, erreur: 'action' });
    return;
  }
  let corps = '';
  req.on('data', (c) => { corps += c; });
  req.on('end', () => {
    try {
      const d = JSON.parse(corps);
      if (d.action === 'horloge') {
        if (d.cle !== CLE_TEST) { repondre(res, { ok: false, erreur: 'cle' }); return; }
        faux.depart = /^\d{2}:\d{2}$/.test(String(d.depart || '')) ? d.depart : '';
        repondre(res, { ok: true, depart: faux.depart });
        return;
      }
      if (d.jeton !== jetonConfig() || !d.id) { repondre(res, { ok: false, erreur: 'jeton' }); return; }
      const ligne = COLONNES.map((c) => cellule(d[c]));
      const ancienne = faux.lignes.get(d.id);
      if (ancienne) { ligne.forEach((v, k) => { if (v === '' && ancienne[k] !== '') { ligne[k] = ancienne[k]; } }); }
      faux.lignes.set(d.id, ligne);
      repondre(res, { ok: true });
    } catch (e) {
      repondre(res, { ok: false, erreur: String(e) });
    }
  });
}

const serveur = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/faux-script') { fauxScript(req, res, u); return; }
  let p = decodeURIComponent(u.pathname);
  if (p === '/' || p === prefixe) { res.writeHead(302, { Location: prefixe + '/' }); res.end(); return; }
  if (!p.startsWith(prefixe + '/')) { res.writeHead(404); res.end('Introuvable'); return; }
  p = p.slice(prefixe.length);
  if (p.endsWith('/')) { p += 'index.html'; }
  const fichier = path.join(racine, p);
  if (!fichier.startsWith(racine)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fichier, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Introuvable'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(fichier)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

serveur.listen(port, () => {
  console.log('Site servi sur http://localhost:' + port + prefixe + '/');
});
