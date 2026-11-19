// Point d’entrée chargé par toutes les pages du site.
// Chaque page indique son identifiant dans <body data-page="…"> et son
// espace dans <body data-espace="seance|prof|site">.

import { charger, surChangement } from './state.js';
import { initHorloge } from './clock.js';
import { initNav, appliquerOptions } from './nav.js';
import { typographier } from './typo.js';
import { initChamps } from './champs.js';
import { initQCM } from './qcm.js';
import { initJeu } from './gamify.js';
import { initRecap } from './recap.js';
import { initWidgets } from './widgets.js';
import { initCollecte } from './collect.js';
import { initIndices } from './indices.js';

async function demarrer() {
  const corps = document.body;
  const page = corps.dataset.page || '';
  const espace = corps.dataset.espace || 'seance';
  charger();
  appliquerOptions();
  // Les champs et les QCM sont branchés tout de suite : une saisie faite
  // pendant le chargement des données n’est jamais perdue.
  initChamps();
  initQCM();
  await initHorloge(espace === 'seance' ? page : null);
  typographier(document.body);
  initJeu();
  initNav(page, { espace });
  initWidgets();
  initIndices();
  initRecap();
  await initCollecte(espace, surChangement);
  document.documentElement.classList.add('js-pret');
  window.dispatchEvent(new CustomEvent('fabrique:pret'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', demarrer);
} else {
  demarrer();
}
