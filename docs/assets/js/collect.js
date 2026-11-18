// Collecte automatique, optionnelle et désactivée par défaut.
// Si l’enseignant l’active dans data/config.json, le dépôt envoie aussi un
// JSON vers un script Google Apps Script qui ajoute une ligne dans une feuille
// privée. Le jeton n’est pas un secret : il est lisible dans le code du site.

import { config } from './donnees.js';

export async function collecteActive() {
  const c = await config();
  return !!(c.collecte && c.collecte.actif && c.collecte.endpoint);
}

// Envoie le dépôt. La réponse d’Apps Script est opaque (mode no-cors) :
// on ne peut affirmer qu’une chose, la requête est partie.
export async function envoyer(donnees) {
  const c = await config();
  if (!c.collecte || !c.collecte.actif || !c.collecte.endpoint) { return { ok: false, raison: 'inactive' }; }
  const corps = JSON.stringify(Object.assign({ jeton: c.collecte.jeton || '' }, donnees));
  try {
    await fetch(c.collecte.endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: corps
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, raison: 'reseau' };
  }
}
