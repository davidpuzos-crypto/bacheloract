// Page « Réponses des équipes » (espace enseignant).
// Lit les réponses envoyées par les binômes dans la feuille Google privée,
// via le script Apps Script, avec la clé de l’enseignant. La clé n’est
// jamais dans le code du site : on la tape sur cette page.
// Tout texte venu des étudiant·es est affiché comme du texte (textContent),
// jamais comme du HTML.

import { config, icone } from './donnees.js';
import { catalogue } from './recap.js';
import { formatHeure } from './clock.js';
import { QUETES, champsRequis, SEUIL_CHAMP, ICONES_EQUIPE } from './gamify.js';
import { typographier } from './typo.js';

const CLE_STOCKAGE = 'fabrique:s09:cle-enseignant';
const ACTIF_MS = 5 * 60000;
const PAGES = {
  hub: 'Accueil', cadre: 'Cadre', methode: 'Méthode', chercher: 'Chercher', 'citer-lecture': 'Bien citer',
  'citer-pratique': 'Citer, pratique', pause: 'Pause', lire: 'Lire', correction: 'Correction', notes: 'Conseils de notes',
  video: 'Vidéo', fin: 'Bilan', accueil: 'Accueil du cours'
};
const SECTIONS = { '#depot': 'Dépôt', '#pendant': 'pendant', '#comparer': 'à froid et comparer', '#questions': 'questions' };

let cfg = null;
let cle = '';
let equipes = [];
let questions = [];
let departDiffuse = '';
let vue = 'ensemble';
let minuteur = null;
let enChargement = false;

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
function json(v, defaut) {
  if (v && typeof v === 'object') { return v; }
  try { return v ? JSON.parse(v) : defaut; } catch (e) { return defaut; }
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
function adresse(parametres) {
  const base = cfg.collecte.endpoint;
  return base + (base.includes('?') ? '&' : '?') + parametres;
}
function lireCle() {
  try { return sessionStorage.getItem(CLE_STOCKAGE) || localStorage.getItem(CLE_STOCKAGE) || ''; } catch (e) { return ''; }
}
function garderCle(v, souvenir) {
  try {
    sessionStorage.setItem(CLE_STOCKAGE, v);
    if (souvenir) { localStorage.setItem(CLE_STOCKAGE, v); } else { localStorage.removeItem(CLE_STOCKAGE); }
  } catch (e) { /* stockage indisponible : la clé reste en mémoire */ }
}
function oublierCle() {
  try { sessionStorage.removeItem(CLE_STOCKAGE); localStorage.removeItem(CLE_STOCKAGE); } catch (e) { /* rien à faire */ }
}

function normaliser(r) {
  const maj = r.maj ? new Date(r.maj) : null;
  return {
    id: String(r.id || ''),
    maj: maj && !isNaN(maj.getTime()) ? maj : null,
    equipe: String(r.equipe || '').trim(),
    noms: String(r.noms || '').trim(),
    icone: ICONES_EQUIPE[r.icone] ? String(r.icone) : 'loupe',
    page: String(r.page || ''),
    points: Number(r.points) || 0,
    drapeau: r.drapeau === 'aide' ? 'aide' : 'ok',
    quetes: json(r.quetes, {}),
    reponses: json(r.reponses, {}),
    depots: json(r.depots, {}),
    depot_parcours: String(r.depot_parcours || ''),
    depot_video: String(r.depot_video || '')
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

// ---------------------------------------------------------------- chargement
async function charger() {
  if (enChargement) { return; }
  enChargement = true;
  const statutMaj = $('[data-maj]');
  try {
    const r = await fetch(adresse('action=lire&cle=' + encodeURIComponent(cle)), { cache: 'no-store' });
    const j = await r.json();
    if (!j.ok) {
      if (j.erreur === 'cle') { deconnecter('Clé incorrecte.'); return; }
      throw new Error(j.erreur || 'réponse inattendue');
    }
    equipes = (j.equipes || []).map(normaliser).filter((e) => e.id);
    departDiffuse = j.depart || '';
    rendre();
    statutMaj.textContent = 'Mise à jour à ' + heure(Date.now()) + '.';
    statutMaj.className = 'statut';
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
  }, 20000);
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
    panneau.replaceChildren(h('p', { class: 'statut', text: 'Aucune équipe pour l’instant. Les équipes apparaissent dès qu’un binôme ouvre une page de la séance.' }));
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
      blocs.push(h('p', { class: 'ligne-qcm' }, h('b', { text: q.id + '. ' }),
        r && r.premier ? 'première réponse ' + r.premier.toUpperCase() + (r.premierJuste ? ' (juste)' : ' (fausse)') + ', réponse finale ' + String(r.dernier).toUpperCase() + ', ' + r.essais + (r.essais > 1 ? ' essais' : ' essai') : 'pas de réponse'));
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
  blocs.push(h('p', { class: 'statut', text: 'Conseils choisis pour la vidéo, ' + (conseils.length ? conseils.join(', ') : 'aucun') + '. Conseils repérés chez l’autre, ' + (vus.length ? vus.join(', ') : 'aucun') + '.' }));
  [['depot_parcours', 'Récapitulatif du parcours envoyé'], ['depot_video', 'Récapitulatif de la vidéo envoyé']].forEach(([cle, titre]) => {
    if (e[cle]) {
      blocs.push(h('details', { class: 'encadre' }, h('summary', { text: titre }), h('pre', { class: 'recap-recu', text: e[cle] })));
    }
  });
  zone.replaceChildren(...blocs);
  typographier(zone);
}

function rendreDepart() {
  const p = $('[data-depart-actuel]');
  p.textContent = departDiffuse
    ? 'Heure de départ diffusée à toute la classe, ' + departDiffuse.replace(':', ' h ') + '.'
    : 'Aucune heure diffusée. Les appareils suivent l’horaire du fichier docs/data/schedule.json.';
  typographier(p);
}

// ---------------------------------------------------------------- horloge de la classe
async function diffuserDepart(valeur) {
  const st = $('[data-statut-horloge]');
  st.textContent = 'Envoi…';
  try {
    await fetch(cfg.collecte.endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'horloge', cle, depart: valeur }) });
    await new Promise((r) => setTimeout(r, 1200));
    const r = await fetch(adresse('action=horloge'), { cache: 'no-store' });
    const j = await r.json();
    departDiffuse = j.depart || '';
    rendreDepart();
    st.textContent = (departDiffuse === valeur)
      ? (valeur ? 'C’est fait. Départ à ' + valeur.replace(':', ' h ') + ' pour toute la classe.' : 'C’est fait. Retour à l’horaire du fichier.')
      : 'Le changement n’est pas confirmé. Vérifiez la clé, puis recommencez.';
  } catch (e) {
    st.textContent = 'L’envoi n’a pas abouti. Vérifiez la connexion, puis recommencez.';
  }
  typographier(st);
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
  $('[data-tableau]').hidden = true;
  $('[data-connexion]').hidden = false;
  $('[data-erreur-cle]').textContent = message || '';
  if (message) { oublierCle(); }
  cle = '';
}

async function connecter(valeur) {
  cle = valeur;
  $('[data-erreur-cle]').textContent = '';
  $('[data-connexion]').hidden = true;
  $('[data-tableau]').hidden = false;
  if (!questions.length) { questions = await catalogue(); }
  await charger();
  if (cle) { planifier(); }
}

async function demarrer() {
  await new Promise((r) => {
    if (document.documentElement.classList.contains('js-pret')) { r(); } else { window.addEventListener('fabrique:pret', r, { once: true }); }
  });
  cfg = await config();
  if (!(cfg.collecte && cfg.collecte.actif && cfg.collecte.endpoint)) { return; }

  $('[data-connexion]').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const v = $('#cle-enseignant').value.trim();
    if (!v) { return; }
    garderCle(v, $('#cle-souvenir').checked);
    connecter(v);
  });
  $('[data-actualiser]').addEventListener('click', charger);
  $('[data-oublier]').addEventListener('click', () => { oublierCle(); deconnecter(''); $('#cle-enseignant').value = ''; });
  $('[data-exporter]').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(equipes, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 's09_reponses_equipes.json' });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
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
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cle && $('#auto-maj').checked) { charger(); } });

  const memorisee = lireCle();
  if (memorisee) { connecter(memorisee); }
}

demarrer();
