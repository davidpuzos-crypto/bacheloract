# La fabrique du social, site de séance

Site du cours « La fabrique du social, introduction à la sociologie » (Bachelor ACT). Il conduit la **séance 9**, une matinée de méthode de 9 h 00 à 12 h 00 en binôme : définir, citer, lire une étude de l’Insee, prendre des notes pendant une vidéo.

Le site est statique (HTML, CSS, JavaScript sans framework). Il est publié par GitHub Pages depuis le dossier `docs/`. Les réponses des étudiant·es restent dans leur navigateur. Aucun cookie, aucune mesure d’audience, aucune police chargée depuis un autre site.

## Ce qu’il y a dans le dépôt

| Emplacement | Contenu |
|---|---|
| `docs/` | Le site publié. Accueil du cours (`index.html`), pages de la séance 9 (`seance-09/`), pages de l’enseignant (`prof/`), styles, scripts, polices et icônes (`assets/`). |
| `docs/data/schedule.json` | Le déroulé chronométré : heure de départ, phases, textes des écrans STOP. |
| `docs/data/config.json` | Les liens (Moodle, Insee, vidéo…), la collecte optionnelle et les options d’affichage. |
| `private/` | **Jamais publié.** La correction en clair, avant chiffrement. Ignoré par Git. |
| `scripts/` | Le build (chiffrement), le contrôle éditorial, le calcul des budgets de temps, le contrôle des liens, un petit serveur local. |
| `tests/` | Les tests automatiques (Playwright). |
| `docs-internes/budget-temps.md` | Le calcul du temps nécessaire à chaque phase, page par page. |
| `VERIFICATIONS.md` | Tout ce qui reste à vérifier avant la séance, et les coupes faites. |

Les pages élèves sont, dans l’ordre : `index.html` (accueil de la séance), `1-cadre`, `2-methode`, `3-chercher`, `4-citer-lecture`, `5-citer-pratique`, `pause`, `6-lire` (avec le dépôt), `7-correction` (chiffrée), `8-notes`, `9-video`, `10-fin`. Côté enseignant : `prof/projecteur.html` (à projeter) et `prof/deroule.html` (feuille de route).

## Modifier une question ou un texte

Les textes sont directement dans les pages HTML de `docs/seance-09/`. On peut les modifier sur GitHub, sans rien installer.

1. Ouvrez le fichier de la page sur GitHub (par exemple `docs/seance-09/3-chercher.html`), puis cliquez sur le crayon « Edit this file ».
2. Cherchez le texte avec Ctrl+F (Cmd+F sur Mac). Une question ouverte ressemble à ceci :
   ```html
   <label class="qlabel" for="f-a2"><span class="qid">A2</span>Les deux premiers paragraphes…</label>
   <p class="indice" id="i-a2">Deux ou trois phrases.</p>
   ```
   Changez le texte entre les balises, sans toucher à ce qui est entre `<` et `>`.
3. Pour un QCM, la bonne réponse est la lettre de `data-correct="b"`, et chaque retour est dans un bloc `<div data-fb="a">…</div>`.
4. Validez avec « Commit changes ». La page publiée se met à jour en une ou deux minutes.

La **correction** est une exception : elle est chiffrée. Modifiez `private/seance-09/7-correction.html` sur votre ordinateur, puis reconstruisez (voir plus bas).

Les règles d’écriture (pas de tiret long, peu de deux-points, apostrophes typographiques, vouvoiement…) sont contrôlées par `npm run lint`. Le contrôle signale aussi une page qui dépasse son budget de temps.

## Changer l’heure de départ

L’horloge suit l’heure de chaque appareil. Toutes les phases se calculent à partir de l’heure de départ.

- **Pour toute la classe** : sur GitHub, ouvrez `docs/data/schedule.json` et changez `"departParDefaut": "09:00"` (par exemple `"09:15"`). Validez. C’est à faire avant la séance.
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

Un mot de passe provisoire a été utilisé pour le premier chiffrement. Choisissez le vôtre avant la séance. Le jour même, annoncez-le à 11 h 00, par exemple avec le bouton « Afficher en grand » de l’écran de projection (le mot de passe saisi là n’est enregistré nulle part).

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
2. Dans « Build and deployment », choisissez **Deploy from a branch**, la branche **main** et le dossier **/docs**, puis **Save**.
3. Une à deux minutes plus tard, l’adresse du site s’affiche en haut de la page Pages (de la forme `https://<compte>.github.io/<nom-du-depot>/`).

Le travail a été préparé sur la branche `claude/elegant-planck-ir8tii`. Fusionnez-la dans `main` (par une pull request) avant l’étape 2, ou choisissez provisoirement cette branche dans l’étape 2 pour essayer le site.

Après publication, vérifiez sur l’adresse publique : la page de la correction demande le mot de passe, le bouton « Télécharger le récapitulatif » produit bien un fichier, et l’horloge affiche la bonne phase.

## Sauvegarder le dossier `private/`

`private/` contient la seule version lisible de la correction. Il n’est jamais publié, donc GitHub n’en garde aucune copie. Gardez-en une sauvegarde ailleurs : un dossier personnel dans le cloud de l’école, une clé USB, ou un dépôt GitHub **privé** distinct. Sans ce fichier, il faudrait réécrire la correction pour changer le mot de passe.

## Ce que le chiffrement protège

La correction publiée est chiffrée (AES, côté navigateur). Sans le mot de passe, son contenu n’apparaît pas dans le HTML servi. Le chiffrement protège contre la lecture directe, pas contre une personne déterminée qui aurait le mot de passe ou qui le devinerait : choisissez un mot de passe qui ne se devine pas. C’est suffisant ici. Si le dépôt est privé avec Pages activé (plan GitHub payant), vous pouvez ne pas chiffrer : mettez `"chiffrerCorrection": false` dans `docs/data/config.json`, puis reconstruisez.

L’option « se souvenir » évite de redemander le mot de passe à chaque rechargement, sur le même ordinateur, pendant 30 jours.

## Collecte automatique vers une feuille Google (facultatif)

Désactivée par défaut. Activée, elle envoie en plus chaque dépôt (équipe, noms, étape, points, temps, récapitulatif) vers une feuille Google privée, pour voir les dépôts arriver en direct. Avant de l’activer, décidez de l’information donnée aux étudiant·es et de la durée de conservation des données.

1. Créez une feuille Google, puis **Extensions**, **Apps Script**. Collez ce script en remplaçant le jeton :
   ```javascript
   const JETON = 'REMPLACER_PAR_UN_JETON';

   function doPost(e) {
     try {
       const d = JSON.parse(e.postData.contents);
       if (d.jeton !== JETON) {
         return sortie({ ok: false, erreur: 'jeton' });
       }
       const feuille = SpreadsheetApp.getActive().getSheetByName('Depots')
         || SpreadsheetApp.getActive().insertSheet('Depots');
       feuille.appendRow([new Date(), d.equipe, d.noms, d.etape, d.points, d.temps, d.recap]);
       return sortie({ ok: true });
     } catch (err) {
       return sortie({ ok: false, erreur: String(err) });
     }
   }

   function sortie(obj) {
     return ContentService.createTextOutput(JSON.stringify(obj))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```
2. **Déployer**, **Nouveau déploiement**, type **Application Web**, exécuter en tant que vous-même, accès « Tout le monde ». Copiez l’adresse obtenue.
3. Dans `docs/data/config.json`, mettez `"actif": true`, l’adresse dans `"endpoint"` et le même jeton dans `"jeton"`.

Le jeton n’est pas un secret : il est lisible dans le code du site. Il évite seulement les envois par erreur. Le site affiche un avis avant l’envoi, et propose toujours la copie et le téléchargement en plus.

## Comment le site fonctionne

- **État partagé** : toutes les pages lisent et écrivent le même objet dans le navigateur (clé `fabrique:s09:v1`). Une écriture a lieu 350 ms après chaque saisie, et tout de suite quand on quitte la page. Si le navigateur refuse d’enregistrer (navigation privée stricte), un message demande de copier régulièrement le récapitulatif.
- **Horloge** : les phases, les comptes à rebours et les écrans STOP viennent de `schedule.json`. À chaque point d’arrêt, un bandeau prévient pendant 60 secondes, puis un écran plein cadre propose un seul bouton vers la page suivante. Les réponses sont conservées, et les pages précédentes restent accessibles ensuite.
- **Récapitulatif** : texte brut à copier ou à télécharger (`s09_<equipe>_parcours.txt`, et `s09_<equipe>_video.txt` pour le dépôt express), à déposer sur Moodle.
- **Jeu** : points d’expérience, quatre quêtes, huit badges, anneaux de compétences et phrase mystère. Les points ne sont pas une note, et il n’y a aucun classement. Le mode sobre (menu) masque les animations et les badges. Les animations sont coupées si l’appareil demande moins de mouvement.
- **Accessibilité** : navigation au clavier, retours de QCM annoncés aux lecteurs d’écran, contrastes vérifiés en mode sombre et clair. Les tests incluent un audit axe-core sur chaque page, et Lighthouse donne 100 en accessibilité sur chaque page.

## Licences

Polices Archivo et Literata sous licence SIL Open Font License (fichiers `OFL-*.txt` dans `docs/assets/fonts/`). Bibliothèque de code QR `qrcode-generator` de Kazuhiko Arase, licence MIT (`docs/assets/js/vendor/qrcode.mjs`). StatiCrypt (licence MIT) n’est utilisé qu’au moment du build.
