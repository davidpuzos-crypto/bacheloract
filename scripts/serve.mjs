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

// Faux relais (même protocole que ntfy.sh), pour tester l’envoi des réponses
// et la page « Réponses des équipes » sans rien envoyer sur Internet.
// Le serveur sert une version de data/config.json qui pointe vers ce faux
// relais, avec des clés de test : en local, le code enseignant est code-test.
const CODE_TEST = 'code-test';
const relais = { sujets: new Map(), limite: false, compteur: 0 };
let configTest = null;

async function preparerConfigTest() {
  const { creerCles } = await import('../docs/assets/js/chiffre.js');
  const cles = await creerCles(CODE_TEST, 2000);
  return (base) => {
    const c = JSON.parse(base);
    c.collecte = Object.assign({}, c.collecte, {
      relais: 'http://localhost:' + port + '/faux-relais',
      sujet: 'test-reponses',
      sujetHorloge: 'test-horloge',
      clePublique: cles.clePublique,
      cleSignature: cles.cleSignature,
      coffre: cles.coffre,
      premierEnvoiSecondes: 1,
      etalementSecondes: 0,
      horlogeMinutes: 0.05,
      lectureSecondes: 10
    });
    return JSON.stringify(c, null, 2);
  };
}

function repondre(res, statut, corps, type = 'application/json; charset=utf-8') {
  res.writeHead(statut, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(corps);
}

function fauxRelais(req, res, u) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT', 'Access-Control-Allow-Headers': '*' });
    res.end();
    return;
  }
  const morceaux = u.pathname.split('/').filter(Boolean).slice(1);
  if (morceaux[0] === 'remise-a-zero') { relais.sujets.clear(); relais.limite = false; repondre(res, 200, '{"ok":true}'); return; }
  if (morceaux[0] === 'limite') { relais.limite = u.searchParams.get('etat') === '1'; repondre(res, 200, '{"ok":true}'); return; }
  if (morceaux[0] === 'compteur') { repondre(res, 200, JSON.stringify({ messages: relais.compteur })); return; }
  const sujet = morceaux[0];
  if (!sujet || !/^[A-Za-z0-9_-]{1,64}$/.test(sujet)) { repondre(res, 404, '{"error":"sujet"}'); return; }
  const liste = relais.sujets.get(sujet) || [];
  if (req.method === 'GET' && morceaux[1] === 'json') {
    const since = u.searchParams.get('since') || 'all';
    let depuis = 0;
    if (/^\d+$/.test(since)) { depuis = Number(since); }
    const m = /^(\d+)([smh])$/.exec(since);
    if (m) { depuis = Math.floor(Date.now() / 1000) - Number(m[1]) * { s: 1, m: 60, h: 3600 }[m[2]]; }
    const lignes = liste.filter((x) => x.time >= depuis).map((x) => JSON.stringify(x));
    repondre(res, 200, lignes.length ? lignes.join('\n') + '\n' : '', 'application/x-ndjson; charset=utf-8');
    return;
  }
  if (req.method === 'POST' || req.method === 'PUT') {
    let corps = '';
    req.on('data', (c) => { corps += c; });
    req.on('end', () => {
      if (relais.limite) { repondre(res, 429, '{"code":42901,"http":429,"error":"limit reached"}'); return; }
      if (Buffer.byteLength(corps) > 4096) { repondre(res, 413, '{"error":"trop long"}'); return; }
      const msg = { id: Math.random().toString(36).slice(2, 14), time: Math.floor(Date.now() / 1000), event: 'message', topic: sujet, message: corps };
      liste.push(msg);
      relais.sujets.set(sujet, liste);
      relais.compteur += 1;
      repondre(res, 200, JSON.stringify(msg));
    });
    return;
  }
  repondre(res, 405, '{"error":"methode"}');
}

const serveur = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/faux-relais' || u.pathname.startsWith('/faux-relais/')) { fauxRelais(req, res, u); return; }
  let p = decodeURIComponent(u.pathname);
  if (p === '/' || p === prefixe) { res.writeHead(302, { Location: prefixe + '/' }); res.end(); return; }
  if (!p.startsWith(prefixe + '/')) { res.writeHead(404); res.end('Introuvable'); return; }
  p = p.slice(prefixe.length);
  if (p.endsWith('/')) { p += 'index.html'; }
  const fichier = path.join(racine, p);
  if (!fichier.startsWith(racine)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fichier, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Introuvable'); return; }
    if (p === '/data/config.json' && configTest) { data = Buffer.from(configTest(data.toString('utf8'))); }
    res.writeHead(200, { 'Content-Type': types[path.extname(fichier)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

configTest = await preparerConfigTest();
serveur.listen(port, () => {
  console.log('Site servi sur http://localhost:' + port + prefixe + '/');
  console.log('Réponses envoyées à un faux relais local. Code enseignant de test : ' + CODE_TEST + '.');
});
