// Gamification sobre : points d’expérience, niveaux, quêtes, badges,
// anneaux de compétences et phrase mystère. Les points ne sont pas une note.
// Tout est recalculé à partir de l’état : rien ne se perd d’une page à l’autre.

import { lire, modifierSansSignal, enregistrerMaintenant, surChangement } from './state.js';
import { minuteDeSeance, finPhaseMin, statut } from './clock.js';
import { icone } from './donnees.js';
import { typographier } from './typo.js';
import { annoncer, gain, confettis, sobre } from './ui.js';

export const SEUIL_CHAMP = 25;
export const SEUIL_BONUS = 40;
export const POINTS = { champ: 10, qcmPremier: 5, qcmEnsuite: 2, bonus: 15, queteALHeure: 20, lu: 10 };
export const NIVEAUX = [
  { seuil: 0, nom: 'Stagiaire' },
  { seuil: 100, nom: 'Enquêteur·ice' },
  { seuil: 200, nom: 'Analyste' },
  { seuil: 300, nom: 'Sociologue' }
];

// Quêtes : ce qui doit être fait pour les terminer.
export const QUETES = [
  {
    id: 'definir', numero: 1, label: 'Définir', morceau: 'Ce qui semble',
    phases: ['methode', 'chercher'], fin: 'chercher',
    champs: ['a1', 'a2', 'a3', 'b1', 'b2'], radios: ['b0'],
    conditionnels: [{ id: 'b4', si: ['b0', 'sophia'] }],
    qcm: ['M1', 'M2', 'M3']
  },
  {
    id: 'citer', numero: 2, label: 'Citer', morceau: 'le plus personnel',
    phases: ['citer-lecture', 'citer-pratique'], fin: 'citer-pratique',
    champs: ['c1', 'c2', 'c3'], qcm: ['C-Q1', 'C-Q2', 'C-Q4', 'C-Q5']
  },
  {
    id: 'lire', numero: 3, label: 'Lire', morceau: 'est souvent',
    phases: ['lire', 'depot', 'correction'], fin: 'correction',
    champs: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'], radios: ['usage'], depot: 'parcours',
    qcm: ['L-Q1', 'L-Q2', 'F-Q1', 'F-Q2', 'F-Q3', 'K1', 'K2']
  },
  {
    id: 'noter', numero: 4, label: 'Noter', morceau: 'le plus social.',
    phases: ['notes', 'video', 'froid', 'questions'], fin: 'questions',
    champs: ['bp', 's1', 'g1'], conseils: 3, qcm: ['V4', 'V5', 'V6', 'V7', 'V8']
  }
];

// Les trois quêtes d’écriture, pour le badge « Dans les temps ».
export const ETAPES = [
  { id: 'chercher', label: 'Chercher', fin: 'chercher', champs: ['a1', 'a2', 'a3', 'b1', 'b2'], radios: ['b0'], conditionnels: [{ id: 'b4', si: ['b0', 'sophia'] }] },
  { id: 'pratique', label: 'Citer, pratique', fin: 'citer-pratique', champs: ['c1', 'c2', 'c3'], qcm: ['C-Q1', 'C-Q2', 'C-Q4', 'C-Q5'] },
  { id: 'lire', label: 'Lire', fin: 'depot', champs: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'], qcm: ['L-Q1', 'L-Q2', 'F-Q1', 'F-Q2', 'F-Q3'] }
];

export const BONUS = ['a6', 'g2', 'g3', 'g4'];

export const BADGES = [
  { id: 'detective', nom: 'Détective de sources', icone: 'b-detective', critere: 'A3 d’au moins 60 caractères.' },
  { id: 'citation', nom: 'Citation en or', icone: 'b-citation', critere: 'Les quatre QCM de la page Citer justes du premier coup.' },
  { id: 'biblio', nom: 'Bibliographe', icone: 'b-biblio', critere: 'C2 d’au moins 80 caractères.' },
  { id: 'lynx', nom: 'Œil de lynx', icone: 'b-oeil', critere: 'Les trois QCM sur les chiffres justes du premier coup.' },
  { id: 'temps', nom: 'Dans les temps', icone: 'b-temps', critere: 'Chercher, Citer et Lire terminées avant la fin de leur phase.' },
  { id: 'critique', nom: 'Esprit critique', icone: 'b-critique', critere: 'Au moins une question bonus répondue.' },
  { id: 'stratege', nom: 'Stratège', icone: 'b-stratege', critere: 'Trois conseils choisis et trois bonnes pratiques repérées.' },
  { id: 'fil', nom: 'Fil rouge', icone: 'b-fil', critere: 'La phrase mystère complète.' }
];

export const ICONES_EQUIPE = { loupe: 'Loupe', boussole: 'Boussole', plume: 'Plume', lanterne: 'Lanterne', jumelles: 'Jumelles', cle: 'Clé' };

// ---------------------------------------------------------------- calculs

function long(e, id) {
  const v = e.champs[id];
  return typeof v === 'string' ? v.trim().length : 0;
}

function elements(def, e) {
  const liste = [];
  (def.champs || []).forEach((id) => liste.push(long(e, id) >= SEUIL_CHAMP));
  (def.conditionnels || []).forEach((c) => { if (e.radios[c.si[0]] === c.si[1]) { liste.push(long(e, c.id) >= SEUIL_CHAMP); } });
  (def.radios || []).forEach((id) => liste.push(!!e.radios[id]));
  (def.qcm || []).forEach((id) => liste.push(!!(e.qcm[id] && e.qcm[id].dernier)));
  if (def.depot) { liste.push(!!e.depots[def.depot]); }
  if (def.conseils) { liste.push((e.conseils || []).length >= def.conseils); }
  return liste;
}

function avancement(def, e) {
  const l = elements(def, e);
  const faits = l.filter(Boolean).length;
  return { faits, total: l.length, complet: l.length > 0 && faits === l.length, ratio: l.length ? faits / l.length : 0 };
}

export function champsRequis(e = lire()) {
  const ids = [];
  QUETES.forEach((q) => {
    (q.champs || []).forEach((id) => ids.push(id));
    (q.conditionnels || []).forEach((c) => { if (e.radios[c.si[0]] === c.si[1]) { ids.push(c.id); } });
  });
  return ids;
}

function aLHeure(enreg, idPhase) {
  return !!enreg && typeof enreg.fin === 'number' && enreg.fin <= finPhaseMin(idPhase);
}

export function calculer(e = lire()) {
  let points = 0;
  champsRequis(e).forEach((id) => { if (long(e, id) >= SEUIL_CHAMP) { points += POINTS.champ; } });
  Object.values(e.qcm || {}).forEach((rec) => {
    if (!rec || !rec.premier) { return; }
    if (rec.premierJuste) { points += POINTS.qcmPremier; } else if (rec.juste) { points += POINTS.qcmEnsuite; }
  });
  BONUS.forEach((id) => { if (long(e, id) >= SEUIL_BONUS) { points += POINTS.bonus; } });
  const quetes = QUETES.map((q) => {
    const av = avancement(q, e);
    const enreg = e.quetes[q.id];
    const terminee = !!enreg;
    const ponctuelle = terminee && aLHeure(enreg, q.fin);
    if (ponctuelle && av.complet) { points += POINTS.queteALHeure; }
    return Object.assign({ def: q, terminee, ponctuelle }, av);
  });
  if (e.lu && e.lu.citer) { points += POINTS.lu; }
  if (e.lu && e.lu.correction) { points += POINTS.lu; }
  let niveau = NIVEAUX[0];
  NIVEAUX.forEach((n) => { if (points >= n.seuil) { niveau = n; } });
  const iNiv = NIVEAUX.indexOf(niveau);
  const prochain = NIVEAUX[iNiv + 1] || null;
  return { points, niveau, prochain, quetes };
}

function conditionsBadges(e, quetes) {
  const premierJuste = (id) => !!(e.qcm[id] && e.qcm[id].premierJuste);
  const etapesALHeure = ETAPES.every((et) => aLHeure(e.etapes[et.id], et.fin));
  return {
    detective: long(e, 'a3') >= 60,
    citation: ['C-Q1', 'C-Q2', 'C-Q4', 'C-Q5'].every(premierJuste),
    biblio: long(e, 'c2') >= 80,
    lynx: ['F-Q1', 'F-Q2', 'F-Q3'].every(premierJuste),
    temps: etapesALHeure,
    critique: BONUS.some((id) => long(e, id) >= SEUIL_BONUS),
    stratege: (e.conseils || []).length >= 3 && ((e.cases && e.cases.tips_vus) || []).length >= 3,
    fil: quetes.every((q) => q.terminee)
  };
}

// Enregistre les quêtes, étapes et badges nouvellement obtenus.
function enregistrerAccomplissements() {
  const e = lire();
  const nouveau = { quetes: [], badges: [] };
  const minute = Math.round(minuteDeSeance() * 10) / 10;
  QUETES.forEach((q) => {
    if (!e.quetes[q.id] && avancement(q, e).complet) { nouveau.quetes.push(q); }
  });
  const etapesNouvelles = ETAPES.filter((et) => !e.etapes[et.id] && avancement(et, e).complet);
  if (nouveau.quetes.length || etapesNouvelles.length) {
    modifierSansSignal((s) => {
      nouveau.quetes.forEach((q) => { s.quetes[q.id] = { fin: minute, le: Date.now() }; });
      etapesNouvelles.forEach((et) => { s.etapes[et.id] = { fin: minute, le: Date.now() }; });
    });
  }
  const res = calculer(lire());
  const cond = conditionsBadges(lire(), res.quetes);
  BADGES.forEach((b) => { if (cond[b.id] && !lire().badges[b.id]) { nouveau.badges.push(b); } });
  if (nouveau.badges.length) {
    modifierSansSignal((s) => { nouveau.badges.forEach((b) => { s.badges[b.id] = Date.now(); }); });
  }
  if (nouveau.quetes.length || nouveau.badges.length || etapesNouvelles.length) { enregistrerMaintenant(); }
  return nouveau;
}

// ---------------------------------------------------------------- rendu

export function echapper(t) {
  return String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function equipe(e = lire()) {
  const nom = (e.champs.equipe || '').trim();
  const ic = e.radios.icone && ICONES_EQUIPE[e.radios.icone] ? e.radios.icone : 'loupe';
  const n1 = (e.champs.nom1 || '').trim();
  const n2 = (e.champs.nom2 || '').trim();
  return { nom, icone: ic, n1, n2, defini: !!nom };
}

function svg(id, classe = '') {
  return '<svg class="' + classe + '" aria-hidden="true" focusable="false"><use href="' + icone(id) + '"></use></svg>';
}

function htmlPhrase(e, nouvelles = []) {
  const complete = QUETES.every((q) => !!e.quetes[q.id]);
  const morceaux = QUETES.map((q) => {
    if (e.quetes[q.id]) {
      const neuf = nouvelles.includes(q.id) ? ' nouveau' : '';
      return '<span class="morceau revele' + neuf + '">' + echapper(q.morceau) + '</span>';
    }
    const largeur = Math.max(3, q.morceau.length * 0.55);
    return '<span class="morceau cache" style="width:' + largeur + 'em"><span class="visuellement-cache">morceau à débloquer avec la quête ' + echapper(q.label) + '</span></span>';
  });
  return '<p class="phrase-mystere' + (complete ? ' complete' : '') + '">' + morceaux.join(' ') + '</p>';
}

function htmlAnneaux(res) {
  const C = 2 * Math.PI * 40;
  return '<div class="anneaux">' + res.quetes.map((q) => {
    const pc = Math.round(q.ratio * 100);
    return '<div class="anneau" data-c="' + q.def.id + '">'
      + '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="fond-anneau" cx="50" cy="50" r="40"/>'
      + '<circle class="trace" cx="50" cy="50" r="40" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + (C * (1 - q.ratio)).toFixed(2) + '"/></svg>'
      + '<span>' + q.def.label + '</span><span class="pc">' + pc + ' %</span></div>';
  }).join('') + '</div>';
}

function etatQuete(q) {
  if (q.terminee) { return q.ponctuelle ? 'Résolue dans les temps' : 'Résolue'; }
  if (q.faits > 0) { return 'En cours, ' + q.faits + ' sur ' + q.total; }
  return 'À venir';
}

function htmlQuetes(res, nouvelles = []) {
  return '<ol class="quetes">' + res.quetes.map((q) => {
    const tampon = q.terminee
      ? '<span class="tampon' + (nouvelles.includes(q.def.id) ? ' nouveau' : '') + '" aria-hidden="true">Résolue</span>'
      : '';
    return '<li class="quete" data-c="' + q.def.id + '" data-etat="' + (q.terminee ? 'terminee' : (q.faits ? 'en-cours' : 'a-venir')) + '">'
      + '<span class="numero" aria-hidden="true">' + q.def.numero + '</span>'
      + '<b>Quête ' + q.def.numero + ' · ' + q.def.label + '</b>'
      + '<span class="etat-quete">' + etatQuete(q) + '</span>' + tampon + '</li>';
  }).join('') + '</ol>';
}

function htmlBadges(e, nouveaux = []) {
  return '<ul class="badges">' + BADGES.map((b) => {
    const ok = !!e.badges[b.id];
    return '<li class="badge' + (nouveaux.includes(b.id) ? ' nouveau' : '') + '" data-obtenu="' + (ok ? 1 : 0) + '" title="' + echapper(b.critere) + '">'
      + '<span class="medaille">' + svg(b.icone) + '</span>' + echapper(b.nom)
      + '<span class="visuellement-cache">' + (ok ? ', obtenu. ' : ', pas encore obtenu. ') + echapper(b.critere) + '</span></li>';
  }).join('') + '</ul>';
}

export function htmlCarnet(options = {}) {
  const e = lire();
  const res = calculer(e);
  const eq = equipe(e);
  const nq = options.nouvellesQuetes || [];
  const nb = options.nouveauxBadges || [];
  const vers = res.prochain
    ? 'Encore ' + (res.prochain.seuil - res.points) + ' points pour le niveau ' + res.prochain.nom + '.'
    : 'Niveau maximal atteint.';
  const largeur = res.prochain
    ? Math.round(((res.points - res.niveau.seuil) / (res.prochain.seuil - res.niveau.seuil)) * 100)
    : 100;
  const noms = [eq.n1, eq.n2].filter(Boolean).map(echapper).join(' et ');
  return ''
    + '<div class="carnet-bloc equipe-carte">' + svg(eq.icone, 'icone-equipe')
    + '<div><b>' + (eq.defini ? echapper(eq.nom) : 'Équipe sans nom') + '</b><span>' + (noms || 'Noms à indiquer sur la page Cadre') + '</span></div></div>'
    + '<div class="carnet-bloc"><h3>Points d’expérience</h3><div class="score"><span class="valeur">' + res.points + '</span>'
    + '<span class="niveau">' + res.niveau.nom + '</span><span class="prochain">' + vers + '</span></div>'
    + '<div class="barre-niveau" aria-hidden="true"><span style="width:' + largeur + '%"></span></div>'
    + '<p class="mention-note">Les points ne sont pas une note. Ils suivent votre avancement, sans classement.</p></div>'
    + '<div class="carnet-bloc"><h3>Compétences</h3>' + htmlAnneaux(res) + '</div>'
    + '<div class="carnet-bloc"><h3>Quêtes</h3>' + htmlQuetes(res, nq) + '</div>'
    + '<div class="carnet-bloc deco"><h3>Badges</h3>' + htmlBadges(e, nb) + '</div>'
    + '<div class="carnet-bloc"><h3>Phrase mystère</h3>' + htmlPhrase(e, nq) + '</div>';
}

export function phraseComplete(e = lire()) { return QUETES.every((q) => !!e.quetes[q.id]); }
export function htmlPhraseSeule(e = lire()) { return htmlPhrase(e); }

// Carte des quêtes du hub : à venir, en cours, terminée.
export function htmlCarteQuetes() {
  const e = lire();
  const res = calculer(e);
  const s = statut();
  const idPhase = s.phase && !s.apres ? s.phase.id : null;
  return '<ol class="quetes">' + res.quetes.map((q) => {
    let etat = 'À venir';
    if (q.terminee) { etat = 'Terminée'; } else if (q.faits > 0 || (idPhase && q.def.phases.includes(idPhase))) { etat = 'En cours'; }
    return '<li class="quete" data-c="' + q.def.id + '" data-etat="' + (q.terminee ? 'terminee' : etat === 'En cours' ? 'en-cours' : 'a-venir') + '">'
      + '<span class="numero" aria-hidden="true">' + q.def.numero + '</span>'
      + '<b>Quête ' + q.def.numero + ' · ' + q.def.label + '</b><span class="etat-quete">' + etat + ', ' + q.faits + ' sur ' + q.total + '</span>'
      + (q.terminee ? '<span class="tampon" aria-hidden="true">Résolue</span>' : '') + '</li>';
  }).join('') + '</ol>';
}

// ---------------------------------------------------------------- animation des changements

let pointsAffiches = null;
const abonnes = [];
export function surMiseAJourJeu(cb) { abonnes.push(cb); }

function rafraichir(detail = {}) {
  const nouveau = enregistrerAccomplissements();
  const res = calculer(lire());
  const delta = pointsAffiches === null ? 0 : res.points - pointsAffiches;
  pointsAffiches = res.points;
  if (delta > 0 && !detail.externe && !detail.efface) { gain(delta, detail.ancre || document.querySelector('.pastille-equipe')); }
  nouveau.quetes.forEach((q) => {
    annoncer('Quête ' + q.label + ' résolue. Un morceau de la phrase mystère est débloqué.');
    confettis();
  });
  if (!sobre()) {
    nouveau.badges.forEach((b) => annoncer('Badge obtenu, ' + b.nom + '.'));
  }
  abonnes.forEach((cb) => cb({ res, nouvellesQuetes: nouveau.quetes.map((q) => q.id), nouveauxBadges: nouveau.badges.map((b) => b.id) }));
}

export function initJeu() {
  pointsAffiches = calculer(lire()).points;
  surChangement(rafraichir);
  // Premier passage : enregistre ce qui était déjà acquis, sans animation.
  const res = calculer(lire());
  enregistrerAccomplissements();
  abonnes.forEach((cb) => cb({ res: calculer(lire()), nouvellesQuetes: [], nouveauxBadges: [] }));
  pointsAffiches = calculer(lire()).points;
  return res;
}

export function rafraichirTypo(el) { typographier(el); }
