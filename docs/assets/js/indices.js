// Correction de l’étude de l’Insee, en chasse aux indices.
// Pour chaque question de l’analyse (L1 à L6), l’équipe retrouve dans le
// document la phrase, la mention ou la ligne du tableau qui justifie la
// réponse. La réponse proposée s’affiche ensuite, à côté de la sienne.
// « Montrer l’indice » l’affiche sans rapporter de points.

import { lire, modifier } from './state.js';
import { typographier } from './typo.js';

const VIDE = { trouve: false, montre: false, essais: 0, trouves: [] };

function etatIndice(id) {
  return Object.assign({}, VIDE, (lire().indices || {})[id] || {});
}
function resolu(id) {
  const r = etatIndice(id);
  return r.trouve || r.montre;
}

export function initIndices() {
  const zone = document.querySelector('[data-chasse]');
  if (!zone) { return; }
  const doc = zone.querySelector('[data-doc-chasse]');
  const cartes = [...zone.querySelectorAll('[data-indice]')];
  const consigne = zone.querySelector('[data-consigne-chasse]');
  const annonce = zone.querySelector('[data-annonce-chasse]');
  const passages = [...doc.querySelectorAll('[data-z]')];
  let active = null;

  passages.forEach((p) => {
    p.setAttribute('role', 'button');
    p.setAttribute('tabindex', '0');
  });

  const cibles = (carte) => carte.dataset.cibles.split(',').map((x) => x.trim());
  const minimum = (carte) => Number(carte.dataset.min || 1);
  const passage = (z) => doc.querySelector('[data-z="' + z + '"]');

  function dire(texte) {
    annonce.textContent = texte;
    typographier(annonce);
  }

  function poser(el, id) {
    if (!el) { return; }
    el.classList.add('indice-pose');
    const etiquettes = new Set((el.dataset.etiquette || '').split(' ').filter(Boolean));
    etiquettes.add(id);
    el.dataset.etiquette = [...etiquettes].join(' ');
  }

  function marquer(carte) {
    const id = carte.dataset.indice;
    const r = etatIndice(id);
    (r.montre ? cibles(carte) : r.trouves).forEach((z) => poser(passage(z), id));
  }

  function afficher(carte) {
    const id = carte.dataset.indice;
    const r = etatIndice(id);
    const fini = r.trouve || r.montre;
    carte.dataset.etat = r.trouve ? 'trouve' : r.montre ? 'montre' : (carte === active ? 'actif' : 'a-chercher');
    carte.querySelector('.corrige').hidden = !fini;
    carte.querySelector('[data-etat-indice]').textContent = r.trouve ? 'Indice trouvé' : r.montre ? 'Indice montré' : (carte === active ? 'En cours' : 'À chercher');
    const bChercher = carte.querySelector('[data-chercher]');
    bChercher.hidden = fini;
    bChercher.setAttribute('aria-pressed', carte === active ? 'true' : 'false');
    carte.querySelector('[data-montrer]').hidden = fini;
    const aide = carte.querySelector('[data-aide-indice]');
    if (aide && fini) { aide.hidden = true; }
    if (fini) { marquer(carte); }
  }

  function activer(carte) {
    active = carte && !resolu(carte.dataset.indice) ? carte : null;
    cartes.forEach(afficher);
    if (active) {
      consigne.textContent = 'Indice ' + active.dataset.indice + '. ' + active.querySelector('.question-indice').textContent + ' Cliquez sur le passage.';
    } else {
      const trouves = cartes.filter((c) => etatIndice(c.dataset.indice).trouve).length;
      consigne.textContent = 'Enquête terminée. ' + trouves + (trouves > 1 ? ' indices trouvés' : ' indice trouvé') + ' sans aide sur ' + cartes.length + '. Relisez les réponses proposées à côté des vôtres.';
    }
    typographier(consigne);
  }

  const suivant = () => cartes.find((c) => !resolu(c.dataset.indice)) || null;

  function choisir(el) {
    if (!active) {
      dire('Choisissez d’abord un indice à chercher, dans la colonne des questions.');
      return;
    }
    const carte = active;
    const id = carte.dataset.indice;
    const z = el.dataset.z;
    const bon = cibles(carte).includes(z);
    modifier((s) => {
      const r = Object.assign({}, VIDE, s.indices[id] || {});
      r.trouves = [...(r.trouves || [])];
      r.essais += 1;
      if (bon && !r.trouves.includes(z)) { r.trouves.push(z); }
      if (r.trouves.length >= minimum(carte) && !r.montre) { r.trouve = true; }
      s.indices[id] = r;
    }, { source: 'indice', id, ancre: el });
    const r = etatIndice(id);
    if (bon) {
      poser(el, id);
      if (r.trouve) {
        dire('Indice ' + id + ' trouvé. La réponse proposée s’affiche dans la colonne des questions.');
        afficher(carte);
        activer(suivant());
      } else {
        const reste = minimum(carte) - r.trouves.length;
        dire('Bien vu. Encore ' + reste + (reste > 1 ? ' passages' : ' passage') + ' à trouver pour cet indice.');
      }
      return;
    }
    const rates = r.essais - r.trouves.length;
    el.classList.add('indice-rate');
    setTimeout(() => el.classList.remove('indice-rate'), 700);
    const aide = carte.querySelector('[data-aide-indice]');
    if (rates >= 2 && aide) { aide.hidden = false; }
    dire('Pas ici.' + (rates >= 2 && aide ? ' ' + aide.textContent : ' Cherchez encore.'));
  }

  passages.forEach((p) => {
    p.addEventListener('click', () => choisir(p));
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choisir(p); }
    });
  });

  cartes.forEach((c) => {
    c.querySelector('[data-chercher]').addEventListener('click', () => {
      activer(c);
      dire('Indice ' + c.dataset.indice + ' en cours. Cherchez dans le document.');
      const r = doc.getBoundingClientRect();
      if (r.bottom < 80 || r.top > window.innerHeight - 80) { doc.scrollIntoView({ block: 'start' }); }
      doc.focus({ preventScroll: true });
    });
    c.querySelector('[data-montrer]').addEventListener('click', () => {
      const id = c.dataset.indice;
      modifier((s) => {
        const r = Object.assign({}, VIDE, s.indices[id] || {});
        if (!r.trouve) { r.montre = true; }
        s.indices[id] = r;
      }, { source: 'indice', id });
      afficher(c);
      const premier = passage(cibles(c)[0]);
      if (premier) { premier.scrollIntoView({ block: 'center' }); }
      dire('Indice ' + c.dataset.indice + ' montré dans le document.');
      activer(suivant());
    });
  });

  // Sur petit écran, la consigne reste collée sous l’en-tête, dont la
  // hauteur varie selon la largeur.
  const caler = () => {
    const entete = document.querySelector('.entete');
    zone.style.setProperty('--haut-consigne', (entete ? Math.round(entete.getBoundingClientRect().height) : 0) + 'px');
  };
  caler();
  window.addEventListener('resize', caler);

  cartes.forEach((c) => { if (resolu(c.dataset.indice)) { marquer(c); } });
  activer(suivant());
}
