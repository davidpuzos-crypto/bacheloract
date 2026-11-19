// Écran de projection de l’enseignant : grande horloge, phase en cours, temps
// restant, phase suivante, déroulé et code QR.

import { statut, surTic, phases, heureMinute, formatCompte, formatHeure, heureDepartTexte } from './clock.js';
import { lire } from './state.js';
import { config, url } from './donnees.js';
import { typographier } from './typo.js';
import { echapper } from './gamify.js';
import qrcode from './vendor/qrcode.mjs';

function adresseEtudiants(c) {
  const base = (c.options && c.options.adresseSite) ? c.options.adresseSite.replace(/\/?$/, '/') : url('');
  const cible = new URL('seance-09/index.html', base);
  const h = lire().options.horloge || {};
  if (h.depart && h.depart !== '09:00') { cible.searchParams.set('depart', h.depart); }
  if (h.decalage) { cible.searchParams.set('decalage', String(h.decalage)); }
  return cible.href;
}

function dessinerQR(conteneur, texte) {
  const qr = qrcode(0, 'M');
  qr.addData(texte);
  qr.make();
  conteneur.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true, title: 'Code QR de l’adresse de la séance' });
}

function rendreListe(liste, s) {
  liste.innerHTML = phases().map((p, i) => {
    const enCours = !s.avant && !s.apres && s.index === i;
    const passee = !s.avant && (s.apres || i < s.index);
    return '<li class="' + (enCours ? 'en-cours' : passee ? 'passee' : '') + '"><span class="h">' + heureMinute(p.debut) + '</span><span>'
      + echapper(p.id === 'fin' ? 'Fin' : p.label) + '</span><span class="arret">' + (p.stop ? 'stop ' + heureMinute(p.debut + p.duree) : '') + '</span></li>';
  }).join('');
  typographier(liste);
}

async function demarrer() {
  if (!document.querySelector('[data-proj-horloge]')) { return; }
  await new Promise((r) => {
    if (document.documentElement.classList.contains('js-pret')) { r(); } else { window.addEventListener('fabrique:pret', r, { once: true }); }
  });
  const c = await config();
  const horloge = document.querySelector('[data-proj-horloge]');
  const nom = document.querySelector('[data-proj-phase]');
  const reste = document.querySelector('[data-proj-reste]');
  const suivante = document.querySelector('[data-proj-suivante]');
  const barre = document.querySelector('[data-proj-progres] span');
  const liste = document.querySelector('[data-proj-liste]');
  const boiteStop = document.querySelector('[data-proj-stop]');
  const texteStop = document.querySelector('[data-proj-stop-texte]');
  const depart = document.querySelector('[data-proj-depart]');
  let dernierIndex = null;

  function rendre(s) {
    const d = new Date(s.t);
    horloge.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
    if (s.avant) {
      nom.textContent = 'La séance commence à ' + heureMinute(0);
      reste.textContent = 'Dans ' + formatCompte(s.resteMs);
      suivante.textContent = '';
    } else if (s.apres) {
      nom.textContent = 'Séance terminée';
      reste.textContent = '';
      suivante.textContent = 'Pensez au dépôt express.';
    } else {
      nom.textContent = s.phase.label;
      reste.textContent = 'Reste ' + formatCompte(s.resteMs);
      suivante.textContent = s.suivante ? 'Ensuite, ' + (s.suivante.id === 'fin' ? 'fin de la séance' : s.suivante.label) + ' à ' + heureMinute(s.suivante.debut) : '';
    }
    barre.style.width = Math.round(s.progression * 100) + '%';
    const recent = s.arret && s.arret.depuisMs < 5 * 60000;
    if (recent) {
      const pause = phases().find((p) => p.id === 'pause');
      texteStop.textContent = String(s.arret.phase.stopTexte || 'Stop.').replace('{reprise}', pause ? heureMinute(pause.debut + pause.duree) : '');
      const mot = boiteStop.querySelector('.stop-mot');
      if (mot) { mot.textContent = s.arret.phase.stopMot || 'Stop'; }
      boiteStop.hidden = false;
    } else {
      boiteStop.hidden = true;
    }
    if (dernierIndex !== s.index + (s.avant ? 'a' : '') + (s.apres ? 'p' : '')) {
      dernierIndex = s.index + (s.avant ? 'a' : '') + (s.apres ? 'p' : '');
      rendreListe(liste, s);
    }
    typographier(nom);
    typographier(suivante);
    typographier(texteStop);
  }
  let texteDepart = '';
  const majDepart = () => {
    if (!depart) { return; }
    const t = heureDepartTexte().replace(':', ' h ') + (lire().options.horloge.decalage ? ', décalage de ' + lire().options.horloge.decalage + ' min' : '');
    if (t !== texteDepart) { texteDepart = t; depart.textContent = t; typographier(depart); }
  };
  majDepart();
  rendre(statut());
  surTic((s) => { rendre(s); majDepart(); });

  // Code QR (option codeQR de config.json)
  const zoneQR = document.querySelector('[data-qr]');
  if (zoneQR) {
    const actif = !c.options || c.options.codeQR !== false;
    zoneQR.closest('.proj-boite').hidden = !actif;
    if (actif) {
      const adresse = adresseEtudiants(c);
      dessinerQR(zoneQR, adresse);
      document.querySelector('[data-adresse]').textContent = adresse;
    }
  }
  document.querySelectorAll('[data-heure-courante]').forEach((el) => { el.textContent = formatHeure(statut().t); });
}

demarrer();
