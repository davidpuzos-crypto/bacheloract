// Portes du parcours, sans mot de passe. Pour voir une correction et pour
// passer à la quête suivante, l’équipe envoie d’abord son travail à
// l’enseignant, d’un clic.
//   definir  travail de la quête 1 (Méthode, Chercher), pour ouvrir la quête 2
//   citer    travail des quêtes 1 et 2, pour la correction de Définir et
//            Citer et pour ouvrir la quête 3
//   lire     dépôt de la quête 3 (l’étude), pour la correction de l’étude et
//            pour ouvrir la quête 4
// Une porte s’ouvre seule quand le travail est déjà parti (envoi automatique
// au point d’arrêt, par exemple), quand il n’y a rien à envoyer (équipe sans
// réponse, aperçu de l’enseignant) ou quand l’envoi est désactivé. Si l’envoi
// échoue, elle s’ouvre quand même, avec un message. On ne bloque personne.
// Les boutons « Envoyer et … » de fin de quête (data-envoyer-avant) envoient
// le travail avant de changer de page.

import { lire, modifier } from './state.js';
import { envoyer, etatCollecte, travailEnvoye } from './collect.js';
import { formatHeure } from './clock.js';
import { typographier } from './typo.js';
import { initRail } from './rail.js';
import { annoncer } from './ui.js';
import { QUETES } from './gamify.js';

// Ce que chaque page demande d’avoir envoyé.
const REQUIS = {
  'citer-lecture': 'definir',
  'citer-pratique': 'definir',
  'correction-definir': 'citer',
  lire: 'citer',
  correction: 'lire',
  notes: 'lire',
  video: 'lire'
};

// Porte ajoutée aux pages des quêtes. Les corrections ont la leur dans le HTML.
const PORTES_QUETE = {
  definir: {
    texte: 'La quête 2, Citer, s’ouvre quand votre travail de la quête 1 est envoyé à l’enseignant. Un clic suffit.',
    bouton: 'Envoyer et ouvrir la quête 2', retour: ['3-chercher.html', 'Revenir à Chercher'], ouverte: 'Quête 2 débloquée.'
  },
  citer: {
    texte: 'La quête 3, Lire, s’ouvre quand votre travail de Chercher et de Citer est envoyé à l’enseignant. Un clic suffit.',
    bouton: 'Envoyer et ouvrir la quête 3', retour: ['5-citer-pratique.html', 'Revenir à Citer'], ouverte: 'Quête 3 débloquée.'
  },
  lire: {
    texte: 'La quête 4, Noter, s’ouvre quand votre travail sur l’étude de l’Insee est déposé, c’est-à-dire envoyé à l’enseignant. Un clic suffit.',
    bouton: 'Envoyer et ouvrir la quête 4', retour: ['6-lire.html#depot', 'Revenir au dépôt'], ouverte: 'Quête 4 débloquée.'
  }
};

// Les quêtes dont chaque porte regarde le travail.
const QUETES_DE = { definir: ['definir'], citer: ['definir', 'citer'], lire: ['lire'], noter: ['noter'] };
const ATTENTE_MAX = 15000;
const NOTE = 'fabrique:s09:porte-note';

function drapeau(type) { return 'porte-' + type; }

// La porte a déjà été franchie (ou le dépôt de l’étude est fait).
function franchie(type) {
  const e = lire();
  return !!((e.lu && e.lu[drapeau(type)]) || (type === 'lire' && e.depots && e.depots.parcours));
}

function quetesDe(type) { return QUETES.filter((q) => (QUETES_DE[type] || []).includes(q.id)); }

// Réponses des quêtes que la porte regarde, sous la forme envoyée (c. champs,
// r. choix, q. QCM).
function clesDe(type) {
  const cles = [];
  quetesDe(type).forEach((q) => {
    (q.champs || []).forEach((id) => cles.push('c.' + id));
    (q.radios || []).forEach((id) => cles.push('r.' + id));
    (q.qcm || []).forEach((id) => cles.push('q.' + id));
  });
  return cles;
}

// Une équipe qui n’a rien fait dans ces quêtes n’a rien à envoyer.
function aDuTravail(type) {
  const e = lire();
  return quetesDe(type).some((q) => (q.champs || []).some((id) => typeof e.champs[id] === 'string' && e.champs[id].trim())
    || (q.radios || []).some((id) => !!e.radios[id])
    || (q.qcm || []).some((id) => !!(e.qcm[id] && e.qcm[id].premier)));
}

function pret() {
  if (document.documentElement.classList.contains('js-pret')) { return Promise.resolve(); }
  return new Promise((r) => { window.addEventListener('fabrique:pret', r, { once: true }); });
}

function bilanEnvoi(res, type, suite = '') {
  if (res && res.ok) {
    return { texte: 'Votre travail a été envoyé à l’enseignant à ' + formatHeure(Date.now()) + '.' + (suite ? ' ' + suite : ''), classe: 'ok' };
  }
  if (res === null) {
    return { texte: 'L’envoi prend plus de temps que prévu. Il continue, ou repartira au prochain envoi.', classe: 'alerte' };
  }
  const debut = res && res.raison === 'limite' ? 'Le relais refuse les envois pour l’instant.' : 'L’envoi n’a pas abouti.';
  const fin = type === 'lire'
    ? ' Vos réponses restent dans ce navigateur. Téléchargez le récapitulatif en bas de la page Lire et prévenez l’enseignant.'
    : ' Vos réponses restent dans ce navigateur et repartiront au prochain envoi. Prévenez l’enseignant si le problème dure.';
  return { texte: debut + fin, classe: 'alerte' };
}

// Envoie le travail (et fait le dépôt de l’étude pour la porte « lire »), puis
// note la porte comme franchie, quoi qu’il arrive. Renvoie null s’il n’y avait
// rien à envoyer, sinon { res, envoi } (res vaut null si l’envoi traîne).
async function envoyerPour(type) {
  await pret();
  const actif = etatCollecte().actif;
  const reponses = aDuTravail(type);
  const depot = type === 'lire' && actif && reponses && !(lire().depots || {}).parcours;
  modifier((e) => {
    e.lu[drapeau(type)] = Date.now();
    if (depot) { e.depots.parcours = { le: Date.now(), via: 'envoi' }; }
  }, { source: 'porte', id: type });
  if (!actif || !reponses) { return null; }
  const envoi = envoyer({ force: true }).then((res) => {
    if (!res.ok && depot) { modifier((e) => { delete e.depots.parcours; }, { source: 'depot', id: 'parcours' }); }
    return res;
  });
  const res = await Promise.race([envoi, new Promise((r) => { setTimeout(() => r(null), ATTENTE_MAX); })]);
  return { res, envoi };
}

function noterDans(zone, bilan) {
  if (!zone || !bilan) { return; }
  zone.textContent = bilan.texte;
  zone.className = 'statut ' + bilan.classe;
  zone.hidden = false;
  typographier(zone);
}

// Message laissé par un bouton « Envoyer et … » de la page précédente.
function noteDeSession() {
  let bilan = null;
  try {
    bilan = JSON.parse(sessionStorage.getItem(NOTE) || 'null');
    sessionStorage.removeItem(NOTE);
  } catch (e) { bilan = null; }
  if (!bilan || !bilan.texte) { return; }
  const zone = document.querySelector('[data-porte-note]');
  if (zone) { noterDans(zone, bilan); return; }
  if (bilan.classe === 'ok') { pret().then(() => annoncer(bilan.texte)); return; }
  const tete = document.querySelector('main.page .tete-page');
  if (!tete) { return; }
  const p = document.createElement('p');
  p.className = 'statut alerte';
  p.setAttribute('role', 'status');
  tete.after(p);
  noterDans(p, bilan);
}

// Boutons de fin de quête : envoyer, puis changer de page.
function initEnvoisAvant() {
  document.querySelectorAll('a[data-envoyer-avant]').forEach((a) => {
    a.addEventListener('click', async (ev) => {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) { return; }
      const type = a.dataset.envoyerAvant;
      if (franchie(type) && travailEnvoye(clesDe(type))) { return; }
      ev.preventDefault();
      if (a.getAttribute('aria-disabled') === 'true') { return; }
      a.setAttribute('aria-disabled', 'true');
      a.textContent = 'Envoi en cours…';
      const r = await envoyerPour(type);
      const suite = PORTES_QUETE[type] && REQUIS[pageDe(a)] === type ? PORTES_QUETE[type].ouverte : '';
      const bilan = r ? bilanEnvoi(r.res, type, suite) : (suite ? { texte: suite, classe: 'ok' } : null);
      try { if (bilan) { sessionStorage.setItem(NOTE, JSON.stringify(bilan)); } } catch (e) { /* message perdu, sans gravité */ }
      window.location.href = a.href;
    });
  });
}

// Identifiant de page d’un lien de la séance (d’après le nom du fichier).
const PAGES = {
  '4-citer-lecture.html': 'citer-lecture', '5-citer-pratique.html': 'citer-pratique',
  '5b-correction-definir.html': 'correction-definir', '6-lire.html': 'lire',
  '7-correction.html': 'correction', '8-notes.html': 'notes', '9-video.html': 'video'
};
function pageDe(a) {
  const fichier = (a.getAttribute('href') || '').split('#')[0].split('?')[0].split('/').pop();
  return PAGES[fichier] || '';
}

// Ajoute la porte d’une page de quête, juste sous l’en-tête de la page.
function creerPorte(type) {
  const t = PORTES_QUETE[type];
  const tete = document.querySelector('main.page > .tete-page');
  if (!t || !tete) { return null; }
  const section = document.createElement('section');
  section.className = 'porte-correction';
  section.dataset.porte = type;
  section.setAttribute('aria-labelledby', 'titre-porte');
  section.hidden = true;
  section.innerHTML = '<h2 id="titre-porte">D’abord, envoyez votre travail</h2>'
    + '<p>' + t.texte + '</p>'
    + '<p class="rangee-boutons"><button type="button" class="btn" data-porte-ouvrir>' + t.bouton + '</button>'
    + '<a href="' + t.retour[0] + '">' + t.retour[1] + '</a></p>'
    + '<p class="statut" data-porte-statut role="status" aria-live="polite"></p>';
  const note = document.createElement('p');
  note.className = 'statut ok';
  note.setAttribute('data-porte-note', '');
  note.tabIndex = -1;
  note.hidden = true;
  tete.after(section, note);
  typographier(section);
  return section;
}

export function initPorte() {
  initEnvoisAvant();
  const page = document.body.dataset.page || '';
  let porte = document.querySelector('[data-porte]');
  const contenu = document.querySelector('[data-porte-contenu]');
  const type = porte ? porte.dataset.porte : REQUIS[page];
  if (!type) { noteDeSession(); return; }
  if (!porte) { porte = creerPorte(type); }
  if (!porte) { noteDeSession(); return; }
  const quete = !contenu ? PORTES_QUETE[type] : null;

  // Page de quête : le contenu est tout ce qui suit l’en-tête, sauf la porte,
  // son message, la colonne de suivi et les liens de bas de page.
  const main = document.querySelector('main.page');
  const elements = contenu ? [] : [...main.children].filter((n) => !n.matches('.tete-page, .pager, .rail, [data-porte], [data-porte-note]'));
  const note = (contenu || main).querySelector('[data-porte-note]');
  const bouton = porte.querySelector('[data-porte-ouvrir]');
  const statut = porte.querySelector('[data-porte-statut]');

  function montrerContenu(ouvert) {
    if (contenu) {
      contenu.hidden = !ouvert;
      if (ouvert) { contenu.setAttribute('data-ouverte', ''); }
      return;
    }
    elements.forEach((n) => {
      if (ouvert && n.hasAttribute('data-porte-masque')) { n.removeAttribute('data-porte-masque'); n.hidden = false; }
      if (!ouvert && !n.hidden) { n.hidden = true; n.setAttribute('data-porte-masque', ''); }
    });
  }

  // apresClic : la page est déjà construite. On ajoute le sommaire et on place
  // le focus sur ce qui vient de s’afficher.
  function ouvrir(bilan = null, apresClic = false) {
    porte.hidden = true;
    montrerContenu(true);
    noterDans(note, bilan);
    if (!apresClic) { return; }
    initRail('seance');
    if (!bilan && quete) { annoncer(quete.ouverte); }
    const cible = note && !note.hidden ? note : (contenu || main).querySelector('h2:not(#titre-porte)');
    if (cible) {
      if (!cible.hasAttribute('tabindex')) { cible.setAttribute('tabindex', '-1'); }
      cible.focus();
    }
  }

  // Déjà franchie, rien à envoyer, ou travail déjà parti : la porte s’ouvre seule.
  const travail = aDuTravail(type);
  const dejaParti = type !== 'lire' && travail && travailEnvoye(clesDe(type));
  if (franchie(type) || !travail || dejaParti) {
    if (dejaParti && !franchie(type)) { modifier((e) => { e.lu[drapeau(type)] = Date.now(); }, { source: 'porte', id: type }); }
    ouvrir();
    noteDeSession();
    return;
  }
  porte.hidden = false;
  montrerContenu(false);
  noteDeSession();

  // Envoi désactivé par l’enseignant : rien à attendre.
  pret().then(() => { if (!etatCollecte().actif && porte.hidden === false) { ouvrir(null, true); } });

  bouton.addEventListener('click', async () => {
    bouton.disabled = true;
    statut.textContent = 'Envoi en cours…';
    const r = await envoyerPour(type);
    if (!r) { ouvrir(null, true); return; }
    ouvrir(bilanEnvoi(r.res, type, quete ? quete.ouverte : ''), true);
    if (r.res === null) { r.envoi.then((res) => { noterDans(note, bilanEnvoi(res, type, quete ? quete.ouverte : '')); }); }
  });
}
