// Typographie française appliquée aux nœuds texte au chargement
// (et aux contenus ajoutés ensuite par les autres modules).
// Les sources respectent déjà ces règles ; ce module rattrape les oublis.

const NBSP = ' ';
const FINE = ' ';
const EXCLUS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'KBD', 'SAMP', 'svg', 'SVG']);
const ATTRIBUTS = ['aria-label', 'title', 'placeholder', 'alt'];

export function corriger(t) {
  if (!t) { return t; }
  let s = t;
  s = s.replace(/'/g, '’');
  s = s.replace(/\.\.\./g, '…');
  s = s.replace(/«[   ]*/g, '«' + NBSP);
  s = s.replace(/[   ]*»/g, NBSP + '»');
  s = s.replace(/ ([:;!?])/g, NBSP + '$1');
  s = s.replace(/(\d)[  ]%/g, '$1' + FINE + '%');
  s = s.replace(/(\d) (?=\d{3}(?!\d))/g, '$1' + FINE);
  s = s.replace(/\bn° (?=\d)/g, 'n°' + NBSP);
  s = s.replace(/\bp\. (?=\d)/g, 'p.' + NBSP);
  s = s.replace(/\bpar\. (?=\d)/g, 'par.' + NBSP);
  s = s.replace(/(\d) h (\d)/g, '$1' + NBSP + 'h' + NBSP + '$2');
  s = s.replace(/(\d) (min|s|h)\b/g, '$1' + NBSP + '$2');
  return s;
}

function exclu(noeud) {
  for (let n = noeud.parentNode; n && n.nodeType === 1; n = n.parentNode) {
    if (EXCLUS.has(n.nodeName) || (n.dataset && n.dataset.typo === 'non')) { return true; }
  }
  return false;
}

export function typographier(racine = document.body) {
  if (!racine) { return; }
  const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
  const noeuds = [];
  while (marcheur.nextNode()) { noeuds.push(marcheur.currentNode); }
  for (const n of noeuds) {
    if (!/['«»:;!?%\d.]/.test(n.nodeValue) || exclu(n)) { continue; }
    const v = corriger(n.nodeValue);
    if (v !== n.nodeValue) { n.nodeValue = v; }
  }
  const elements = racine.nodeType === 1 ? [racine, ...racine.querySelectorAll('[aria-label],[title],[placeholder],[alt]')] : [];
  for (const el of elements) {
    for (const a of ATTRIBUTS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v) {
        const c = corriger(v);
        if (c !== v) { el.setAttribute(a, c); }
      }
    }
  }
}
