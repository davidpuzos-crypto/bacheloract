// Repère horaire : « vous devriez être là ».
// Aucune page n’est imposée, chaque équipe circule librement. Une ligne sous
// l’en-tête dit explicitement où elle devrait être :
//  - en retard sur le déroulé, la page ou la section où en est la séance,
//    jusqu’à quelle heure, avec le message de passage de data/schedule.json
//    (stopTexte, sans le « Stop. » du début) et un lien pour y aller ;
//  - sur la bonne page, la question où elle devrait en être. Chaque phase de
//    travail peut avoir des repères dans data/schedule.json, sous la forme
//    [minute depuis le début de la phase, question]. La question visée porte
//    un petit drapeau.

import { lire, surChangement } from './state.js';
import { statut, surTic, phases, heureMinute, formatHeure, fichierDe, ancreDe, ordreFichier } from './clock.js';
import { urlSeance, fichierCourant } from './donnees.js';
import { SEUIL_CHAMP } from './gamify.js';
import { typographier } from './typo.js';

let barre = null;
let heureEl = null;
let texte = null;
let detail = null;
let lien = null;
let dernier = '';
let cible = null;
let drapeau = null;
let mode = '';
let appel = null;

function questionDe(id) {
  return document.querySelector('.q[data-q="' + id + '"], fieldset.qcm[data-qcm="' + id + '"]');
}

export function nomDe(el) {
  const q = el.querySelector('.qid');
  return q ? q.textContent.trim() : (el.dataset.q || el.dataset.qcm || '').toUpperCase();
}

export function faite(el) {
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
  if (barre) { barre.hidden = true; delete barre.dataset.etat; heureEl.textContent = ''; }
  demarquer();
  dernier = '';
  mode = '';
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

// Position de la page affichée dans le déroulé (fichier et section).
function indexLieu() {
  const f = fichierCourant();
  const h = window.location.hash;
  const ph = phases();
  let i = h ? ph.findIndex((p) => p.page === f + h) : -1;
  if (i < 0) { i = ordreFichier(f); }
  return i;
}

// La section visée est sur cette page et l’équipe y est arrivée en faisant
// défiler (son haut est dans les 40 % supérieurs de l’écran, ou au-dessus).
function surPlace(phase) {
  if (fichierDe(phase.page) !== fichierCourant()) { return false; }
  const ancre = ancreDe(phase.page);
  if (!ancre || window.location.hash === ancre) { return true; }
  const el = document.querySelector(ancre);
  return !!el && el.getBoundingClientRect().top <= window.innerHeight * 0.4;
}

// Message prévu pour ce passage dans data/schedule.json, sans le « Stop. ».
function messagePassage(arret) {
  if (!arret || !arret.phase.stopTexte) { return ''; }
  const pause = phases().find((p) => p.id === 'pause');
  const reprise = pause ? heureMinute(pause.debut + pause.duree) : '';
  return String(arret.phase.stopTexte).replace('{reprise}', reprise).replace(/^Stop\.\s*/, '');
}

// L’équipe est en retard sur le déroulé : on dit où elle devrait être.
function afficherAilleurs(s) {
  demarquer();
  const ph = s.phase;
  // L’heure reste hors de la zone annoncée : sinon elle serait relue chaque minute.
  const heure = 'Il est ' + formatHeure(s.t) + '. ';
  if (heureEl.textContent !== heure) { heureEl.textContent = heure; typographier(heureEl); }
  const passage = s.arret && s.arret.cible.id === ph.id ? s.arret : null;
  let etat = 'ailleurs';
  let phrase = 'Vous devriez être sur « ' + ph.label + ' », jusqu’à ' + heureMinute(ph.debut + ph.duree) + '.';
  let suite = messagePassage(passage);
  let texteLien = (passage && passage.phase.stopBouton) || 'Y aller';
  if (s.apres) {
    etat = 'fin';
    phrase = 'La séance est terminée.';
    suite = '';
    texteLien = 'Voir le bilan';
  } else if (ph.id === 'pause') {
    etat = 'pause';
    phrase = 'C’est la pause, jusqu’à ' + heureMinute(ph.debut + ph.duree) + '.';
    suite = 'Vos réponses sont enregistrées.';
    texteLien = 'Voir la pause';
  }
  const page = s.apres ? phases()[phases().length - 1].page : ph.page;
  lien.href = fichierDe(page) === fichierCourant() && ancreDe(page) ? ancreDe(page) : urlSeance(page);
  lien.textContent = texteLien;
  if (mode !== etat) {
    // Le repère vient d’apparaître : il s’éclaire un instant.
    barre.classList.add('appel');
    clearTimeout(appel);
    appel = setTimeout(() => barre.classList.remove('appel'), 2400);
  }
  mode = etat;
  barre.hidden = false;
  barre.dataset.etat = etat;
  if (phrase + suite !== dernier) {
    dernier = phrase + suite;
    texte.textContent = phrase;
    detail.textContent = suite ? ' ' + suite : '';
    typographier(texte);
    typographier(detail);
  }
}

function mettreAJour() {
  const s = statut();
  if (!barre || s.avant || !s.phase) { masquer(); return; }
  const iLieu = indexLieu();
  if (iLieu >= 0 && iLieu < s.index && !surPlace(s.apres ? phases()[phases().length - 1] : s.phase)) { afficherAilleurs(s); return; }
  if (s.apres || !Array.isArray(s.phase.reperes)) { masquer(); return; }
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
  let suite = '';
  let classe = 'ok';
  if (iPremier < 0) {
    etat = 'Tout est rempli.';
    suite = 'Relisez vos réponses.';
  } else if (iPremier > iCible) {
    etat = 'Vous êtes en avance.';
  } else if (iPremier === iCible) {
    etat = 'Vous êtes dans les temps.';
  } else if (iCible - iPremier === 1) {
    etat = 'Léger retard.';
    suite = 'Ne restez pas bloqués sur ' + nomDe(liste[iPremier]) + '.';
    classe = 'leger';
  } else {
    etat = 'Vous avez du retard.';
    suite = 'Passez à ' + nom + ', vous reviendrez ensuite sur ce qui manque.';
    classe = 'retard';
  }
  const phrase = 'À cette heure, vous devriez en être à la question ' + nom + '. ' + etat;
  marquer(el);
  mode = 'question';
  heureEl.textContent = '';
  lien.textContent = 'Aller à la question';
  lien.href = '#';
  barre.hidden = false;
  barre.dataset.etat = classe;
  if (phrase + suite !== dernier) {
    dernier = phrase + suite;
    texte.textContent = phrase;
    detail.textContent = suite ? ' ' + suite : '';
    typographier(texte);
    typographier(detail);
  }
}

export function initRepere(espace) {
  const entete = document.querySelector('.entete');
  if (espace !== 'seance' || !entete) { return; }
  barre = document.createElement('div');
  barre.className = 'repere-barre';
  barre.hidden = true;
  barre.innerHTML = '<p><span><span class="repere-heure"></span><span role="status" aria-live="polite"><span class="repere-texte"></span><span class="repere-detail"></span></span></span> <a class="repere-lien" href="#">Aller à la question</a></p>';
  entete.append(barre);
  heureEl = barre.querySelector('.repere-heure');
  texte = barre.querySelector('.repere-texte');
  detail = barre.querySelector('.repere-detail');
  lien = barre.querySelector('.repere-lien');
  lien.addEventListener('click', (ev) => {
    // Hors mode « question », le lien mène simplement à la page indiquée.
    if (mode !== 'question') { return; }
    ev.preventDefault();
    if (!cible) { return; }
    cible.scrollIntoView({ block: 'start' });
    const champ = cible.querySelector('textarea, input');
    if (champ) { champ.focus({ preventScroll: true }); }
  });
  surTic(() => mettreAJour());
  surChangement(() => mettreAJour());
  window.addEventListener('hashchange', () => mettreAJour());
  let enAttente = false;
  window.addEventListener('scroll', () => {
    if (enAttente) { return; }
    enAttente = true;
    requestAnimationFrame(() => { enAttente = false; mettreAJour(); });
  }, { passive: true });
  mettreAJour();
}
