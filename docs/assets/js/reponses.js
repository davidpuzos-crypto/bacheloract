// Page « Réponses des équipes » (espace enseignant).
// Lit les réponses envoyées par les équipes sur le relais public (ntfy.sh),
// où elles circulent chiffrées. Le code de l’enseignant ouvre le coffre de
// data/config.json, qui contient la clé privée de déchiffrement. Le code
// n’est jamais dans le site : on le tape sur cette page.
// Le relais garde les messages 12 heures. Cette page en garde une copie dans
// le navigateur, et permet de tout télécharger.
// Tout texte venu des étudiant·es est affiché comme du texte (textContent),
// jamais comme du HTML.

import { config, icone } from './donnees.js';
import { catalogue } from './recap.js';
import { formatHeure } from './clock.js';
import { QUETES, champsRequis, SEUIL_CHAMP, ICONES_EQUIPE } from './gamify.js';
import { typographier } from './typo.js';
import { ouvrirCoffre, dechiffrer, signer, verifier } from './chiffre.js';
import { relireHorloge } from './collect.js';

const CLE_CODE = 'fabrique:s09:code-enseignant';
const CLE_MESSAGES = 'fabrique:s09:prof:messages';
const ACTIF_MS = 5 * 60000;
const LIMITE_JOUR = 250;
const PAGES = {
  hub: 'Accueil', cadre: 'Cadre', methode: 'Méthode', chercher: 'Chercher', 'citer-lecture': 'Bien citer',
  'citer-pratique': 'Citer, pratique', pause: 'Pause', lire: 'Lire', correction: 'Correction', notes: 'Conseils de notes',
  video: 'Vidéo', fin: 'Bilan', accueil: 'Accueil du cours'
};
const SECTIONS = { '#lire': 'lecture', '#analyser': 'analyse', '#depot': 'Dépôt', '#pendant': 'pendant', '#comparer': 'à froid et comparer', '#questions': 'questions' };
const INTERDITES = new Set(['__proto__', 'constructor', 'prototype']);

let cfg = null;
let cles = null;
let equipes = [];
let questions = [];
let departDiffuse = null;
let vue = 'ensemble';
let minuteur = null;
let enChargement = false;
// Messages du relais gardés dans ce navigateur, et messages déjà déchiffrés.
let local = { depuis: 0, messages: [] };
const dechiffres = new Map();

const $ = (s) => document.querySelector(s);

// ---------------------------------------------------------------- utilitaires
function h(tag, attrs = {}, ...enfants) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) { continue; }
    if (k === 'class') { el.className = v; } else if (k === 'text') { el.textContent = v; } else { el.setAttribute(k, v === true ? '' : v); }
  }
  enfants.flat().forEach((c) => { if (c !== null && c !== undefined && c !== false) { el.append(c instanceof Node ? c : document.createTextNode(String(c))); } });
  return el;
}
function svg(id, classe = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  if (classe) { s.setAttribute('class', classe); }
  const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  u.setAttribute('href', icone(id));
  s.append(u);
  return s;
}
function heure(ms) { return ms ? formatHeure(ms) : ''; }
function nb(n, singulier, pluriel) { return n + ' ' + (n > 1 ? pluriel : singulier); }
function ilYA(date) {
  if (!date) { return 'jamais'; }
  const s = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (s < 60) { return 'à l’instant'; }
  const m = Math.round(s / 60);
  if (m < 60) { return 'il y a ' + m + ' min'; }
  return 'à ' + heure(date.getTime());
}
function lireCode() {
  try { return sessionStorage.getItem(CLE_CODE) || localStorage.getItem(CLE_CODE) || ''; } catch (e) { return ''; }
}
function garderCode(v, souvenir) {
  try {
    sessionStorage.setItem(CLE_CODE, v);
    if (souvenir) { localStorage.setItem(CLE_CODE, v); } else { localStorage.removeItem(CLE_CODE); }
  } catch (e) { /* stockage indisponible : le code reste en mémoire */ }
}
function oublierCode() {
  try { sessionStorage.removeItem(CLE_CODE); localStorage.removeItem(CLE_CODE); } catch (e) { /* rien à faire */ }
}
function cleSure(k) { return /^[A-Za-z0-9_-]{1,40}$/.test(k) && !INTERDITES.has(k); }
function texteSur(v, max = 20000) { return typeof v === 'string' ? v.slice(0, max) : (typeof v === 'number' ? String(v) : ''); }
function listeNoms(noms) {
  const l = (Array.isArray(noms) ? noms : []).map((n) => texteSur(n, 120).trim()).filter(Boolean).slice(0, 3);
  if (l.length < 2) { return l.join(''); }
  return l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1];
}

// État d’une équipe reconstitué à partir de ses messages (clés à plat).
function deplier(id, st) {
  const p = st.plat;
  const champs = Object.create(null);
  const radios = Object.create(null);
  const qcm = Object.create(null);
  const cases = Object.create(null);
  const indices = Object.create(null);
  const depots = Object.create(null);
  Object.keys(p).forEach((k) => {
    const [genre, cle] = [k.slice(0, 1), k.slice(2)];
    if (k.charAt(1) !== '.' || !cleSure(cle)) { return; }
    const v = p[k];
    if (genre === 'c') { champs[cle] = texteSur(v); }
    if (genre === 'r') { radios[cle] = texteSur(v, 40); }
    if (genre === 'q' && Array.isArray(v)) {
      qcm[cle] = { premier: texteSur(v[0], 4), dernier: texteSur(v[1], 4), essais: Number(v[2]) || 1, premierJuste: !!v[3], juste: !!v[4] };
    }
    if (genre === 'k' && Array.isArray(v)) { cases[cle] = v.map((x) => texteSur(x, 20)).slice(0, 40); }
    if (genre === 'i' && Array.isArray(v)) { indices[cle] = { trouve: !!v[0], montre: !!v[1], essais: Number(v[2]) || 0 }; }
    if (genre === 'd' && Array.isArray(v)) { depots[cle] = { le: Number(v[0]) || 0, via: texteSur(v[1], 20) }; }
  });
  const quetes = Object.create(null);
  const q = p['m.quetes'];
  if (q && typeof q === 'object') {
    QUETES.forEach((d) => {
      const v = q[d.id];
      if (Array.isArray(v)) { quetes[d.id] = { faits: Number(v[0]) || 0, total: Number(v[1]) || 0, terminee: !!v[2] }; }
    });
  }
  const icone = texteSur(p['m.icone'], 20);
  return {
    id,
    maj: st.maj ? new Date(st.maj) : null,
    messages: st.messages,
    equipe: texteSur(p['m.equipe'], 80).trim(),
    noms: listeNoms(p['m.noms']),
    icone: ICONES_EQUIPE[icone] ? icone : 'loupe',
    page: texteSur(p['m.page'], 80),
    points: Number(p['m.points']) || 0,
    drapeau: p['m.drapeau'] === 'aide' ? 'aide' : 'ok',
    quetes,
    reponses: {
      champs, radios, qcm, cases, indices,
      conseils: Array.isArray(p['s.conseils']) ? p['s.conseils'].map((x) => Number(x)).filter(Number.isFinite).slice(0, 8) : [],
      lu: Array.isArray(p['u.lu']) ? p['u.lu'].map((x) => texteSur(x, 20)) : []
    },
    depots
  };
}
function nomEquipe(e) { return e.equipe || 'Équipe sans nom'; }
function indicesTrouves(e) {
  const ind = (e.reponses && e.reponses.indices) || {};
  return Object.values(ind).filter((r) => r && r.trouve && !r.montre).length;
}
function lieu(e) {
  const [p, ancre] = [e.page.split('#')[0], e.page.includes('#') ? '#' + e.page.split('#')[1] : ''];
  const base = PAGES[p] || p || 'inconnu';
  if (ancre && SECTIONS[ancre]) { return ancre === '#depot' ? 'Dépôt' : base + ', ' + SECTIONS[ancre]; }
  return base;
}
function champ(e, id) {
  const v = e.reponses && e.reponses.champs ? e.reponses.champs[id] : '';
  return typeof v === 'string' ? v : (v == null ? '' : String(v));
}
function requisRemplis(e) {
  const radios = (e.reponses && e.reponses.radios) || {};
  const ids = champsRequis({ radios });
  const faits = ids.filter((id) => champ(e, id).trim().length >= SEUIL_CHAMP).length;
  return { faits, total: ids.length };
}

// ---------------------------------------------------------------- relais

function relais() { return String(cfg.collecte.relais).replace(/\/+$/, ''); }

async function lireSujet(sujet, depuis) {
  const r = await fetch(relais() + '/' + encodeURIComponent(sujet) + '/json?poll=1&since=' + encodeURIComponent(depuis), { cache: 'no-store' });
  if (r.status === 429) { throw new Error('le relais demande de patienter'); }
  if (!r.ok) { throw new Error('relais, erreur ' + r.status); }
  const lignes = [];
  (await r.text()).split('\n').forEach((l) => {
    try {
      const m = JSON.parse(l);
      if (m && m.event === 'message' && typeof m.message === 'string' && typeof m.id === 'string') { lignes.push({ id: m.id, time: Number(m.time) || 0, message: m.message }); }
    } catch (e) { /* ligne vide ou illisible */ }
  });
  return lignes;
}

function chargerLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_MESSAGES) || 'null');
    if (v && Array.isArray(v.messages)) { local = { depuis: Number(v.depuis) || 0, messages: v.messages }; }
  } catch (e) { /* rien de gardé */ }
}
function garderLocal() {
  try {
    localStorage.setItem(CLE_MESSAGES, JSON.stringify(local));
    return true;
  } catch (e) {
    return false;
  }
}

// Regroupe les morceaux d’un même message, déchiffre ce qui est complet, puis
// rejoue les messages de chaque équipe dans l’ordre.
async function reconstituer() {
  const groupes = new Map();
  local.messages.forEach((m) => {
    const p = m.message.split('.');
    if (p.length !== 5 || p[0] !== 'f1') { return; }
    const [, mid, i, n, morceau] = p;
    const total = Number(n);
    const rang = Number(i);
    if (!(total >= 1 && total <= 40 && rang >= 1 && rang <= total)) { return; }
    const g = groupes.get(mid) || { total, morceaux: new Map() };
    if (g.total !== total) { return; }
    g.morceaux.set(rang, morceau);
    groupes.set(mid, g);
  });
  for (const [mid, g] of groupes) {
    if (dechiffres.has(mid) || g.morceaux.size !== g.total) { continue; }
    const texte = Array.from({ length: g.total }, (_, k) => g.morceaux.get(k + 1)).join('');
    try {
      const d = await dechiffrer(cles.dechiffrement, texte);
      const ok = d && d.v === 1 && typeof d.id === 'string' && cleSure(d.id) && typeof d.t === 'number' && d.x && typeof d.x === 'object';
      dechiffres.set(mid, ok ? d : null);
    } catch (e) {
      dechiffres.set(mid, null);
    }
  }
  const parEquipe = new Map();
  [...dechiffres.values()].filter(Boolean).sort((a, b) => a.t - b.t).forEach((d) => {
    let st = parEquipe.get(d.id);
    if (!st || d.complet) { st = { plat: Object.create(null), maj: 0, messages: st ? st.messages : 0 }; }
    Object.keys(d.x).forEach((k) => {
      if (!/^[a-z]\.[A-Za-z0-9_-]{1,40}$/.test(k) || INTERDITES.has(k.slice(2))) { return; }
      if (d.x[k] === null) { delete st.plat[k]; } else { st.plat[k] = d.x[k]; }
    });
    st.maj = Math.max(st.maj, d.t);
    st.messages += 1;
    parEquipe.set(d.id, st);
  });
  equipes = [...parEquipe.entries()].map(([id, st]) => deplier(id, st));
}

async function lireDepart() {
  if (!cfg.collecte.sujetHorloge) { return; }
  const lignes = await lireSujet(cfg.collecte.sujetHorloge, '12h');
  let meilleur = null;
  for (const m of lignes) {
    if (!m.message.startsWith('h1.')) { continue; }
    const d = await verifier(cfg.collecte.cleSignature, m.message.slice(3));
    if (d && typeof d.t === 'number' && (!meilleur || d.t > meilleur.t)) { meilleur = d; }
  }
  departDiffuse = meilleur;
}

// ---------------------------------------------------------------- chargement
async function charger() {
  if (enChargement || !cles) { return; }
  enChargement = true;
  const statutMaj = $('[data-maj]');
  try {
    const connus = new Set(local.messages.map((m) => m.id));
    const dernier = local.messages.reduce((t, m) => Math.max(t, m.time), 0);
    const depuis = Math.max(dernier ? dernier - 1 : 0, local.depuis);
    const neufs = (await lireSujet(cfg.collecte.sujet, depuis ? String(depuis) : 'all'))
      .filter((m) => !connus.has(m.id) && m.time >= local.depuis && m.message.startsWith('f1.'));
    if (neufs.length) { local.messages = local.messages.concat(neufs); }
    const garde = garderLocal();
    await reconstituer();
    try { await lireDepart(); } catch (e) { /* l’heure diffusée sera relue à la prochaine actualisation */ }
    rendre();
    const aujourdhui = local.messages.filter((m) => Date.now() / 1000 - m.time < 86400).length;
    statutMaj.textContent = 'Mise à jour à ' + heure(Date.now()) + '. ' + nb(aujourdhui, 'message reçu', 'messages reçus')
      + ' en 24 heures, sur ' + LIMITE_JOUR + ' possibles depuis un même réseau.'
      + (garde ? '' : ' Ce navigateur ne peut plus garder de copie, téléchargez les réponses.');
    statutMaj.className = 'statut' + (aujourdhui > LIMITE_JOUR * 0.8 || !garde ? ' alerte' : '');
  } catch (err) {
    statutMaj.textContent = 'Lecture impossible pour l’instant (' + err.message + '). Nouvel essai à la prochaine actualisation.';
    statutMaj.className = 'statut alerte';
  } finally {
    enChargement = false;
  }
}

function planifier() {
  clearInterval(minuteur);
  minuteur = setInterval(() => {
    if ($('#auto-maj').checked && document.visibilityState === 'visible') { charger(); }
  }, Math.max(10, Number(cfg.collecte.lectureSecondes) || 40) * 1000);
}

// ---------------------------------------------------------------- rendu
function rendre() {
  rendreResume();
  rendreEnsemble();
  rendreChoix();
  rendreQuestion();
  rendreEquipe();
  rendreDepart();
}

function rendreResume() {
  const actives = equipes.filter((e) => e.maj && Date.now() - e.maj.getTime() < ACTIF_MS).length;
  const aide = equipes.filter((e) => e.drapeau === 'aide').length;
  const parcours = equipes.filter((e) => e.depots.parcours).length;
  const video = equipes.filter((e) => e.depots.video).length;
  const zone = $('[data-resume]');
  zone.replaceChildren(
    h('p', { class: 'puce' }, h('b', { text: String(equipes.length) }), equipes.length > 1 ? ' équipes' : ' équipe'),
    h('p', { class: 'puce' }, h('b', { text: String(actives) }), (actives > 1 ? ' actives' : ' active') + ' (moins de 5 min)'),
    h('p', { class: 'puce' + (aide ? ' puce-aide' : '') }, aide ? svg('coup-de-main') : null, h('b', { text: String(aide) }), aide > 1 ? ' demandent de l’aide' : ' demande de l’aide'),
    h('p', { class: 'puce' }, h('b', { text: parcours + '/' + equipes.length }), ' dépôts du parcours'),
    h('p', { class: 'puce' }, h('b', { text: video + '/' + equipes.length }), ' dépôts de la vidéo')
  );
}

function pastillesQuetes(e) {
  return h('span', { class: 'pastilles-quetes' }, QUETES.map((q) => {
    const etat = e.quetes[q.id] || {};
    const fini = !!etat.terminee;
    return h('span', { class: 'pq' + (fini ? ' fini' : ''), 'data-c': q.id, title: 'Quête ' + q.label },
      q.label.charAt(0), h('span', { class: 'visuellement-cache', text: ' ' + q.label + ', ' }),
      fini ? ' ✓' : ' ' + (etat.faits || 0) + '/' + (etat.total || '?'));
  }));
}

function depotCellule(d) {
  if (!d || !d.le) { return h('td', { class: 'vide', text: 'pas encore' }); }
  const via = { envoi: 'envoyé', copie: 'copié', fichier: 'téléchargé' }[d.via] || '';
  return h('td', {}, h('b', { text: heure(d.le) }), via ? ' ' + via : '');
}

function rendreEnsemble() {
  const panneau = $('[data-panneau="ensemble"]');
  if (!equipes.length) {
    panneau.replaceChildren(h('p', { class: 'statut', text: 'Aucune équipe pour l’instant. Une équipe apparaît une vingtaine de secondes après avoir écrit ses noms sur la page Cadre.' }));
    return;
  }
  const tri = [...equipes].sort((a, b) => (a.drapeau === 'aide' ? 0 : 1) - (b.drapeau === 'aide' ? 0 : 1) || nomEquipe(a).localeCompare(nomEquipe(b), 'fr'));
  const lignes = tri.map((e) => {
    const inactive = !e.maj || Date.now() - e.maj.getTime() >= ACTIF_MS;
    const req = requisRemplis(e);
    const tr = h('tr', { class: (e.drapeau === 'aide' ? 'ligne-aide' : '') + (inactive ? ' inactive' : '') },
      h('td', {}, e.drapeau === 'aide'
        ? h('span', { class: 'badge-aide' }, svg('coup-de-main'), 'Besoin d’aide')
        : h('span', { class: 'badge-ok' }, svg('valide'), 'On avance')),
      h('th', { scope: 'row' }, h('span', { class: 'nom-equipe' }, svg(e.icone, 'icone-mini'), h('button', { type: 'button', class: 'lien-equipe', 'data-voir-equipe': e.id, text: nomEquipe(e) })), h('span', { class: 'noms', text: e.noms || 'noms non renseignés' })),
      h('td', {}, lieu(e), h('span', { class: 'noms', text: ilYA(e.maj) })),
      h('td', { class: 'num' }, String(e.points)),
      h('td', {}, pastillesQuetes(e)),
      h('td', { class: 'num' }, req.faits + '/' + req.total),
      depotCellule(e.depots.parcours),
      depotCellule(e.depots.video)
    );
    return tr;
  });
  const table = h('table', { class: 'tableau-equipes' },
    h('caption', { class: 'visuellement-cache', text: 'Équipes, avec leur signal, leur page, leurs points, leurs quêtes et leurs dépôts' }),
    h('thead', {}, h('tr', {},
      ['Signal', 'Équipe', 'Page et activité', 'Points', 'Quêtes', 'Champs requis', 'Dépôt parcours', 'Dépôt vidéo'].map((t, i) => h('th', { scope: 'col', class: i === 3 || i === 5 ? 'num' : null, text: t })))),
    h('tbody', {}, lignes));
  panneau.replaceChildren(h('div', { class: 'table-defile' }, table));
  typographier(panneau);
}

function rendreChoix() {
  const selQ = $('[data-choix-question]');
  if (!selQ.options.length && questions.length) {
    const groupes = new Map();
    questions.forEach((q) => {
      if (!groupes.has(q.section)) { groupes.set(q.section, h('optgroup', { label: q.section })); }
      const texte = q.id + '. ' + (q.enonce.length > 90 ? q.enonce.slice(0, 87) + '…' : q.enonce);
      groupes.get(q.section).append(h('option', { value: q.cle, text: texte }));
    });
    selQ.replaceChildren(...groupes.values());
  }
  const selE = $('[data-choix-equipe]');
  const courant = selE.value;
  const tri = [...equipes].sort((a, b) => nomEquipe(a).localeCompare(nomEquipe(b), 'fr'));
  selE.replaceChildren(...tri.map((e) => h('option', { value: e.id, text: nomEquipe(e) + (e.noms ? ' (' + e.noms + ')' : '') })));
  if (courant && tri.some((e) => e.id === courant)) { selE.value = courant; }
}

function reponseTexte(e, q) {
  if (q.type === 'choix') {
    const radios = (e.reponses && e.reponses.radios) || {};
    const v = radios[q.cle];
    if (!v) { return ''; }
    const precision = q.precision ? champ(e, q.precision) : '';
    return (q.options[v] || v) + (precision ? ', ' + precision : '');
  }
  return champ(e, q.cle);
}

function rendreQuestion() {
  const zone = $('[data-contenu-question]');
  const cleQ = $('[data-choix-question]').value;
  const q = questions.find((x) => x.cle === cleQ);
  if (!q) { zone.replaceChildren(); return; }
  const tri = [...equipes].sort((a, b) => nomEquipe(a).localeCompare(nomEquipe(b), 'fr'));
  const blocs = [h('p', { class: 'enonce' }, h('b', { text: q.id + '. ' }), q.enonce)];
  if (q.type === 'qcm') {
    const recs = tri.map((e) => [e, ((e.reponses && e.reponses.qcm) || {})[q.cle]]).filter(([, r]) => r && r.premier);
    const justes = recs.filter(([, r]) => r.premierJuste).length;
    const lettres = [...new Set([...Object.keys(q.options), ...recs.map(([, r]) => r.premier), ...recs.map(([, r]) => r.dernier)])].sort();
    blocs.push(h('p', { class: 'statut', text: nb(recs.length, 'équipe a répondu', 'équipes ont répondu') + ' sur ' + equipes.length + '. Justes du premier coup, ' + justes + '.' }));
    blocs.push(h('div', { class: 'table-defile' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', { scope: 'col', text: 'Réponse' }), h('th', { scope: 'col', class: 'num', text: 'Premier choix' }), h('th', { scope: 'col', class: 'num', text: 'Choix final' }))),
      h('tbody', {}, lettres.map((l) => h('tr', {},
        h('th', { scope: 'row' }, h('b', { text: l.toUpperCase() + ' ' }), q.options[l] || ''),
        h('td', { class: 'num', text: String(recs.filter(([, r]) => r.premier === l).length) }),
        h('td', { class: 'num', text: String(recs.filter(([, r]) => r.dernier === l).length) })))))));
    blocs.push(h('ul', { class: 'liste-reponses' }, recs.map(([e, r]) => h('li', { class: 'reponse-carte' },
      h('b', { text: nomEquipe(e) }), ' première réponse ' + r.premier.toUpperCase() + (r.premierJuste ? ' (juste)' : ' (fausse)') + ', réponse finale ' + String(r.dernier).toUpperCase() + ', ' + r.essais + (r.essais > 1 ? ' essais' : ' essai')))));
  } else {
    const avec = tri.filter((e) => reponseTexte(e, q).trim());
    const sans = tri.filter((e) => !reponseTexte(e, q).trim());
    blocs.push(h('p', { class: 'statut', text: nb(avec.length, 'réponse', 'réponses') + ' sur ' + nb(equipes.length, 'équipe', 'équipes') + '.' }));
    if (q.type === 'choix') {
      const comptes = {};
      avec.forEach((e) => { const v = ((e.reponses && e.reponses.radios) || {})[q.cle]; comptes[v] = (comptes[v] || 0) + 1; });
      blocs.push(h('p', { class: 'statut', text: Object.entries(comptes).map(([v, n]) => (q.options[v] || v) + ', ' + n).join(' ; ') }));
    }
    blocs.push(h('ul', { class: 'liste-reponses' }, avec.map((e) => h('li', { class: 'reponse-carte' },
      h('p', { class: 'qui' }, h('b', { text: nomEquipe(e) }), e.noms ? ' (' + e.noms + ')' : ''),
      h('p', { class: 'texte-reponse', text: reponseTexte(e, q) })))));
    if (sans.length) { blocs.push(h('p', { class: 'statut', text: 'Sans réponse pour l’instant. ' + sans.map(nomEquipe).join(', ') + '.' })); }
  }
  zone.replaceChildren(...blocs);
  typographier(zone);
}

function rendreEquipe() {
  const zone = $('[data-contenu-equipe]');
  const e = equipes.find((x) => x.id === $('[data-choix-equipe]').value);
  if (!e) { zone.replaceChildren(h('p', { class: 'statut', text: 'Aucune équipe pour l’instant.' })); return; }
  const blocs = [
    h('div', { class: 'fiche-equipe' },
      h('p', {}, svg(e.icone, 'icone-mini'), h('b', { text: nomEquipe(e) }), e.noms ? ' (' + e.noms + ')' : ''),
      h('p', { class: 'statut', text: lieu(e) + ', ' + ilYA(e.maj) + '. ' + e.points + ' points d’enquête. Indices retrouvés dans la correction, ' + indicesTrouves(e) + ' sur 6.' + (e.drapeau === 'aide' ? ' Demande de l’aide.' : '') }))
  ];
  let section = '';
  questions.forEach((q) => {
    if (q.section !== section) { section = q.section; blocs.push(h('h3', { text: section })); }
    if (q.type === 'qcm') {
      const r = ((e.reponses && e.reponses.qcm) || {})[q.cle];
      blocs.push(h('p', { class: 'ligne-qcm' }, h('b', { text: q.id + '. ' }), ligneQCM(r)));
      return;
    }
    const v = reponseTexte(e, q);
    if (!v && q.bonus) { return; }
    blocs.push(h('div', { class: 'reponse-carte' },
      h('p', { class: 'qui' }, h('b', { text: q.id + '. ' }), q.enonce),
      h('p', { class: 'texte-reponse' + (v ? '' : ' vide'), text: v || 'pas de réponse' })));
  });
  const conseils = (e.reponses && e.reponses.conseils) || [];
  const vus = ((e.reponses && e.reponses.cases) || {}).tips_vus || [];
  blocs.push(h('p', { class: 'statut', text: 'Conseils choisis pour la vidéo, ' + (conseils.length ? conseils.join(', ') : 'aucun') + '. Conseils repérés dans les notes reçues, ' + (vus.length ? vus.join(', ') : 'aucun') + '.' }));
  blocs.push(h('p', { class: 'statut', text: texteDepot(e, 'parcours', 'Dépôt du parcours') + ' ' + texteDepot(e, 'video', 'Dépôt de la vidéo') }));
  zone.replaceChildren(...blocs);
  typographier(zone);
}

function texteDepot(e, type, titre) {
  const d = e.depots[type];
  if (!d || !d.le) { return titre + ', pas encore.'; }
  const via = { envoi: 'envoyé', copie: 'copié', fichier: 'téléchargé' }[d.via];
  return titre + ', ' + heure(d.le) + (via ? ', ' + via : '') + '.';
}

function rendreDepart() {
  const p = $('[data-depart-actuel]');
  const duJour = departDiffuse && departDiffuse.depart && new Date(departDiffuse.t).toDateString() === new Date().toDateString();
  p.textContent = duJour
    ? 'Heure de départ diffusée à toute la classe, ' + departDiffuse.depart.replace(':', ' h ') + ' (envoyée à ' + heure(departDiffuse.t) + ').'
    : 'Aucune heure diffusée aujourd’hui. Les appareils suivent l’horaire du fichier docs/data/schedule.json.';
  typographier(p);
}

// ---------------------------------------------------------------- horloge de la classe
async function diffuserDepart(valeur) {
  const st = $('[data-statut-horloge]');
  st.textContent = 'Envoi…';
  try {
    const corps = 'h1.' + await signer(cles.signature, { depart: valeur, t: Date.now() });
    const r = await fetch(relais() + '/' + encodeURIComponent(cfg.collecte.sujetHorloge), { method: 'POST', body: corps, cache: 'no-store' });
    if (r.status === 429) { throw new Error('limite'); }
    if (!r.ok) { throw new Error('relais'); }
    // Le relais enregistre les messages avec un léger différé : on relit
    // jusqu’à voir l’heure envoyée.
    let recu = null;
    for (let essai = 0; essai < 4 && recu !== valeur; essai++) {
      await new Promise((ok) => setTimeout(ok, 1500));
      await lireDepart();
      recu = (departDiffuse && departDiffuse.depart) || '';
    }
    rendreDepart();
    relireHorloge();
    st.textContent = recu === valeur
      ? (valeur ? 'C’est fait. Départ à ' + valeur.replace(':', ' h ') + ' pour toute la classe.' : 'C’est fait. Retour à l’horaire du fichier.')
      : 'Le changement n’est pas confirmé. Recommencez dans un instant.';
  } catch (e) {
    st.textContent = e.message === 'limite'
      ? 'Le relais refuse l’envoi pour l’instant, la limite de ce réseau est atteinte. Réessayez dans quelques minutes.'
      : 'L’envoi n’a pas abouti. Vérifiez la connexion, puis recommencez.';
  }
  typographier(st);
}

// ---------------------------------------------------------------- téléchargements

function telecharger(contenu, nom, type) {
  const blob = new Blob([contenu], { type });
  const a = h('a', { href: URL.createObjectURL(blob), download: nom });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function ligneQCM(r) {
  return r && r.premier
    ? 'première réponse ' + r.premier.toUpperCase() + (r.premierJuste ? ' (juste)' : ' (fausse)') + ', réponse finale ' + String(r.dernier).toUpperCase() + ', ' + r.essais + (r.essais > 1 ? ' essais' : ' essai')
    : 'pas de réponse';
}

// Une fiche par équipe, avec chaque question et sa réponse.
function texteExport() {
  const lignes = ['Réponses des équipes, séance 9, téléchargées le ' + new Date().toLocaleString('fr-FR') + '.', ''];
  [...equipes].sort((a, b) => nomEquipe(a).localeCompare(nomEquipe(b), 'fr')).forEach((e) => {
    lignes.push('==== ' + nomEquipe(e) + (e.noms ? ' (' + e.noms + ')' : ''));
    lignes.push('Dernier envoi, ' + (e.maj ? e.maj.toLocaleString('fr-FR') : 'inconnu') + '. Points d’enquête, ' + e.points + '. Indices retrouvés dans la correction, ' + indicesTrouves(e) + ' sur 6.');
    lignes.push(texteDepot(e, 'parcours', 'Dépôt du parcours') + ' ' + texteDepot(e, 'video', 'Dépôt de la vidéo'));
    let section = '';
    questions.forEach((q) => {
      if (q.section !== section) { section = q.section; lignes.push('', '-- ' + section); }
      if (q.type === 'qcm') { lignes.push(q.id + '. ' + ligneQCM((e.reponses.qcm || {})[q.cle])); return; }
      const v = reponseTexte(e, q);
      if (!v && q.bonus) { return; }
      lignes.push('', q.id + '. ' + q.enonce, 'Réponse. ' + (v || '(pas de réponse)'));
    });
    lignes.push('', '');
  });
  return lignes.join('\n');
}

// ---------------------------------------------------------------- onglets et actions
function changerVue(v) {
  vue = v;
  document.querySelectorAll('[role="tab"]').forEach((t) => {
    const actif = t.dataset.vue === v;
    t.setAttribute('aria-selected', actif ? 'true' : 'false');
    t.tabIndex = actif ? 0 : -1;
  });
  document.querySelectorAll('[data-panneau]').forEach((p) => { p.hidden = p.dataset.panneau !== v; });
}

function deconnecter(message) {
  clearInterval(minuteur);
  cles = null;
  $('[data-tableau]').hidden = true;
  $('[data-connexion]').hidden = false;
  $('[data-erreur-cle]').textContent = message || '';
  if (message) { oublierCode(); }
}

async function connecter(valeur, souvenir) {
  const erreur = $('[data-erreur-cle]');
  const bouton = $('[data-connexion] button[type="submit"]');
  erreur.textContent = '';
  bouton.disabled = true;
  bouton.textContent = 'Ouverture…';
  const ouvertes = await ouvrirCoffre(cfg.collecte.coffre, valeur);
  bouton.disabled = false;
  bouton.textContent = 'Afficher les réponses';
  if (!ouvertes) { deconnecter('Code incorrect.'); return; }
  cles = ouvertes;
  if (souvenir !== undefined) { garderCode(valeur, souvenir); }
  $('[data-connexion]').hidden = true;
  $('[data-tableau]').hidden = false;
  chargerLocal();
  if (!questions.length) { questions = await catalogue(); }
  await charger();
  planifier();
}

async function demarrer() {
  await new Promise((r) => {
    if (document.documentElement.classList.contains('js-pret')) { r(); } else { window.addEventListener('fabrique:pret', r, { once: true }); }
  });
  cfg = await config();
  const k = cfg.collecte || {};
  if (!(k.actif && k.relais && k.sujet && k.coffre)) { return; }

  $('[data-connexion]').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const v = $('#code-enseignant').value.trim();
    if (!v) { return; }
    connecter(v, $('#code-souvenir').checked);
  });
  $('[data-actualiser]').addEventListener('click', charger);
  $('[data-oublier]').addEventListener('click', () => { oublierCode(); deconnecter(''); $('#code-enseignant').value = ''; });
  $('[data-exporter]').addEventListener('click', () => {
    telecharger(JSON.stringify(equipes, null, 2), 's09_reponses_equipes.json', 'application/json');
  });
  $('[data-exporter-texte]').addEventListener('click', () => {
    telecharger(texteExport(), 's09_reponses_equipes.txt', 'text/plain;charset=utf-8');
  });
  const effacer = $('[data-effacer-local]');
  const libelle = effacer.textContent;
  let confirmer = null;
  effacer.addEventListener('click', () => {
    const st = $('[data-statut-local]');
    if (!confirmer) {
      effacer.textContent = 'Confirmer l’effacement';
      st.textContent = 'Les réponses déjà reçues ne s’afficheront plus ici. Téléchargez-les d’abord si besoin.';
      confirmer = setTimeout(() => { confirmer = null; effacer.textContent = libelle; st.textContent = ''; }, 8000);
      return;
    }
    clearTimeout(confirmer);
    confirmer = null;
    effacer.textContent = libelle;
    local = { depuis: Math.floor(Date.now() / 1000), messages: [] };
    dechiffres.clear();
    equipes = [];
    garderLocal();
    rendre();
    st.textContent = 'C’est fait. Seules les réponses envoyées à partir de maintenant s’afficheront.';
    typographier(st);
  });
  document.querySelectorAll('[role="tab"]').forEach((t) => {
    t.addEventListener('click', () => changerVue(t.dataset.vue));
    t.addEventListener('keydown', (ev) => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') { return; }
      const onglets = [...document.querySelectorAll('[role="tab"]')];
      const i = onglets.indexOf(t) + (ev.key === 'ArrowRight' ? 1 : -1);
      const cible = onglets[(i + onglets.length) % onglets.length];
      changerVue(cible.dataset.vue);
      cible.focus();
    });
  });
  $('[data-choix-question]').addEventListener('change', rendreQuestion);
  $('[data-choix-equipe]').addEventListener('change', rendreEquipe);
  $('[data-panneau="ensemble"]').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-voir-equipe]');
    if (!b) { return; }
    $('[data-choix-equipe]').value = b.dataset.voirEquipe;
    rendreEquipe();
    changerVue('equipe');
    $('#onglet-equipe').focus();
  });
  $('[data-diffuser]').addEventListener('click', () => {
    const v = $('#depart-classe').value;
    if (/^\d{2}:\d{2}$/.test(v)) { diffuserDepart(v); }
  });
  $('[data-demarrer]').addEventListener('click', () => {
    const d = new Date();
    const v = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    $('#depart-classe').value = v;
    diffuserDepart(v);
  });
  $('[data-annuler-depart]').addEventListener('click', () => diffuserDepart(''));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cles && $('#auto-maj').checked) { charger(); } });

  const memorise = lireCode();
  if (memorise) { connecter(memorise); }
}

demarrer();
