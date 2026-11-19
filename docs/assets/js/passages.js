// Correction de l’étude de l’Insee : « Voir le passage » surligne, dans
// l’extrait affiché à côté des questions, le passage du document qui
// justifie la réponse, et le fait défiler jusqu’à lui.

import { typographier } from './typo.js';

export function initPassages() {
  const boutons = [...document.querySelectorAll('[data-voir-passage]')];
  const doc = document.querySelector('[data-doc-passages]');
  if (!boutons.length || !doc) { return; }
  const annonce = document.querySelector('[data-annonce-passage]');
  const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  boutons.forEach((b) => {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      doc.querySelectorAll('.passage-surligne').forEach((z) => z.classList.remove('passage-surligne'));
      const zones = b.dataset.voirPassage.split(',')
        .map((z) => doc.querySelector('[data-z="' + z.trim() + '"]'))
        .filter(Boolean);
      zones.forEach((z) => z.classList.add('passage-surligne'));
      boutons.forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      if (annonce) {
        annonce.textContent = 'Passage de ' + (b.dataset.question || 'la question') + ' surligné dans l’étude.';
        typographier(annonce);
      }
      const premier = zones[0];
      if (!premier) { return; }
      const defile = doc.scrollHeight > doc.clientHeight + 1 && getComputedStyle(doc).overflowY !== 'visible';
      if (defile) {
        const haut = premier.getBoundingClientRect().top - doc.getBoundingClientRect().top + doc.scrollTop - 60;
        doc.scrollTo({ top: Math.max(0, haut), behavior: doux ? 'smooth' : 'auto' });
      } else {
        premier.scrollIntoView({ block: 'center', behavior: doux ? 'smooth' : 'auto' });
      }
    });
  });
}
