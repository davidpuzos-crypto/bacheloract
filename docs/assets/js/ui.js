// Petits effets d’interface partagés : messages éphémères, gains de points,
// confettis. Tout effet visuel est coupé en mode sobre ou si l’appareil
// demande moins d’animations (prefers-reduced-motion). Aucun son.

import { lire } from './state.js';

export function mouvementReduit() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export function sobre() { return !!lire().options.sobre; }
function effetsPermis() { return !sobre() && !mouvementReduit(); }

let zone = null;
function zoneAnnonces() {
  if (zone && document.body.contains(zone)) { return zone; }
  zone = document.createElement('div');
  zone.className = 'annonces';
  zone.setAttribute('role', 'status');
  zone.setAttribute('aria-live', 'polite');
  document.body.append(zone);
  return zone;
}

export function annoncer(texte, duree = 4200) {
  const el = document.createElement('div');
  el.className = 'annonce';
  el.textContent = texte;
  zoneAnnonces().append(el);
  setTimeout(() => el.remove(), duree);
}

export function gain(n, ancre) {
  if (!n || n <= 0 || !effetsPermis()) { return; }
  let x = window.innerWidth - 120;
  let y = 70;
  if (ancre && ancre.getBoundingClientRect) {
    const r = ancre.getBoundingClientRect();
    if (r.width || r.height) { x = r.left + Math.min(r.width, 260) - 10; y = r.top + 8; }
  }
  const el = document.createElement('span');
  el.className = 'gain';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = '+' + n;
  el.style.left = Math.max(8, Math.min(window.innerWidth - 60, x)) + 'px';
  el.style.top = Math.max(8, y) + 'px';
  document.body.append(el);
  setTimeout(() => el.remove(), 1000);
}

export function confettis() {
  if (!effetsPermis()) { return; }
  const c = document.createElement('canvas');
  c.className = 'confettis';
  c.setAttribute('aria-hidden', 'true');
  const ratio = window.devicePixelRatio || 1;
  c.width = window.innerWidth * ratio;
  c.height = window.innerHeight * ratio;
  document.body.append(c);
  const ctx = c.getContext('2d');
  const style = getComputedStyle(document.documentElement);
  const couleurs = ['--c-definir', '--c-citer', '--c-lire', '--c-noter'].map((v) => style.getPropertyValue(v).trim() || '#f08a3c');
  const morceaux = Array.from({ length: 80 }, () => ({
    x: c.width * (0.3 + Math.random() * 0.4),
    y: c.height * 0.35,
    vx: (Math.random() - 0.5) * 18 * ratio,
    vy: (-Math.random() * 14 - 6) * ratio,
    r: (3 + Math.random() * 4) * ratio,
    a: Math.random() * Math.PI,
    c: couleurs[Math.floor(Math.random() * couleurs.length)]
  }));
  const debut = performance.now();
  function image(t) {
    const ecoule = t - debut;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const m of morceaux) {
      m.vy += 0.9 * ratio;
      m.x += m.vx;
      m.y += m.vy;
      m.a += 0.2;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - ecoule / 900);
      ctx.translate(m.x, m.y);
      ctx.rotate(m.a);
      ctx.fillStyle = m.c;
      ctx.fillRect(-m.r, -m.r / 2, m.r * 2, m.r);
      ctx.restore();
    }
    if (ecoule < 900) { requestAnimationFrame(image); } else { c.remove(); }
  }
  requestAnimationFrame(image);
}
