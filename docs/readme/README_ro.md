<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · **Română**

</div>

# Opus

Aplicație Android făcută pe măsură pentru a-ți asculta muzica de pe un server [Navidrome](https://www.navidrome.org/) (API Subsonic).
Temă întunecată cu culoare reglabilă, animații GSAP, versuri sincronizate, mod offline și controlul deemix din aplicație.
Împachetată ca APK cu [Capacitor](https://capacitorjs.com/), cu un aranjament adaptat pentru Galaxy Z Fold (pliat / desfăcut).

## Noutăți în v6
- **Player nativ Android (ExoPlayer/Media3), ca în Subtracks**: coada este redată de un serviciu Android, nu de pagina web. Muzica trece de la o piesă la alta cu ecranul stins sau cu aplicația în fundal, iar notificarea (redare/pauză/anterior/următor) controlează playerul adevărat.
- Limitele modului nativ: fără egalizator și fără crossfade (înlocuite de redarea fără pauze a playerului nativ).

## Noutăți în v4
- O piesă nu mai începe de la jumătate: vechea poziție de reluare se aplică doar piesei căreia îi aparține.
- Redare în fundal mai robustă (blocare CPU/Wi-Fi în timpul redării, trecerea la piesa următoare supravegheată). Setări › Redare în fundal: buton pentru eliminarea restricției de baterie.
- Offline: sortarea artiștilor, albumelor și playlisturilor (A→Z, recente, cele mai multe piese, cele mai mari) și meniul ⋯ › „Descarcă toate playlisturile mele”.
- APK-ul este compilat automat de GitHub Actions la fiecare actualizare (fila Releases).

## Descarcă APK-ul

➡️ **[Descarcă Opus v6 (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, 4,6 MB. Fișierul apare și
în lista de fișiere a depozitului.

Suma SHA-256 pentru verificarea fișierului: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Instalare pe Android:
1. Descarcă `opus.apk` direct pe telefon.
2. Deschide fișierul. Android cere permisiunea de a instala din această sursă (browser sau manager de fișiere): acceptă.
3. Atinge **Instalează**.

Observații:
- Este un APK de **debug** (semnat cu cheia de depanare a Android Studio). Dacă ai deja o versiune de Opus semnată altfel,
  dezinstaleaz-o mai întâi.
- Pe Android 13+, permite notificările pentru Opus (comenzile media de pe ecranul de blocare) și setează bateria aplicației pe
  „Nerestricționat”, ca redarea să continue cu ecranul stins.
- Telefonul trebuie să poată ajunge la serverul tău Navidrome (de exemplu prin Tailscale).

## Funcții principale

### Noutăți în v3
- **Gesturi ca pe iPhone** (Setări › Gesturi și scurtături): tragerea în jos în partea de sus a unei pagini deschide meniul ei ⋯, glisarea
  în jos pe player deschide meniul piesei, în sus coada, atingere dublă pe copertă = îmi place,
  apăsare lungă pe o piesă, un album, un playlist sau un artist = meniul lui, glisarea unei piese la dreapta = redă în continuare, la stânga =
  adaugă în coadă. Totul se poate configura.
- **Teme**: întunecată, AMOLED (negru pur) și luminoasă.
- **Fold desfăcut**: biblioteca în stânga, playerul fixat în dreapta cu versurile (sau coada) dedesubt. Pliată, aplicația
  revine la normal.
- **Dosare de playlisturi**: organizare locală pe telefon (Navidrome nu gestionează dosare).
- **Import de playlisturi din Spotify, YouTube și YouTube Music** prin link, fără cheie API: piesele sunt căutate în
  bibliotecă, cele care lipsesc pot fi trimise la deemix, iar playlistul poate fi recreat în Navidrome.
- **Detectarea duplicatelor**: aceeași piesă în mai multe copii sau calități, cea mai bună calitate prima.
- **deemix de la caz la caz**: calitatea (FLAC, 320, 128) și playlistul de destinație se aleg la fiecare descărcare.
- **Android**: scurtături pe pictograma aplicației (Flow, Offline, Căutare) și widget pentru ecranul de pornire.

### Ascultare și descoperire
- **Flow** (mix nesfârșit după gusturile tale, cu stări), **Mixul zilei**, **radiouri** pornind de la o piesă sau un artist.
- **Comori uitate**, **În această zi**, **Noutăți de la artiștii tăi**, **Blind test**, **Istoric**, **Replay**.
- Versuri sincronizate pe care poți atinge, coadă, temporizator de somn, egalizator, ReplayGain, crossfade, mod mașină.
- Mod offline pe file (Piese, Artiști, Albume, Playlisturi).
- Peste 40 de funcții care se activează sau se dezactivează în Setări › Funcții.

## Configurare

La prima pornire, introdu adresa serverului tău Navidrome (de exemplu `http://mon-serveur:4533`), numele de utilizator și
parola. Culoarea temei se schimbă în Setări › Aspect.

### deemix (opțional)
Opus poate controla un mic serviciu instalat pe serverul tău (dosarul `server/`, vezi `server/README-serveur.md`) pentru a
descărca piese de pe Deezer în dosarul de muzică al Navidrome. ARL-ul Deezer se introduce în aplicație.
Atenție: această utilizare încalcă condițiile de utilizare Deezer.

## Compilează-l singur (Windows)

Cerințe: Node.js 20+, Android Studio cu Android SDK și **JDK 21** (Gradle 8.14 nu poate citi încă clasele
compilate cu Java 27 sau mai nou).

```
npm install
npm run android:add     # creează dosarul android/ și aplică corecturile
npm run sync            # build web + sincronizare Capacitor
cd android
gradlew.bat assembleDebug
```

APK-ul este generat în `android/app/build/outputs/apk/debug/app-debug.apk`.

Dacă Gradle folosește alt Java, setează `JAVA_HOME` pe JDK 21 înainte de compilare:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

Pentru a încerca fără server: `npm run mock` (Navidrome fals, date de autentificare `test` / `test`), apoi `npm run dev`.

## Limitări cunoscute
- Importul din Spotify / YouTube citește paginile publice ale acestor site-uri, al căror format se schimbă des. Dacă eșuează, lipirea
  unei liste „Artist - Titlu” funcționează mereu. Fără cont, se citesc doar primele 100 de piese.
- Modul Fold, widgetul și gesturile au fost verificate prin simulare, încă nu pe toate dispozitivele.
- Vizualizatorul este decorativ.
- Egalizatorul necesită ca serverul tău să permită CORS pe fluxurile audio (`Access-Control-Allow-Origin`).
