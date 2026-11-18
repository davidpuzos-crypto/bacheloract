# La fabrique du social, site de séance

Site du cours « La fabrique du social, introduction à la sociologie » (Bachelor ACT). Il conduit la **séance 9**, une matinée de méthode de 9 h 00 à 12 h 00 en binôme : définir, citer, lire et analyser une étude de l’Insee, prendre des notes pendant une vidéo.

Le site est statique (HTML, CSS, JavaScript sans framework). Il est publié par GitHub Pages depuis le dossier `docs/`. Les réponses des étudiant·es sont enregistrées dans leur navigateur et, une fois l’envoi branché, envoyées pendant la séance dans une feuille Google privée que vous lisez sur la page « Réponses des équipes ». Pas de Moodle, aucun cookie, aucune mesure d’audience, aucune police chargée depuis un autre site.

## Ce qu’il y a dans le dépôt

| Emplacement | Contenu |
|---|---|
| `docs/` | Le site publié. Accueil du cours (`index.html`), pages de la séance 9 (`seance-09/`), pages de l’enseignant (`prof/`), styles, scripts, polices et icônes (`assets/`). |
| `docs/data/schedule.json` | Le déroulé chronométré : heure de départ, phases, textes des écrans STOP. |
| `docs/data/config.json` | Les liens (Insee, vidéo, ressources…), l’envoi des réponses à l’enseignant et les options d’affichage. |
| `private/` | **Jamais publié.** La correction en clair, avant chiffrement. Ignoré par Git. |
| `scripts/` | Le build (chiffrement), le contrôle éditorial, le calcul des budgets de temps, le contrôle des liens, un petit serveur local. |
| `scripts/apps-script/Code.gs` | Le script Google à coller une fois pour recevoir les réponses (voir « Voir les réponses en direct »). |
| `tests/` | Les tests automatiques (Playwright). |
| `docs-internes/budget-temps.md` | Le calcul du temps nécessaire à chaque phase, page par page. |
| `VERIFICATIONS.md` | Tout ce qui reste à vérifier avant la séance, et les coupes faites. |

Les pages élèves sont, dans l’ordre : `index.html` (accueil de la séance), `1-cadre`, `2-methode`, `3-chercher`, `4-citer-lecture`, `5-citer-pratique`, `6-lire` (lecture avant la pause, analyse après, puis dépôt), `pause`, `7-correction` (chiffrée), `8-notes`, `9-video`, `10-fin`. Côté enseignant : `prof/reponses.html` (les réponses des équipes en direct), `prof/projecteur.html` (à projeter) et `prof/deroule.html` (feuille de route).

## Le déroulé de la séance

Pour un départ à 9 h 00. Le détail, avec ce qu’il faut dire à chaque phase, est sur la page `prof/deroule.html`.

| Heure | Durée | Phase |
|---|---|---|
| 9 h 00 | 3 min | Cadre |
| 9 h 03 | 5 min | Méthode |
| 9 h 08 | 15 min | Chercher une définition du genre |
| 9 h 23 | 7 min | Bien citer, le cours |
| 9 h 30 | 13 min | Citer, la pratique |
| 9 h 43 | 22 min | Lire l’étude de l’Insee, avec neuf questions qui obligent à lire |
| 10 h 05 | 30 min | Pause |
| 10 h 35 | 27 min | Analyser l’étude, question par question (L1 à L6) |
| 11 h 02 | 3 min | Dépôt |
| 11 h 05 | 10 min | Correction, en chasse aux indices dans l’étude |
| 11 h 15 | 5 min | Conseils de prise de notes |
| 11 h 20 | 25 min | Vidéo |
| 11 h 45 | 5 min | Notes à froid, comparaison en binôme |
| 11 h 50 | 10 min | Questions sur la vidéo, dépôt express |

Définir et citer tiennent en 43 minutes. Le temps nécessaire à chaque phase est calculé page par page dans `docs-internes/budget-temps.md`.

## Modifier une question ou un texte

Les textes sont directement dans les pages HTML de `docs/seance-09/`. On peut les modifier sur GitHub, sans rien installer.

1. Ouvrez le fichier de la page sur GitHub (par exemple `docs/seance-09/3-chercher.html`), puis cliquez sur le crayon « Edit this file ».
2. Cherchez le texte avec Ctrl+F (Cmd+F sur Mac). Une question ouverte ressemble à ceci :
   ```html
   <label class="qlabel" for="f-b2"><span class="qid">B2</span>De quel type de source s’agit-il…</label>
   <p class="indice" id="i-b2">Trois réponses courtes.</p>
   ```
   Changez le texte entre les balises, sans toucher à ce qui est entre `<` et `>`.
3. Pour un QCM, la bonne réponse est la lettre de `data-correct="b"`, et chaque retour est dans un bloc `<div data-fb="a">…</div>`.
4. Validez avec « Commit changes ». La page publiée se met à jour en une ou deux minutes.

La **correction** est une exception : elle est chiffrée. Modifiez `private/seance-09/7-correction.html` sur votre ordinateur, puis reconstruisez (voir plus bas).

Les règles d’écriture (pas de tiret long, peu de deux-points, apostrophes typographiques, vouvoiement…) sont contrôlées par `npm run lint`. Le contrôle signale aussi une page qui dépasse son budget de temps.

## Changer l’heure de départ

L’horloge suit l’heure de chaque appareil. Toutes les phases se calculent à partir de l’heure de départ.

- **Pour toute la classe, pendant la séance** : sur la page « Réponses des équipes », ouvrez « Heure de départ pour toute la classe ». Diffusez une heure (par exemple 10 h 00), ou cliquez « Démarrer maintenant » au vrai début. Les appareils des binômes et l’écran de projection la reçoivent en moins d’une minute. « Revenir à l’horaire du fichier » annule ce réglage. Il faut que l’envoi des réponses soit branché.
- **Pour toute la classe, par le fichier** : sur GitHub, ouvrez `docs/data/schedule.json` et changez `"departParDefaut": "09:00"` (par exemple `"10:00"`). Validez. Les pages ouvertes relisent ce fichier chaque minute.
- **Sur un seul appareil** : ajoutez à l’adresse de n’importe quelle page `?depart=09:15`, ou `?decalage=5` pour décaler de 5 minutes (ou `?decalage=-5`). Le réglage reste mémorisé sur cet appareil. Pour l’annuler : `?depart=defaut` ou `?decalage=0`.
- **Pour une démonstration** : `?now=10:30` simule l’heure (ici 10 h 30). Pour revenir à l’heure réelle : `?now=reel`.
- Si la séance démarre en retard, l’adresse affichée sous le code QR de l’écran de projection reprend le réglage de l’appareil de l’enseignant. Donnez-la aux binômes.

## Changer le mot de passe de la correction

Il faut un ordinateur avec [Node.js](https://nodejs.org) (version 18 ou plus) et une copie du dépôt.

1. Dans le dossier du dépôt, créez un fichier texte nommé `.env.local` contenant une seule ligne :
   ```
   CORRECTION_PASSWORD=votre-mot-de-passe
   ```
   Ce fichier n’est jamais envoyé sur GitHub.
2. Installez les outils une première fois :
   ```bash
   npm install
   ```
3. Reconstruisez :
   ```bash
   npm run build
   ```
4. Publiez le fichier `docs/seance-09/7-correction.html` mis à jour (voir « Publier »).

Un mot de passe provisoire a été utilisé pour le premier chiffrement. Choisissez le vôtre avant la séance. Le jour même, annoncez-le à 11 h 05, à la fin du dépôt, par exemple avec le bouton « Afficher en grand » de l’écran de projection (le mot de passe saisi là n’est enregistré nulle part).

## Reconstruire

```bash
npm run build
```

Le build lance le contrôle éditorial et le calcul des budgets, puis chiffre la correction avec StatiCrypt. Il s’arrête si une règle est violée ou si une phase dépasse son temps.

Autres commandes utiles :

```bash
npm run lint
```

```bash
npm run liens
```

```bash
npm run serve
```

`npm run serve` affiche le site sur `http://localhost:8080/fabrique/`. Les tests se lancent avec `npm test` (il faut avoir le mot de passe dans `.env.local` pour le test de la correction) et les captures d’écran avec `npm run captures`.

## Publier sur GitHub Pages

1. Sur GitHub, ouvrez le dépôt, puis **Settings**, puis **Pages**.
2. Dans « Build and deployment », choisissez **Deploy from a branch**, la branche **main** et le dossier **/docs**, puis **Save**. Le dossier **/ (root)** marche aussi : la page d’accueil du dépôt redirige alors vers `docs/`.
3. Une à deux minutes plus tard, l’adresse du site s’affiche en haut de la page Pages (de la forme `https://<compte>.github.io/<nom-du-depot>/`).

Le travail a été préparé sur la branche `claude/elegant-planck-ir8tii`. Fusionnez-la dans `main` (par une pull request) avant l’étape 2, ou choisissez provisoirement cette branche dans l’étape 2 pour essayer le site.

Après publication, vérifiez sur l’adresse publique : la page de la correction demande le mot de passe, le bouton « Télécharger le récapitulatif » produit bien un fichier, l’horloge affiche la bonne phase, et une équipe de test apparaît sur la page « Réponses des équipes ».

## Sauvegarder le dossier `private/`

`private/` contient la seule version lisible de la correction. Il n’est jamais publié, donc GitHub n’en garde aucune copie. Gardez-en une sauvegarde ailleurs : un dossier personnel dans le cloud de l’école, une clé USB, ou un dépôt GitHub **privé** distinct. Sans ce fichier, il faudrait réécrire la correction pour changer le mot de passe.

## Ce que le chiffrement protège

La correction publiée est chiffrée (AES, côté navigateur). Sans le mot de passe, son contenu n’apparaît pas dans le HTML servi. Le chiffrement protège contre la lecture directe, pas contre une personne déterminée qui aurait le mot de passe ou qui le devinerait : choisissez un mot de passe qui ne se devine pas. C’est suffisant ici. Si le dépôt est privé avec Pages activé (plan GitHub payant), vous pouvez ne pas chiffrer : mettez `"chiffrerCorrection": false` dans `docs/data/config.json`, puis reconstruisez.

L’option « se souvenir » évite de redemander le mot de passe à chaque rechargement, sur le même ordinateur, pendant 30 jours.

## Voir les réponses en direct

Le site n’a pas de serveur. Pour que vous voyiez les réponses des binômes, elles sont envoyées dans une **feuille Google privée**, dans votre compte, par un petit script. Vous les lisez ensuite sur la page « Réponses des équipes » (`prof/reponses.html`), avec une clé que vous seul·e connaissez. Comptez une dizaine de minutes, une seule fois. Il faut un compte Google (un compte personnel suffit).

**1. Créer la feuille et le script**

1. Sur [Google Sheets](https://sheets.google.com), créez une feuille vierge, par exemple « Séance 9, réponses ».
2. Dans cette feuille, menu **Extensions**, puis **Apps Script**.
3. Effacez le contenu de l’éditeur, puis collez tout le fichier `scripts/apps-script/Code.gs` du dépôt.
4. En haut du script, remplacez `CHOISISSEZ_UNE_CLE` par une clé de votre choix, longue et difficile à deviner. Ne la mettez jamais dans le dépôt GitHub : vous la taperez seulement sur la page « Réponses des équipes ». Ne changez pas la ligne `JETON`, elle doit rester identique à celle de `docs/data/config.json`.
5. Enregistrez (icône disquette).

**2. Publier le script**

1. Bouton **Déployer**, puis **Nouveau déploiement**.
2. Roue dentée, type **Application Web**.
3. « Exécuter en tant que » : **Moi**. « Qui a accès » : **Tout le monde**.
4. **Déployer**, puis autorisez l’accès à votre compte quand Google le demande (l’écran « application non validée » est normal pour un script personnel : « Paramètres avancés », puis « Accéder au projet »).
5. Copiez l’**URL de l’application Web** (elle se termine par `/exec`).

**3. Brancher le site**

1. Sur GitHub, ouvrez `docs/data/config.json`, crayon « Edit this file ».
2. Dans `"collecte"`, mettez `"actif": true` et collez l’adresse dans `"endpoint"`.
3. Validez. Une à deux minutes plus tard, le site envoie les réponses.

**4. Vérifier**

Ouvrez une page de la séance, tapez un nom d’équipe, attendez quelques secondes, puis ouvrez `prof/reponses.html` et tapez votre clé. L’équipe de test doit apparaître. Vous pouvez ensuite supprimer sa ligne dans la feuille Google.

**Ce que vous voyez sur la page « Réponses des équipes »**

- La vue d’ensemble : pour chaque équipe, le drapeau d’aide, la page en cours, la dernière activité, les points, l’avancement des quêtes, les champs requis remplis et l’heure des dépôts. Les équipes qui demandent de l’aide sont en tête.
- Par question : toutes les réponses des équipes à une question, et pour un QCM la répartition des réponses et le nombre de bonnes réponses du premier coup.
- Par équipe : toutes les réponses d’une équipe, et ses récapitulatifs envoyés.
- L’heure de départ pour toute la classe (voir plus haut).
- La page s’actualise toute seule toutes les 20 secondes.

**Ce qui est envoyé, et quand.** Le nom d’équipe, les deux noms, l’icône, la page en cours, les points, l’avancement des quêtes, le drapeau d’aide, les réponses et les dépôts. L’envoi a lieu peu après l’arrivée sur une page, puis toutes les 45 secondes s’il y a du nouveau, quand on quitte la page, quand le drapeau change, à chaque point d’arrêt, et au dépôt. Les étudiant·es en sont informé·es sur la page Cadre, au moment de saisir leurs noms. Avant la séance, décidez de l’information à leur donner et de la durée de conservation de la feuille (RGPD).

**À savoir.** Le jeton de `config.json` n’est pas un secret : il est lisible dans le code du site et évite seulement les envois par erreur. La clé enseignant, elle, reste dans votre script Google et dans votre tête. Si l’envoi échoue (réseau), les binômes peuvent toujours télécharger leur récapitulatif.

## Comment le site fonctionne

- **État partagé** : toutes les pages lisent et écrivent le même objet dans le navigateur (clé `fabrique:s09:v1`). Une écriture a lieu 350 ms après chaque saisie, et tout de suite quand on quitte la page. Si le navigateur refuse d’enregistrer (navigation privée stricte), un message demande de copier régulièrement le récapitulatif.
- **Horloge** : les phases, les comptes à rebours et les écrans STOP viennent de `schedule.json`. À chaque point d’arrêt, un bandeau prévient pendant 60 secondes, puis un écran plein cadre propose un seul bouton vers la page suivante. Les réponses sont conservées, et les pages précédentes restent accessibles ensuite.
- **Dépôt** : le bouton « Envoyer à l’enseignant » envoie le récapitulatif complet et signale que le dépôt est fait. Le récapitulatif peut aussi être téléchargé (`s09_<equipe>_parcours.txt`, et `s09_<equipe>_video.txt` pour la vidéo) ou copié, en secours.
- **Jeu** : points d’enquête, quatre quêtes, huit badges, anneaux de compétences et phrase mystère. Pendant la correction, l’étude de l’Insee devient une chasse aux indices : pour chaque question d’analyse, l’équipe clique dans le document sur le passage qui justifie la réponse, puis découvre la réponse proposée à côté de la sienne. Les points ne sont pas une note, il n’y a ni niveau ni classement. Le mode sobre (menu) masque les animations et les badges. Les animations sont coupées si l’appareil demande moins de mouvement.
- **Accessibilité** : navigation au clavier, retours de QCM annoncés aux lecteurs d’écran, contrastes vérifiés en mode sombre et clair. Les tests incluent un audit axe-core sur chaque page, et Lighthouse donne 100 en accessibilité sur chaque page.

## Licences

Polices Archivo et Literata sous licence SIL Open Font License (fichiers `OFL-*.txt` dans `docs/assets/fonts/`). Bibliothèque de code QR `qrcode-generator` de Kazuhiko Arase, licence MIT (`docs/assets/js/vendor/qrcode.mjs`). StatiCrypt (licence MIT) n’est utilisé qu’au moment du build.
