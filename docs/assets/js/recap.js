// Récapitulatif des réponses, en texte brut, à déposer sur Moodle.
// Les énoncés sont lus dans le HTML des pages (source unique des textes) :
// la page courante directement, les autres pages par une requête vers le site.

import { lire, modifier, surChangement } from './state.js';
import { urlSeance, fichierCourant } from './donnees.js';
import { ligneQCM } from './qcm.js';
import { calculer, equipe, listeNoms, BADGES, ICONES_EQUIPE } from './gamify.js';
import { collecteActive, envoyerDepot } from './collect.js';
import { formatHeure } from './clock.js';

const SOURCES = {
  parcours: {
    titre: 'Séance 9, La fabrique du social. Parcours « Définir, citer, lire une étude »',
    sections: [
      { fichier: '3-chercher.html', titre: 'CHERCHER' },
      { fichier: '5-citer-pratique.html', titre: 'CITER, PRATIQUE' },
      { fichier: '6-lire.html', titre: 'LIRE' }
    ],
    qcm: ['2-methode.html', '5-citer-pratique.html', '6-lire.html'],
    temps: [['cadre', 'cadre'], ['methode', 'méthode'], ['chercher', 'chercher'], ['citer-lecture', 'lecture'], ['citer-pratique', 'pratique'], ['lire', 'lire']],
    suffixe: 'parcours'
  },
  video: {
    titre: 'Séance 9, La fabrique du social. Partie vidéo et prise de notes',
    sections: [
      { fichier: '9-video.html', titre: 'VIDÉO' }
    ],
    qcm: ['9-video.html'],
    temps: [['notes', 'conseils de notes'], ['video', 'vidéo']],
    suffixe: 'video'
  }
};

const IGNORES = new Set(['usage', 'verif', 'equipe', 'nom1', 'nom2', 'nom3']);
const cache = new Map();

async function documentDe(fichier) {
  if (fichier === fichierCourant()) { return document; }
  if (cache.has(fichier)) { return cache.get(fichier); }
  const promesse = fetch(urlSeance(fichier), { cache: 'no-cache' })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
    .then((html) => new DOMParser().parseFromString(html, 'text/html'))
    .catch(() => null);
  cache.set(fichier, promesse);
  return promesse;
}

function texteSans(el, selecteurs) {
  const copie = el.cloneNode(true);
  copie.querySelectorAll(selecteurs).forEach((n) => n.remove());
  return copie.textContent.replace(/\s+/g, ' ').trim();
}

function conditionVraie(expr) {
  if (!expr) { return true; }
  const [cle, valeur] = String(expr).split('=');
  return lire().radios[cle] === valeur;
}

function reponseDe(bloc) {
  const e = lire();
  const radio = bloc.querySelector('input[type="radio"][data-radio]');
  if (radio) {
    const nom = radio.dataset.radio;
    const choisi = [...bloc.querySelectorAll('input[type="radio"][data-radio]')].find((r) => r.value === e.radios[nom]);
    if (!choisi) { return ''; }
    let t = choisi.dataset.label || texteSans(bloc.querySelector('label[for="' + choisi.id + '"]') || choisi, '');
    const precision = bloc.querySelector('[data-id]');
    if (precision) {
      const v = (e.champs[precision.dataset.id] || '').trim();
      if (v) { t += ', ' + v; }
    }
    return t;
  }
  const champ = bloc.querySelector('[data-id]');
  if (!champ) { return ''; }
  const v = e.champs[champ.dataset.id];
  return typeof v === 'string' ? v.trim() : '';
}

function minutes(sec) { return Math.round((sec || 0) / 60); }

function slug(t) {
  const s = String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return s || 'equipe';
}

export function nomFichier(type) {
  return 's09_' + slug(equipe().nom) + '_' + SOURCES[type].suffixe + '.txt';
}

function entete(type) {
  const e = lire();
  const eq = equipe(e);
  const res = calculer(e);
  const src = SOURCES[type];
  const lignes = [src.titre];
  lignes.push('Équipe. ' + (eq.defini ? eq.nom : '(nom d’équipe non renseigné)') + ' (icône ' + (ICONES_EQUIPE[eq.icone] || 'Loupe').toLowerCase() + ')');
  lignes.push('Membres. ' + (listeNoms([eq.n1, eq.n2, eq.n3]) || '(noms non renseignés)'));
  lignes.push('Récapitulatif généré le ' + new Date().toLocaleString('fr-FR'));
  lignes.push('Temps passé par page, en minutes. ' + src.temps.map(([id, lib]) => lib + ' ' + minutes(e.temps[id])).join(', ') + '.');
  const badges = BADGES.filter((b) => e.badges[b.id]).map((b) => b.nom);
  lignes.push('Points d’enquête. ' + res.points + '. Badges. ' + (badges.length ? badges.join(', ') : 'aucun pour l’instant') + '.');
  lignes.push('Les points ne sont pas une note.');
  return lignes;
}

async function questionsDe(fichier) {
  const doc = await documentDe(fichier);
  if (!doc) { return null; }
  const blocs = [...doc.querySelectorAll('.q[data-q]')].filter((b) => !IGNORES.has(b.dataset.q));
  return blocs.map((b) => {
    const lab = b.querySelector('.qlabel');
    const id = lab && lab.querySelector('.qid') ? lab.querySelector('.qid').textContent.trim() : b.dataset.q.toUpperCase();
    return {
      cle: b.dataset.q,
      id,
      enonce: lab ? texteSans(lab, '.qid, .tag-bonus') : '',
      bonus: b.hasAttribute('data-bonus'),
      requis: b.hasAttribute('data-requis'),
      si: b.dataset.si || '',
      reponse: reponseDe(b)
    };
  });
}

async function qcmDe(fichier) {
  const doc = await documentDe(fichier);
  if (!doc) { return []; }
  return [...doc.querySelectorAll('fieldset.qcm[data-qcm]')].map((fs) => {
    const affiche = fs.querySelector('legend .qid') ? fs.querySelector('legend .qid').textContent.trim() : fs.dataset.qcm;
    const lib = affiche === fs.dataset.qcm ? affiche : affiche + ' (' + fs.dataset.qcm + ')';
    return ligneQCM(fs.dataset.qcm, lib, fs.dataset.correct);
  });
}

async function conseilsTextes() {
  const doc = await documentDe('8-notes.html');
  const map = {};
  if (doc) {
    doc.querySelectorAll('[data-conseil]').forEach((b) => {
      const t = b.querySelector('.texte');
      map[b.dataset.conseil] = t ? t.textContent.replace(/\s+/g, ' ').trim() : '';
    });
  }
  return map;
}

// Construit le récapitulatif. Renvoie { texte, manquants, total }.
export async function construire(type) {
  const e = lire();
  const src = SOURCES[type];
  const lignes = entete(type);
  const manquants = [];
  let total = 0;
  const corps = [];

  if (type === 'video') {
    const textes = await conseilsTextes();
    corps.push('', 'CONSEILS CHOISIS POUR LA VIDÉO');
    if (e.conseils.length) {
      e.conseils.forEach((n) => corps.push(String(n).padStart(2, '0') + '. ' + (textes[n] || '')));
    } else {
      corps.push('(aucun conseil choisi)');
    }
    corps.push('', 'NOTES PRISES SUR LA PAGE');
    corps.push('Notes. ' + ((e.champs.n1 || '').trim() || '(notes prises sur papier)'));
    corps.push('Pour moi. ' + ((e.champs.n2 || '').trim() || '(rien)'));
    const vus = (e.cases.tips_vus || []).map((n) => String(n).padStart(2, '0'));
    corps.push('', 'COMPARAISON EN BINÔME');
    corps.push('Conseils repérés dans les notes reçues. ' + (vus.length ? vus.join(', ') : '(aucun coché)'));
  }

  for (const section of src.sections) {
    const qs = await questionsDe(section.fichier);
    corps.push('', section.titre, '');
    if (!qs) {
      corps.push('(La page ' + section.fichier + ' n’a pas pu être lue. Vérifiez votre connexion, puis recommencez.)');
      continue;
    }
    for (const q of qs) {
      if (q.si && !conditionVraie(q.si)) { continue; }
      if (q.cle === 'n1' || q.cle === 'n2') { continue; }
      if (q.bonus && !q.reponse) { continue; }
      if (q.requis) {
        total += 1;
        if (!q.reponse) { manquants.push(q.id); }
      }
      corps.push(q.id + (q.bonus ? ' (bonus)' : '') + '. ' + q.enonce);
      corps.push('Réponse. ' + (q.reponse || '(pas de réponse)'));
      corps.push('');
    }
  }

  corps.push('DÉTAIL DES QUESTIONS À CHOIX MULTIPLE');
  for (const f of src.qcm) {
    (await qcmDe(f)).forEach((l) => corps.push(l));
  }

  if (type === 'parcours') {
    corps.push('', 'DÉCLARATION D’USAGE DE L’IA');
    const libelles = {
      non: 'Nous n’avons utilisé aucun outil d’IA.',
      sophia: 'Nous avons utilisé SophIA.',
      autre: 'Nous avons utilisé un autre outil d’IA.'
    };
    const u = e.radios.usage;
    if (!u) { manquants.push('déclaration d’usage de l’IA'); }
    corps.push(u ? libelles[u] : '(pas de réponse)');
    const v = (e.champs.verif || '').trim();
    corps.push('Précision. ' + (v || '(aucune)'));
  }

  const etatLigne = manquants.length
    ? 'Réponses. ' + (total - manquants.filter((m) => m !== 'déclaration d’usage de l’IA').length) + ' sur ' + total + '. Il manque encore ' + manquants.join(', ') + '.'
    : 'Réponses. ' + total + ' sur ' + total + '.';
  lignes.push(etatLigne);
  return { texte: lignes.concat(corps).join('\n') + '\n', manquants, total };
}

// ---------------------------------------------------------------- catalogue des questions (page Réponses)

const CATALOGUE = [
  { fichier: '2-methode.html', titre: 'Méthode' },
  { fichier: '3-chercher.html', titre: 'Chercher' },
  { fichier: '5-citer-pratique.html', titre: 'Citer, pratique' },
  { fichier: '6-lire.html', titre: 'Lire et dépôt' },
  { fichier: '9-video.html', titre: 'Vidéo' }
];

// Liste ordonnée des questions du parcours, lue dans le HTML des pages.
export async function catalogue() {
  const sortie = [];
  for (const section of CATALOGUE) {
    const doc = await documentDe(section.fichier);
    if (!doc) { continue; }
    doc.querySelectorAll('.q[data-q], fieldset.qcm[data-qcm]').forEach((el) => {
      if (el.matches('fieldset.qcm')) {
        const leg = el.querySelector('legend');
        const options = {};
        el.querySelectorAll('.opt').forEach((o) => {
          const inp = o.querySelector('input');
          const lab = o.querySelector('label');
          if (inp && lab) { options[inp.value] = texteSans(lab, '.ltr'); }
        });
        sortie.push({
          type: 'qcm', cle: el.dataset.qcm, section: section.titre,
          id: leg && leg.querySelector('.qid') ? leg.querySelector('.qid').textContent.trim() : el.dataset.qcm,
          enonce: leg ? texteSans(leg, '.qid') : '', options
        });
        return;
      }
      const cle = el.dataset.q;
      if (['equipe', 'nom1', 'nom2', 'nom3', 'icone'].includes(cle)) { return; }
      const lab = el.querySelector('.qlabel');
      const radios = [...el.querySelectorAll('input[type="radio"][data-radio]')];
      const options = {};
      radios.forEach((r) => { options[r.value] = r.dataset.label || r.value; });
      sortie.push({
        type: radios.length ? 'choix' : 'texte', cle, section: section.titre,
        id: lab && lab.querySelector('.qid') ? lab.querySelector('.qid').textContent.trim() : (cle === 'usage' ? 'IA' : cle === 'verif' ? 'IA, précision' : cle.toUpperCase()),
        enonce: lab ? texteSans(lab, '.qid, .tag-bonus') : '',
        requis: el.hasAttribute('data-requis'), bonus: el.hasAttribute('data-bonus'), options,
        precision: radios.length && el.querySelector('[data-id]') ? el.querySelector('[data-id]').dataset.id : ''
      });
    });
  }
  return sortie;
}

// ---------------------------------------------------------------- copie et téléchargement

function copieDeSecours(ta, texte) {
  try {
    ta.value = texte;
    ta.removeAttribute('readonly');
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, texte.length);
    const ok = document.execCommand('copy');
    ta.setAttribute('readonly', '');
    return ok;
  } catch (e) {
    ta.setAttribute('readonly', '');
    return false;
  }
}

export async function copier(texte, ta) {
  if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
    try { await navigator.clipboard.writeText(texte); return true; } catch (e) { /* repli ci-dessous */ }
  }
  return copieDeSecours(ta, texte);
}

export function telecharger(texte, nom) {
  const blob = new Blob([texte], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  a.hidden = true;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function noterDepot(type, via) {
  modifier((e) => { e.depots[type] = { le: Date.now(), via }; }, { source: 'depot', id: type });
}

// ---------------------------------------------------------------- composant de dépôt

async function brancherDepot(zone) {
  const type = zone.dataset.depot;
  const ta = zone.querySelector('[data-recap-texte]');
  const statut = zone.querySelector('[data-recap-statut]');
  const progres = zone.querySelector('[data-recap-progres]');
  const bEnvoyer = zone.querySelector('[data-action="envoyer"]');
  const bTelecharger = zone.querySelector('[data-action="telecharger"]');
  const avis = zone.querySelector('[data-avis-collecte]');
  const active = await collecteActive();
  if (bEnvoyer) { bEnvoyer.hidden = !active; }
  if (avis) { avis.hidden = !active; }
  // Sans envoi à l’enseignant, le téléchargement devient l’action principale.
  if (!active && bTelecharger) { bTelecharger.classList.remove('secondaire'); }

  let enCours = null;
  async function actualiser() {
    const r = await construire(type);
    if (ta) { ta.value = r.texte; }
    if (progres) {
      progres.textContent = r.manquants.length
        ? 'Il manque encore ' + r.manquants.join(', ') + '. Vous pouvez déposer quand même.'
        : 'Toutes les réponses demandées sont renseignées.';
      progres.className = 'statut ' + (r.manquants.length ? 'alerte' : 'ok');
    }
    return r;
  }
  function planifier() {
    clearTimeout(enCours);
    enCours = setTimeout(actualiser, 400);
  }

  zone.querySelector('[data-action="copier"]').addEventListener('click', async () => {
    const r = await actualiser();
    const ok = await copier(r.texte, ta);
    if (ok) {
      noterDepot(type, 'copie');
      statut.textContent = 'Récapitulatif copié. Collez-le dans un document pour le garder.';
      statut.className = 'statut ok';
    } else {
      const det = zone.querySelector('details');
      if (det) { det.open = true; }
      ta.focus();
      ta.select();
      statut.textContent = 'La copie automatique n’a pas fonctionné. Le texte est sélectionné, utilisez Ctrl+C (ou Cmd+C), ou téléchargez le fichier.';
      statut.className = 'statut alerte';
    }
  });
  zone.querySelector('[data-action="telecharger"]').addEventListener('click', async () => {
    const r = await actualiser();
    const nom = nomFichier(type);
    telecharger(r.texte, nom);
    noterDepot(type, 'fichier');
    statut.textContent = 'Fichier ' + nom + ' téléchargé. Gardez-le.';
    statut.className = 'statut ok';
  });
  if (bEnvoyer) {
    bEnvoyer.addEventListener('click', async () => {
      bEnvoyer.disabled = true;
      const r = await actualiser();
      noterDepot(type, 'envoi');
      const res = await envoyerDepot(type, r.texte);
      bEnvoyer.disabled = false;
      if (res.ok) {
        statut.textContent = 'Récapitulatif envoyé à l’enseignant à ' + formatHeure(Date.now()) + '. Vous pouvez aussi télécharger une copie.';
        statut.className = 'statut ok';
      } else {
        modifier((e) => { delete e.depots[type]; }, { source: 'depot', id: type });
        statut.textContent = res.raison === 'limite'
          ? 'Le relais refuse les envois pour l’instant (trop d’envois depuis ce réseau). Téléchargez le récapitulatif et gardez le fichier, puis prévenez l’enseignant.'
          : 'L’envoi n’a pas abouti. Téléchargez le récapitulatif et gardez le fichier, puis prévenez l’enseignant.';
        statut.className = 'statut alerte';
      }
    });
  }
  surChangement((d) => { if (d.source !== 'depot') { planifier(); } });
  await actualiser();
}

export function initRecap(racine = document) {
  racine.querySelectorAll('[data-depot]').forEach((z) => { brancherDepot(z); });
}
