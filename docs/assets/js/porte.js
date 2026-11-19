// Porte des corrections, sans mot de passe. Une correction s’affiche dès que
// l’équipe a envoyé son travail à l’enseignant, d’un clic.
//   data-porte="definir"   correction de Chercher et Citer, envoi des réponses
//   data-porte="parcours"  correction de l’étude, dépôt du parcours (la
//                          correction s’ouvre seule si le dépôt est déjà fait)
// Elle s’ouvre directement quand il n’y a rien à envoyer (équipe sans réponse,
// aperçu de l’enseignant) ou quand l’envoi est désactivé. Si l’envoi échoue,
// elle s’affiche quand même. On ne bloque personne.

import { lire, modifier } from './state.js';
import { envoyer, etatCollecte } from './collect.js';
import { formatHeure } from './clock.js';
import { typographier } from './typo.js';
import { initRail } from './rail.js';

const IDENTITE = new Set(['equipe', 'nom1', 'nom2', 'nom3']);
const ATTENTE_MAX = 15000;

function dejaOuverte(type) {
  const e = lire();
  return !!((e.lu && e.lu['porte-' + type]) || (e.depots && e.depots.parcours));
}

function aDesReponses() {
  const e = lire();
  const ecrit = (o, exclus) => Object.entries(o || {}).some(([k, v]) => !exclus.has(k) && typeof v === 'string' && v.trim());
  return ecrit(e.champs, IDENTITE) || ecrit(e.radios, new Set(['icone'])) || Object.keys(e.qcm || {}).length > 0;
}

function pret() {
  if (document.documentElement.classList.contains('js-pret')) { return Promise.resolve(); }
  return new Promise((r) => { window.addEventListener('fabrique:pret', r, { once: true }); });
}

function bilanEnvoi(res, type) {
  if (res && res.ok) {
    return { texte: 'Votre travail a été envoyé à l’enseignant à ' + formatHeure(Date.now()) + '.', classe: 'ok' };
  }
  const debut = res && res.raison === 'limite'
    ? 'Le relais refuse les envois pour l’instant.'
    : 'L’envoi n’a pas abouti.';
  const suite = type === 'parcours'
    ? ' Vos réponses restent dans ce navigateur. Téléchargez le récapitulatif en bas de la page Lire et prévenez l’enseignant.'
    : ' Vos réponses restent dans ce navigateur et repartiront au prochain envoi. Prévenez l’enseignant si le problème dure.';
  return { texte: debut + suite, classe: 'alerte' };
}

export function initPorte() {
  const porte = document.querySelector('[data-porte]');
  const contenu = document.querySelector('[data-porte-contenu]');
  if (!porte || !contenu) { return; }
  const type = porte.dataset.porte;
  const note = contenu.querySelector('[data-porte-note]');
  const bouton = porte.querySelector('[data-porte-ouvrir]');
  const statut = porte.querySelector('[data-porte-statut]');

  function noter(bilan) {
    if (!note || !bilan) { return; }
    note.textContent = bilan.texte;
    note.className = 'statut ' + bilan.classe;
    note.hidden = false;
    typographier(note);
  }

  // apresClic : la page est déjà construite, on ajoute le sommaire et on
  // place le focus sur ce qui vient de s’afficher.
  function ouvrir(bilan = null, apresClic = false) {
    porte.hidden = true;
    contenu.hidden = false;
    contenu.setAttribute('data-ouverte', '');
    noter(bilan);
    if (!apresClic) { return; }
    initRail('seance');
    const cible = note && !note.hidden ? note : contenu.querySelector('h2');
    if (cible) {
      if (!cible.hasAttribute('tabindex')) { cible.setAttribute('tabindex', '-1'); }
      cible.focus();
    }
  }

  if (dejaOuverte(type) || !aDesReponses()) { ouvrir(); return; }
  porte.hidden = false;
  contenu.hidden = true;

  // Envoi désactivé par l’enseignant : rien à attendre.
  pret().then(() => { if (!etatCollecte().actif && porte.hidden === false) { ouvrir(null, true); } });

  bouton.addEventListener('click', async () => {
    bouton.disabled = true;
    statut.textContent = 'Envoi en cours…';
    await pret();
    const envoiPossible = etatCollecte().actif;
    modifier((e) => {
      e.lu['porte-' + type] = Date.now();
      if (type === 'parcours' && envoiPossible) { e.depots.parcours = { le: Date.now(), via: 'envoi' }; }
    }, { source: 'porte', id: type });
    if (!envoiPossible) { ouvrir(null, true); return; }
    const envoi = envoyer({ force: true }).then((res) => {
      if (!res.ok && type === 'parcours') { modifier((e) => { delete e.depots.parcours; }, { source: 'depot', id: 'parcours' }); }
      return res;
    });
    const res = await Promise.race([envoi, new Promise((r) => { setTimeout(() => r(null), ATTENTE_MAX); })]);
    if (res === null) {
      ouvrir({ texte: 'L’envoi prend plus de temps que prévu. Il continue pendant que vous lisez la correction.', classe: 'alerte' }, true);
      envoi.then((r) => { noter(bilanEnvoi(r, type)); });
      return;
    }
    ouvrir(bilanEnvoi(res, type), true);
  });
}
