/**
 * La fabrique du social, séance 9 : réception des réponses des équipes.
 *
 * À coller dans un projet Apps Script lié à une feuille Google privée
 * (Extensions, Apps Script), puis à déployer comme « Application Web »
 * (exécuter en tant que : moi ; qui a accès : tout le monde).
 * Le mode d’emploi complet est dans le README du dépôt, section
 * « Voir les réponses en direct ».
 *
 * Deux réglages, ci-dessous :
 *  JETON           le même que dans docs/data/config.json. Ce n’est pas un secret.
 *  CLE_ENSEIGNANT  une clé que vous choisissez. Vous la taperez sur la page
 *                  « Réponses des équipes ». Ne la mettez jamais dans le dépôt GitHub.
 */
const JETON = 's09-124a1f0a2443c7c8';
const CLE_ENSEIGNANT = 'CHOISISSEZ_UNE_CLE';

const COLONNES = ['id', 'maj', 'equipe', 'noms', 'icone', 'page', 'phase', 'points', 'niveau', 'drapeau',
  'quetes', 'reponses', 'depots', 'depot_parcours', 'depot_video'];

function feuille_() {
  const classeur = SpreadsheetApp.getActive();
  let f = classeur.getSheetByName('Equipes');
  if (!f) {
    f = classeur.insertSheet('Equipes');
    f.appendRow(COLONNES);
    f.setFrozenRows(1);
  }
  return f;
}

// Une cellule qui commence par = + - ou @ serait lue comme une formule.
function cellule_(v) {
  if (v === undefined || v === null) { return ''; }
  if (typeof v === 'object') { v = JSON.stringify(v); }
  if (typeof v === 'string') {
    if (/^[=+\-@]/.test(v)) { v = "'" + v; }
    if (v.length > 49000) { v = v.slice(0, 49000) + ' […]'; }
  }
  return v;
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.action === 'horloge') {
      if (d.cle !== CLE_ENSEIGNANT) { return sortie_({ ok: false, erreur: 'cle' }); }
      const depart = /^\d{2}:\d{2}$/.test(String(d.depart || '')) ? d.depart : '';
      PropertiesService.getScriptProperties().setProperty('depart', depart);
      return sortie_({ ok: true, depart: depart });
    }
    if (d.jeton !== JETON || !d.id) { return sortie_({ ok: false, erreur: 'jeton' }); }
    const verrou = LockService.getScriptLock();
    verrou.waitLock(15000);
    try {
      const f = feuille_();
      const ligne = COLONNES.map(function (c) { return cellule_(d[c]); });
      const nbLignes = Math.max(f.getLastRow() - 1, 0);
      const ids = nbLignes ? f.getRange(2, 1, nbLignes, 1).getValues().map(function (r) { return r[0]; }) : [];
      const i = ids.indexOf(d.id);
      if (i >= 0) {
        const plage = f.getRange(i + 2, 1, 1, COLONNES.length);
        const ancienne = plage.getValues()[0];
        // Un envoi sans récapitulatif ne doit pas effacer un dépôt déjà reçu.
        ligne.forEach(function (v, k) { if (v === '' && ancienne[k] !== '') { ligne[k] = ancienne[k]; } });
        plage.setValues([ligne]);
      } else {
        f.appendRow(ligne);
      }
    } finally {
      verrou.releaseLock();
    }
    return sortie_({ ok: true });
  } catch (err) {
    return sortie_({ ok: false, erreur: String(err) });
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'horloge') {
    return sortie_({ ok: true, depart: PropertiesService.getScriptProperties().getProperty('depart') || '' });
  }
  if (p.action === 'lire') {
    if (p.cle !== CLE_ENSEIGNANT) { return sortie_({ ok: false, erreur: 'cle' }); }
    const valeurs = feuille_().getDataRange().getValues();
    const entetes = valeurs.shift();
    const equipes = valeurs.filter(function (r) { return r[0]; }).map(function (r) {
      const o = {};
      entetes.forEach(function (h, k) { o[h] = r[k]; });
      return o;
    });
    return sortie_({ ok: true, equipes: equipes, maintenant: new Date().toISOString(),
      depart: PropertiesService.getScriptProperties().getProperty('depart') || '' });
  }
  return sortie_({ ok: false, erreur: 'action' });
}

function sortie_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
