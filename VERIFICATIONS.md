# À vérifier avant la séance 9

Ce fichier liste tout ce qui n’a pas pu être vérifié pendant la construction du site, et tous les écarts avec les textes de référence. Rien de ce qui suit n’est affiché comme un fait acquis sur le site.

## 1. Liens externes

Contrôle fait avec `npm run liens` depuis l’environnement de construction. Une réponse 403 veut dire que le site a refusé la requête automatique (blocage des robots ou du réseau), pas forcément que le lien est mort. **Ouvrez chaque lien dans un navigateur.**

| Lien | Utilisé sur | Constat |
|---|---|---|
| Entrée « Genre » de Géoconfluences, `https://geoconfluences.ens-lyon.fr/glossaire/genre` | Chercher (A1 à A3) | 403, à vérifier |
| Glossaire de Géoconfluences (secours), `https://geoconfluences.ens-lyon.fr/glossaire` | Chercher | 403, à vérifier |
| Dictionnaire de sociologie clinique sur Cairn | Chercher, première porte | 403, à vérifier. L’entrée « Genre » existe (confirmé par l’enseignant). |
| Site SES-ENS, `https://ses.ens-lyon.fr` | Chercher, deuxième porte | 403, à vérifier |
| Cairn et SophIA, `https://www.cairn.info` | Chercher, troisième porte | 403, à vérifier. Tester l’accès par le K-lab depuis la salle. |
| Guide APA simplifié de l’ENS Paris (PDF) | Citer | répond (200) |
| Insee Focus n° 377, `https://www.insee.fr/fr/statistiques/8743657` | Lire | répond (200), adresse fournie par l’enseignant |
| Vidéo YouTube `aed8Q40M8r8` | Vidéo (G3) | répond (200) |
| `https://tutos.bu.univ-rennes2.fr` | Conseils de notes | répond (200) |
| Liens Moodle de la fiche méthode et du guide de révision | Conseils de notes, bilan | **vides** dans `docs/data/config.json`, boutons masqués. Les dépôts ne passent plus par Moodle (voir la section 2, point 9). |

## 2. Contenus à vérifier

1. **Modèles APA de la page « Bien citer ».** Ils viennent de la v2 et ont été écrits d’après les règles générales. Comparez-les avec le guide de l’ENS Paris et corrigez-les en cas de différence. Les intervalles de pages sont écrits avec un trait d’union (62-63, 69-72, p. 9-12), car la règle éditoriale du site interdit le demi-cadratin que l’APA recommande. À trancher.
2. **Conditions de réutilisation** de l’extrait de l’Insee et des courtes citations (Géoconfluences, INJEP).
3. **Auteure de la définition de Géoconfluences.** L’entrée l’attribue à « Blidon, 2011 ». Aucune biographie n’est rédigée sur le site : la question A3 demande aux étudiant·es de la chercher.
4. **Deux vérifications laissées ouvertes aux étudiant·es** (bloc « Deux vérifications pour aller plus loin » de la correction) : l’exactitude de la formule de Beauvoir citée par Géoconfluences dans *Le Deuxième Sexe*, et la date et le titre de l’article de Scott cités dans la note de Chartrain. Aucune réponse n’est fournie.
5. **Date de parution de l’Insee Focus n° 377.** Le site reprend « 26 février 2026 » de la v2 (page Lire, correction L1). Le PDF fourni indique seulement « Février 2026 ». Vérifiez la mention « Paru le » sur la page de l’Insee.
6. **Vidéo.** Le PDF de la transcription n’a pas été fourni. Les QCM V4 à V8 et le bonus G2 (« un écart de 25,7 % en 2012 ») sont repris de la v2 sans nouvelle vérification. La transcription automatique déforme des passages : **revérifiez ces questions contre la vidéo, aux horodatages des chapitres.** La liste de sources de la description ne semble contenir aucune référence pour Pierre Bourdieu ni pour Catherine Vidal (à confirmer). L’attribution « artisan de sa propre domination » à Bourdieu n’est affichée nulle part sur le site.
7. **Pourcentages de rétention** (20, 40, 60, 80 %) de la diapo 33. Sans source indiquée, ils ressemblent à la « pyramide de l’apprentissage ». Ils sont **masqués** (`afficherPourcentages: false` dans `docs/data/config.json`). La phrase « Écrire, c’est faire » n’apparaît qu’avec eux.
8. **Intersectionnalité.** Le syllabus et la diapositive d’examen l’attendent, mais le déroulé ne lui laisse aucune place. La page Bilan contient un bloc « À compléter avec le cours », sans définition ni référence.
9. **Envoi des réponses à l’enseignant** (à la place de Moodle). Il reste à le brancher (README, « Voir les réponses en direct »). Points à vérifier après la mise en place :
   1. Le script n’a pas pu être essayé sur un vrai compte Google depuis l’environnement de construction. Le site a été testé avec un faux script qui suit le même protocole. **Faites l’essai complet une fois le script déployé** (une équipe de test doit apparaître sur la page « Réponses des équipes », et « Diffuser cette heure » doit être confirmé).
   2. RGPD : les noms et les réponses arrivent dans votre compte Google, et chaque envoi passe par les serveurs de Google, qui voient l’adresse IP des appareils. Décidez de l’information donnée aux étudiant·es (un avis est affiché sur la page Cadre) et de la durée de conservation de la feuille.
   3. La clé enseignant ne doit jamais être écrite dans le dépôt, qui est public. Le jeton de `config.json`, lui, n’est pas un secret.
10. **Identité visuelle.** Le PDF des slides de la séance 1 n’a pas été fourni. Les couleurs (fond `#17181c`, texte crème, orange chaud) et les polices (Archivo pour les titres, Literata pour le texte, libres de droits) suivent la description du cahier des charges. Comparez avec les slides et ajustez `docs/assets/css/tokens.css` si besoin.
11. **Syllabus** non fourni. Rien n’a été repris du syllabus en dehors de ce que le cahier des charges en dit.

## 3. Coupes et écarts faits pour tenir les budgets de temps

Le cahier des charges demande de couper plutôt que d’allonger une phase. Le calcul est dans `docs-internes/budget-temps.md`. Chaque coupe peut être annulée si vous préférez un texte plus long.

### Page Cadre (budget de 250 mots, les textes de l’annexe B.1 en comptaient environ 300)

- Retiré dans « Ce que vous allez faire » : « Le genre est une notion que vous connaissez encore peu. » La phrase suivante devient « Vous allez chercher une définition solide du genre, apprendre à la citer… ».
- Retiré dans « Les règles du jeu » : « Des questions à choix multiple corrigent tout de suite, et vous pouvez changer votre réponse. Le chrono de la séance est affiché en haut, il sert de repère. » (la page Méthode le redit, et le chrono est visible en permanence).
- Retiré dans « Les outils » : « Ce que vous citez, c’est l’article que vous ouvrez vous-mêmes. » (repris par la porte SophIA de la page Chercher et par le tableau de la méthode).
- Titre « Les outils » devenu « Outils et IA (niveau 2) », pour rappeler le niveau de la charte IA demandé au point 7.1.

### Extrait de l’Insee (budget de 1 000 mots, la sélection du point 7.7 en comptait 1 383)

Toutes les phrases gardées sont mot pour mot. Les passages retirés sont signalés par […] :

1. Chapeau, fin du premier paragraphe : « En 2024, l’écart de revenu salarial s’est réduit de 0,4 point […] trois dernières décennies. »
2. Première section : « En moyenne, le volume de travail annuel des femmes est inférieur de 9,1 % […] » et « À temps de travail égal […] atteint 14,0 %. » (chiffres repris par le chapeau et la légende de la figure 1).
3. Section sur l’âge : de « À l’inverse, les différences de temps de travail […] » jusqu’à « […] selon les âges. »
4. Légende de la figure 2 : la ligne « Note », car le texte de la section dit déjà que le champ diffère.
5. Ségrégation professionnelle : les exemples « Les femmes sont particulièrement sous-représentées […] sont des hommes. »
6. Ségrégation professionnelle : « En effet, pour établir une comparaison […] » et « Ces emplois comparables […] que l’ensemble. », puis « Or ces différences […] en les atténuant. »
7. Encadré sur les enfants : « Au total, la combinaison […] trois enfants ou plus. »

Le titre de la figure 2 est devenu la légende (`caption`) du tableau.

### Page « Bien citer » (900 mots au plus)

Le cours de la v2 a été légèrement resserré, sans changer ses règles : « Cette page donne le cours, la suivante vous fait appliquer » ; retrait de « et vous vous y référerez pour écrire votre bibliographie » ; « Quand vous comparez plusieurs définitions » ; « Vous dites sur quoi elle s’appuie ». **Une précision a été ajoutée** : « Pour deux auteur·es d’un même texte, on écrit (A et B, année) », pour éviter qu’une synthèse de deux sources s’écrive (A et B, année) au lieu de (A, année ; B, année). À valider.

### Vidéo, comparaison en binôme (5 minutes)

Les huit cases à cocher portent des libellés courts tirés des conseils (« Relire à froid », « Une colonne pour soi »…). Les conseils complets, mot pour mot, restent sur la page Conseils de prise de notes.

## 4. Autres choix faits pendant la construction

- **Correction.** Pour rester sous 900 mots visibles par défaut, chaque question est un bloc fermé. Ouvert, il montre d’abord la réponse de l’équipe (lue dans le navigateur), puis la réponse proposée, déployée. « Ce qu’on attend » et « Pièges fréquents » sont repliés. Les titres des blocs A3, C3, L2, L4 et L5 ont été écrits pour l’occasion. Le libellé « La forme attendue » remplace « Réponse proposée » pour A3, comme le demande l’annexe C, et « Un exemple » est gardé pour B1, B2, C1 et C2 comme dans la v2.
- **Bouton « J’ai tout lu »** de la page « Bien citer » : +10 points, comme « J’ai lu la correction » (le montant n’était pas fixé).
- **Quête Lire** : terminée quand L1 à L6, les cinq QCM de la page, la déclaration d’usage de l’IA, un dépôt (copie, fichier ou envoi) et les QCM K1 et K2 de la correction sont faits.
- **Badge « Dans les temps »** : Chercher avant 9 h 35, Citer avant 10 h 05, Lire avant 11 h 00 (fin du dépôt).
- **Écran STOP** : il s’affiche d’abord en bandeau pendant 60 secondes, puis en plein écran. Il ne s’affiche pas si la page ouverte est déjà la suivante, ou plus loin dans le déroulé.
- **Page Chercher** : « pour l’étape suivante » devient « pour la suite », et le bonus A6 est placé en fin de page, sous « Si vous avez le temps », pour que les champs requis passent d’abord.
- **Libellé de la colonne de notes** : « Pour moi (questions, désaccords, mots à vérifier) », avec des parenthèses à la place des deux-points.
- **Dépôt** : un seul champ facultatif sous la déclaration d’usage de l’IA, « Précision facultative. Quel outil, pour quoi faire, et qu’avez-vous vérifié vous-mêmes dans les sources ? ».
- **Textes nouveaux** courts, écrits pour l’interface (accueil du site, hub, pause, bilan, feuille de route, messages des écrans). Ils suivent les règles éditoriales et sont contrôlés par `npm run lint`.
- **Données du site** : `schedule.json` et `config.json` sont dans `docs/data/` (et non à la racine) pour être modifiables directement sur GitHub sans reconstruction. Les pages ouvertes relisent `schedule.json` chaque minute.
- **Pas de Moodle** (demande de l’enseignant) : les dépôts se font avec « Envoyer à l’enseignant », et les réponses arrivent aussi en continu sur la page « Réponses des équipes ». Le téléchargement et la copie du récapitulatif restent possibles en secours. Sans envoi branché, le site propose de télécharger le récapitulatif.
- **Heure de départ** : la séance risque de commencer à 10 h 00 au lieu de 9 h 00. L’enseignant peut diffuser l’heure réelle depuis la page « Réponses des équipes ». Le déroulé reste de trois heures à partir de cette heure (fin à 13 h 00 pour un départ à 10 h 00). **Si la séance doit finir à 12 h 00 malgré tout, il faut raccourcir le déroulé : à décider.**

## 5. Publication

- Le site est sur la branche `claude/elegant-planck-ir8tii`. GitHub Pages n’est pas encore activé (voir le README, section « Publier »).
- La correction est chiffrée avec un **mot de passe provisoire**. Choisissez le vôtre et reconstruisez (README, section « Changer le mot de passe »).
- Branchez l’envoi des réponses (README, section « Voir les réponses en direct »).
- Après publication, vérifiez sur l’adresse publique la page chiffrée, le téléchargement du récapitulatif et l’horloge.
