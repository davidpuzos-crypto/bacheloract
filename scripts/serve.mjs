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

const serveur = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
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
