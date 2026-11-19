// Envoi des réponses à l’enseignant, sans compte ni script à installer.
// Les réponses partent chiffrées vers un relais public (ntfy.sh, adresse et
// sujets dans data/config.json). Seule la page « Réponses des équipes »,
// ouverte avec le code de l’enseignant, peut les lire.
//
// Le relais garde les messages 12 heures et accepte, depuis un même réseau,
// 250 messages par jour et une requête toutes les 5 secondes en moyenne.
// Toute la classe partage souvent le même réseau : on envoie donc peu, et
// seulement ce qui a changé depuis le dernier envoi réussi.
// Moments d’envoi : peu après la saisie des noms, à chaque point d’arrêt,
// quand le drapeau d’aide change, au dépôt, et au plus tard 15 minutes après
// une modification restée sans envoi.
//
// L’heure de départ diffusée par l’enseignant est lue sur le même relais, au
// plus toutes les 6 minutes. Elle est signée : une heure qui ne vient pas de
// l’enseignant est ignorée.

import { lire, modifierSansSignal } from './state.js';
import { config, fichierCourant } from './donnees.js';
import { calculer, equipe } from './gamify.js';
import { statut, appliquerDepartDiffuse, surArret } from './clock.js';
import { chiffrerPour, verifier } from './chiffre.js';

const MAX_CHAMP = 8000;
const TAILLE_MORCEAU = 3800;
const MAX_MESSAGES_JOUR = 40;
const CLE_ENVOI = 'fabrique:s09:envoi';
const CLE_HORLOGE = 'fabrique:s09:horloge-lue';
const LEGERS = new Set(['m.page', 'm.phase', 'm.points']);
const SOURCES_IGNOREES = new Set(['options', 'arret']);
const IDENTITE = new Set(['equipe', 'nom1', 'nom2', 'nom3', 'icone']);

let cfg = null;
let actif = false;
let memoire = null;
let enVol = null;
let minuterieIdentite = null;
const abonnes = [];

export function surCollecte(cb) { abonnes.push(cb); }
function prevenir() {
  const env = etatEnvoi();
  abonnes.forEach((cb) => cb({ actif, dernierEnvoi: env.dernier || null, sature: sature(env) }));
}

function configActive(c) {
  const k = c && c.collecte;
  return !!(k && k.actif && k.relais && k.sujet && k.clePublique);
}
export async function collecteActive() { return configActive(await config()); }
export function etatCollecte() { const env = etatEnvoi(); return { actif, dernierEnvoi: env.dernier || null, sature: sature(env) }; }

function relais() { return String(cfg.collecte.relais).replace(/\/+$/, ''); }

// ---------------------------------------------------------------- mémoire des envois

function etatEnvoi() {
  if (!memoire) {
    try { memoire = JSON.parse(localStorage.getItem(CLE_ENVOI) || 'null'); } catch (e) { memoire = null; }
  }
  const id = lire().id || '';
  // Mémoire créée avant l’identifiant de l’équipe : on la garde.
  if (memoire && typeof memoire === 'object' && !memoire.id && id) { memoire.id = id; }
  if (!memoire || typeof memoire !== 'object' || memoire.id !== id) {
    memoire = { id, base: {}, jour: 0, n: 0, dernier: 0, arrets: {}, enAttenteDepuis: 0, derniereModif: 0, pauseJusqua: 0 };
  }
  // Nouvelle journée (autre séance sur le même appareil) : compteurs remis à zéro.
  if (Date.now() - (memoire.jour || 0) > 86400000) { memoire.jour = Date.now(); memoire.n = 0; memoire.arrets = {}; }
  return memoire;
}
function garderEnvoi() {
  try { localStorage.setItem(CLE_ENVOI, JSON.stringify(memoire)); } catch (e) { /* stockage indisponible : la mémoire reste dans la page */ }
}
function sature(env) { return !!(env.pauseJusqua && Date.now() < env.pauseJusqua); }

function identifiant() {
  if (!lire().id) {
    modifierSansSignal((s) => { s.id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); });
  }
  return lire().id;
}

// ---------------------------------------------------------------- contenu envoyé

function couper(v) {
  return typeof v === 'string' && v.length > MAX_CHAMP ? v.slice(0, MAX_CHAMP) + ' […]' : v;
}

// L’état de l’équipe à plat : une clé par information, pour n’envoyer que ce
// qui change. m. équipe et avancement, c. champs, r. choix, q. QCM, k. cases,
// s. conseils choisis, u. lectures terminées, d. dépôts.
function aplatir() {
  const e = lire();
  const eq = equipe(e);
  const res = calculer(e);
  const s = statut();
  const quetes = {};
  res.quetes.forEach((q) => { quetes[q.def.id] = [q.faits, q.total, q.terminee ? 1 : 0]; });
  const plat = {
    'm.equipe': eq.nom,
    'm.noms': [eq.n1, eq.n2, eq.n3].filter(Boolean),
    'm.icone': eq.icone,
    'm.page': (document.body.dataset.page || fichierCourant()) + (window.location.hash || ''),
    'm.phase': s.avant ? 'avant' : s.apres ? 'apres' : (s.phase ? s.phase.id : ''),
    'm.points': res.points,
    'm.drapeau': e.drapeau === 'aide' ? 'aide' : 'ok',
    'm.quetes': quetes
  };
  return Object.assign(plat, aplatirReponses(e));
}

// Les réponses seules (sans les clés m.), sans calcul ni horloge.
function aplatirReponses(e = lire()) {
  const plat = {};
  Object.entries(e.champs || {}).forEach(([k, v]) => {
    if (IDENTITE.has(k)) { return; }
    if (typeof v === 'string' && v.trim()) { plat['c.' + k] = couper(v); }
  });
  Object.entries(e.radios || {}).forEach(([k, v]) => { if (k !== 'icone' && v) { plat['r.' + k] = String(v); } });
  Object.entries(e.qcm || {}).forEach(([k, r]) => {
    if (r && r.premier) { plat['q.' + k] = [r.premier, r.dernier, r.essais || 1, r.premierJuste ? 1 : 0, r.juste ? 1 : 0]; }
  });
  Object.entries(e.cases || {}).forEach(([k, v]) => { if (Array.isArray(v) && v.length) { plat['k.' + k] = v; } });
  if ((e.conseils || []).length) { plat['s.conseils'] = e.conseils; }
  if (e.lu && Object.keys(e.lu).length) { plat['u.lu'] = Object.keys(e.lu).sort(); }
  Object.entries(e.depots || {}).forEach(([k, d]) => { if (d && d.le) { plat['d.' + k] = [d.le, d.via || '']; } });
  return plat;
}

// Vrai quand le travail de l’équipe est déjà parti : aucune réponse écrite,
// choisie ou déposée n’a changé depuis le dernier envoi réussi. Les lectures
// terminées (u.) ne comptent pas comme du travail. cles limite la vérification
// à certaines réponses (par exemple celles d’une quête : 'c.a1', 'q.M1'…).
export function travailEnvoye(cles = null) {
  const env = etatEnvoi();
  const travail = (k) => /^[crqksd]\./.test(k) && (!cles || cles.includes(k));
  const plat = aplatirReponses();
  for (const [k, v] of Object.entries(plat)) {
    if (travail(k) && env.base[k] !== JSON.stringify(v)) { return false; }
  }
  return Object.keys(env.base).every((k) => !travail(k) || k in plat);
}

// ---------------------------------------------------------------- relais

async function publier(sujet, corps) {
  try {
    const r = await fetch(relais() + '/' + encodeURIComponent(sujet), { method: 'POST', body: corps, cache: 'no-store' });
    return { ok: r.ok, statut: r.status };
  } catch (e) {
    return { ok: false, statut: 0 };
  }
}

function decouper(texte) {
  const morceaux = [];
  for (let i = 0; i < texte.length; i += TAILLE_MORCEAU) { morceaux.push(texte.slice(i, i + TAILLE_MORCEAU)); }
  return morceaux.length ? morceaux : [''];
}

// Envoie ce qui a changé depuis le dernier envoi réussi. Sans changement qui
// compte, rien ne part, sauf si force est vrai (dépôt, drapeau).
export async function envoyer({ force = false } = {}) {
  if (!actif) { return { ok: false, raison: 'inactive' }; }
  while (enVol) { await enVol; }
  let fin;
  enVol = new Promise((r) => { fin = r; });
  try {
    identifiant();
    const env = etatEnvoi();
    if (sature(env) && !force) { return { ok: false, raison: 'limite' }; }
    const debut = Date.now();
    const plat = aplatir();
    const delta = {};
    let compte = false;
    Object.entries(plat).forEach(([k, v]) => {
      if (env.base[k] !== JSON.stringify(v)) { delta[k] = v; if (!LEGERS.has(k)) { compte = true; } }
    });
    Object.keys(env.base).forEach((k) => { if (!(k in plat)) { delta[k] = null; compte = true; } });
    if (!compte && !force) { env.enAttenteDepuis = 0; garderEnvoi(); return { ok: true, inchange: true }; }
    if (env.n >= MAX_MESSAGES_JOUR && !force) { return { ok: false, raison: 'quota' }; }
    const message = { v: 1, id: identifiant(), t: Date.now(), x: delta };
    if (!Object.keys(env.base).length) { message.complet = 1; }
    const texte = await chiffrerPour(cfg.collecte.clePublique, message);
    const morceaux = decouper(texte);
    const mid = Math.random().toString(36).slice(2, 10);
    for (let i = 0; i < morceaux.length; i++) {
      const r = await publier(cfg.collecte.sujet, 'f1.' + mid + '.' + (i + 1) + '.' + morceaux.length + '.' + morceaux[i]);
      if (!r.ok) {
        if (r.statut === 429) { env.pauseJusqua = Date.now() + 10 * 60000; garderEnvoi(); prevenir(); return { ok: false, raison: 'limite' }; }
        return { ok: false, raison: 'reseau' };
      }
      env.n += 1;
    }
    env.base = {};
    Object.entries(plat).forEach(([k, v]) => { env.base[k] = JSON.stringify(v); });
    env.dernier = Date.now();
    // Une modification faite pendant l’envoi reste à envoyer.
    env.enAttenteDepuis = env.derniereModif > debut ? env.derniereModif : 0;
    env.pauseJusqua = 0;
    garderEnvoi();
    prevenir();
    return { ok: true };
  } finally {
    enVol = null;
    fin();
  }
}

// Dépôt : envoi immédiat de tout ce qui n’est pas encore parti. Le texte du
// récapitulatif n’est pas envoyé, la page de l’enseignant le reconstitue.
export function envoyerDepot() {
  return envoyer({ force: true });
}

// ---------------------------------------------------------------- heure diffusée

function delaiHorloge() { return Math.max(0.05, Number(cfg.collecte.horlogeMinutes) || 6) * 60000; }

async function lireHorloge() {
  const sujet = cfg.collecte.sujetHorloge;
  if (!sujet || !cfg.collecte.cleSignature) { return; }
  try {
    if (Date.now() - Number(localStorage.getItem(CLE_HORLOGE) || 0) < delaiHorloge() - 1000) { return; }
    localStorage.setItem(CLE_HORLOGE, String(Date.now()));
  } catch (e) { /* sans stockage, on lit à chaque ouverture de page */ }
  try {
    const r = await fetch(relais() + '/' + encodeURIComponent(sujet) + '/json?poll=1&since=12h', { cache: 'no-store' });
    if (!r.ok) { return; }
    let meilleur = null;
    for (const ligne of (await r.text()).split('\n')) {
      let m = null;
      try { m = JSON.parse(ligne); } catch (e) { continue; }
      if (!m || m.event !== 'message' || typeof m.message !== 'string' || !m.message.startsWith('h1.')) { continue; }
      const d = await verifier(cfg.collecte.cleSignature, m.message.slice(3));
      if (d && typeof d.t === 'number' && (!meilleur || d.t > meilleur.t)) { meilleur = d; }
    }
    if (meilleur) { appliquerDepartDiffuse(meilleur.depart || '', meilleur.t); }
  } catch (e) { /* relais indisponible : l’horaire déjà connu reste valable */ }
}

// Lecture immédiate, sans attendre le délai entre deux lectures (page enseignant).
export function relireHorloge() {
  try { localStorage.removeItem(CLE_HORLOGE); } catch (e) { /* rien à faire */ }
  return cfg ? lireHorloge() : Promise.resolve();
}

// ---------------------------------------------------------------- démarrage

// espace : 'seance' (envois et horloge), 'prof' (horloge seulement), 'site' (rien).
export async function initCollecte(espace, surChangement) {
  cfg = await config();
  actif = configActive(cfg);
  prevenir();
  if (!actif || espace === 'site') { actif = false; return; }
  lireHorloge();
  setInterval(lireHorloge, delaiHorloge());
  if (espace !== 'seance') { actif = false; prevenir(); return; }

  const relance = Math.max(0.05, Number(cfg.collecte.relanceMinutes) || 15) * 60000;
  const premier = Math.max(0.5, Number(cfg.collecte.premierEnvoiSecondes) || 20) * 1000;
  const etaler = () => Math.round(Math.random() * Math.max(0, Number(cfg.collecte.etalementSecondes) || 0) * 1000);

  // Point d’arrêt : un envoi par arrêt et par appareil, dans les deux minutes.
  // L’arrêt n’est noté qu’une fois l’envoi réussi (ou sans rien de nouveau) :
  // si l’équipe change de page pendant l’étalement, la page suivante s’en charge.
  let arretEnCours = null;
  const auPointDArret = (s) => {
    const a = s && s.arret;
    if (!a || a.depuisMs > 120000) { return; }
    if (etatEnvoi().arrets[a.phase.id] || arretEnCours === a.phase.id) { return; }
    arretEnCours = a.phase.id;
    setTimeout(async () => {
      const res = await envoyer().catch(() => ({ ok: false }));
      if (res.ok) { etatEnvoi().arrets[a.phase.id] = Date.now(); garderEnvoi(); }
      arretEnCours = null;
    }, etaler());
  };
  surArret(({ statut: s }) => auPointDArret(s));
  // Page ouverte juste après un passage : l’événement de l’horloge est déjà parti.
  auPointDArret(statut());

  if (surChangement) {
    surChangement((d) => {
      if (!d || SOURCES_IGNOREES.has(d.source)) { return; }
      const env = etatEnvoi();
      env.derniereModif = Date.now();
      if (!env.enAttenteDepuis) { env.enAttenteDepuis = env.derniereModif; }
      garderEnvoi();
      if (d.source === 'drapeau') { envoyer({ force: true }); return; }
      if ((d.source === 'champ' || d.source === 'radio') && IDENTITE.has(d.id)) {
        clearTimeout(minuterieIdentite);
        minuterieIdentite = setTimeout(() => { envoyer(); }, premier);
      }
    });
  }

  // Relance : une modification restée sans envoi part au plus tard après le délai.
  const verifierRelance = () => {
    const env = etatEnvoi();
    if (env.enAttenteDepuis && Date.now() - env.enAttenteDepuis >= relance) { envoyer(); }
  };
  setTimeout(verifierRelance, 5000);
  setInterval(verifierRelance, Math.min(60000, relance));
}
