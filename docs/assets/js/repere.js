// Repère horaire : « vous devriez en être là ».
// Chaque phase de travail peut avoir des repères dans data/schedule.json,
// sous la forme [minute depuis le début de la phase, question]. Sur la page
// de la phase, une ligne sous l’en-tête dit à quelle question l’équipe
// devrait en être à cette heure, si elle est dans les temps, et mène à la
// question. La question visée porte un petit drapeau.

import { lire, surChangement } from './state.js';
import { statut, surTic } from './clock.js';
import { SEUIL_CHAMP } from './gamify.js';
import { typographier } from './typo.js';

let barre = null;
let texte = null;
let lien = null;
let dernier = '';
let cible = null;
let drapeau = null;

function questionDe(id) {
  return document.querySelector('.q[data-q="' + id + '"], fieldset.qcm[data-qcm="' + id + '"]');
}

function nomDe(el) {
  const q = el.querySelector('.qid');
  return q ? q.textContent.trim() : (el.dataset.q || el.dataset.qcm || '').toUpperCase();
}

function faite(el) {
  const e = lire();
  if (el.matches('fieldset.qcm')) {
    const r = e.qcm[el.dataset.qcm];
    return !!(r && r.dernier);
  }
  const champ = el.querySelector('[data-id]');
  if (champ && champ.matches('textarea')) { return ((e.champs[champ.dataset.id] || '').trim().length >= SEUIL_CHAMP); }
  const radio = el.querySelector('[data-radio]');
  if (radio) { return !!e.radios[radio.dataset.radio]; }
  return champ ? !!(e.champs[champ.dataset.id] || '').trim() : false;
}

// Questions de la même section que la question visée, dans l’ordre de la
// page, sans les bonus ni les questions masquées.
function questionsAutour(el) {
  const zone = el.closest('section') || el.closest('main') || document;
  return [...zone.querySelectorAll('.q[data-q], fieldset.qcm[data-qcm]')]
    .filter((q) => !q.hasAttribute('data-bonus') && !q.hidden && !q.closest('[hidden]'));
}

function demarquer() {
  if (cible) { cible.classList.remove('q-repere'); }
  if (drapeau) { drapeau.remove(); }
  cible = null;
  drapeau = null;
}

function masquer() {
  if (barre) { barre.hidden = true; }
  demarquer();
  dernier = '';
}

// Le drapeau se place juste avant la question (une légende de QCM doit
// rester le premier élément de son groupe).
function marquer(el) {
  if (cible === el) { return; }
  demarquer();
  cible = el;
  el.classList.add('q-repere');
  drapeau = document.createElement('p');
  drapeau.className = 'drapeau-repere';
  drapeau.setAttribute('aria-hidden', 'true');
  drapeau.textContent = 'Vous devriez en être ici';
  el.before(drapeau);
}

function mettreAJour() {
  const s = statut();
  if (!barre || s.avant || s.apres || !s.phase || !Array.isArray(s.phase.reperes)) { masquer(); return; }
  const ecoule = (s.phase.duree * 60000 - s.resteMs) / 60000;
  const atteints = s.phase.reperes.filter((r) => Array.isArray(r) && r[0] <= ecoule);
  if (!atteints.length) { masquer(); return; }
  const el = questionDe(atteints[atteints.length - 1][1]);
  if (!el || el.hidden) { masquer(); return; }
  const liste = questionsAutour(el);
  const iCible = liste.indexOf(el);
  const iPremier = liste.findIndex((q) => !faite(q));
  const nom = nomDe(el);
  let etat = '';
  let classe = 'ok';
  if (iPremier < 0) {
    etat = 'Tout est rempli, relisez vos réponses.';
  } else if (iPremier > iCible) {
    etat = 'Vous êtes en avance.';
  } else if (iPremier === iCible) {
    etat = 'Vous êtes dans les temps.';
  } else if (iCible - iPremier === 1) {
    etat = 'Léger retard, ne restez pas bloqués sur ' + nomDe(liste[iPremier]) + '.';
    classe = 'leger';
  } else {
    etat = 'Vous avez du retard. Passez à ' + nom + ', vous reviendrez ensuite sur ce qui manque.';
    classe = 'retard';
  }
  const phrase = 'À cette heure, vous devriez en être à la question ' + nom + '. ' + etat;
  marquer(el);
  barre.hidden = false;
  barre.dataset.etat = classe;
  if (phrase !== dernier) {
    dernier = phrase;
    texte.textContent = phrase;
    typographier(texte);
  }
}

export function initRepere(espace) {
  const entete = document.querySelector('.entete');
  if (espace !== 'seance' || !entete) { return; }
  barre = document.createElement('div');
  barre.className = 'repere-barre';
  barre.hidden = true;
  barre.innerHTML = '<p><span class="repere-texte" role="status" aria-live="polite"></span> <a class="repere-lien" href="#">Aller à la question</a></p>';
  entete.append(barre);
  texte = barre.querySelector('.repere-texte');
  lien = barre.querySelector('.repere-lien');
  lien.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (!cible) { return; }
    cible.scrollIntoView({ block: 'start' });
    const champ = cible.querySelector('textarea, input');
    if (champ) { champ.focus({ preventScroll: true }); }
  });
  surTic(() => mettreAJour());
  surChangement(() => mettreAJour());
  mettreAJour();
}
