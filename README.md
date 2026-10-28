<div align="center">

[English](docs/readme/README_en.md) · [简体中文](docs/readme/README_zh.md) · [繁體中文](docs/readme/README_zh-TW.md) · [日本語](docs/readme/README_ja.md) · [한국어](docs/readme/README_ko.md) · [Türkçe](docs/readme/README_tr.md) · [Русский](docs/readme/README_ru.md) · [Tiếng Việt](docs/readme/README_vi.md) · [ไทย](docs/readme/README_th.md) · [Deutsch](docs/readme/README_de.md) · [Español](docs/readme/README_es.md) · **Français** · [Українська](docs/readme/README_uk.md) · [Polski](docs/readme/README_pl.md) · [Português (Brasil)](docs/readme/README_pt-BR.md) · [العربية](docs/readme/README_ar.md) · [فارسی](docs/readme/README_fa.md) · [Bahasa Indonesia](docs/readme/README_id.md) · [Italiano](docs/readme/README_it.md)
· [Ελληνικά](docs/readme/README_el.md) · [മലയാളം](docs/readme/README_ml.md) · [Roman Urdu](docs/readme/README_ur-Latn.md) · [Română](docs/readme/README_ro.md)

</div>

# Opus

Application Android sur mesure pour écouter sa musique depuis un serveur [Navidrome](https://www.navidrome.org/) (API Subsonic).
Thème sombre à couleur réglable, animations GSAP, paroles synchronisées, mode hors-ligne, et pilotage de deemix depuis l'appli.
Emballée en APK avec [Capacitor](https://capacitorjs.com/), avec une disposition adaptée au Galaxy Z Fold (plié / déplié).

## Nouveautés v6
- **Lecteur natif Android (ExoPlayer/Media3), comme Subtracks** : la file d'attente est jouée par un service Android, plus par la page web. La musique enchaîne les titres écran éteint ou appli en arrière-plan, et la notification (lecture/pause/précédent/suivant) pilote le vrai lecteur.
- Limites du mode natif : pas d'égaliseur ni de fondu enchaîné (remplacé par l'enchaînement sans coupure du lecteur natif).

## Nouveautés v4
- Un titre ne démarre plus au milieu : l'ancienne position de reprise n'est appliquée qu'au titre auquel elle appartient.
- Lecture en arrière-plan renforcée (verrou CPU/Wi-Fi pendant la lecture, passage au titre suivant surveillé). Réglages › Lecture en arrière-plan : bouton pour retirer la restriction de batterie.
- Hors-ligne : tri des artistes, albums et playlists (A→Z, récents, plus de titres, plus lourds) et menu ⋯ › « Télécharger toutes mes playlists ».
- L'APK est compilé automatiquement par GitHub Actions à chaque mise à jour (onglet Releases).

## Télécharger l'APK

➡️ **[Télécharger Opus v6 (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, soit 4,6 Mo. Le fichier est aussi visible
dans la liste des fichiers du dépôt.

Empreinte SHA-256 pour vérifier le fichier : `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Installation sur Android :
1. Télécharge `opus.apk` directement sur le téléphone.
2. Ouvre le fichier. Android demande d'autoriser l'installation depuis cette source (navigateur ou gestionnaire de fichiers) : accepte.
3. Appuie sur **Installer**.

Remarques :
- C'est un APK de **debug** (signé avec la clé de debug d'Android Studio). Si tu as déjà une version d'Opus signée autrement,
  désinstalle-la d'abord.
- Sur Android 13+, autorise les notifications pour Opus (contrôles média sur l'écran de verrouillage) et mets l'appli en
  batterie « Non restreinte » pour que la lecture continue écran éteint.
- Le téléphone doit pouvoir joindre ton serveur Navidrome (par exemple via Tailscale).

## Fonctions principales

### Nouveautés v3
- **Gestes façon iPhone** (Réglages › Gestes et raccourcis) : tirer vers le bas en haut d'une page ouvre son menu ⋯, glisser
  vers le bas sur le lecteur ouvre le menu du titre, vers le haut la file d'attente, double tap sur la pochette = j'aime,
  appui long sur un titre, un album, une playlist ou un artiste = son menu, glisser un titre à droite = lire ensuite, à gauche =
  ajouter à la file. Tout est réglable.
- **Thèmes** : sombre, AMOLED (noir pur) et clair.
- **Fold déplié** : bibliothèque à gauche, lecteur ancré à droite avec les paroles (ou la file) en dessous. Replié, l'appli
  redevient normale.
- **Dossiers de playlists** : rangement local sur le téléphone (Navidrome ne gère pas les dossiers).
- **Import de playlists Spotify, YouTube et YouTube Music** par lien, sans clé d'API : les titres sont retrouvés dans la
  bibliothèque, les manquants peuvent partir vers deemix, et la playlist peut être recréée dans Navidrome.
- **Détection des doublons** : même titre en plusieurs exemplaires ou qualités, meilleure qualité en tête.
- **deemix au cas par cas** : qualité (FLAC, 320, 128) et playlist de destination choisies à chaque lancement.
- **Android** : raccourcis d'icône (Flow, Hors-ligne, Recherche) et widget d'écran d'accueil.

### Écoute et découverte
- **Flow** (mix sans fin selon tes goûts, avec humeurs), **Mix du jour**, **radios** d'un titre ou d'un artiste.
- **Pépites oubliées**, **Ce jour-là**, **Nouveautés de tes artistes**, **Blind test**, **Historique**, **Replay**.
- Paroles synchronisées et tactiles, file d'attente, minuterie de sommeil, égaliseur, ReplayGain, fondu enchaîné, mode voiture.
- Mode hors-ligne par onglets (Titres, Artistes, Albums, Playlists).
- Plus de 40 fonctions activables ou non dans Réglages › Fonctionnalités.

## Configuration

Au premier lancement, renseigne l'adresse de ton serveur Navidrome (par exemple `http://mon-serveur:4533`), ton identifiant et
ton mot de passe. La couleur du thème se change dans Réglages › Apparence.

### deemix (optionnel)
Opus peut piloter un petit service installé sur ton serveur (dossier `server/`, voir `server/README-serveur.md`) pour
télécharger des titres depuis Deezer dans le dossier de musique de Navidrome. L'ARL Deezer se saisit dans l'appli.
Attention : cet usage est contraire aux conditions d'utilisation de Deezer.

## Compiler soi-même (Windows)

Prérequis : Node.js 20+, Android Studio avec le SDK Android, et **JDK 21** (Gradle 8.14 ne lit pas encore les classes
compilées par Java 27 ou plus).

```
npm install
npm run android:add     # crée le dossier android/ et applique les correctifs
npm run sync            # build web + synchronisation Capacitor
cd android
gradlew.bat assembleDebug
```

L'APK est produit dans `android/app/build/outputs/apk/debug/app-debug.apk`.

Si Gradle utilise le mauvais Java, définis `JAVA_HOME` vers le JDK 21 avant de lancer la compilation :

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

Pour essayer sans serveur : `npm run mock` (faux Navidrome, identifiants `test` / `test`) puis `npm run dev`.

## Limites connues
- L'import Spotify / YouTube lit les pages publiques de ces sites, dont le format change souvent. En cas d'échec, coller une
  liste « Artiste - Titre » fonctionne toujours. Sans compte, seuls les 100 premiers titres sont lus.
- Le mode Fold, le widget et les gestes ont été vérifiés par simulation, pas encore sur tous les appareils.
- Le visualiseur est décoratif.
- L'égaliseur demande que ton serveur autorise CORS sur les flux audio (`Access-Control-Allow-Origin`).
