// Colonne « Sur cette page », affichée à droite sur les grands écrans :
// sommaire de la page, avancement des questions et créneau prévu.
// Les pages dont la mise en page occupe déjà toute la largeur (document et
// questions côte à côte, feuille de notes) n’en ont pas.

import { surChangement } from './state.js';
import { phases, heureMinute, fichierDe, surTic } from './clock.js';
import { fichierCourant } from './donnees.js';
import { faite, nomDe } from './repere.js';
import { echapper } from './gamify.js';
import { typographier } from './typo.js';

function titreCourt(h) {
  const copie = h.cloneNode(true);
  copie.querySelectorAll('.qid, .tag-bonus, .visuellement-cache').forEach((n) => n.remove());
  const t = copie.textContent.replace(/\s+/g, ' ').trim();
  return t.length > 64 ? t.slice(0, 61).trim() + '…' : t;
}

export function initRail(espace) {
  const main = document.querySelector('main.page');
  if (espace !== 'seance' || !main || main.classList.contains('page-large')) { return; }
  if (main.querySelector('.lecture-split, .avec-aside, .feuille')) { return; }

  // Sections (titres de niveau 2) et questions, dans l’ordre de la page.
  const elements = [...main.querySelectorAll('h2, .q[data-q], fieldset.qcm[data-qcm], .carte-correction')]
    .filter((el) => !el.closest('[hidden], .tiroir, .rail') && !el.classList.contains('visuellement-cache'));
  const groupes = [];
  let courant = null;
  let n = 0;
  elements.forEach((el) => {
    if (el.matches('h2')) {
      n += 1;
      if (!el.id) { el.id = 'section-' + n; }
      courant = { titre: el, questions: [] };
      groupes.push(courant);
      return;
    }
    if (!courant) { courant = { titre: null, questions: [] }; groupes.push(courant); }
    const cle = el.dataset.q || el.dataset.qcm || '';
    if (['equipe', 'icone', 'nom1', 'nom2', 'nom3'].includes(cle)) { return; }
    if (!el.id) { el.id = 'bloc-' + cle.toLowerCase(); }
    courant.questions.push(el);
  });
  const questions = groupes.flatMap((g) => g.questions);
  if (groupes.filter((g) => g.titre).length + questions.length < 2) { return; }

  const fichier = fichierCourant();
  const creneaux = phases().filter((p) => fichierDe(p.page) === fichier && p.duree > 0);
  const creneau = creneaux.length
    ? 'Prévue de ' + heureMinute(creneaux[0].debut) + ' à ' + heureMinute(creneaux[creneaux.length - 1].debut + creneaux[creneaux.length - 1].duree)
    : '';
  const suivies = questions.filter((q) => !q.matches('.carte-correction'));

  const rail = document.createElement('nav');
  rail.className = 'rail';
  rail.setAttribute('aria-label', 'Sur cette page');
  rail.innerHTML = '<div class="rail-interieur"><p class="rail-titre">Sur cette page</p>'
    + (creneau ? '<p class="rail-creneau">' + echapper(creneau) + '</p>' : '')
    + '<ol class="rail-liste">' + groupes.map((g) => {
      const lien = g.titre ? '<a href="#' + g.titre.id + '" data-section="' + g.titre.id + '">' + echapper(titreCourt(g.titre)) + '</a>' : '';
      const puces = g.questions.length
        ? '<ul class="rail-questions">' + g.questions.map((q) => '<li><a class="rail-q' + (q.hasAttribute('data-bonus') ? ' bonus' : '') + '" href="#' + q.id + '" data-bloc="' + q.id + '">'
          + echapper(nomDe(q)) + '<span class="visuellement-cache" data-etat-texte></span></a></li>').join('') + '</ul>'
        : '';
      return lien || puces ? '<li>' + lien + puces + '</li>' : '';
    }).join('') + '</ol>'
    + (suivies.length ? '<p class="rail-bilan" data-rail-bilan></p>' : '')
    + (questions.some((q) => q.hasAttribute('data-bonus')) ? '<p class="rail-legende">En pointillé, les questions bonus.</p>' : '')
    + '</div>';
  const tete = main.querySelector('.tete-page');
  if (tete) { tete.after(rail); } else { main.prepend(rail); }
  main.classList.add('avec-rail');
  typographier(rail);

  const puces = [...rail.querySelectorAll('.rail-q')];
  const bilan = rail.querySelector('[data-rail-bilan]');
  let derniere = '';
  function mettreAJour() {
    let faites = 0;
    let total = 0;
    const signature = [];
    puces.forEach((a) => {
      const bloc = document.getElementById(a.dataset.bloc);
      if (!bloc || bloc.matches('.carte-correction')) { return; }
      const ok = faite(bloc);
      const repere = bloc.classList.contains('q-repere');
      if (!bloc.hasAttribute('data-bonus') && !bloc.hidden) { total += 1; if (ok) { faites += 1; } }
      signature.push((ok ? '1' : '0') + (repere ? 'r' : ''));
      a.dataset.etat = ok ? 'fait' : 'a-faire';
      a.classList.toggle('repere', repere);
      a.querySelector('[data-etat-texte]').textContent = (ok ? ', fait' : ', à faire') + (repere ? ', repère de l’heure' : '');
    });
    const cle = signature.join('');
    if (bilan && cle !== derniere) {
      derniere = cle;
      bilan.textContent = total && faites === total
        ? 'Tout est fait sur cette page.'
        : faites + (faites > 1 ? ' réponses' : ' réponse') + ' sur ' + total;
    }
  }
  surChangement(() => mettreAJour());
  surTic(() => mettreAJour());
  mettreAJour();

  // Section en cours de lecture
  const liens = [...rail.querySelectorAll('[data-section]')];
  let attente = false;
  const suivre = () => {
    attente = false;
    let active = null;
    liens.forEach((a) => {
      const h = document.getElementById(a.dataset.section);
      if (h && h.getBoundingClientRect().top < window.innerHeight * 0.45) { active = a; }
    });
    liens.forEach((a) => { if (a === active) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); } });
  };
  window.addEventListener('scroll', () => { if (!attente) { attente = true; requestAnimationFrame(suivre); } }, { passive: true });
  suivre();
}
