// Budgets de temps : pour chaque phase, mots à lire, champs, QCM et durée
// estimée, comparés à la durée de la phase (section 5 du cahier des charges).
// Hypothèses : lecture à 200 mots par minute, 30 secondes par QCM,
// 1 minute par champ court, 2 à 3 minutes par champ de rédaction.
// Usage : node scripts/budget.mjs   (écrit docs-internes/budget-temps.md)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RACINE, DOCS, PRIVE, lire, mots, texte, texteDeLecture } from './lib/pages.mjs';

const MOTS_MINUTE = 200;
const QCM_MIN = 0.5;

// Durées des champs, en minutes. À défaut, la durée dépend de la taille du champ.
const DUREES = {
  equipe: 0.3, icone: 0.2, nom1: 0.3, nom2: 0.3,
  a1: 1, a2: 2, a3: 3, b0: 0.3, b1: 2, b2: 2, b4: 2,
  c1: 2.5, c2: 3, c3: 3,
  l1: 2.5, l2: 1, l3: 1, l4: 1.5, l5: 2.5, l6: 2.5,
  usage: 0.3,
  n3: 2, bp: 2, s1: 2.5, g1: 3
};

const PHASES = [
  { id: 'cadre', titre: 'Cadre', fichier: 'docs/seance-09/1-cadre.html', minutes: 3, maxMots: 250 },
  { id: 'methode', titre: 'Méthode', fichier: 'docs/seance-09/2-methode.html', minutes: 7, maxMots: 650, notes: true },
  { id: 'chercher', titre: 'Chercher', fichier: 'docs/seance-09/3-chercher.html', minutes: 25, maxMots: 350,
    extras: [['Lecture des sources sur les sites externes (entrée de Géoconfluences, seconde source)', 9]] },
  { id: 'citer-lecture', titre: 'Citer, lecture', fichier: 'docs/seance-09/4-citer-lecture.html', minutes: 10, maxMots: 900 },
  { id: 'citer-pratique', titre: 'Citer, pratique', fichier: 'docs/seance-09/5-citer-pratique.html', minutes: 20, maxMots: 120,
    extras: [['Consultation du guide APA et de vos deux sources', 3]] },
  { id: 'lire', titre: 'Lire', fichier: 'docs/seance-09/6-lire.html', exclure: '#depot', minutes: 22, maxMots: 260,
    extrait: '.citation-insee', maxExtrait: 1000 },
  { id: 'depot', titre: 'Dépôt', fichier: 'docs/seance-09/6-lire.html', section: '#depot', minutes: 3,
    extras: [['Copier ou télécharger le récapitulatif, puis le déposer sur Moodle', 1.5]] },
  { id: 'correction', titre: 'Correction', fichier: 'private/seance-09/7-correction.html', minutes: 10, maxMots: 900 },
  { id: 'notes', titre: 'Conseils de prise de notes', fichier: 'docs/seance-09/8-notes.html', minutes: 10, maxMots: 500,
    extras: [['Choix de trois conseils parmi les huit', 1]] },
  { id: 'video', titre: 'Vidéo, pendant', fichier: 'docs/seance-09/9-video.html', section: '#pendant', minutes: 25,
    extras: [['Projection de la vidéo, prise de notes en même temps', 25]], horsBudgetLecture: true },
  { id: 'froid', titre: 'Vidéo, à froid et comparer', fichier: 'docs/seance-09/9-video.html', section: '#comparer', minutes: 5, maxMots: 150,
    cases: 8 },
  { id: 'questions', titre: 'Vidéo, questions', fichier: 'docs/seance-09/9-video.html', section: '#questions', minutes: 10, maxMots: 100,
    extras: [['Dépôt express (copier ou télécharger, déposer)', 1]] }
];

function dureeChamp(bloc) {
  const id = bloc.getAttribute('data-q');
  if (DUREES[id] !== undefined) { return DUREES[id]; }
  const ta = bloc.querySelector('textarea');
  if (ta) {
    const rows = Number(ta.getAttribute('rows') || 3);
    return rows <= 3 ? 1 : rows <= 5 ? 2 : 3;
  }
  return 0.3;
}

function arrondi(n) { return Math.round(n * 10) / 10; }

export function calculerBudgets() {
  const resultats = [];
  for (const ph of PHASES) {
    const chemin = path.join(RACINE, ph.fichier);
    if (!fs.existsSync(chemin)) {
      resultats.push({ ph, absent: true });
      continue;
    }
    const { document } = lire(chemin);
    let racine = document.querySelector('main') || document.body;
    if (ph.section) { racine = document.querySelector(ph.section); }
    const clone = racine.cloneNode(true);
    if (ph.exclure) { clone.querySelectorAll(ph.exclure).forEach((n) => n.remove()); }

    // Lecture : texte visible par défaut, hors QCM, champs et extrait.
    const retirer = [];
    if (ph.extrait) { retirer.push(ph.extrait); }
    const motsLecture = mots(texteDeLecture(clone, { retirer }));
    let motsExtrait = 0;
    if (ph.extrait) {
      const ex = clone.querySelector(ph.extrait).cloneNode(true);
      ex.querySelectorAll('table, [data-hors-citation]').forEach((t) => t.remove());
      motsExtrait = mots(texte(ex));
    }
    let motsNotes = 0;
    if (ph.notes) {
      clone.querySelectorAll('.notes-cachees > div').forEach((d) => { motsNotes += mots(texte(d)); });
    }
    const blocs = [...clone.querySelectorAll('.q[data-requis]')];
    const conditionnels = blocs.filter((b) => b.hasAttribute('data-si'));
    const requis = blocs.filter((b) => !b.hasAttribute('data-si'));
    const identite = ph.id === 'cadre' ? [...clone.querySelectorAll('.q[data-q]')] : [];
    const bonus = [...clone.querySelectorAll('.q[data-bonus]')];
    const facultatifs = [...clone.querySelectorAll('.q[data-q]:not([data-requis]):not([data-bonus])')]
      .filter((b) => ph.id !== 'cadre');
    const qcm = [...clone.querySelectorAll('fieldset.qcm')];

    const champsListe = (ph.id === 'cadre' ? identite : requis).concat(ph.id === 'froid' ? facultatifs.filter((b) => b.getAttribute('data-q') === 'n3') : []);
    const minutesChamps = champsListe.reduce((s, b) => s + dureeChamp(b), 0);
    const minutesLecture = ph.horsBudgetLecture ? 0 : (motsLecture + motsExtrait + motsNotes) / MOTS_MINUTE;
    const minutesQCM = qcm.length * QCM_MIN;
    const minutesCases = (ph.cases || 0) * (5 / 60);
    const minutesExtras = (ph.extras || []).reduce((s, e) => s + e[1], 0);
    const total = minutesLecture + minutesChamps + minutesQCM + minutesCases + minutesExtras;
    const pireCas = total + conditionnels.reduce((s, b) => s + dureeChamp(b), 0);

    const alertes = [];
    if (ph.maxMots !== undefined && motsLecture > ph.maxMots) { alertes.push('lecture ' + motsLecture + ' mots, budget ' + ph.maxMots); }
    if (ph.maxExtrait !== undefined && motsExtrait > ph.maxExtrait) { alertes.push('extrait ' + motsExtrait + ' mots, budget ' + ph.maxExtrait); }
    if (total > ph.minutes + 1e-9) { alertes.push('durée estimée ' + arrondi(total) + ' min pour ' + ph.minutes + ' min'); }

    resultats.push({
      ph, motsLecture, motsExtrait, motsNotes,
      champs: champsListe.map((b) => b.getAttribute('data-q') + ' (' + dureeChamp(b) + ' min)'),
      conditionnels: conditionnels.map((b) => b.getAttribute('data-q')),
      bonus: bonus.map((b) => b.getAttribute('data-q')),
      facultatifs: facultatifs.map((b) => b.getAttribute('data-q')).filter((id) => ph.id !== 'froid' || id !== 'n3'),
      qcm: qcm.map((f) => f.getAttribute('data-qcm')),
      minutesLecture, minutesChamps, minutesQCM, minutesCases, minutesExtras, total, pireCas, alertes
    });
  }
  return resultats;
}

function f(n) { return String(arrondi(n)).replace('.', ','); }

export function ecrireMarkdown(resultats) {
  const l = [];
  l.push('# Budget de temps de la séance 9');
  l.push('');
  l.push('Document produit par `node scripts/budget.mjs` à partir du HTML des pages. Ne pas le modifier à la main.');
  l.push('');
  l.push('Hypothèses de calcul : lecture à 200 mots par minute ; 30 secondes par QCM ; champ court 1 minute, champ de rédaction 2 à 3 minutes (durées par champ dans `scripts/budget.mjs`) ; nom d’équipe et noms 20 secondes chacun ; case à cocher 5 secondes. Les questions bonus et les champs facultatifs ne sont pas comptés. Le texte compté est celui qui est visible par défaut : les aides repliées, les retours de QCM et les blocs fermés de la correction n’entrent pas dans la lecture.');
  l.push('');
  l.push('| Phase | Durée | Mots lus | Champs requis | QCM | Autres activités | Estimation | Marge | État |');
  l.push('|---|---|---|---|---|---|---|---|---|');
  let avant = 0;
  let apres = 0;
  for (const r of resultats) {
    if (r.absent) { l.push('| ' + r.ph.titre + ' | ' + r.ph.minutes + ' min | fichier absent | | | | | | à vérifier |'); continue; }
    const motsTxt = r.motsLecture + (r.motsExtrait ? ' + extrait ' + r.motsExtrait : '') + (r.motsNotes ? ' + notes ' + r.motsNotes : '');
    const autres = (r.ph.extras || []).map((e) => e[0] + ' (' + f(e[1]) + ' min)').concat(r.ph.cases ? [r.ph.cases + ' cases (' + f(r.minutesCases) + ' min)'] : []).join(' ; ');
    l.push('| ' + r.ph.titre + ' | ' + r.ph.minutes + ' min | ' + motsTxt + ' | ' + (r.champs.length ? r.champs.join(', ') : 'aucun') + ' | ' + r.qcm.length
      + ' | ' + (autres || '') + ' | ' + f(r.total) + ' min | ' + f(r.ph.minutes - r.total) + ' min | ' + (r.alertes.length ? 'DÉPASSÉ' : 'tient') + ' |');
    if (['cadre', 'methode', 'chercher', 'citer-lecture', 'citer-pratique'].includes(r.ph.id)) { avant += r.total; } else { apres += r.total; }
  }
  l.push('');
  l.push('Total estimé avant la pause : ' + f(avant) + ' minutes pour 65. Après la pause : ' + f(apres) + ' minutes pour 85.');
  l.push('');
  l.push('## Détails');
  for (const r of resultats) {
    if (r.absent) { continue; }
    l.push('');
    l.push('### ' + r.ph.titre);
    l.push('');
    l.push('Lecture ' + f(r.minutesLecture) + ' min, champs ' + f(r.minutesChamps) + ' min, QCM ' + f(r.minutesQCM) + ' min, autres ' + f(r.minutesExtras + r.minutesCases) + ' min.');
    if (r.ph.maxMots !== undefined) { l.push('Budget de lecture : ' + r.motsLecture + ' mots pour ' + r.ph.maxMots + ' au plus.'); }
    if (r.ph.maxExtrait !== undefined) { l.push('Extrait de l’Insee : ' + r.motsExtrait + ' mots hors tableau, pour 1 000 au plus, et 1 tableau.'); }
    if (r.qcm.length) { l.push('QCM : ' + r.qcm.join(', ') + '.'); }
    if (r.conditionnels.length) { l.push('Champ conditionnel (seulement si SophIA est choisi) : ' + r.conditionnels.join(', ') + '. Estimation dans ce cas : ' + f(r.pireCas) + ' min.'); }
    if (r.bonus.length) { l.push('Bonus facultatifs, non comptés : ' + r.bonus.join(', ') + '.'); }
    if (r.facultatifs.length) { l.push('Champs facultatifs, non comptés : ' + r.facultatifs.join(', ') + '.'); }
    if (r.alertes.length) { l.push('**À couper :** ' + r.alertes.join(' ; ') + '.'); }
  }
  l.push('');
  return l.join('\n');
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const res = calculerBudgets();
  const md = ecrireMarkdown(res);
  fs.mkdirSync(path.join(RACINE, 'docs-internes'), { recursive: true });
  fs.writeFileSync(path.join(RACINE, 'docs-internes', 'budget-temps.md'), md);
  let ko = 0;
  for (const r of res) {
    if (r.absent) { console.log('?  ' + r.ph.titre + ' : fichier absent'); continue; }
    const etat = r.alertes.length ? 'DÉPASSÉ' : 'ok';
    if (r.alertes.length) { ko += 1; }
    console.log((r.alertes.length ? '✗ ' : '✓ ') + r.ph.titre.padEnd(30) + ' ' + f(r.total).padStart(5) + ' / ' + r.ph.minutes + ' min  lecture ' + r.motsLecture + (r.motsExtrait ? ' + extrait ' + r.motsExtrait : '') + ' mots  ' + etat + (r.alertes.length ? '  (' + r.alertes.join(' ; ') + ')' : ''));
  }
  console.log('Écrit : docs-internes/budget-temps.md');
  process.exit(ko ? 1 : 0);
}

export { PHASES, DOCS, PRIVE };
