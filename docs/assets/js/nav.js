// En-tête partagé : phase en cours, compte à rebours, progression de la
// séance, lien vers la phase en cours, équipe et points, drapeau d’aide,
// menu des pages, réglages (thème, mode sobre, export, effacement) et
// écrans de fin de phase (bandeau puis plein cadre).

import { lire, modifier, exporterJSON, effacer, stockageDisponible, surChangement, surStockageIndisponible } from './state.js';
import { statut, surTic, surPhase, phases, formatCompte, formatHeure, heureMinute, fichierDe, ancreDe, ordreFichier, graceMs, minutesTexte } from './clock.js';
import { icone, urlSeance, url, fichierCourant } from './donnees.js';
import { htmlProgression, calculer, equipe, echapper, surMiseAJourJeu } from './gamify.js';
import { typographier } from './typo.js';
import { surCollecte } from './collect.js';

let idPage = '';
let espace = 'seance'; // seance, prof ou site
let refs = {};
let dernierAffichageArret = null;

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function svg(id) { return '<svg aria-hidden="true" focusable="false"><use href="' + icone(id) + '"></use></svg>'; }

// ---------------------------------------------------------------- thème et mode sobre

export function appliquerOptions() {
  const o = lire().options;
  const racine = document.documentElement;
  if (o.theme === 'light' || o.theme === 'dark') { racine.dataset.theme = o.theme; } else { delete racine.dataset.theme; }
  racine.dataset.sobre = o.sobre ? '1' : '0';
  racine.dataset.drapeau = lire().drapeau === 'aide' ? 'aide' : 'ok';
}

function themeEffectif() {
  const o = lire().options.theme;
  if (o === 'light' || o === 'dark') { return o; }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// ---------------------------------------------------------------- construction

function construireEntete() {
  const vieux = document.querySelector('.entete-statique');
  const entete = el(`
    <header class="entete" data-nav>
      <p class="bandeau-aide" aria-hidden="true">Besoin d’un coup de main</p>
      <div class="entete-ligne">
        <a class="marque" href="${urlSeance('index.html')}"><b>La fabrique du social</b><span>Séance 9</span></a>
        <div class="horloge-entete">
          <span class="phase-nom">Séance 9</span>
          <span class="phase-reste" aria-hidden="true"></span>
          <span class="visuellement-cache" data-reste-lisible></span>
          <a class="aller-phase" hidden href="#">Aller à la phase en cours</a>
        </div>
        <div class="outils-entete">
          <button type="button" class="bouton-entete drapeau" data-etat="ok" aria-pressed="false"></button>
          <button type="button" class="bouton-entete pastille-equipe" aria-expanded="false" aria-controls="tiroir-progression"></button>
          <button type="button" class="bouton-entete bouton-menu" aria-expanded="false" aria-controls="tiroir-menu">${svg('menu')}<span>Menu</span></button>
        </div>
      </div>
      <div class="progres-seance" role="progressbar" aria-label="Avancement de la séance" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
    </header>`);
  if (vieux) { vieux.replaceWith(entete); } else { document.body.prepend(entete); }
  const evitement = document.querySelector('.evitement');
  if (evitement) { document.body.prepend(evitement); }

  if (!stockageDisponible()) {
    entete.after(el('<p class="avertissement-stockage" role="alert">Ce navigateur n’enregistre pas vos réponses, copiez régulièrement le récapitulatif.</p>'));
  }

  const voile = el('<div class="voile" hidden></div>');
  const tiroirMenu = el(`
    <div class="tiroir" id="tiroir-menu" role="dialog" aria-modal="true" aria-labelledby="titre-menu" hidden>
      <div class="tiroir-tete"><h2 id="titre-menu">Les pages de la séance</h2>
        <button type="button" class="bouton-entete" data-fermer>${svg('fermer')}<span>Fermer</span></button></div>
      <ol class="menu-pages" data-liste-pages></ol>
      <div class="reglages">
        <h3>Affichage</h3>
        <button type="button" class="interrupteur" data-theme-bouton><span>Thème</span><span class="etat"></span></button>
        <button type="button" class="interrupteur" data-sobre-bouton aria-pressed="false"><span>Mode sobre (sans animations ni badges)</span><span class="etat"></span></button>
        <h3>Vos données</h3>
        <p class="statut" data-texte-donnees>Vos réponses restent dans ce navigateur.</p>
        <button type="button" class="btn discret petit" data-export>Télécharger une sauvegarde (JSON)</button>
        <button type="button" class="btn danger petit" data-effacer>Effacer nos réponses</button>
        <p class="statut" data-statut-reglages role="status" aria-live="polite"></p>
        <p class="statut"><a href="${url('index.html')}">Toutes les séances du cours</a></p>
      </div>
    </div>`);
  const tiroirProgression = el(`
    <div class="tiroir progression" id="tiroir-progression" role="dialog" aria-modal="true" aria-labelledby="titre-progression" hidden>
      <div class="tiroir-tete"><h2 id="titre-progression">Votre progression</h2>
        <button type="button" class="bouton-entete" data-fermer>${svg('fermer')}<span>Fermer</span></button></div>
      <div data-progression-contenu></div>
    </div>`);
  const bandeau = el('<div class="stop-bandeau" role="alert" hidden><span data-bandeau-texte></span><a class="btn petit" data-bandeau-lien href="#"></a></div>');
  const ecran = el(`
    <div class="stop-ecran" role="dialog" aria-modal="true" aria-labelledby="stop-texte" hidden>
      <div class="stop-carte">
        <span class="stop-mot" aria-hidden="true">Stop</span>
        <p class="stop-texte" id="stop-texte"></p>
        <span class="stop-heure"></span>
        <a class="btn" data-stop-lien href="#"></a>
      </div>
    </div>`);
  entete.after(bandeau);
  document.body.append(voile, tiroirMenu, tiroirProgression, ecran);

  refs = {
    entete, voile, tiroirMenu, tiroirProgression, bandeau, ecran,
    phaseNom: entete.querySelector('.phase-nom'),
    reste: entete.querySelector('.phase-reste'),
    resteLisible: entete.querySelector('[data-reste-lisible]'),
    aller: entete.querySelector('.aller-phase'),
    progres: entete.querySelector('.progres-seance'),
    drapeau: entete.querySelector('.drapeau'),
    pastille: entete.querySelector('.pastille-equipe'),
    boutonMenu: entete.querySelector('.bouton-menu'),
    liste: tiroirMenu.querySelector('[data-liste-pages]'),
    progressionContenu: tiroirProgression.querySelector('[data-progression-contenu]')
  };
  brancherTiroirs();
  brancherReglages();
  brancherDrapeau();
  remplirMenu();
  majPastille();
  majDrapeau();
  majReglages();
}

// ---------------------------------------------------------------- tiroirs

let tiroirOuvert = null;
let declencheur = null;

function ouvrir(tiroir, bouton) {
  fermer();
  tiroirOuvert = tiroir;
  declencheur = bouton;
  if (tiroir === refs.tiroirProgression) { majProgression(); }
  tiroir.hidden = false;
  refs.voile.hidden = false;
  bouton.setAttribute('aria-expanded', 'true');
  const premier = tiroir.querySelector('button, a, [tabindex]');
  if (premier) { premier.focus(); }
}
function fermer() {
  if (!tiroirOuvert) { return; }
  tiroirOuvert.hidden = true;
  refs.voile.hidden = true;
  if (declencheur) { declencheur.setAttribute('aria-expanded', 'false'); declencheur.focus(); }
  tiroirOuvert = null;
}

function brancherTiroirs() {
  refs.boutonMenu.addEventListener('click', () => (tiroirOuvert === refs.tiroirMenu ? fermer() : ouvrir(refs.tiroirMenu, refs.boutonMenu)));
  refs.pastille.addEventListener('click', () => (tiroirOuvert === refs.tiroirProgression ? fermer() : ouvrir(refs.tiroirProgression, refs.pastille)));
  refs.voile.addEventListener('click', fermer);
  document.querySelectorAll('[data-fermer]').forEach((b) => b.addEventListener('click', fermer));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tiroirOuvert) { fermer(); }
    if (e.key === 'Tab' && tiroirOuvert) {
      const f = [...tiroirOuvert.querySelectorAll('button, a[href], input, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.hidden && x.offsetParent !== null);
      if (!f.length) { return; }
      const premier = f[0];
      const dernier = f[f.length - 1];
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
    }
  });
}

// ---------------------------------------------------------------- menu des pages

function remplirMenu() {
  const fichier = fichierCourant();
  const items = [{ label: 'Accueil de la séance', page: 'index.html', heure: '' }];
  phases().forEach((p) => {
    items.push({ label: p.id === 'fin' ? 'Bilan' : p.label, page: p.page, heure: heureMinute(p.debut), id: p.id });
  });
  const premierDuFichier = new Set();
  refs.liste.innerHTML = items.map((it) => {
    const f = fichierDe(it.page);
    const courant = f === fichier && espace === 'seance' && !premierDuFichier.has(f);
    if (courant) { premierDuFichier.add(f); }
    return '<li data-phase="' + (it.id || '') + '"><a href="' + urlSeance(it.page) + '"' + (courant ? ' aria-current="page"' : '') + '>'
      + '<span class="heure">' + it.heure + '</span><span>' + echapper(it.label) + '</span><span class="marqueur"></span></a></li>';
  }).join('');
}

function majMenuEnCours(s) {
  if (!refs.liste) { return; }
  refs.liste.querySelectorAll('li').forEach((li) => {
    const id = li.dataset.phase;
    const enCours = !!(s.phase && !s.avant && !s.apres && id && s.phase.id === id);
    li.classList.toggle('en-cours', enCours);
    const m = li.querySelector('.marqueur');
    if (m) { m.textContent = enCours ? 'En cours' : ''; }
  });
}

// ---------------------------------------------------------------- équipe, drapeau, réglages

function majPastille() {
  const eq = equipe();
  const res = calculer();
  refs.pastille.innerHTML = svg(eq.icone) + '<span class="libelle-long">' + (eq.defini ? echapper(eq.nom) : 'Progression') + '</span>'
    + '<span class="points">' + res.points + ' pts</span>';
  refs.pastille.setAttribute('aria-label', 'Ouvrir votre progression. ' + (eq.defini ? 'Équipe ' + eq.nom + '. ' : '') + res.points + ' points d’enquête.');
}

function majProgression(options = {}) {
  if (!refs.progressionContenu) { return; }
  refs.progressionContenu.innerHTML = htmlProgression(options);
  typographier(refs.progressionContenu);
}

function majDrapeau() {
  const aide = lire().drapeau === 'aide';
  refs.drapeau.dataset.etat = aide ? 'aide' : 'ok';
  refs.drapeau.setAttribute('aria-pressed', aide ? 'true' : 'false');
  refs.drapeau.innerHTML = svg(aide ? 'coup-de-main' : 'valide') + '<span>' + (aide ? 'Besoin d’un coup de main' : 'On avance') + '</span>';
  refs.drapeau.title = aide ? 'Signal affiché. Cliquez quand vous n’en avez plus besoin.' : 'Cliquez pour signaler à l’enseignant que vous avez besoin d’aide.';
  document.documentElement.dataset.drapeau = aide ? 'aide' : 'ok';
}

function brancherDrapeau() {
  refs.drapeau.addEventListener('click', () => {
    modifier((e) => { e.drapeau = e.drapeau === 'aide' ? 'ok' : 'aide'; }, { source: 'drapeau' });
    majDrapeau();
  });
}

function majReglages() {
  const o = lire().options;
  const bt = refs.tiroirMenu.querySelector('[data-theme-bouton] .etat');
  bt.textContent = o.theme === 'light' ? 'Clair' : o.theme === 'dark' ? 'Sombre' : (themeEffectif() === 'light' ? 'Automatique (clair)' : 'Automatique (sombre)');
  const bs = refs.tiroirMenu.querySelector('[data-sobre-bouton]');
  bs.setAttribute('aria-pressed', o.sobre ? 'true' : 'false');
  bs.querySelector('.etat').textContent = o.sobre ? 'Activé' : 'Désactivé';
}

function brancherReglages() {
  const m = refs.tiroirMenu;
  const statutR = m.querySelector('[data-statut-reglages]');
  m.querySelector('[data-theme-bouton]').addEventListener('click', () => {
    const ordre = ['auto', 'dark', 'light'];
    modifier((e) => { e.options.theme = ordre[(ordre.indexOf(e.options.theme || 'auto') + 1) % 3]; }, { source: 'options' });
    appliquerOptions();
    majReglages();
  });
  m.querySelector('[data-sobre-bouton]').addEventListener('click', () => {
    modifier((e) => { e.options.sobre = !e.options.sobre; }, { source: 'options' });
    appliquerOptions();
    majReglages();
  });
  m.querySelector('[data-export]').addEventListener('click', () => {
    const blob = new Blob([exporterJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 's09_sauvegarde.json';
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    statutR.textContent = 'Sauvegarde téléchargée.';
  });
  const boutonEffacer = m.querySelector('[data-effacer]');
  let arme = null;
  boutonEffacer.addEventListener('click', () => {
    if (boutonEffacer.dataset.arme === '1') {
      clearTimeout(arme);
      boutonEffacer.dataset.arme = '0';
      boutonEffacer.textContent = 'Effacer nos réponses';
      effacer();
      statutR.textContent = 'Vos réponses ont été effacées de ce navigateur.';
      return;
    }
    boutonEffacer.dataset.arme = '1';
    boutonEffacer.textContent = 'Confirmer l’effacement';
    statutR.textContent = 'Cliquez une seconde fois pour confirmer. Cette action ne peut pas être annulée.';
    arme = setTimeout(() => {
      boutonEffacer.dataset.arme = '0';
      boutonEffacer.textContent = 'Effacer nos réponses';
      statutR.textContent = '';
    }, 6000);
  });
}

// ---------------------------------------------------------------- horloge dans l’en-tête

function majHorloge(s) {
  if (!refs.phaseNom) { return; }
  const fichier = fichierCourant();
  let nom = '';
  let reste = '';
  let lisible = '';
  if (s.avant) {
    nom = 'La séance commence à ' + heureMinute(0);
    reste = '';
  } else if (s.apres) {
    nom = 'La séance est terminée';
  } else {
    nom = s.phase.label;
    reste = 'Reste ' + formatCompte(s.resteMs);
    lisible = 'Temps restant pour cette phase, ' + minutesTexte(s.resteMs) + '.';
  }
  if (refs.phaseNom.textContent !== nom) { refs.phaseNom.textContent = nom; typographier(refs.phaseNom); }
  refs.reste.textContent = reste;
  refs.reste.classList.toggle('urgent', !s.avant && !s.apres && s.resteMs < 120000);
  if (refs.resteLisible.textContent !== lisible) { refs.resteLisible.textContent = lisible; }
  const pc = Math.round(s.progression * 100);
  refs.progres.querySelector('span').style.width = pc + '%';
  refs.progres.setAttribute('aria-valuenow', String(pc));
  refs.progres.setAttribute('aria-valuetext', pc + ' % de la séance écoulée');

  // Lien « Aller à la phase en cours »
  const aller = refs.aller;
  if (espace === 'seance' && s.phase && !s.avant) {
    const cible = s.apres ? phases()[phases().length - 1].page : s.phase.page;
    const fCible = fichierDe(cible);
    const ancre = ancreDe(cible);
    if (fCible !== fichier) {
      aller.hidden = false;
      aller.textContent = 'Aller à la phase en cours';
      aller.href = urlSeance(cible);
    } else if (ancre && window.location.hash !== ancre) {
      aller.hidden = false;
      aller.textContent = 'Aller à la section en cours';
      aller.href = ancre;
    } else {
      aller.hidden = true;
    }
  } else {
    aller.hidden = true;
  }
  majMenuEnCours(s);
}

// ---------------------------------------------------------------- points d’arrêt

function texteArret(arret) {
  const ph = phases();
  const pause = ph.find((p) => p.id === 'pause');
  const reprise = pause ? heureMinute(pause.debut + pause.duree) : '';
  return String(arret.phase.stopTexte || 'Stop.').replace('{reprise}', reprise);
}

function vu(idArret) { return !!lire().arrets[idArret]; }
function marquerVu(idArret) {
  if (vu(idArret)) { return; }
  modifier((e) => { e.arrets[idArret] = Date.now(); }, { source: 'arret' });
}

// Position de la page affichée dans le déroulé (fichier et section).
function indexLieu() {
  const f = fichierCourant();
  const h = window.location.hash;
  const ph = phases();
  let i = h ? ph.findIndex((p) => p.page === f + h) : -1;
  if (i < 0) { i = ordreFichier(f); }
  return i;
}

// La page affichée est déjà la cible du point d’arrêt, ou une page plus loin.
function cibleAtteinte(cible) {
  const iCible = phases().findIndex((p) => p.id === cible.id);
  const iLieu = indexLieu();
  return iLieu >= 0 && iCible >= 0 && iLieu >= iCible;
}

function allerVers(cible, idArret) {
  marquerVu(idArret);
  cacherArret();
  const fCible = fichierDe(cible.page);
  const ancre = ancreDe(cible.page);
  if (fCible === fichierCourant() && ancre) {
    window.location.hash = ancre;
    const h = document.querySelector(ancre);
    if (h) { h.scrollIntoView(); const t = h.querySelector('h2'); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } }
  } else {
    window.location.href = urlSeance(cible.page);
  }
}

function cacherArret() {
  refs.bandeau.hidden = true;
  if (!refs.ecran.hidden) {
    refs.ecran.hidden = true;
    document.querySelectorAll('[data-inerte-stop]').forEach((n) => { n.inert = false; n.removeAttribute('data-inerte-stop'); });
  }
  dernierAffichageArret = null;
}

function montrerEcran(s) {
  const a = s.arret;
  const lien = refs.ecran.querySelector('[data-stop-lien]');
  const mot = refs.ecran.querySelector('.stop-mot');
  mot.textContent = a.phase.stopMot || 'Stop';
  mot.classList.toggle('long', mot.textContent.length > 4);
  refs.ecran.querySelector('.stop-texte').textContent = texteArret(a);
  refs.ecran.querySelector('.stop-heure').textContent = 'Il est ' + formatHeure(s.t) + '.';
  lien.textContent = a.phase.stopBouton || 'Continuer';
  lien.href = urlSeance(a.cible.page);
  lien.onclick = (ev) => { ev.preventDefault(); allerVers(a.cible, a.phase.id); };
  typographier(refs.ecran);
  if (refs.ecran.hidden) {
    refs.bandeau.hidden = true;
    refs.ecran.hidden = false;
    [...document.body.children].forEach((n) => {
      if (n !== refs.ecran && !n.inert && n.tagName !== 'SCRIPT') { n.inert = true; n.setAttribute('data-inerte-stop', ''); }
    });
    lien.focus();
  }
}

function montrerBandeau(s) {
  const a = s.arret;
  const restant = Math.max(0, Math.ceil((graceMs() - a.depuisMs) / 1000));
  refs.bandeau.querySelector('[data-bandeau-texte]').textContent = 'Fin de la phase ' + a.phase.label + '. Terminez votre phrase, la suite s’affiche dans ' + restant + ' s.';
  const lien = refs.bandeau.querySelector('[data-bandeau-lien]');
  lien.textContent = a.phase.stopBouton || 'Continuer';
  lien.href = urlSeance(a.cible.page);
  lien.onclick = (ev) => { ev.preventDefault(); allerVers(a.cible, a.phase.id); };
  refs.bandeau.hidden = false;
}

function gererArret(s) {
  if (espace !== 'seance' || !refs.ecran) { return; }
  const a = s.arret;
  if (!a || vu(a.phase.id)) { cacherArret(); return; }
  if (cibleAtteinte(a.cible)) { marquerVu(a.phase.id); cacherArret(); return; }
  dernierAffichageArret = a.phase.id;
  if (a.depuisMs < graceMs()) { montrerBandeau(s); } else { montrerEcran(s); }
}

// ---------------------------------------------------------------- initialisation

export function initNav(page, options = {}) {
  idPage = page;
  espace = options.espace || 'seance';
  appliquerOptions();
  if (espace !== 'seance') { return; }
  construireEntete();
  typographier(refs.entete);
  const annonceur = el('<p class="visuellement-cache" aria-live="polite" data-annonce-phase></p>');
  document.body.append(annonceur);
  surTic((s) => { majHorloge(s); gererArret(s); });
  surPhase((d) => {
    const s = d.statut;
    if (d.precedente === undefined) { return; }
    annonceur.textContent = s.avant ? '' : s.apres ? 'La séance est terminée.' : 'Nouvelle phase, ' + s.phase.label + '.';
  });
  const s = statut();
  majHorloge(s);
  gererArret(s);
  surChangement((d) => {
    majPastille();
    if (d.source === 'options' || d.efface || d.externe) { appliquerOptions(); majReglages(); majDrapeau(); }
    if (tiroirOuvert === refs.tiroirProgression) { majProgression(); }
  });
  surMiseAJourJeu((info) => {
    majPastille();
    if (tiroirOuvert === refs.tiroirProgression) { majProgression(info); }
  });
  surStockageIndisponible(() => {
    if (!document.querySelector('.avertissement-stockage')) {
      refs.entete.after(el('<p class="avertissement-stockage" role="alert">Ce navigateur n’enregistre pas vos réponses, copiez régulièrement le récapitulatif.</p>'));
    }
  });
  window.addEventListener('hashchange', () => { const st = statut(); majHorloge(st); gererArret(st); });
  surCollecte(({ actif, dernierEnvoi, sature }) => {
    const p = refs.tiroirMenu.querySelector('[data-texte-donnees]');
    if (!p) { return; }
    p.textContent = actif
      ? 'Vos réponses sont enregistrées dans ce navigateur et envoyées chiffrées à l’enseignant, aux moments clés de la séance.'
        + (dernierEnvoi ? ' Dernier envoi à ' + formatHeure(dernierEnvoi).replace(/\u00a0/g, ' ') + '.' : '')
        + (sature ? ' Le relais est saturé pour l’instant, gardez une copie de votre récapitulatif.' : '')
      : 'Vos réponses restent dans ce navigateur.';
    typographier(p);
  });
  const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');
  if (mq && mq.addEventListener) { mq.addEventListener('change', majReglages); }
}

export { idPage };
