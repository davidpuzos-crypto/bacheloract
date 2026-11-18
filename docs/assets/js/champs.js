// Liaison des champs de saisie avec l’état partagé.
//   textarea / input texte  : data-id="a1"          → etat.champs.a1
//   boutons radio           : data-radio="b0"       → etat.radios.b0
//   cases à cocher          : data-case="tips_vus"  → etat.cases.tips_vus (liste)
//   bloc conditionnel       : data-si="b0=sophia"   → affiché seulement si la condition est vraie
//   compteur de page        : data-compteur          → « 3 sur 6 champs requis »

import { lire, modifier, surChangement } from './state.js';

export const SEUIL_CHAMP = 25;
export const SEUIL_BONUS = 40;

export function longueur(id) {
  const v = lire().champs[id];
  return typeof v === 'string' ? v.trim().length : 0;
}
export function rempli(id, seuil = SEUIL_CHAMP) { return longueur(id) >= seuil; }

function conditionVraie(expr) {
  const [cle, valeur] = String(expr).split('=');
  return lire().radios[cle] === valeur;
}

function majConditions(racine) {
  racine.querySelectorAll('[data-si]').forEach((el) => { el.hidden = !conditionVraie(el.dataset.si); });
}

function texteEtat(bloc) {
  const champ = bloc.querySelector('[data-id]');
  if (!champ) { return ''; }
  const n = longueur(champ.dataset.id);
  if (bloc.hasAttribute('data-bonus')) {
    if (n === 0) { return ''; }
    return n >= SEUIL_BONUS ? 'Bonus validé.' : 'Encore quelques mots pour valider ce bonus.';
  }
  if (n === 0) { return ''; }
  return n >= SEUIL_CHAMP ? 'Champ validé.' : 'Encore quelques mots pour valider ce champ.';
}

function majEtats(racine) {
  racine.querySelectorAll('.q[data-requis], .q[data-bonus]').forEach((bloc) => {
    const p = bloc.querySelector('.etat-champ');
    if (!p) { return; }
    const t = texteEtat(bloc);
    if (p.textContent !== t) { p.textContent = t; }
    p.classList.toggle('valide', /validé/.test(t));
  });
}

export function blocRempli(bloc) {
  const radio = bloc.querySelector('input[type="radio"][data-radio]');
  if (radio) { return !!lire().radios[radio.dataset.radio]; }
  const champ = bloc.querySelector('[data-id]');
  return champ ? rempli(champ.dataset.id) : false;
}

function majCompteurs(racine) {
  const compteurs = racine.querySelectorAll('[data-compteur]');
  if (!compteurs.length) { return; }
  const blocs = [...racine.querySelectorAll('.q[data-requis]')].filter((b) => !b.hidden && !b.closest('[hidden]') && !b.hasAttribute('data-hors-compteur'));
  const faits = blocs.filter(blocRempli).length;
  compteurs.forEach((c) => {
    c.textContent = faits + ' sur ' + blocs.length + ' champs requis remplis';
  });
}

export function restaurerChamps(racine = document, initial = false) {
  const e = lire();
  const recuperes = [];
  racine.querySelectorAll('[data-id]').forEach((el) => {
    if (document.activeElement === el && !initial) { return; }
    const v = e.champs[el.dataset.id];
    const enregistre = typeof v === 'string' ? v : '';
    // Au premier passage, un texte déjà présent dans le champ (saisi pendant
    // le chargement, ou remis par le navigateur) n’est pas écrasé par un vide.
    if (initial && el.value && !enregistre) { recuperes.push(el); return; }
    el.value = enregistre;
  });
  if (recuperes.length) {
    modifier((s) => { recuperes.forEach((el) => { s.champs[el.dataset.id] = el.value; }); }, { source: 'champ' });
  }
  racine.querySelectorAll('input[type="radio"][data-radio]').forEach((el) => {
    el.checked = e.radios[el.dataset.radio] === el.value;
  });
  racine.querySelectorAll('input[type="checkbox"][data-case]').forEach((el) => {
    const liste = e.cases[el.dataset.case] || [];
    el.checked = liste.includes(el.value);
  });
  majConditions(racine);
  majEtats(racine);
  majCompteurs(racine);
}

export function initChamps(racine = document) {
  restaurerChamps(racine, true);
  racine.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t && t.dataset && t.dataset.id) {
      modifier((e) => { e.champs[t.dataset.id] = t.value; }, { source: 'champ', id: t.dataset.id, ancre: t });
    }
  });
  racine.addEventListener('change', (ev) => {
    const t = ev.target;
    if (!t || !t.dataset) { return; }
    if (t.type === 'radio' && t.dataset.radio) {
      modifier((e) => { e.radios[t.dataset.radio] = t.value; }, { source: 'radio', id: t.dataset.radio, ancre: t });
    } else if (t.type === 'checkbox' && t.dataset.case) {
      modifier((e) => {
        const liste = new Set(e.cases[t.dataset.case] || []);
        if (t.checked) { liste.add(t.value); } else { liste.delete(t.value); }
        e.cases[t.dataset.case] = [...liste].sort();
      }, { source: 'case', id: t.dataset.case, ancre: t });
    }
  });
  surChangement((d) => {
    if (d.externe || d.efface) { restaurerChamps(racine); return; }
    majConditions(racine);
    majEtats(racine);
    majCompteurs(racine);
  });
}
