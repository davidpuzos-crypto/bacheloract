// Envoi des réponses à l’enseignant, vers une feuille Google privée
// (script Google Apps Script, voir scripts/apps-script/Code.gs et le README).
// Désactivé tant que data/config.json ne contient pas collecte.actif = true
// et l’adresse du script. Le jeton n’est pas un secret : il est lisible dans
// le code du site, il évite seulement les envois par erreur.
//
// Ce qui est envoyé : nom d’équipe, noms, icône, page et phase en cours,
// points, avancement des quêtes, drapeau d’aide, réponses, QCM et dépôts.
// Envois : peu après l’arrivée sur une page, à intervalle régulier si quelque
// chose a changé, quand on quitte la page, quand le drapeau change, à chaque
// point d’arrêt, et au dépôt.

import { lire, modifierSansSignal } from './state.js';
import { config, fichierCourant } from './donnees.js';
import { calculer, equipe } from './gamify.js';
import { statut, appliquerDepartDiffuse, surArret } from './clock.js';

const MAX_CHAMP = 8000;
let cfg = null;
let actif = false;
let empreinteEnvoyee = '';
let dernierEnvoi = null;
const abonnes = [];

export function surCollecte(cb) { abonnes.push(cb); }
function prevenir() { abonnes.forEach((cb) => cb({ actif, dernierEnvoi })); }

export async function collecteActive() {
  const c = await config();
  return !!(c.collecte && c.collecte.actif && c.collecte.endpoint);
}
export function etatCollecte() { return { actif, dernierEnvoi }; }

function adresse(parametres) {
  const base = cfg.collecte.endpoint;
  return base + (base.includes('?') ? '&' : '?') + parametres;
}

function identifiant() {
  if (!lire().id) {
    modifierSansSignal((s) => { s.id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); });
  }
  return lire().id;
}

function couper(v) {
  return typeof v === 'string' && v.length > MAX_CHAMP ? v.slice(0, MAX_CHAMP) + ' […]' : v;
}

// Contenu envoyé à l’enseignant.
function charge(type, supplement) {
  const e = lire();
  const eq = equipe(e);
  const res = calculer(e);
  const s = statut();
  const champs = {};
  Object.entries(e.champs || {}).forEach(([k, v]) => {
    if (['equipe', 'nom1', 'nom2'].includes(k)) { return; }
    if (typeof v === 'string' && v.trim()) { champs[k] = couper(v); }
  });
  const qcm = {};
  Object.entries(e.qcm || {}).forEach(([k, r]) => {
    if (r && r.premier) { qcm[k] = { premier: r.premier, dernier: r.dernier, essais: r.essais, premierJuste: !!r.premierJuste, juste: !!r.juste }; }
  });
  const quetes = {};
  res.quetes.forEach((q) => { quetes[q.def.id] = { faits: q.faits, total: q.total, terminee: q.terminee }; });
  return Object.assign({
    action: 'ecrire',
    jeton: cfg.collecte.jeton || '',
    type,
    id: identifiant(),
    maj: new Date().toISOString(),
    equipe: eq.nom,
    noms: [eq.n1, eq.n2].filter(Boolean).join(' et '),
    icone: eq.icone,
    page: (document.body.dataset.page || fichierCourant()) + (window.location.hash || ''),
    phase: s.avant ? 'avant' : s.apres ? 'apres' : (s.phase ? s.phase.id : ''),
    points: res.points,
    niveau: res.niveau.nom,
    drapeau: e.drapeau === 'aide' ? 'aide' : 'ok',
    quetes,
    reponses: { champs, radios: e.radios || {}, qcm, conseils: e.conseils || [], cases: e.cases || {}, lu: e.lu || {} },
    depots: e.depots || {}
  }, supplement || {});
}

function empreinte(d) {
  const copie = Object.assign({}, d);
  delete copie.maj;
  return JSON.stringify(copie);
}

function envoyerBalise(corps) {
  try {
    return navigator.sendBeacon(cfg.collecte.endpoint, new Blob([corps], { type: 'text/plain;charset=utf-8' }));
  } catch (e) {
    return false;
  }
}

async function poster(corps) {
  try {
    await fetch(cfg.collecte.endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: corps,
      keepalive: corps.length < 60000
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Envoie l’état de l’équipe. Sans changement depuis le dernier envoi, rien
// n’est envoyé, sauf si force est vrai.
export async function synchroniser({ force = false, type = 'synchro', supplement = null } = {}) {
  if (!actif) { return { ok: false, raison: 'inactive' }; }
  const d = charge(type, supplement);
  const emp = empreinte(d);
  if (!force && emp === empreinteEnvoyee) { return { ok: true, inchange: true }; }
  const ok = await poster(JSON.stringify(d));
  if (ok) {
    empreinteEnvoyee = emp;
    dernierEnvoi = Date.now();
    prevenir();
  }
  return { ok };
}

// Envoi synchrone, au moment où l’on quitte la page.
function synchroniserEnPartant() {
  if (!actif) { return; }
  const d = charge('synchro', null);
  const emp = empreinte(d);
  if (emp === empreinteEnvoyee) { return; }
  if (envoyerBalise(JSON.stringify(d))) { empreinteEnvoyee = emp; }
}

// Envoi d’un dépôt (récapitulatif complet).
export function envoyerDepot(typeDepot, texte) {
  const cle = typeDepot === 'video' ? 'depot_video' : 'depot_parcours';
  return synchroniser({ force: true, type: 'depot-' + typeDepot, supplement: { [cle]: texte } });
}

async function lireHorloge() {
  try {
    const r = await fetch(adresse('action=horloge'), { cache: 'no-store' });
    const j = await r.json();
    if (j && j.ok) { appliquerDepartDiffuse(j.depart || ''); }
  } catch (e) { /* réseau ou script indisponible : l’horaire du fichier reste valable */ }
}

// espace : 'seance' (envois et horloge), 'prof' (horloge seulement), 'site' (rien).
export async function initCollecte(espace, surChangement) {
  cfg = await config();
  actif = !!(cfg.collecte && cfg.collecte.actif && cfg.collecte.endpoint);
  prevenir();
  if (!actif || espace === 'site') { return; }
  const intervalleHorloge = Math.max(10, Number(cfg.collecte.horlogeSecondes) || 60) * 1000;
  lireHorloge();
  setInterval(lireHorloge, intervalleHorloge);
  if (espace !== 'seance') { actif = false; return; }

  const intervalle = Math.max(10, Number(cfg.collecte.synchroSecondes) || 45) * 1000;
  setTimeout(() => synchroniser(), 3000);
  setInterval(() => synchroniser(), intervalle);
  setInterval(() => synchroniser({ force: true }), 180000);
  window.addEventListener('pagehide', synchroniserEnPartant);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { synchroniserEnPartant(); } });
  surArret(() => { synchroniser({ force: true }); });
  if (surChangement) {
    surChangement((d) => { if (d.source === 'drapeau') { synchroniser({ force: true }); } });
  }
}
