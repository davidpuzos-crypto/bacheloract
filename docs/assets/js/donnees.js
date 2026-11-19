// Chemins du site et chargement des fichiers de données (docs/data/).
// Tous les chemins sont relatifs à l’emplacement de ce module, pour que le site
// fonctionne aussi sous /<nom-du-depot>/ sur GitHub Pages.

export const RACINE = new URL('../../', import.meta.url);
export const SEANCE = new URL('seance-09/', RACINE);

export function url(chemin) {
  return new URL(chemin, RACINE).href;
}
export function urlSeance(page) {
  return new URL(page, SEANCE).href;
}
export function icone(id) {
  return url('assets/img/icones.svg') + '#' + id;
}

// Copie de secours du déroulé (annexe E), utilisée seulement si
// docs/data/schedule.json ne peut pas être lu. La source reste le fichier JSON.
const PROGRAMME_SECOURS = {
  departParDefaut: '09:00',
  gracePointArretSecondes: 60,
  phases: [
    { id: 'cadre', label: 'Cadre', debut: 0, duree: 3, page: '1-cadre.html' },
    { id: 'methode', label: 'Méthode', debut: 3, duree: 5, page: '2-methode.html', reperes: [[2, 'M1']] },
    { id: 'chercher', label: 'Chercher', debut: 8, duree: 14, page: '3-chercher.html', stop: true, stopTexte: 'Stop. Trouvée ou pas, votre seconde définition suffit pour la suite. Nous lisons maintenant les bonnes façons de citer.', stopBouton: 'Passer à la lecture', reperes: [[0, 'a1'], [3, 'a2'], [6, 'A3'], [7, 'b1']] },
    { id: 'citer-lecture', label: 'Lecture, bien citer', debut: 22, duree: 4, page: '4-citer-lecture.html' },
    { id: 'citer-pratique', label: 'Citer, pratique', debut: 26, duree: 9, page: '5-citer-pratique.html', stop: true, stopTexte: 'Stop. Place à la correction de vos définitions. Un clic envoie vos réponses et l’affiche.', stopBouton: 'Ouvrir la correction', reperes: [[0, 'C-Q1'], [2, 'c1'], [5, 'c3']] },
    { id: 'correction-definir', label: 'Correction, définir et citer', debut: 35, duree: 5, page: '5b-correction-definir.html', stop: true, stopTexte: 'Stop. Place à l’étude de l’Insee. Lisez-la attentivement avant la pause, les questions vous guident dans le texte.', stopBouton: 'Ouvrir l’étude' },
    { id: 'lire', label: 'Lire l’étude', debut: 40, duree: 22, page: '6-lire.html', stop: true, stopTexte: 'Stop. C’est la pause, jusqu’à {reprise}. Vos réponses sont enregistrées.', stopBouton: 'Voir la pause', reperes: [[0, 'L-Q1'], [3, 'R1'], [7, 'F-Q1'], [11, 'R2'], [14, 'R3'], [18, 'R4']] },
    { id: 'pause', label: 'Pause', debut: 62, duree: 30, page: 'pause.html', stop: true, stopMot: 'Reprise', stopTexte: 'Analysez maintenant l’étude de l’Insee, question par question.', stopBouton: 'Analyser l’étude' },
    { id: 'analyser', label: 'Analyser l’étude', debut: 92, duree: 27, page: '6-lire.html#analyser', reperes: [[0, 'l1'], [5, 'l2'], [8, 'l3'], [11, 'l4'], [14, 'l5'], [20, 'l6']] },
    { id: 'depot', label: 'Dépôt', debut: 119, duree: 2, page: '6-lire.html#depot', stop: true, stopTexte: 'Stop. Le dépôt est terminé. Place à la correction de l’étude.', stopBouton: 'Ouvrir la correction' },
    { id: 'correction', label: 'Correction de l’étude', debut: 121, duree: 8, page: '7-correction.html' },
    { id: 'notes', label: 'Conseils de prise de notes', debut: 129, duree: 4, page: '8-notes.html', stop: true, stopMot: 'Vidéo', stopTexte: 'La vidéo commence. Chacun·e prend ses notes à sa façon, sur une feuille ou sur son ordinateur, avec les conseils choisis.', stopBouton: 'Passer à la vidéo' },
    { id: 'video', label: 'Vidéo', debut: 133, duree: 25, page: '9-video.html#pendant', stop: true, stopTexte: 'La vidéo est terminée. Relisez vos notes, puis comparez-les en équipe.', stopBouton: 'Passer à la comparaison' },
    { id: 'froid', label: 'Comparer vos notes', debut: 158, duree: 8, page: '9-video.html#comparer', stop: true, stopTexte: 'Stop. Place au QCM, à faire en équipe.', stopBouton: 'Aller au QCM' },
    { id: 'questions', label: 'QCM sur la vidéo', debut: 166, duree: 4, page: '9-video.html#questions', stop: true, stopMot: 'Ouverture', stopTexte: 'Dernière étape, dix minutes de lecture pour aller plus loin que le genre.', stopBouton: 'Ouvrir la page', reperes: [[0, 'V4']] },
    { id: 'ouverture', label: 'Pour aller plus loin', debut: 170, duree: 10, page: 'aller-plus-loin.html', stop: true, stopMot: 'Fin', stopTexte: 'La séance est terminée. Merci pour votre travail.', stopBouton: 'Voir le bilan' },
    { id: 'fin', label: 'Fin', debut: 180, duree: 0, page: '10-fin.html' }
  ]
};

const CONFIG_SECOURS = { liens: {}, collecte: { actif: false }, options: { afficherPourcentages: false, codeQR: true } };

let promesseProgramme = null;
let promesseConfig = null;

async function lireJSON(chemin, secours) {
  try {
    const rep = await fetch(url(chemin), { cache: 'no-cache' });
    if (!rep.ok) { return secours; }
    return await rep.json();
  } catch (e) {
    return secours;
  }
}

export function programme() {
  if (!promesseProgramme) { promesseProgramme = lireJSON('data/schedule.json', PROGRAMME_SECOURS); }
  return promesseProgramme;
}

// Relit le déroulé sans cache (null en cas d’échec : on garde l’ancien).
export async function rechargerProgramme() {
  const p = await lireJSON('data/schedule.json', null);
  if (p && Array.isArray(p.phases)) { promesseProgramme = Promise.resolve(p); return p; }
  return null;
}

export function config() {
  if (!promesseConfig) { promesseConfig = lireJSON('data/config.json', CONFIG_SECOURS); }
  return promesseConfig;
}

// Nom de fichier de la page courante (« 3-chercher.html »), « index.html » par défaut.
export function fichierCourant() {
  const morceaux = window.location.pathname.split('/');
  const dernier = morceaux[morceaux.length - 1];
  return dernier && dernier.includes('.') ? decodeURIComponent(dernier) : 'index.html';
}
