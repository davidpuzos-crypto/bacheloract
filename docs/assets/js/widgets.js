// Outils propres à certaines pages : exemple annoté, progression de lecture,
// choix des conseils, boîte à symboles, chronomètre, plan de la vidéo,
// modèle de fiche, carnet intégré, déroulé, liens de configuration.

import { lire, modifier, surChangement } from './state.js';
import { config, urlSeance } from './donnees.js';
import { statut, surTic, phases, heureMinute, formatCompte, fichierDe } from './clock.js';
import { htmlCarnet, htmlCarteQuetes, htmlPhraseSeule, surMiseAJourJeu, echapper } from './gamify.js';
import { typographier } from './typo.js';
import { copier } from './recap.js';
import { annoncer } from './ui.js';

// ---------------------------------------------------------------- liens de config.json
async function liensConfig() {
  const c = await config();
  const liens = c.liens || {};
  document.querySelectorAll('a[data-lien]').forEach((a) => {
    const v = liens[a.dataset.lien];
    const sans = a.parentElement ? a.parentElement.querySelector('[data-sans-lien="' + a.dataset.lien + '"]') : null;
    if (v) { a.href = v; a.hidden = false; if (sans) { sans.hidden = true; } } else if (!a.getAttribute('href') || a.getAttribute('href') === '#') { a.hidden = true; if (sans) { sans.hidden = false; } }
  });
  document.querySelectorAll('[data-option]').forEach((el) => {
    const v = c.options ? c.options[el.dataset.option] : false;
    el.hidden = !v;
  });
  const collecte = !!(c.collecte && c.collecte.actif && c.collecte.endpoint);
  document.querySelectorAll('[data-si-collecte]').forEach((el) => { el.hidden = !collecte; });
  document.querySelectorAll('[data-sans-collecte]').forEach((el) => { el.hidden = collecte; });
  document.querySelectorAll('[data-date-seance]').forEach((el) => {
    const d = c.dateSeance ? new Date(c.dateSeance + 'T12:00:00') : null;
    if (d && !isNaN(d.getTime())) {
      el.textContent = 'Séance du ' + d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '.';
      el.hidden = false;
    }
  });
}

// ---------------------------------------------------------------- exemple annoté (méthode)
function exempleAnnote() {
  const boite = document.querySelector('[data-boite-note]');
  if (!boite) { return; }
  document.querySelectorAll('mark[data-note]').forEach((m) => {
    const ouvrir = () => {
      const src = document.getElementById(m.dataset.note);
      if (!src) { return; }
      boite.innerHTML = src.innerHTML;
      document.querySelectorAll('mark[data-note][aria-pressed="true"]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      m.setAttribute('aria-pressed', 'true');
      typographier(boite);
    };
    m.addEventListener('click', ouvrir);
    m.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } });
  });
}

// ---------------------------------------------------------------- progression de lecture (citer, lecture)
function progressionLecture() {
  const barre = document.querySelector('[data-progres-lecture] span');
  const bouton = document.querySelector('[data-tout-lu]');
  const zone = document.querySelector('[data-zone-lecture]');
  const maj = () => {
    if (!barre || !zone) { return; }
    const r = zone.getBoundingClientRect();
    const h = window.innerHeight;
    const total = r.height - h * 0.6;
    const fait = Math.min(1, Math.max(0, (h * 0.4 - r.top) / Math.max(1, total)));
    barre.style.width = Math.round(fait * 100) + '%';
  };
  if (zone) {
    window.addEventListener('scroll', maj, { passive: true });
    window.addEventListener('resize', maj);
    maj();
  }
  if (bouton) {
    const etat = bouton.parentElement.querySelector('[data-etat-lu]');
    const afficher = () => {
      const lu = !!lire().lu[bouton.dataset.toutLu];
      bouton.setAttribute('aria-pressed', lu ? 'true' : 'false');
      bouton.textContent = lu ? 'Lecture terminée' : bouton.dataset.libelle;
      if (etat) { etat.textContent = lu ? 'C’est noté dans votre carnet.' : ''; }
    };
    bouton.dataset.libelle = bouton.textContent;
    bouton.addEventListener('click', () => {
      if (lire().lu[bouton.dataset.toutLu]) { return; }
      modifier((e) => { e.lu[bouton.dataset.toutLu] = Date.now(); }, { source: 'lu', ancre: bouton });
      afficher();
    });
    surChangement(afficher);
    afficher();
  }
}

// ---------------------------------------------------------------- choix des trois conseils
function choixConseils() {
  const cartes = [...document.querySelectorAll('button[data-conseil]')];
  if (!cartes.length) { return; }
  const statutEl = document.querySelector('[data-statut-conseils]');
  const afficher = () => {
    const choisis = lire().conseils || [];
    cartes.forEach((c) => {
      const oui = choisis.includes(Number(c.dataset.conseil));
      c.setAttribute('aria-pressed', oui ? 'true' : 'false');
      const ch = c.querySelector('.choix');
      if (ch) { ch.textContent = oui ? 'Choisi' : 'Choisir ce conseil'; }
    });
    if (statutEl) {
      statutEl.textContent = choisis.length === 3
        ? 'Vos trois conseils sont choisis. Ils seront rappelés sur la feuille de notes.'
        : choisis.length + ' sur 3 conseils choisis.';
    }
  };
  cartes.forEach((c) => c.addEventListener('click', () => {
    const n = Number(c.dataset.conseil);
    const choisis = lire().conseils || [];
    if (!choisis.includes(n) && choisis.length >= 3) {
      if (statutEl) { statutEl.textContent = 'Vous avez déjà trois conseils. Retirez-en un pour en choisir un autre.'; }
      return;
    }
    modifier((e) => {
      const s = new Set(e.conseils || []);
      if (s.has(n)) { s.delete(n); } else { s.add(n); }
      e.conseils = [...s].sort((a, b) => a - b);
    }, { source: 'conseils', ancre: c });
    afficher();
  }));
  surChangement(afficher);
  afficher();
}

// ---------------------------------------------------------------- rappel des conseils choisis (vidéo)
async function rappelConseils() {
  const cibles = document.querySelectorAll('[data-mes-conseils]');
  if (!cibles.length) { return; }
  let textes = {};
  try {
    const r = await fetch(urlSeance('8-notes.html'), { cache: 'no-cache' });
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    doc.querySelectorAll('[data-conseil]').forEach((b) => {
      const t = b.querySelector('.texte');
      textes[b.dataset.conseil] = t ? t.textContent.replace(/\s+/g, ' ').trim() : '';
    });
  } catch (e) { textes = {}; }
  const afficher = () => {
    const choisis = lire().conseils || [];
    cibles.forEach((ul) => {
      ul.innerHTML = choisis.length
        ? choisis.map((n) => '<li><b>' + String(n).padStart(2, '0') + '</b> ' + echapper(textes[n] || '') + '</li>').join('')
        : '<li>Aucun conseil choisi. <a href="' + urlSeance('8-notes.html') + '">Choisissez-en trois sur la page des conseils</a>.</li>';
      typographier(ul);
    });
  };
  surChangement(afficher);
  afficher();
}

// ---------------------------------------------------------------- boîte à symboles et chronomètre (vidéo)
function outilsNotes() {
  const zones = [...document.querySelectorAll('textarea[data-cible-symboles]')];
  if (!zones.length) { return; }
  let derniere = zones[0];
  zones.forEach((z) => z.addEventListener('focus', () => { derniere = z; }));
  function inserer(texte) {
    const ta = derniere;
    const debut = typeof ta.selectionStart === 'number' ? ta.selectionStart : ta.value.length;
    const fin = typeof ta.selectionEnd === 'number' ? ta.selectionEnd : debut;
    const avant = ta.value.slice(0, debut);
    const espace = avant && !/\s$/.test(avant) ? ' ' : '';
    const ajout = espace + texte + ' ';
    ta.value = avant + ajout + ta.value.slice(fin);
    const pos = debut + ajout.length;
    ta.focus();
    try { ta.setSelectionRange(pos, pos); } catch (e) { /* champ non sélectionnable */ }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  document.querySelectorAll('[data-symbole]').forEach((b) => {
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => inserer(b.dataset.symbole));
  });

  const affiche = document.querySelector('[data-chrono-affiche]');
  if (!affiche) { return; }
  let depart = null;
  let cumul = 0;
  let iv = null;
  const ecoule = () => cumul + (depart ? Date.now() - depart : 0);
  const rendre = () => { affiche.textContent = formatCompte(ecoule()); };
  const bDemarrer = document.querySelector('[data-chrono="demarrer"]');
  const bArreter = document.querySelector('[data-chrono="arreter"]');
  const bInserer = document.querySelector('[data-chrono="inserer"]');
  bDemarrer.addEventListener('click', () => {
    if (depart) { return; }
    depart = Date.now();
    iv = setInterval(rendre, 500);
    rendre();
    bDemarrer.setAttribute('aria-pressed', 'true');
  });
  bArreter.addEventListener('click', () => {
    if (!depart) { return; }
    cumul += Date.now() - depart;
    depart = null;
    clearInterval(iv);
    rendre();
    bDemarrer.setAttribute('aria-pressed', 'false');
  });
  bInserer.addEventListener('mousedown', (e) => e.preventDefault());
  bInserer.addEventListener('click', () => {
    derniere = document.querySelector('textarea[data-id="n1"]') || derniere;
    inserer('[' + Math.floor(ecoule() / 60000) + ' min]');
  });
  rendre();
}

// ---------------------------------------------------------------- plan de la vidéo révélé
function planVideo() {
  const plan = document.querySelector('[data-plan-video]');
  if (!plan) { return; }
  const seuil = Number(plan.dataset.seuil || 40);
  const afficher = () => {
    const v = (lire().champs.bp || '').trim().length;
    const montrer = v >= seuil;
    if (montrer && plan.hidden) { plan.hidden = false; annoncer('Le plan de la vidéo est affiché sous votre réponse.'); }
    if (!montrer) { plan.hidden = true; }
  };
  surChangement(afficher);
  afficher();
}

// ---------------------------------------------------------------- copie du modèle de fiche
function modeleFiche() {
  document.querySelectorAll('[data-copier-modele]').forEach((b) => {
    const ta = document.getElementById(b.dataset.copierModele);
    const st = b.parentElement.parentElement.querySelector('[data-statut-modele]');
    b.addEventListener('click', async () => {
      const ok = await copier(ta.value, ta);
      if (st) { st.textContent = ok ? 'Modèle copié.' : 'La copie automatique n’a pas fonctionné. Le texte est sélectionné, utilisez Ctrl+C (ou Cmd+C).'; }
    });
  });
}

// ---------------------------------------------------------------- carnet intégré dans une page
function carnetsDansLaPage() {
  const blocs = document.querySelectorAll('[data-carnet]');
  const cartes = document.querySelectorAll('[data-carte-quetes]');
  const phrases = document.querySelectorAll('[data-phrase]');
  if (!blocs.length && !cartes.length && !phrases.length) { return; }
  const rendre = (info = {}) => {
    blocs.forEach((b) => { b.innerHTML = htmlCarnet(info); typographier(b); });
    cartes.forEach((b) => { b.innerHTML = htmlCarteQuetes(); typographier(b); });
    phrases.forEach((b) => { b.innerHTML = htmlPhraseSeule(); typographier(b); });
  };
  surMiseAJourJeu(rendre);
  rendre();
  setInterval(() => cartes.forEach((b) => { b.innerHTML = htmlCarteQuetes(); typographier(b); }), 30000);
}

// ---------------------------------------------------------------- déroulé de la matinée (heures réelles)
function deroules() {
  const tables = document.querySelectorAll('[data-deroule]');
  if (!tables.length) { return; }
  const rendre = () => {
    const s = statut();
    tables.forEach((tb) => {
      const corps = tb.querySelector('tbody');
      corps.innerHTML = phases().map((p) => {
        const enCours = s.phase && !s.avant && !s.apres && s.phase.id === p.id;
        const duree = p.duree ? p.duree + '\u00a0min' : '';
        const arret = p.stop ? '<tr class="arret"><th scope="row" class="heure">' + heureMinute(p.debut + p.duree) + '</th><td></td><td>Stop. Fin de la phase ' + echapper(p.label) + '</td></tr>' : '';
        return '<tr' + (enCours ? ' class="en-cours"' : '') + '><th scope="row" class="heure">' + heureMinute(p.debut) + '</th><td>' + duree + '</td><td><a href="' + urlSeance(p.page) + '">' + echapper(p.id === 'fin' ? 'Fin et bilan' : p.label) + '</a>' + (enCours ? ' <span class="marqueur">(en cours)</span>' : '') + '</td></tr>' + arret;
      }).join('');
      typographier(corps);
    });
  };
  rendre();
  let dernier = '';
  surTic((s) => {
    const cle = (s.phase && s.phase.id) + (s.avant ? 'a' : '') + (s.apres ? 'p' : '');
    if (cle !== dernier) { dernier = cle; rendre(); }
  });
}

// ---------------------------------------------------------------- phase en cours (hub) et pause
function phaseActuelle() {
  const blocs = document.querySelectorAll('[data-phase-actuelle]');
  const reprise = document.querySelectorAll('[data-compte-reprise]');
  if (!blocs.length && !reprise.length) { return; }
  const pause = phases().find((p) => p.id === 'pause');
  let cleRendue = '';
  const maj = (s) => {
    const cle = s.avant ? 'avant' : s.apres ? 'apres' : s.phase.id;
    if (cle !== cleRendue) {
      cleRendue = cle;
      let html;
      if (s.avant) {
        html = '<span class="etiquette">Avant la séance</span><span class="grand">La séance commence à ' + heureMinute(0) + '</span>'
          + 'En attendant, créez votre équipe sur la page Cadre.';
      } else if (s.apres) {
        html = '<span class="etiquette">Séance terminée</span><span class="grand">Merci pour cette matinée</span>'
          + '<a href="' + urlSeance('10-fin.html') + '">Voir le bilan</a>';
      } else {
        const suite = s.suivante && s.suivante.id !== 'fin' ? ' Ensuite, ' + echapper(s.suivante.label) + ' à ' + heureMinute(s.suivante.debut) + '.' : '';
        html = '<span class="etiquette">Phase en cours</span><span class="grand">' + echapper(s.phase.label) + '</span>'
          + 'Il reste <span data-compte>' + formatCompte(s.resteMs) + '</span>.' + suite
          + ' <a href="' + urlSeance(s.phase.page) + '">Aller à la phase en cours</a>';
      }
      blocs.forEach((b) => { b.innerHTML = html; typographier(b); });
    }
    if (!s.avant && !s.apres) {
      blocs.forEach((b) => { const c = b.querySelector('[data-compte]'); if (c) { c.textContent = formatCompte(s.resteMs); } });
    }
    if (pause) {
      const finPause = s.d0 + (pause.debut + pause.duree) * 60000;
      reprise.forEach((r) => {
        const reste = finPause - s.t;
        r.textContent = reste > 0 ? formatCompte(reste) : 'C’est l’heure de reprendre';
      });
      document.querySelectorAll('[data-heure-reprise]').forEach((h) => { h.textContent = heureMinute(pause.debut + pause.duree); });
    }
  };
  maj(statut());
  surTic(maj);
}

// ---------------------------------------------------------------- heures affichées dans le texte
function heuresDansLeTexte() {
  document.querySelectorAll('[data-heure-phase]').forEach((el) => {
    const [id, quand] = el.dataset.heurePhase.split(':');
    const p = phases().find((x) => x.id === id);
    if (p) { el.textContent = heureMinute(quand === 'fin' ? p.debut + p.duree : p.debut); }
  });
}

// ---------------------------------------------------------------- « Tout ouvrir » (correction)
function toutOuvrir() {
  document.querySelectorAll('[data-tout-ouvrir]').forEach((b) => {
    const cible = document.querySelectorAll(b.dataset.toutOuvrir);
    let ouvert = false;
    b.addEventListener('click', () => {
      ouvert = !ouvert;
      cible.forEach((d) => { d.open = ouvert; });
      b.textContent = ouvert ? 'Tout fermer' : 'Tout ouvrir';
      b.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    });
  });
}

// ---------------------------------------------------------------- vos réponses dans la correction
function vosReponses() {
  document.querySelectorAll('[data-votre-reponse]').forEach((el) => {
    const ids = el.dataset.votreReponse.split(',');
    const e = lire();
    const parties = ids.map((id) => {
      const v = (e.champs[id] || '').trim();
      return '<b>' + echapper(id.toUpperCase()) + '.</b> ' + (v ? echapper(v) : '(pas de réponse enregistrée dans ce navigateur)');
    });
    el.innerHTML = '<span class="visuellement-cache">Votre réponse. </span>' + parties.join('\n');
  });
}

export function initWidgets() {
  liensConfig();
  exempleAnnote();
  progressionLecture();
  choixConseils();
  rappelConseils();
  outilsNotes();
  planVideo();
  modeleFiche();
  carnetsDansLaPage();
  deroules();
  phaseActuelle();
  heuresDansLeTexte();
  toutOuvrir();
  vosReponses();
}

export { fichierDe };

// Les tableaux qui défilent horizontalement deviennent atteignables au clavier.
function tableauxDefilants() {
  const maj = () => {
    document.querySelectorAll('.table-defile').forEach((z) => {
      const defile = z.scrollWidth > z.clientWidth + 1;
      if (defile) {
        z.setAttribute('tabindex', '0');
        z.setAttribute('role', 'region');
        if (!z.hasAttribute('aria-label')) {
          const cap = z.querySelector('caption');
          z.setAttribute('aria-label', cap ? cap.textContent.replace(/\s+/g, ' ').trim() : 'Tableau, défilement horizontal');
        }
      } else if (z.getAttribute('tabindex') === '0') {
        z.removeAttribute('tabindex');
        z.removeAttribute('role');
      }
    });
  };
  maj();
  window.addEventListener('resize', maj);
}
tableauxDefilants();
