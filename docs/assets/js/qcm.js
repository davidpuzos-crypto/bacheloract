// Questions à choix multiple : retour immédiat, réponse modifiable,
// première réponse, dernière réponse et nombre d’essais enregistrés.
// Le texte des retours est dans le HTML de chaque page (blocs [data-fb]).

import { lire, modifier } from './state.js';
import { typographier } from './typo.js';

const ecouteurs = [];
export function surReponseQCM(cb) { ecouteurs.push(cb); }

function afficherRetour(fs, valeur) {
  const fb = fs.querySelector('.fb');
  const source = fs.querySelector('[data-fb="' + valeur + '"]');
  const juste = valeur === fs.dataset.correct;
  fb.hidden = false;
  fb.className = 'fb ' + (juste ? 'ok' : 'ko');
  fb.innerHTML = '';
  const verdict = document.createElement('span');
  verdict.className = 'verdict';
  verdict.textContent = juste ? 'Bonne réponse.' : 'Pas tout à fait.';
  fb.append(verdict, ' ');
  if (source) {
    const texte = document.createElement('span');
    texte.innerHTML = source.innerHTML;
    fb.append(texte);
  }
  if (!juste) {
    const suite = document.createElement('span');
    suite.textContent = ' Vous pouvez choisir une autre réponse.';
    fb.append(suite);
  }
  typographier(fb);
}

function restaurer(fs) {
  const rec = lire().qcm[fs.dataset.qcm];
  fs.querySelectorAll('input[type="radio"]').forEach((r) => { r.checked = !!rec && r.value === rec.dernier; });
  const fb = fs.querySelector('.fb');
  if (rec && rec.dernier) { afficherRetour(fs, rec.dernier); } else if (fb) { fb.hidden = true; }
}

export function initQCM(racine = document) {
  const blocs = [...racine.querySelectorAll('fieldset.qcm[data-qcm]')];
  blocs.forEach((fs) => {
    restaurer(fs);
    fs.addEventListener('change', (e) => {
      const r = e.target;
      if (!r || r.type !== 'radio') { return; }
      const id = fs.dataset.qcm;
      const juste = r.value === fs.dataset.correct;
      let premier = false;
      afficherRetour(fs, r.value);
      modifier((etat) => {
        const rec = etat.qcm[id] || { premier: null, dernier: null, essais: 0, juste: false };
        if (!rec.premier) { rec.premier = r.value; rec.premierJuste = juste; premier = true; }
        rec.dernier = r.value;
        rec.essais += 1;
        if (juste) { rec.juste = true; }
        etat.qcm[id] = rec;
      }, { source: 'qcm', id, ancre: fs.querySelector('.fb') });
      ecouteurs.forEach((cb) => cb({ id, juste, premier, element: fs }));
    });
  });
  return blocs;
}

export function rafraichirQCM(racine = document) {
  racine.querySelectorAll('fieldset.qcm[data-qcm]').forEach(restaurer);
}

// Bilan d’un ensemble de QCM, pour le récapitulatif.
export function ligneQCM(id, libelle, bonne) {
  const rec = lire().qcm[id];
  if (!rec) { return libelle + '. pas de réponse'; }
  const premierJuste = rec.premier === bonne;
  const dernierJuste = rec.dernier === bonne;
  return libelle + '. première réponse ' + String(rec.premier).toUpperCase() + (premierJuste ? ' (juste)' : ' (fausse)')
    + ', réponse finale ' + String(rec.dernier).toUpperCase() + (dernierJuste ? ' (juste)' : ' (fausse)')
    + ', ' + rec.essais + (rec.essais > 1 ? ' essais' : ' essai');
}
