# À vérifier avant la séance 9

Ce fichier liste tout ce qui n’a pas pu être vérifié pendant la construction du site, et tous les écarts avec les textes de référence. Rien de ce qui suit n’est affiché comme un fait acquis sur le site.

## 1. Liens externes

Contrôle fait avec `npm run liens` depuis l’environnement de construction. Une réponse 403 veut dire que le site a refusé la requête automatique (blocage des robots ou du réseau), pas forcément que le lien est mort. **Ouvrez chaque lien dans un navigateur.**

| Lien | Utilisé sur | Constat |
|---|---|---|
| Page « Genre » de Géoconfluences, `https://geoconfluences.ens-lyon.fr/glossaire/genre` | Chercher (A1, et A3 en bonus) | 403, à vérifier |
| Glossaire de Géoconfluences (secours), `https://geoconfluences.ens-lyon.fr/glossaire` | Chercher | répond (200) |
| Dictionnaire de sociologie clinique sur Cairn | Chercher, première porte | 403, à vérifier. L’article « Genre » existe (confirmé par l’enseignant). |
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
3. **Auteure de la définition de Géoconfluences.** La page l’attribue à « Blidon, 2011 ». Aucune biographie n’est rédigée sur le site : la question bonus A3 demande aux étudiant·es de la chercher.
4. **Deux vérifications laissées ouvertes aux étudiant·es** (bloc « Deux vérifications pour aller plus loin » de la correction) : l’exactitude de la formule de Beauvoir citée par Géoconfluences dans *Le Deuxième Sexe*, et la date et le titre de l’article de Scott cités dans la note de Chartrain. Aucune réponse n’est fournie.
5. **Date de parution de l’Insee Focus n° 377.** Le site reprend « 26 février 2026 » de la v2 (page Lire, correction L1). Le PDF fourni indique seulement « Février 2026 ». Vérifiez la mention « Paru le » sur la page de l’Insee.
6. **Vidéo.** Le PDF de la transcription n’a pas été fourni. Les QCM V4 à V6 et le bonus G2 (« un écart de 25,7 % en 2012 ») sont repris de la v2 sans nouvelle vérification. La transcription automatique déforme des passages : **revérifiez ces questions contre la vidéo, aux horodatages des chapitres.** La liste de sources de la description ne semble contenir aucune référence pour Pierre Bourdieu ni pour Catherine Vidal (à confirmer). L’attribution « artisan de sa propre domination » à Bourdieu n’est affichée nulle part sur le site.
7. **Pourcentages de rétention** (20, 40, 60, 80 %) de la diapo 33. Sans source indiquée, ils ressemblent à la « pyramide de l’apprentissage ». Ils sont **masqués** (`afficherPourcentages: false` dans `docs/data/config.json`). La phrase « Écrire, c’est faire » n’apparaît qu’avec eux.
8. **Intersectionnalité.** Le syllabus et la diapositive d’examen l’attendent, mais le déroulé ne lui laisse aucune place. La page Bilan contient un bloc « À compléter avec le cours », sans définition ni référence.
9. **Envoi des réponses à l’enseignant** (à la place de Moodle). Il reste à le brancher (README, « Voir les réponses en direct »). Points à vérifier après la mise en place :
   1. Le script n’a pas pu être essayé sur un vrai compte Google depuis l’environnement de construction. Le site a été testé avec un faux script qui suit le même protocole. **Faites l’essai complet une fois le script déployé** (une équipe de test doit apparaître sur la page « Réponses des équipes », et « Diffuser cette heure » doit être confirmé).
   2. RGPD : les noms et les réponses arrivent dans votre compte Google, et chaque envoi passe par les serveurs de Google, qui voient l’adresse IP des appareils. Décidez de l’information donnée aux étudiant·es (un avis est affiché sur la page Cadre) et de la durée de conservation de la feuille.
   3. La clé enseignant ne doit jamais être écrite dans le dépôt, qui est public. Le jeton de `config.json`, lui, n’est pas un secret.
10. **Identité visuelle.** Le PDF des slides de la séance 1 n’a pas été fourni. Les couleurs (fond `#17181c`, texte crème, orange chaud) et les polices (Archivo pour les titres, Literata pour le texte, libres de droits) suivent la description du cahier des charges. Comparez avec les slides et ajustez `docs/assets/css/tokens.css` si besoin.
11. **Syllabus** non fourni. Rien n’a été repris du syllabus en dehors de ce que le cahier des charges en dit.
12. **Questions de lecture nouvelles** (page Lire, avant la pause). Quatre QCM ont été écrits d’après l’extrait, pour obliger à lire tout le document. Relisez-les :
    - Q3 (R1) : depuis 1995, l’écart de revenu salarial « s’est réduit d’un tiers » (chapeau).
    - Q6 (R2) : l’écart de salaire en EQTP le plus fort est chez les 60 ans ou plus, 24,1 % (section sur l’âge).
    - Q7 (R3) : cinq professions sont communes aux vingt plus courantes de chaque genre (section sur les métiers).
    - Q9 (R4) : l’écart augmente avec le nombre d’enfants, de 5,8 % sans enfant à 28,2 % avec trois enfants ou plus (encadré).
13. **Chasse aux indices de la correction.** Pour chaque question d’analyse, voici les passages de l’extrait acceptés. Un clic ailleurs répond « Pas ici ».
    - L1 : l’une des deux mentions Champ (sous la figure 1 ou sous le tableau).
    - L2 : le sous-titre, la phrase « Depuis 1995, les inégalités… » ou la phrase « En 2024, l’écart de revenu salarial s’est réduit de 0,4 point… ».
    - L3 : les deux variables du tableau qui décrivent l’entreprise, « Taille de l’entreprise » et « Secteur d’activité » (les deux sont demandées).
    - L4 : l’une des deux mentions Lecture.
    - L5 : la phrase « Par ailleurs, cet écart de salaire « à emploi comparable » ne peut pas être interprété… » ou la suivante, « Or ces différences… ».
    - L6 : les deux passages qui emploient « genrée » et « genres » (les deux sont demandés).
    « Le détail qui compte » de L1 relève que les deux mentions Champ ne comptent pas les mêmes personnes (apprentis et stagiaires exclus sous la figure 1, alternants et stagiaires inclus sous le tableau). Le détail est tiré des deux mentions de l’extrait.

## 3. Coupes et écarts faits pour tenir les budgets de temps

Le cahier des charges demande de couper plutôt que d’allonger une phase. Le calcul est dans `docs-internes/budget-temps.md`. Chaque coupe peut être annulée si vous préférez un texte plus long.

### Nouveau découpage, demandé par l’enseignant

Moins de temps pour définir, plus pour l’étude de l’Insee :

- Définir et citer tiennent en 43 minutes, de 9 h 00 à 9 h 43 (Chercher 15 minutes, Bien citer 7, Citer en pratique 13).
- Lecture de l’étude avant la pause, de 9 h 43 à 10 h 05, avec neuf questions à choix multiple qui suivent l’ordre du texte et renvoient chacune au passage où chercher.
- Analyse après la pause, de 10 h 35 à 11 h 02 (L1 à L6), puis dépôt et correction.

Questions retirées ou allégées pour que chaque phase tienne :

- Chercher : A2 (quel paragraphe citer) est retirée, A3 (l’auteure citée par la page) devient un bonus.
- Méthode : le tableau « Ce qu’on vérifie » est retiré, la page dure 5 minutes.
- Citer : le QCM C-Q5 est retiré, et la synthèse C3 demande deux ou trois phrases au lieu de trois ou quatre.
- Vidéo : les QCM V7 et V8 sont retirés.
- Correction : les QCM K1 et K2 sont retirés, la chasse aux indices les remplace.
- Le mot « entrée » (au sens d’article de dictionnaire) est remplacé par « page » ou « article » partout.

### Page Cadre (budget de 250 mots)

- Retiré dans « Ce que vous allez faire » : « Le genre est une notion que vous connaissez encore peu. »
- Retiré dans « Les règles du jeu » : « Des questions à choix multiple corrigent tout de suite, et vous pouvez changer votre réponse. Le chrono de la séance est affiché en haut, il sert de repère. » (la page Méthode le redit, et le chrono est visible en permanence).
- Retiré dans « Les outils » : « Ce que vous citez, c’est l’article que vous ouvrez vous-mêmes. » (repris par la porte SophIA de la page Chercher).
- Chapeau raccourci en « Un parcours en binôme et chronométré, qui reprend les gestes que l’examen de décembre vous demandera. », pour laisser la place à l’annonce de la chasse aux indices dans les règles du jeu.
- Titre « Les outils » devenu « Outils et IA (niveau 2) », pour rappeler le niveau de la charte IA demandé au point 7.1.

### Extrait de l’Insee (sélection du point 7.7, rétablie en entier)

La lecture dispose maintenant de 22 minutes avant la pause. Les coupes de la version précédente sont annulées : toutes les phrases de la sélection sont là, mot pour mot. Les […] signalent seulement les passages du document qui ne font pas partie de la sélection. Le budget de l’extrait passe à 1 400 mots (1 357 mots hors tableau), lus à 130 mots par minute parce que le texte est dense. La figure 1, une série de courbes, n’est pas reproduite, mais sa légende est conservée. Le titre de la figure 2 est devenu la légende (`caption`) du tableau.

### Page « Bien citer » (900 mots au plus)

Le cours de la v2 a été légèrement resserré, sans changer ses règles : « Cette page donne le cours, la suivante vous fait appliquer » ; retrait de « et vous vous y référerez pour écrire votre bibliographie » ; « Quand vous comparez plusieurs définitions » ; « Vous dites sur quoi elle s’appuie ». **Une précision a été ajoutée** : « Pour deux auteur·es d’un même texte, on écrit (A et B, année) », pour éviter qu’une synthèse de deux sources s’écrive (A et B, année) au lieu de (A, année ; B, année). À valider.

### Vidéo, comparaison en binôme (5 minutes)

Les huit cases à cocher portent des libellés courts tirés des conseils (« Relire à froid », « Une colonne pour soi »…). Les conseils complets, mot pour mot, restent sur la page Conseils de prise de notes.

## 4. Autres choix faits pendant la construction

- **Correction de l’étude, en chasse aux indices.** L’extrait est affiché à côté de six cartes, L1 à L6. Pour chaque carte, l’équipe clique dans le document sur le passage qui justifie la réponse (liste en section 2, point 13). L’indice trouvé est surligné dans le texte avec son numéro, et la carte révèle la réponse de l’équipe, la réponse proposée, puis « Ce qu’on attend » et « Pièges fréquents », repliés. Après deux clics ratés, une aide apparaît. « Montrer l’indice » surligne le passage et révèle la réponse, sans points. Chaque indice trouvé sans aide rapporte 5 points, et les six donnent le badge « Détective de sources ». Trois cartes ajoutent « Le détail qui compte », une remarque courte tirée du document.
- **Correction de Définir et Citer.** Blocs fermés comme avant, sous la chasse, à relire après la séance si le temps manque. Ouvert, un bloc montre d’abord la réponse de l’équipe, puis la réponse proposée. Le libellé « La forme attendue » remplace « Réponse proposée » pour A3, comme le demande l’annexe C, et « Un exemple » est gardé pour B1, B2, C1 et C2 comme dans la v2.
- **Bouton « J’ai tout lu »** de la page « Bien citer » : +10 points, comme « J’ai lu la correction » (le montant n’était pas fixé).
- **Quête Lire** : terminée quand les neuf QCM de lecture, L1 à L6, la déclaration d’usage de l’IA, un dépôt (copie, fichier ou envoi) et les six indices de la correction (trouvés ou montrés) sont faits.
- **Badge « Dans les temps »** : Chercher avant 9 h 23, Citer avant 9 h 43, Analyser avant 11 h 05 (fin du dépôt).
- **Jeu sans grades** : les niveaux (Stagiaire, Sociologue…) sont supprimés. Le carnet affiche les points d’enquête, les quêtes résolues et les indices retrouvés.
- **Écrans plein cadre** : le grand mot peut changer selon l’étape (« Reprise » à la fin de la pause, « Vidéo » avant la vidéo, « Stop » ailleurs), par le champ `stopMot` de `schedule.json`.
- **Écran STOP** : il s’affiche d’abord en bandeau pendant 60 secondes, puis en plein écran. Il ne s’affiche pas si la page ouverte est déjà la suivante, ou plus loin dans le déroulé.
- **Page Chercher** : « pour l’étape suivante » devient « pour la suite », et le bonus A6 est placé en fin de page, sous « Si vous avez le temps », pour que les champs requis passent d’abord.
- **Libellé de la colonne de notes** : « Pour moi (questions, désaccords, mots à vérifier) », avec des parenthèses à la place des deux-points.
- **Dépôt** : un seul champ facultatif sous la déclaration d’usage de l’IA, « Précision facultative. Quel outil, pour quoi faire, et qu’avez-vous vérifié vous-mêmes dans les sources ? ».
- **Textes nouveaux** courts, écrits pour l’interface (accueil du site, hub, pause, bilan, feuille de route, messages des écrans). Ils suivent les règles éditoriales et sont contrôlés par `npm run lint`.
- **Données du site** : `schedule.json` et `config.json` sont dans `docs/data/` (et non à la racine) pour être modifiables directement sur GitHub sans reconstruction. Les pages ouvertes relisent `schedule.json` chaque minute.
- **Pas de Moodle** (demande de l’enseignant) : les dépôts se font avec « Envoyer à l’enseignant », et les réponses arrivent aussi en continu sur la page « Réponses des équipes ». Le téléchargement et la copie du récapitulatif restent possibles en secours. Sans envoi branché, le site propose de télécharger le récapitulatif.
- **Heure de départ** : la séance risque de commencer à 10 h 00 au lieu de 9 h 00. L’enseignant peut diffuser l’heure réelle depuis la page « Réponses des équipes ». Le déroulé reste de trois heures à partir de cette heure (fin à 13 h 00 pour un départ à 10 h 00). **Si la séance doit finir à 12 h 00 malgré tout, il faut raccourcir le déroulé : à décider.**

## 5. Publication

- Le site est publié par GitHub Pages depuis la branche `main` : `https://davidpuzos-crypto.github.io/bacheloract/` (la racine redirige vers `docs/`). Chaque mise à jour est préparée sur la branche `claude/elegant-planck-ir8tii`, puis fusionnée.
- La correction est chiffrée avec un **mot de passe provisoire**. Choisissez le vôtre et reconstruisez (README, section « Changer le mot de passe »).
- Branchez l’envoi des réponses (README, section « Voir les réponses en direct »).
- Après chaque publication, vérifiez sur l’adresse publique la page chiffrée, le téléchargement du récapitulatif et l’horloge.
