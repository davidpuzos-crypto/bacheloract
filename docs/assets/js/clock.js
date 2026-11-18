// Horloge de séance. Les phases suivent l’heure réelle de l’appareil, pour que
// toute la classe soit synchronisée sans serveur.
// Paramètres d’URL (mémorisés dans l’état) :
//   ?depart=HH:MM    heure de départ du planning (?depart=defaut pour revenir à data/schedule.json)
//   ?decalage=±N     décalage fin en minutes (?decalage=0 pour l’annuler)
//   ?now=HH:MM       heure simulée, pour les tests et les démonstrations (?now=reel pour l’annuler)

import { lire, modifierSansSignal, enregistrerMaintenant } from './state.js';
import { programme as chargerProgramme } from './donnees.js';

let P = null;
const bus = new EventTarget();
let pageSuivie = null;
let secondesEnAttente = 0;
let dernierePhase;
let dernierArret;

const RE_HEURE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

function heureDuJour(texte, refMs) {
  const m = RE_HEURE.exec(texte);
  const d = new Date(refMs);
  d.setHours(Number(m[1]), Number(m[2]), Number(m[3] || 0), 0);
  return d.getTime();
}

function lireParametresURL() {
  const q = new URLSearchParams(window.location.search);
  const h = lire().options.horloge;
  let change = false;
  if (q.has('depart')) {
    const v = (q.get('depart') || '').trim();
    if (RE_HEURE.test(v)) { h.depart = v.length === 4 ? '0' + v : v; } else { delete h.depart; }
    change = true;
  }
  if (q.has('decalage')) {
    const n = parseInt((q.get('decalage') || '').replace(/\s/g, ''), 10);
    if (Number.isFinite(n) && n !== 0) { h.decalage = n; } else { delete h.decalage; }
    change = true;
  }
  if (q.has('now')) {
    const v = (q.get('now') || '').trim();
    if (RE_HEURE.test(v)) { h.nowOffsetMs = heureDuJour(v, Date.now()) - Date.now(); } else { delete h.nowOffsetMs; }
    change = true;
  }
  if (change) { modifierSansSignal(() => {}); enregistrerMaintenant(); }
}

export function maintenant() {
  const h = lire().options.horloge || {};
  return Date.now() + (Number(h.nowOffsetMs) || 0);
}

export function heureDepartTexte() {
  const h = lire().options.horloge || {};
  return h.depart || (P && P.departParDefaut) || '09:00';
}

export function departMs(t = maintenant()) {
  const h = lire().options.horloge || {};
  return heureDuJour(heureDepartTexte(), t) + (Number(h.decalage) || 0) * 60000;
}

export function phases() { return P ? P.phases : []; }
export function graceMs() { return ((P && P.gracePointArretSecondes) || 60) * 1000; }
export function dureeTotaleMin() {
  const ph = phases();
  return ph.length ? ph[ph.length - 1].debut : 180;
}

// Heure de début d’une phase (ou d’une minute de séance), formatée « 9 h 35 ».
export function heureMinute(minute, t = maintenant()) {
  return formatHeure(departMs(t) + minute * 60000);
}
export function formatHeure(ms) {
  const d = new Date(ms);
  return d.getHours() + ' h ' + String(d.getMinutes()).padStart(2, '0');
}
export function formatCompte(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) { return h + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0'); }
  return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
}
export function minutesTexte(ms) {
  const n = Math.max(0, Math.ceil(ms / 60000));
  return n + (n > 1 ? ' minutes' : ' minute');
}

// État de la séance à un instant donné.
export function statut(t = maintenant()) {
  const ph = phases();
  const d0 = departMs(t);
  const m = (t - d0) / 60000;
  const total = dureeTotaleMin();
  const base = { t, d0, m, total, progression: Math.min(1, Math.max(0, m / total)) };
  if (!ph.length) { return Object.assign(base, { avant: true, index: -1 }); }
  if (m < 0) {
    return Object.assign(base, { avant: true, index: -1, phase: null, suivante: ph[0], resteMs: d0 - t, arret: null });
  }
  let index = ph.findIndex((p) => m >= p.debut && m < p.debut + p.duree);
  const apres = index < 0;
  if (apres) { index = ph.length - 1; }
  const phase = ph[index];
  const precedente = index > 0 ? ph[index - 1] : null;
  const debutMs = d0 + phase.debut * 60000;
  const arret = precedente && precedente.stop
    ? { phase: precedente, cible: phase, depuisMs: t - debutMs, heure: formatHeure(debutMs) }
    : null;
  return Object.assign(base, {
    avant: false,
    apres,
    index,
    phase,
    suivante: apres ? null : (ph[index + 1] || null),
    resteMs: apres ? 0 : debutMs + phase.duree * 60000 - t,
    arret
  });
}

export function phaseParId(id) { return phases().find((p) => p.id === id) || null; }
export function finPhaseMin(id) {
  const p = phaseParId(id);
  return p ? p.debut + p.duree : Infinity;
}
export function minuteDeSeance(t = maintenant()) { return (t - departMs(t)) / 60000; }

// Fichier de la page d’une phase (« 9-video.html#comparer » donne « 9-video.html »).
export function fichierDe(page) { return String(page || '').split('#')[0]; }
export function ancreDe(page) { const i = String(page || '').indexOf('#'); return i >= 0 ? page.slice(i) : ''; }
export function ordreFichier(fichier) {
  return phases().findIndex((p) => fichierDe(p.page) === fichier);
}

export function surTic(cb) { bus.addEventListener('tic', (e) => cb(e.detail)); }
export function surPhase(cb) { bus.addEventListener('phasechange', (e) => cb(e.detail)); }
export function surArret(cb) { bus.addEventListener('stoppoint', (e) => cb(e.detail)); }

function vider() {
  if (!pageSuivie || secondesEnAttente <= 0) { return; }
  const n = secondesEnAttente;
  secondesEnAttente = 0;
  modifierSansSignal((e) => { e.temps[pageSuivie] = (e.temps[pageSuivie] || 0) + n; });
}

function tic() {
  if (pageSuivie && document.visibilityState === 'visible') {
    secondesEnAttente += 1;
    if (secondesEnAttente >= 10) { vider(); }
  }
  const s = statut();
  const idPhase = s.avant ? 'avant' : (s.apres ? 'apres' : s.phase.id);
  if (idPhase !== dernierePhase) {
    const precedente = dernierePhase;
    dernierePhase = idPhase;
    bus.dispatchEvent(new CustomEvent('phasechange', { detail: { statut: s, precedente } }));
  }
  const idArret = s.arret ? s.arret.phase.id : null;
  if (idArret !== dernierArret) {
    dernierArret = idArret;
    if (idArret) { bus.dispatchEvent(new CustomEvent('stoppoint', { detail: { statut: s } })); }
  }
  bus.dispatchEvent(new CustomEvent('tic', { detail: s }));
}

export async function initHorloge(idPage) {
  P = await chargerProgramme();
  pageSuivie = idPage || null;
  lireParametresURL();
  const fermer = () => { vider(); enregistrerMaintenant(); };
  window.addEventListener('pagehide', fermer);
  document.addEventListener('visibilitychange', fermer);
  tic();
  setInterval(tic, 1000);
  return P;
}
