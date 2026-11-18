// État unique du site, partagé par toutes les pages (même origine).
// Tout reste dans le navigateur (localStorage). Rien n’est envoyé, sauf si la
// collecte optionnelle est activée par l’enseignant (collect.js).

export const CLE = 'fabrique:s09:v1';
const DELAI_ECRITURE = 350;

function etatVide() {
  return {
    v: 1,
    champs: {},       // textes saisis, par identifiant (a1, c2, nom1…)
    radios: {},       // choix uniques (b0, usage, icone…)
    cases: {},        // cases à cocher, par groupe (tips_vus)
    qcm: {},          // { M1: { premier, dernier, essais, juste } }
    temps: {},        // secondes passées par page
    lu: {},           // { citer: horodatage, correction: horodatage }
    conseils: [],     // conseils choisis (tips_choisis)
    quetes: {},       // { definir: { fin: minute de séance } }
    etapes: {},       // étapes d’écriture terminées (badge « Dans les temps »)
    badges: {},       // badges obtenus, avec horodatage
    arrets: {},       // points d’arrêt déjà vus
    depots: {},       // { parcours: { le, via }, video: {…} }
    drapeau: 'ok',
    options: { sobre: false, theme: 'auto', horloge: {} },
    cree: Date.now(),
    maj: null
  };
}

function fusion(base, sauve) {
  const sortie = Object.assign(base, sauve || {});
  const vide = etatVide();
  for (const k of Object.keys(vide)) {
    if (sortie[k] === undefined || sortie[k] === null) { sortie[k] = vide[k]; }
  }
  sortie.options = Object.assign(vide.options, sortie.options || {});
  sortie.options.horloge = sortie.options.horloge || {};
  if (!Array.isArray(sortie.conseils)) { sortie.conseils = []; }
  return sortie;
}

let etat = etatVide();
let base = JSON.stringify(etat); // dernier état lu ou écrit par cette page
let stockageOK = true;
let minuteur = null;
const bus = new EventTarget();

// Clés dont les entrées sont fusionnées une à une.
const DICTIONNAIRES = new Set(['champs', 'radios', 'cases', 'qcm', 'temps', 'lu', 'quetes', 'etapes', 'badges', 'arrets', 'depots', 'options']);

function json(v) { return JSON.stringify(v === undefined ? null : v); }

// Fusion à trois voies : on part de l’état enregistré (« distant », écrit
// éventuellement par une autre page ouverte) et on n’y applique que ce que
// cette page a modifié depuis sa dernière lecture (« base »). Aucune page ne
// peut ainsi effacer la saisie faite dans une autre.
function fusionner(baseObj, local, distant) {
  const sortie = JSON.parse(JSON.stringify(distant));
  const cles = new Set([...Object.keys(local), ...Object.keys(baseObj || {})]);
  for (const k of cles) {
    const vl = local[k];
    const vb = baseObj ? baseObj[k] : undefined;
    if (DICTIONNAIRES.has(k) && vl && typeof vl === 'object' && !Array.isArray(vl)) {
      const b = vb && typeof vb === 'object' ? vb : {};
      const d = Object.assign({}, sortie[k] || {});
      for (const c of new Set([...Object.keys(vl), ...Object.keys(b)])) {
        if (json(vl[c]) !== json(b[c])) {
          if (vl[c] === undefined) { delete d[c]; } else { d[c] = vl[c]; }
        }
      }
      sortie[k] = d;
    } else if (json(vl) !== json(vb)) {
      sortie[k] = vl;
    }
  }
  return fusion(etatVide(), sortie);
}

function testerStockage() {
  try {
    const t = '__fabrique_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return true;
  } catch (e) {
    return false;
  }
}

export function charger() {
  stockageOK = testerStockage();
  if (!stockageOK) { etat = etatVide(); return etat; }
  try {
    const brut = window.localStorage.getItem(CLE);
    etat = brut ? fusion(etatVide(), JSON.parse(brut)) : etatVide();
  } catch (e) {
    etat = etatVide();
  }
  base = JSON.stringify(etat);
  return etat;
}

export function lire() { return etat; }
export function stockageDisponible() { return stockageOK; }

export function enregistrerMaintenant(forcer = false) {
  clearTimeout(minuteur);
  minuteur = null;
  if (!stockageOK) { return false; }
  try {
    if (forcer !== true) {
      let distant = null;
      try {
        const brut = window.localStorage.getItem(CLE);
        distant = brut ? fusion(etatVide(), JSON.parse(brut)) : null;
      } catch (e) { distant = null; }
      if (distant) { etat = fusionner(JSON.parse(base), etat, distant); }
    }
    etat.maj = Date.now();
    const texte = JSON.stringify(etat);
    window.localStorage.setItem(CLE, texte);
    base = texte;
    bus.dispatchEvent(new CustomEvent('enregistre', { detail: { le: etat.maj } }));
    return true;
  } catch (e) {
    stockageOK = false;
    bus.dispatchEvent(new CustomEvent('stockage-indisponible'));
    return false;
  }
}

function planifier() {
  clearTimeout(minuteur);
  minuteur = setTimeout(enregistrerMaintenant, DELAI_ECRITURE);
}

// Modifie l’état, planifie l’écriture et prévient les modules abonnés.
export function modifier(fn, detail = {}) {
  fn(etat);
  planifier();
  bus.dispatchEvent(new CustomEvent('change', { detail }));
}

// Modification silencieuse (temps passé, par exemple) : pas d’évènement.
export function modifierSansSignal(fn) {
  fn(etat);
  planifier();
}

export function surChangement(cb) {
  bus.addEventListener('change', (e) => cb(e.detail || {}));
}
export function surEnregistrement(cb) {
  bus.addEventListener('enregistre', (e) => cb(e.detail || {}));
}
export function surStockageIndisponible(cb) {
  bus.addEventListener('stockage-indisponible', cb);
}

export function exporterJSON() {
  return JSON.stringify(etat, null, 2);
}

// Remise à zéro des réponses. Les réglages d’affichage et d’horloge sont gardés.
export function effacer() {
  const options = etat.options;
  etat = etatVide();
  etat.options = options;
  enregistrerMaintenant(true);
  bus.dispatchEvent(new CustomEvent('change', { detail: { efface: true } }));
}

// Écriture immédiate à la fermeture ou quand l’onglet change de visibilité.
window.addEventListener('pagehide', () => { enregistrerMaintenant(); });
document.addEventListener('visibilitychange', () => { enregistrerMaintenant(); });

// Un autre onglet du site a modifié l’état : on le relit.
window.addEventListener('storage', (e) => {
  if (e.key !== CLE || !e.newValue) { return; }
  try {
    const distant = fusion(etatVide(), JSON.parse(e.newValue));
    etat = fusionner(JSON.parse(base), etat, distant);
    base = e.newValue;
    bus.dispatchEvent(new CustomEvent('change', { detail: { externe: true } }));
  } catch (err) { /* contenu illisible, on garde l’état courant */ }
});
