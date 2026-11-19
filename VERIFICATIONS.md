# À vérifier avant la séance 9

Ce fichier liste tout ce qui n’a pas pu être vérifié pendant la construction du site, et tous les écarts avec les textes de référence. Rien de ce qui suit n’est affiché comme un fait acquis sur le site.

## 1. Liens externes

Contrôle fait avec `npm run liens` depuis l’environnement de construction. Une réponse 403 veut dire que le site a refusé la requête automatique (blocage des robots ou du réseau), pas forcément que le lien est mort. **Ouvrez chaque lien dans un navigateur.**

| Lien | Utilisé sur | Constat |
|---|---|---|
| Page « Genre » de Géoconfluences, `https://geoconfluences.ens-lyon.fr/glossaire/genre` | Chercher (A1, et A3 en bonus) | 403, à vérifier |
| Glossaire de Géoconfluences (secours), `https://geoconfluences.ens-lyon.fr/glossaire` | Chercher | répond (200) |
| Article « Genre (gender) » du lexique Socius, par Séverine Sofio, `https://ressources-socius.info/index.php/lexique/21-lexique/65-genre-gender` | Chercher, première porte, et Citer | répond (200). Remplace le Dictionnaire de sociologie clinique, à la demande de l’enseignant. |
| Site SES-ENS, `https://ses.ens-lyon.fr` | Chercher, deuxième porte | 403, à vérifier |
| Cairn et SophIA, `https://www.cairn.info` | Chercher, troisième porte | 403, à vérifier. Tester l’accès par le K-lab depuis la salle. |
| Guide APA simplifié de l’ENS Paris (PDF) | Citer | répond (200) |
| Insee Focus n° 377, `https://www.insee.fr/fr/statistiques/8743657` | Lire | répond (200), adresse fournie par l’enseignant |
| Vidéo YouTube `aed8Q40M8r8` | Projection en classe (lien dans `docs/data/config.json`) | répond (200) |
| `https://tutos.bu.univ-rennes2.fr` | Conseils de notes | répond (200) |
| Liens Moodle de la fiche méthode et du guide de révision | Conseils de notes, bilan | **vides** dans `docs/data/config.json`, boutons masqués. Les dépôts ne passent plus par Moodle (voir la section 2, point 9). |

## 2. Contenus à vérifier

1. **Modèles APA de la page « Bien citer ».** Ils viennent de la v2 et ont été écrits d’après les règles générales. Comparez-les avec le guide de l’ENS Paris et corrigez-les en cas de différence. Les intervalles de pages sont écrits avec un trait d’union (62-63, 69-72, p. 9-12), car la règle éditoriale du site interdit le demi-cadratin que l’APA recommande. À trancher.
2. **Conditions de réutilisation** de l’extrait de l’Insee et des courtes citations (Géoconfluences, Socius). Le bas de la page de Socius indique une licence Creative Commons BY-NC-ND 4.0.
3. **Auteure de la définition de Géoconfluences.** La page l’attribue à « Blidon, 2011 », et cite aussi Blidon (2015) pour la géographie du genre. La question A2 demande aux étudiant·es de chercher qui elle est et dans quelle discipline elle travaille (voir le point 14).
4. **Deux vérifications laissées ouvertes aux étudiant·es** (bloc « Deux vérifications pour aller plus loin » de la correction) : la formule de Beauvoir, citée différemment par Géoconfluences (« on ne naît pas femme, mais on le devient ») et par Socius (« On ne naît pas femme, on le devient »), à retrouver dans *Le Deuxième Sexe*, et les deux dates (1986 entre crochets, 1988) que Sofio donne pour l’article de Scott paru dans *Les Cahiers du GRIF*. Aucune réponse n’est fournie.
5. **Date de parution de l’Insee Focus n° 377.** Le site reprend « 26 février 2026 » de la v2 (page Lire, correction L1). Le PDF fourni indique seulement « Février 2026 ». Vérifiez la mention « Paru le » sur la page de l’Insee.
6. **Vidéo.** Le PDF de la transcription n’a pas été fourni. Les trois questions du QCM (V4 à V6) sont reprises de la v2 sans nouvelle vérification. La transcription automatique déforme des passages : **revérifiez ces questions contre la vidéo, aux horodatages des chapitres.** Les questions ouvertes et les bonus sur la vidéo (dont G2, l’écart de 25,7 % en 2012, et G3, les sources de la description) sont retirés. L’attribution « artisan de sa propre domination » à Bourdieu n’est affichée nulle part sur le site.
7. **Pourcentages de rétention** (20, 40, 60, 80 %) de la diapo 33. Sans source indiquée, ils ressemblent à la « pyramide de l’apprentissage ». Ils sont **masqués** (`afficherPourcentages: false` dans `docs/data/config.json`). La phrase « Écrire, c’est faire » n’apparaît qu’avec eux.
8. **Intersectionnalité.** Abordée seulement en ouverture, par dix minutes de lecture en fin de séance (page « Pour aller plus loin », voir le point 15). Le titre de la séance reste « Genre et pouvoir d’agir ».
9. **Envoi des réponses à l’enseignant**, sans Google ni Moodle. Les réponses passent chiffrées par le relais public ntfy.sh (sans compte), et la page « Réponses des équipes » les déchiffre avec le code enseignant. Points à vérifier :
   1. **Depuis la salle**, avant la séance : une équipe de test doit apparaître sur la page « Réponses des équipes ». Le réseau de l’école peut bloquer ntfy.sh. Le protocole a été vérifié sur le vrai relais avec un sujet d’essai (envoi d’un morceau de 3,8 Ko, relecture identique, accès autorisé depuis une page web), et tout le parcours a été testé avec un faux relais local.
   2. **Limites du relais** pour un usage sans compte, lues sur ntfy.sh le 19 novembre 2026 : 250 messages par jour et une requête toutes les 5 secondes en moyenne (60 d’un coup), par adresse réseau, et conservation 12 heures. Une classe partage souvent la même adresse. Le site envoie donc peu (environ 15 messages par équipe et par séance), ce qui tient pour une quinzaine d’équipes. Ces limites peuvent changer : si le relais refuse, les équipes en sont prévenues et téléchargent leur récapitulatif.
   3. **Conservation** : le relais efface tout au bout de 12 heures. La page enseignant garde une copie dans son navigateur et propose de tout télécharger. Téléchargez les réponses le jour même.
   4. **RGPD** : le relais ne voit que des données chiffrées, mais il voit l’adresse IP des appareils et l’heure des envois. Décidez de l’information donnée aux étudiant·es (un avis est affiché sur la page Cadre) et de la durée de conservation du fichier téléchargé.
   5. Le **code enseignant** n’est écrit nulle part dans le dépôt. La clé publique et le coffre de `config.json` ne sont pas des secrets. Quelqu’un qui lit le code du site peut envoyer de fausses réponses, pas lire les vraies. L’heure de départ diffusée est signée, une heure fausse est ignorée.
10. **Identité visuelle.** Le PDF des slides de la séance 1 n’a pas été fourni. Les couleurs (fond `#17181c`, texte crème, orange chaud) et les polices (Archivo pour les titres, Literata pour le texte, libres de droits) suivent la description du cahier des charges. Comparez avec les slides et ajustez `docs/assets/css/tokens.css` si besoin.
11. **Syllabus** non fourni. Rien n’a été repris du syllabus en dehors de ce que le cahier des charges en dit.
12. **Questions de lecture nouvelles** (page Lire, avant la pause). Quatre QCM ont été écrits d’après l’extrait, pour obliger à lire tout le document. Relisez-les :
    - Q3 (R1) : depuis 1995, l’écart de revenu salarial « s’est réduit d’un tiers » (chapeau).
    - Q6 (R2) : l’écart de salaire en EQTP le plus fort est chez les 60 ans ou plus, 24,1 % (section sur l’âge).
    - Q7 (R3) : cinq professions sont communes aux vingt plus courantes de chaque genre (section sur les métiers).
    - Q9 (R4) : l’écart augmente avec le nombre d’enfants, de 5,8 % sans enfant à 28,2 % avec trois enfants ou plus (encadré).
13. **Correction de l’étude.** Chaque question est affichée avec la réponse de l’équipe, la réponse proposée et des conseils de méthode, sans chasse aux indices (demande de l’enseignant). « Voir le passage » surligne dans l’étude :
    - L1 : les deux mentions Champ (sous la figure 1 et sous le tableau). Les conseils relèvent qu’elles ne comptent pas exactement les mêmes personnes (apprentis et stagiaires exclus sous la figure 1, alternants et stagiaires inclus sous le tableau), d’après les deux mentions de l’extrait.
    - L2 : le sous-titre et la phrase « Depuis 1995, les inégalités… ».
    - L3 : les titres des quatre groupes de lignes du tableau.
    - L4 : les deux mentions Lecture.
    - L5 : les phrases « Par ailleurs, cet écart de salaire « à emploi comparable »… » et « Or ces différences… ».
    - L6 : les deux passages qui emploient « genrée » et « genres ».
14. **Questions sur Blidon** (page Chercher, A2 et A3). La citation sur la « géographie du genre » (Blidon, 2015) a été fournie par l’enseignant : comparez-la avec la page en ligne avant la séance. La correction indique que Marianne Blidon est une géographe française, d’après l’enseignant, et laisse en blanc la source que chaque équipe aura trouvée.
15. **Page « Pour aller plus loin »** (approches intersectionnelles, dix minutes de lecture). À relire en entier avant la séance. D’où vient chaque élément :
    - Les quatre chiffres du tableau viennent de la figure 2 de l’Insee Focus n° 377 (cadres 4 180 et 4 906 euros, ouvriers 1 850 et 2 096 euros). L’Insee n’emploie pas le mot « intersectionnalité », la page le dit.
    - Les définitions et les références (Géoconfluences, Martin, Perrot et Johri, Schmoll, Gautier et Zancarini-Fournel, Lahdily, Crenshaw) sont celles fournies par l’enseignant. Les citations sont reprises mot pour mot. Les numéros de paragraphe (par. 17, 19, 24, 31, 52) viennent des ancres des liens Cairn fournis, à contrôler sur les articles. L’année 2025 pour le livre de Schmoll est celle affichée par Cairn.
    - Les explications (femmes noires invisibles pour les luttes antiracistes et féministes, addition contre imbrication, outil à utiliser en contexte, débats sur la classe sociale et sur le militantisme) et les repères (Crenshaw, anthologie de 1982 et traduction de son titre, Kergoat et la « consubstantialité ») reprennent le support pédagogique fourni par l’enseignant, qui n’est pas cité sur la page, comme demandé.
    - Ajouts de rédaction à valider : l’image du carrefour, la phrase « En sciences sociales, “race” ne désigne pas une réalité biologique, mais une catégorie produite par le racisme », et les trois courtes phrases de commentaire sous les définitions.
    - Les liens vers Cairn et Géoconfluences répondent 403 depuis l’environnement de construction, comme les autres liens vers ces sites. À ouvrir dans un navigateur.

## 3. Coupes et écarts faits pour tenir les budgets de temps

Le cahier des charges demande de couper plutôt que d’allonger une phase. Le calcul est dans `docs-internes/budget-temps.md`. Chaque coupe peut être annulée si vous préférez un texte plus long.

### Nouveau découpage, demandé par l’enseignant

Moins de temps pour définir, plus pour l’étude de l’Insee :

- Définir et citer tiennent en 40 minutes, de 9 h 00 à 9 h 40, correction comprise (Chercher 14 minutes, Bien citer 4, Citer en pratique 9, correction 5).
- La correction de Définir et Citer vient juste après l’exercice, de 9 h 35 à 9 h 40.
- Lecture de l’étude avant la pause, de 9 h 40 à 10 h 02, avec neuf questions à choix multiple qui suivent l’ordre du texte et renvoient chacune au passage où chercher.
- Analyse après la pause, de 10 h 32 à 10 h 59 (L1 à L6), puis dépôt et correction de l’étude (8 minutes).
- Dix minutes dégagées en fin de séance, de 11 h 50 à 12 h 00, pour la lecture « Pour aller plus loin ». Elles viennent de Chercher et Citer (5 minutes), du dépôt (1), des conseils de notes (1) et des questions sur la vidéo (3). Le temps consacré à l’étude de l’Insee n’a pas bougé.

Questions retirées ou allégées pour que chaque phase tienne :

- Chercher : l’ancienne A2 (quel paragraphe citer) est retirée. Deux questions demandées par l’enseignant la remplacent, A2 (qui parle, et dans quelle discipline) et A3 (quelle dimension ajoute le passage sur la géographie du genre ?). A3 est une question à choix, corrigée tout de suite. B2 (type de source de la seconde définition) et B4 (trace de l’usage de SophIA) sont retirées.
- Méthode : le tableau « Ce qu’on vérifie » est retiré, la page dure 5 minutes.
- Citer : le QCM C-Q5 est retiré, et la synthèse C3 demande deux ou trois phrases au lieu de trois ou quatre. La bibliographie C2 devient un bonus, limité à la référence de la page de Géoconfluences. Le tableau des modèles APA du cours est replié.
- Analyse de l’étude : L1, L5 et L6 demandent trois ou quatre phrases au lieu de quatre à six.
- Vidéo (demande de l’enseignant) : la feuille de notes du site (avec ses symboles et son chronomètre), N3, BP, les cases des conseils repérés, S1, les bonus G1 à G4 et les deux dépôts express sont retirés. Chacun·e prend ses notes à sa façon, hors du site, qui est partagé par l’équipe. La comparaison des notes en équipe passe de 5 à 8 minutes, à l’oral, et le QCM (V4 à V6) se fait ensemble en 4 minutes.
- Correction : les QCM K1 et K2 sont retirés.
- Dépôt : la déclaration d’usage de l’IA est retirée du site (demande de l’enseignant).
- Le mot « entrée » (au sens d’article de dictionnaire) est remplacé par « page » ou « article » partout.

### Page Cadre (budget de 250 mots)

- Retiré dans « Ce que vous allez faire » : « Le genre est une notion que vous connaissez encore peu. »
- Retiré dans « Les règles du jeu » : « Des questions à choix multiple corrigent tout de suite, et vous pouvez changer votre réponse. Le chrono de la séance est affiché en haut, il sert de repère. » (la page Méthode le redit, et le chrono est visible en permanence).
- Retiré dans « Les outils » : « Ce que vous citez, c’est l’article que vous ouvrez vous-mêmes. » (repris par la porte SophIA de la page Chercher), puis « Vous déclarez l’usage de l’IA au dépôt. » (déclaration retirée à la demande de l’enseignant).
- Chapeau raccourci en « Un parcours en équipe, chronométré, qui reprend les gestes que l’examen de décembre vous demandera. », pour laisser la place à l’annonce du repère horaire dans les règles du jeu.
- Titre « Les outils » devenu « Outils et IA (niveau 2) », pour rappeler le niveau de la charte IA demandé au point 7.1.

### Extrait de l’Insee (sélection du point 7.7, rétablie en entier)

La lecture dispose maintenant de 22 minutes avant la pause. Les coupes de la version précédente sont annulées : toutes les phrases de la sélection sont là, mot pour mot. Les […] signalent seulement les passages du document qui ne font pas partie de la sélection. Le budget de l’extrait passe à 1 400 mots (1 357 mots hors tableau), lus à 130 mots par minute parce que le texte est dense. La figure 1, une série de courbes, n’est pas reproduite, mais sa légende est conservée. Le titre de la figure 2 est devenu la légende (`caption`) du tableau.

### Page « Bien citer » (900 mots au plus)

Le cours de la v2 a été légèrement resserré, sans changer ses règles : « Cette page donne le cours, la suivante vous fait appliquer » ; retrait de « et vous vous y référerez pour écrire votre bibliographie » ; « Quand vous comparez plusieurs définitions » ; « Vous dites sur quoi elle s’appuie ». **Une précision a été ajoutée** : « Pour deux auteur·es d’un même texte, on écrit (A et B, année) », pour éviter qu’une synthèse de deux sources s’écrive (A et B, année) au lieu de (A, année ; B, année). À valider.

### Vidéo, comparaison en équipe (8 minutes)

Rien n’est à écrire sur le site. La page propose quatre pistes de comparaison (relire seul·e une minute, ce que tout le monde a noté, l’organisation de la page, les conseils choisis) et affiche d’emblée le plan de la vidéo d’après ses chapitres. Les conseils complets, mot pour mot, restent sur la page Conseils de prise de notes.

## 4. Autres choix faits pendant la construction

- **Corrections sans mot de passe** (demande de l’enseignant). Celle de Définir et Citer (`5b-correction-definir.html`) vient juste après l’exercice et s’ouvre d’un clic qui envoie les réponses de l’équipe. Celle de l’étude (`7-correction.html`) s’ouvre d’elle-même si le dépôt est fait, sinon le même clic fait le dépôt. Si l’envoi échoue, la correction s’affiche quand même, avec un message. Le texte des corrections est donc public (dans le dépôt et le code des pages). Le chiffrement StatiCrypt, le dossier `private/` et l’affichage du mot de passe sur l’écran de projection sont supprimés. Chaque question montre la réponse de l’équipe, une réponse proposée et des conseils de méthode, visibles d’emblée. Le libellé « La forme attendue » remplace « Réponse proposée » pour A2, et « Un exemple » est gardé pour B1, B2, C1 et C2 comme dans la v2.
- **Seconde source de Chercher** (demande de l’enseignant). Le Dictionnaire de sociologie clinique, dont la définition du genre était trop complexe, est remplacé par l’article « Genre (gender) » de Séverine Sofio sur le lexique Socius, plus clair. La correction de B1, C1 et C3 prend cet article pour exemple, à la place de l’introduction de l’INJEP (Chartrain, 2013). Elle signale que la phrase « un système de bicatégorisation hiérarchisé entre les sexes » est de Bereni et ses coauteurs (2012, p. 10), citée par Sofio, et que l’article n’a pas de date (« s. d. »). Les citations ont été vérifiées mot pour mot sur la page en ligne.
- **Quête Noter et badge Stratège.** La quête Noter demande désormais trois conseils choisis et les trois réponses du QCM de la vidéo. Le badge Stratège récompense trois conseils choisis et un QCM de la vidéo juste. La page « Réponses des équipes » n’a plus de colonne « Dépôt vidéo ».
- **Repère horaire.** Sur les pages de travail, une ligne sous le chrono dit à quelle question l’équipe devrait en être, si elle est dans les temps, en léger retard ou en retard, et mène à la question. Les repères sont dans `docs/data/schedule.json` (minute depuis le début de la phase, question) et peuvent être ajustés.
- **Bouton « J’ai tout lu »** de la page « Bien citer » : +10 points, comme « J’ai lu la correction » (le montant n’était pas fixé).
- **Quête Lire** : terminée quand les neuf QCM de lecture, L1 à L6 et un dépôt (copie, fichier ou envoi) sont faits. La lecture « Pour aller plus loin » n’entre dans aucune quête, elle rapporte seulement quelques points.
- **Badge « Détective de sources »** : A2 renseignée et A3 trouvée, c’est-à-dire qui parle et depuis quelle discipline.
- **Badge « Dans les temps »** : Chercher avant 9 h 22, Citer avant 9 h 35, Analyser avant 11 h 01 (fin du dépôt).
- **Mise en page** : une seule largeur de colonne pour tous les blocs, une colonne « Sur cette page » à droite sur grand écran (sommaire, questions faites, créneau prévu), des réponses de QCM dont toute la ligne se clique, un déroulé d’accueil regroupé en cinq blocs, et un en-tête plus compact sur téléphone. Deux débordements en largeur ont été corrigés (barre de lecture, champ « autre texte » sur téléphone).
- **Jeu sans grades** : les niveaux (Stagiaire, Sociologue…) sont supprimés. La progression de l’équipe affiche les points d’enquête et les quêtes résolues.
- **Envoyer pour passer** (demande de l’enseignant) : la phrase mystère est supprimée, et le mot « carnet », jugé trop scolaire, devient « progression ». Pour voir une correction ou passer à la quête suivante, l’équipe envoie son travail d’un clic (boutons « Envoyer et… » en fin de quête, ou encadré « D’abord, envoyez votre travail » quand on arrive par le menu). La porte s’ouvre seule si le travail est déjà parti ou s’il n’y a rien à envoyer, et ne bloque jamais en cas d’échec de l’envoi. Le badge « Fil rouge » récompense désormais les quatre quêtes résolues.
- **Écrans plein cadre** : le grand mot peut changer selon l’étape (« Reprise » à la fin de la pause, « Vidéo » avant la vidéo, « Stop » ailleurs), par le champ `stopMot` de `schedule.json`.
- **Écran STOP** : il s’affiche d’abord en bandeau pendant 60 secondes, puis en plein écran. Il ne s’affiche pas si la page ouverte est déjà la suivante, ou plus loin dans le déroulé.
- **Page Chercher** : « pour l’étape suivante » devient « pour la suite », et le bonus A6 est placé en fin de page, sous « Si vous avez le temps », pour que les champs requis passent d’abord.
- **Libellé de la colonne de notes** : « Pour moi (questions, désaccords, mots à vérifier) », avec des parenthèses à la place des deux-points.
- **Textes nouveaux** courts, écrits pour l’interface (accueil du site, hub, pause, bilan, feuille de route, messages des écrans). Ils suivent les règles éditoriales et sont contrôlés par `npm run lint`.
- **Données du site** : `schedule.json` et `config.json` sont dans `docs/data/` (et non à la racine) pour être modifiables directement sur GitHub sans reconstruction. Les pages ouvertes relisent `schedule.json` chaque minute.
- **Pas de Moodle ni de Google** (demande de l’enseignant) : les dépôts se font avec « Envoyer à l’enseignant », et les réponses arrivent aussi aux moments clés sur la page « Réponses des équipes », ouverte avec un code. Le téléchargement et la copie du récapitulatif restent possibles en secours. Si l’envoi est désactivé ou refusé par le relais, le site propose de télécharger le récapitulatif.
- **Équipes de trois** : un troisième nom, facultatif, sur la page Cadre. Les textes disent « en équipe » plutôt que « en binôme », et la comparaison des notes parle des « notes reçues ».
- **Heure de départ** : la séance risque de commencer à 10 h 00 au lieu de 9 h 00. L’enseignant peut diffuser l’heure réelle depuis la page « Réponses des équipes ». Le déroulé reste de trois heures à partir de cette heure (fin à 13 h 00 pour un départ à 10 h 00). **Si la séance doit finir à 12 h 00 malgré tout, il faut raccourcir le déroulé : à décider.**

## 5. Publication

- Le site est publié par GitHub Pages depuis la branche `main` : `https://davidpuzos-crypto.github.io/bacheloract/` (la racine redirige vers `docs/`). Chaque mise à jour est préparée sur la branche `claude/elegant-planck-ir8tii`, puis fusionnée.
- Seule la page « Réponses des équipes » demande un code, celui de l’enseignant. Il n’est écrit nulle part dans le dépôt. Un code court se devine plus facilement : à changer si besoin (README, « Voir les réponses en direct »). Les étudiant·es n’ont aucun mot de passe.
- Testez l’envoi des réponses depuis la salle (README, section « Voir les réponses en direct »). Il n’y a rien à installer.
- Après chaque publication, vérifiez sur l’adresse publique que les corrections s’ouvrent avec « Envoyer et voir la correction », le téléchargement du récapitulatif et l’horloge.
