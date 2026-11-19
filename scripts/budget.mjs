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
// Les questions d’analyse de l’étude (l1 à l6) demandent plusieurs phrases
// appuyées sur le document : elles sont comptées large.
const DUREES = {
  equipe: 0.3, icone: 0.2, nom1: 0.3, nom2: 0.3, nom3: 0.3,
  a1: 1, a2: 2, b0: 0.3, b1: 2,
  c1: 2, c3: 3,
  l1: 4, l2: 2, l3: 2, l4: 3, l5: 4, l6: 4,
  n3: 2, bp: 1.5, s1: 2.5
};

// L’étude de l’Insee se lit lentement : texte dense, chiffres, tableau.
const MOTS_MINUTE_ETUDE = 130;
// La page d’ouverture présente des notions nouvelles : lecture posée.
const MOTS_MINUTE_OUVERTURE = 150;

const PHASES = [
  { id: 'cadre', titre: 'Cadre', fichier: 'docs/seance-09/1-cadre.html', minutes: 3, maxMots: 250 },
  { id: 'methode', titre: 'Méthode', fichier: 'docs/seance-09/2-methode.html', minutes: 5, maxMots: 650, notes: true },
  { id: 'chercher', titre: 'Chercher', fichier: 'docs/seance-09/3-chercher.html', minutes: 14, maxMots: 350,
    extras: [['Lecture des sources sur les sites externes (page de Géoconfluences, seconde source)', 5]] },
  { id: 'citer-lecture', titre: 'Citer, lecture', fichier: 'docs/seance-09/4-citer-lecture.html', minutes: 4, maxMots: 720 },
  { id: 'citer-pratique', titre: 'Citer, pratique', fichier: 'docs/seance-09/5-citer-pratique.html', minutes: 9, maxMots: 180 },
  { id: 'correction-definir', titre: 'Correction, définir et citer', fichier: 'private/seance-09/5b-correction-definir.html', minutes: 5, maxMots: 900 },
  { id: 'lire', titre: 'Lire l’étude', fichier: 'docs/seance-09/6-lire.html', exclure: '#depot, #analyser', minutes: 22, maxMots: 260,
    extrait: '.citation-insee', maxExtrait: 1400, motsMinuteExtrait: MOTS_MINUTE_ETUDE,
    extras: [['Lecture du tableau de la figure 2', 3]] },
  { id: 'analyser', titre: 'Analyser l’étude', fichier: 'docs/seance-09/6-lire.html', section: '#analyser', minutes: 27, maxMots: 120,
    extras: [['Retours au document pour appuyer les réponses', 2]] },
  { id: 'depot', titre: 'Dépôt', fichier: 'docs/seance-09/6-lire.html', section: '#depot', minutes: 2,
    extras: [['Envoyer le récapitulatif à l’enseignant, ou le télécharger', 1.2]] },
  { id: 'correction', titre: 'Correction de l’étude', fichier: 'private/seance-09/7-correction.html', minutes: 8, maxMots: 1500,
    retirer: '.citation-insee', extras: [['Retours à l’étude avec « Voir le passage »', 1]] },
  { id: 'notes', titre: 'Conseils de prise de notes', fichier: 'docs/seance-09/8-notes.html', minutes: 4, maxMots: 500,
    extras: [['Lecture des huit conseils et choix de trois', 1.8]] },
  { id: 'video', titre: 'Vidéo, pendant', fichier: 'docs/seance-09/9-video.html', section: '#pendant', minutes: 25,
    extras: [['Projection de la vidéo, prise de notes en même temps', 25]], horsBudgetLecture: true },
  { id: 'froid', titre: 'Vidéo, à froid et comparer', fichier: 'docs/seance-09/9-video.html', section: '#comparer', minutes: 5, maxMots: 150,
    cases: 8 },
  { id: 'questions', titre: 'Vidéo, questions', fichier: 'docs/seance-09/9-video.html', section: '#questions', minutes: 7, maxMots: 100,
    extras: [['Dépôt express (envoyer ou télécharger)', 1]] },
  { id: 'ouverture', titre: 'Pour aller plus loin', fichier: 'docs/seance-09/aller-plus-loin.html', minutes: 10, maxMots: 1100,
    motsMinute: MOTS_MINUTE_OUVERTURE, extras: [['Lecture du tableau et du schéma', 0.8]] }
];

// Phases avant la pause, et minutes disponibles avant et après (d’après data/schedule.json).
const PROGRAMME = JSON.parse(fs.readFileSync(path.join(RACINE, 'docs', 'data', 'schedule.json'), 'utf8'));
const PAUSE = PROGRAMME.phases.find((p) => p.id === 'pause');
const AVANT_PAUSE = PROGRAMME.phases.filter((p) => p.debut < PAUSE.debut).map((p) => p.id);
const FIN = PROGRAMME.phases[PROGRAMME.phases.length - 1].debut;

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
    if (ph.retirer) { retirer.push(ph.retirer); }
    const motsLecture = mots(texteDeLecture(clone, { retirer }));
    // Textes masqués au départ mais révélés pendant la phase (réponses proposées).
    let motsAussi = 0;
    if (ph.aussi) { clone.querySelectorAll(ph.aussi).forEach((n) => { motsAussi += mots(texte(n)); }); }
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
    const minutesLecture = ph.horsBudgetLecture ? 0
      : (motsLecture + motsNotes + motsAussi) / (ph.motsMinute || MOTS_MINUTE) + motsExtrait / (ph.motsMinuteExtrait || MOTS_MINUTE);
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
      ph, motsLecture, motsExtrait, motsNotes, motsAussi,
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
  l.push('Hypothèses de calcul : lecture à 200 mots par minute, 130 pour l’extrait de l’Insee et 150 pour la page d’ouverture, plus denses ; 30 secondes par QCM ; champ court 1 minute, champ de rédaction 2 à 3 minutes (durées par champ dans `scripts/budget.mjs`) ; nom d’équipe et noms 20 secondes chacun ; case à cocher 5 secondes. Les questions bonus et les champs facultatifs ne sont pas comptés. Le texte compté est celui qui est visible par défaut : les aides repliées, les retours de QCM et les blocs fermés de la correction n’entrent pas dans la lecture.');
  l.push('');
  l.push('| Phase | Durée | Mots lus | Champs requis | QCM | Autres activités | Estimation | Marge | État |');
  l.push('|---|---|---|---|---|---|---|---|---|');
  let avant = 0;
  let apres = 0;
  for (const r of resultats) {
    if (r.absent) { l.push('| ' + r.ph.titre + ' | ' + r.ph.minutes + ' min | fichier absent | | | | | | à vérifier |'); continue; }
    const motsTxt = r.motsLecture + (r.motsExtrait ? ' + extrait ' + r.motsExtrait : '') + (r.motsNotes ? ' + notes ' + r.motsNotes : '') + (r.motsAussi ? ' + réponses révélées ' + r.motsAussi : '');
    const autres = (r.ph.extras || []).map((e) => e[0] + ' (' + f(e[1]) + ' min)').concat(r.ph.cases ? [r.ph.cases + ' cases (' + f(r.minutesCases) + ' min)'] : []).join(' ; ');
    l.push('| ' + r.ph.titre + ' | ' + r.ph.minutes + ' min | ' + motsTxt + ' | ' + (r.champs.length ? r.champs.join(', ') : 'aucun') + ' | ' + r.qcm.length
      + ' | ' + (autres || '') + ' | ' + f(r.total) + ' min | ' + f(r.ph.minutes - r.total) + ' min | ' + (r.alertes.length ? 'DÉPASSÉ' : 'tient') + ' |');
    if (AVANT_PAUSE.includes(r.ph.id)) { avant += r.total; } else { apres += r.total; }
  }
  l.push('');
  l.push('Total estimé avant la pause : ' + f(avant) + ' minutes pour ' + PAUSE.debut + '. Après la pause : ' + f(apres) + ' minutes pour ' + (FIN - PAUSE.debut - PAUSE.duree) + '.');
  l.push('');
  l.push('## Détails');
  for (const r of resultats) {
    if (r.absent) { continue; }
    l.push('');
    l.push('### ' + r.ph.titre);
    l.push('');
    l.push('Lecture ' + f(r.minutesLecture) + ' min, champs ' + f(r.minutesChamps) + ' min, QCM ' + f(r.minutesQCM) + ' min, autres ' + f(r.minutesExtras + r.minutesCases) + ' min.');
    if (r.ph.maxMots !== undefined) { l.push('Budget de lecture : ' + r.motsLecture + ' mots pour ' + r.ph.maxMots + ' au plus.'); }
    if (r.ph.maxExtrait !== undefined) { l.push('Extrait de l’Insee : ' + r.motsExtrait + ' mots hors tableau, pour ' + r.ph.maxExtrait.toLocaleString('fr-FR') + ' au plus, et 1 tableau.'); }
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
