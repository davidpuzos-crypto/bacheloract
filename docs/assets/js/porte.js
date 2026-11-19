// Portes du parcours, sans mot de passe. Pour voir une correction et pour
// passer à la quête suivante, l’équipe envoie d’abord son travail à
// l’enseignant, d’un clic.
//   definir  travail de la quête 1 (Méthode, Chercher), pour ouvrir la quête 2
//   citer    travail des quêtes 1 et 2, pour la correction de Définir et
//            Citer et pour ouvrir la quête 3
//   lire     dépôt envoyé de la quête 3 (l’étude), pour la correction de
//            l’étude et pour ouvrir la quête 4
// Une porte s’ouvre seule quand le travail est déjà parti (envoi automatique
// au point d’arrêt, par exemple), quand il n’y a rien à envoyer (équipe sans
// réponse, aperçu de l’enseignant) ou quand l’envoi est désactivé. Si l’envoi
// échoue, elle s’ouvre quand même, avec un message. On ne bloque personne.
// Les boutons « Envoyer et … » de fin de quête (data-envoyer-avant) envoient
// le travail avant de changer de page.

import { lire, modifier } from './state.js';
import { envoyer, etatCollecte, travailEnvoye, surCollecte } from './collect.js';
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
    texte: 'La quête 2, Citer, s’ouvre quand votre travail de la quête 1, Définir, est envoyé à l’enseignant. Un clic suffit.',
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
const ATTENTE_PRET = 8000;
const NOTE = 'fabrique:s09:porte-note';

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

function drapeau(type) { return 'porte-' + type; }
function marquer(type) { modifier((e) => { e.lu[drapeau(type)] = Date.now(); }, { source: 'porte', id: type }); }

// La porte a déjà été franchie. Pour l’étude, seul un dépôt envoyé compte :
// une copie ou un téléchargement ne suffit pas quand l’envoi fonctionne.
function franchie(type) {
  const e = lire();
  const d = e.depots && e.depots.parcours;
  return !!((e.lu && e.lu[drapeau(type)]) || (type === 'lire' && d && d.via === 'envoi'));
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

// Page prête (configuration lue, envoi branché), sans attendre indéfiniment.
function pret() {
  if (document.documentElement.classList.contains('js-pret')) { return Promise.resolve(); }
  return new Promise((r) => {
    window.addEventListener('fabrique:pret', r, { once: true });
    setTimeout(r, ATTENTE_PRET);
  });
}

function bilanEnvoi(res, type, suite = '') {
  const fin = suite ? ' ' + suite : '';
  if (res && res.deja) { return { texte: 'Votre travail était déjà parvenu à l’enseignant.' + fin, classe: 'ok' }; }
  if (res && res.ok) { return { texte: 'Votre travail a été envoyé à l’enseignant à ' + formatHeure(Date.now()) + '.' + fin, classe: 'ok' }; }
  if (res === null) {
    return { texte: 'L’envoi prend plus de temps que prévu. Il continue, ou repartira au prochain envoi.', classe: 'alerte' };
  }
  const debut = res && res.raison === 'limite' ? 'Le relais refuse les envois pour l’instant.' : 'L’envoi n’a pas abouti.';
  const suiteEchec = type === 'lire'
    ? ' Vos réponses restent dans ce navigateur. Téléchargez le récapitulatif en bas de la page Lire et prévenez l’enseignant.'
    : ' Vos réponses restent dans ce navigateur et repartiront au prochain envoi. Prévenez l’enseignant si le problème dure.';
  return { texte: debut + suiteEchec, classe: 'alerte' };
}

// Dépôt refusé : on revient à l’état d’avant, y compris la quête « Lire » et
// le badge « Fil rouge » s’ils viennent d’être obtenus grâce à ce dépôt.
export function annulerDepot(avant, depuis) {
  modifier((e) => {
    if (avant) { e.depots.parcours = avant; } else { delete e.depots.parcours; }
    if (e.quetes.lire && (e.quetes.lire.le || 0) >= depuis) { delete e.quetes.lire; }
    if (e.badges.fil && e.badges.fil >= depuis) { delete e.badges.fil; }
  }, { source: 'depot', id: 'parcours' });
}

// Envoie le travail (et fait le dépôt de l’étude pour la porte « lire »), puis
// note la porte comme franchie, quoi qu’il arrive. Renvoie null s’il n’y avait
// rien à envoyer, sinon { res, envoi } (res vaut null si l’envoi traîne).
async function envoyerPour(type) {
  await pret();
  const actif = etatCollecte().actif;
  const travail = aDuTravail(type);
  const avant = (lire().depots || {}).parcours || null;
  const depot = type === 'lire' && actif && travail && !(avant && avant.via === 'envoi');
  // Travail déjà parti (envoi automatique au point d’arrêt, par exemple) :
  // rien à renvoyer, on économise les envois de la classe.
  if (actif && travail && !depot && travailEnvoye(clesDe(type))) {
    marquer(type);
    const deja = { ok: true, deja: true };
    return { res: deja, envoi: Promise.resolve(deja) };
  }
  const t0 = Date.now();
  modifier((e) => {
    e.lu[drapeau(type)] = t0;
    if (depot) { e.depots.parcours = { le: t0, via: 'envoi' }; }
  }, { source: 'porte', id: type });
  if (!actif || !travail) { return null; }
  const envoi = envoyer({ force: true })
    .catch(() => ({ ok: false, raison: 'erreur' }))
    .then((res) => {
      if (!res.ok && depot) { annulerDepot(avant, t0); }
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

// Boutons de fin de quête : envoyer, puis changer de page. Ne bloque jamais.
function initEnvoisAvant() {
  document.querySelectorAll('a[data-envoyer-avant]').forEach((a) => {
    a.addEventListener('click', async (ev) => {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) { return; }
      const type = a.dataset.envoyerAvant;
      if (franchie(type) && travailEnvoye(clesDe(type))) { return; }
      ev.preventDefault();
      if (a.getAttribute('aria-disabled') === 'true') { return; }
      a.setAttribute('aria-disabled', 'true');
      const texte = a.textContent;
      a.textContent = 'Envoi en cours…';
      let bilan = null;
      try {
        const r = await envoyerPour(type);
        const suite = PORTES_QUETE[type] && REQUIS[pageDe(a)] === type ? PORTES_QUETE[type].ouverte : '';
        bilan = r ? bilanEnvoi(r.res, type, suite) : (suite ? { texte: suite, classe: 'ok' } : null);
      } catch (e) {
        marquer(type);
      }
      try { if (bilan) { sessionStorage.setItem(NOTE, JSON.stringify(bilan)); } } catch (e) { /* message perdu, sans gravité */ }
      // Si l’on revient sur cette page, le lien doit rester utilisable.
      a.textContent = texte;
      a.removeAttribute('aria-disabled');
      window.location.href = a.href;
    });
  });
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
  let ouverte = false;
  let clicEnCours = false;

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

  // Ouvre la porte. apresInit : la page est déjà construite, on ajoute le
  // sommaire. clic : l’équipe vient de cliquer, on place le focus sur ce qui
  // vient de s’afficher (la section visée par l’adresse, sinon le message).
  function ouvrir(bilan = null, { apresInit = false, clic = false } = {}) {
    if (ouverte) { noterDans(note, bilan); return; }
    ouverte = true;
    porte.hidden = true;
    montrerContenu(true);
    noterDans(note, bilan);
    if (apresInit) { initRail('seance'); }
    if (!clic) { return; }
    if (!bilan && quete) { annoncer(quete.ouverte); }
    const visee = window.location.hash ? document.querySelector(window.location.hash) : null;
    let cible = note && !note.hidden ? note : (contenu || main).querySelector('h2:not(#titre-porte)');
    if (visee && visee.getClientRects().length) {
      visee.scrollIntoView({ block: 'start' });
      cible = visee.querySelector('h2') || visee;
      if (bilan) { annoncer(bilan.texte); }
    }
    if (cible) {
      if (!cible.hasAttribute('tabindex')) { cible.setAttribute('tabindex', '-1'); }
      cible.focus({ preventScroll: !!visee });
    }
  }

  // Déjà franchie, rien à envoyer, ou travail déjà parti : la porte s’ouvre seule.
  const travail = aDuTravail(type);
  const dejaParti = type !== 'lire' && travail && travailEnvoye(clesDe(type));
  if (franchie(type) || !travail || dejaParti) {
    if (dejaParti && !franchie(type)) { marquer(type); }
    ouvrir();
    noteDeSession();
    return;
  }
  porte.hidden = false;
  montrerContenu(false);
  noteDeSession();

  // Envoi désactivé par l’enseignant : rien à attendre. La porte est notée
  // franchie pour ne plus s’afficher aux chargements suivants.
  pret().then(() => {
    if (!etatCollecte().actif && !ouverte) { marquer(type); ouvrir(null, { apresInit: true }); }
  });
  // Le travail part automatiquement (au point d’arrêt, par exemple) : la porte
  // s’ouvre d’elle-même, sans déplacer le focus.
  surCollecte(() => {
    if (ouverte || clicEnCours || type === 'lire' || !travailEnvoye(clesDe(type))) { return; }
    marquer(type);
    ouvrir({ texte: 'Votre travail est parti automatiquement à l’enseignant.' + (quete ? ' ' + quete.ouverte : ''), classe: 'ok' }, { apresInit: true });
  });

  bouton.addEventListener('click', async () => {
    if (bouton.disabled) { return; }
    bouton.disabled = true;
    clicEnCours = true;
    statut.textContent = 'Envoi en cours…';
    let r = null;
    try {
      r = await envoyerPour(type);
    } catch (e) {
      marquer(type);
      const echec = { ok: false, raison: 'erreur' };
      r = { res: echec, envoi: Promise.resolve(echec) };
    }
    const suite = quete ? quete.ouverte : '';
    if (!r) { ouvrir(null, { apresInit: true, clic: true }); return; }
    ouvrir(bilanEnvoi(r.res, type, suite), { apresInit: true, clic: true });
    if (r.res === null) { r.envoi.then((res) => { noterDans(note, bilanEnvoi(res, type, suite)); }); }
  });
}
