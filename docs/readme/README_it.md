<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · **Italiano**
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

App Android su misura per ascoltare la tua musica da un server [Navidrome](https://www.navidrome.org/) (API Subsonic).
Tema scuro con colore regolabile, animazioni GSAP, testi sincronizzati, modalità offline e controllo di deemix dall'app.
Impacchettata come APK con [Capacitor](https://capacitorjs.com/), con un layout adattato al Galaxy Z Fold (chiuso / aperto).

## Novità della v6
- **Lettore nativo Android (ExoPlayer/Media3), come Subtracks**: la coda è riprodotta da un servizio Android, non più dalla pagina web. La musica passa da un brano all'altro a schermo spento o con l'app in background, e la notifica (play/pausa/precedente/successivo) controlla il vero lettore.
- Limiti della modalità nativa: niente equalizzatore né dissolvenza incrociata (sostituiti dalla riproduzione senza pause del lettore nativo).

## Novità della v4
- Un brano non parte più a metà: la vecchia posizione di ripresa viene applicata solo al brano a cui appartiene.
- Riproduzione in background più robusta (blocco CPU/Wi-Fi durante la riproduzione, passaggio al brano successivo sorvegliato). Impostazioni › Riproduzione in background: pulsante per togliere la restrizione della batteria.
- Offline: ordinamento di artisti, album e playlist (A→Z, recenti, più brani, più pesanti) e menu ⋯ › «Scarica tutte le mie playlist».
- L'APK viene compilato automaticamente da GitHub Actions a ogni aggiornamento (scheda Releases).

## Scaricare l'APK

➡️ **[Scarica Opus v6 (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, 4,6 MB. Il file è visibile anche
nell'elenco dei file del repository.

Hash SHA-256 per verificare il file: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Installazione su Android:
1. Scarica `opus.apk` direttamente sul telefono.
2. Apri il file. Android chiede di consentire l'installazione da questa origine (browser o gestore file): accetta.
3. Tocca **Installa**.

Note:
- È un APK di **debug** (firmato con la chiave di debug di Android Studio). Se hai già una versione di Opus firmata in altro modo,
  disinstallala prima.
- Su Android 13+, consenti le notifiche per Opus (controlli multimediali sulla schermata di blocco) e imposta la batteria dell'app su
  «Senza restrizioni» perché la riproduzione continui a schermo spento.
- Il telefono deve poter raggiungere il tuo server Navidrome (per esempio tramite Tailscale).

## Funzioni principali

### Novità della v3
- **Gesti stile iPhone** (Impostazioni › Gesti e scorciatoie): trascinare in basso in cima a una pagina apre il suo menu ⋯, scorrere
  in basso sul lettore apre il menu del brano, in alto la coda, doppio tocco sulla copertina = mi piace,
  pressione prolungata su un brano, un album, una playlist o un artista = il suo menu, scorrere un brano a destra = riproduci dopo, a sinistra =
  aggiungi alla coda. Tutto è configurabile.
- **Temi**: scuro, AMOLED (nero puro) e chiaro.
- **Fold aperto**: libreria a sinistra, lettore fisso a destra con il testo (o la coda) sotto. Da chiuso, l'app
  torna normale.
- **Cartelle di playlist**: organizzazione locale sul telefono (Navidrome non gestisce le cartelle).
- **Importazione di playlist da Spotify, YouTube e YouTube Music** tramite link, senza chiave API: i brani vengono ritrovati nella
  libreria, quelli mancanti possono essere inviati a deemix e la playlist può essere ricreata in Navidrome.
- **Rilevamento dei doppioni**: lo stesso brano in più copie o qualità, la qualità migliore in cima.
- **deemix caso per caso**: qualità (FLAC, 320, 128) e playlist di destinazione scelte a ogni download.
- **Android**: scorciatoie sull'icona (Flow, Offline, Cerca) e widget per la schermata Home.

### Ascolto e scoperta
- **Flow** (mix infinito secondo i tuoi gusti, con stati d'animo), **Mix del giorno**, **radio** a partire da un brano o un artista.
- **Gemme dimenticate**, **Accadde oggi**, **Novità dei tuoi artisti**, **Blind test**, **Cronologia**, **Replay**.
- Testi sincronizzati e toccabili, coda, timer di spegnimento, equalizzatore, ReplayGain, dissolvenza incrociata, modalità auto.
- Modalità offline a schede (Brani, Artisti, Album, Playlist).
- Più di 40 funzioni da attivare o disattivare in Impostazioni › Funzioni.

## Configurazione

Al primo avvio, inserisci l'indirizzo del tuo server Navidrome (per esempio `http://mon-serveur:4533`), il tuo nome utente e
la password. Il colore del tema si cambia in Impostazioni › Aspetto.

### deemix (facoltativo)
Opus può controllare un piccolo servizio installato sul tuo server (cartella `server/`, vedi `server/README-serveur.md`) per
scaricare brani da Deezer nella cartella musicale di Navidrome. L'ARL di Deezer si inserisce nell'app.
Attenzione: questo uso è contrario alle condizioni d'uso di Deezer.

## Compilarlo da solo (Windows)

Prerequisiti: Node.js 20+, Android Studio con l'SDK Android e **JDK 21** (Gradle 8.14 non legge ancora le classi
compilate con Java 27 o successivo).

```
npm install
npm run android:add     # crea la cartella android/ e applica le correzioni
npm run sync            # build web + sincronizzazione Capacitor
cd android
gradlew.bat assembleDebug
```

L'APK viene prodotto in `android/app/build/outputs/apk/debug/app-debug.apk`.

Se Gradle usa il Java sbagliato, imposta `JAVA_HOME` sul JDK 21 prima di compilare:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

Per provarlo senza server: `npm run mock` (finto Navidrome, credenziali `test` / `test`) e poi `npm run dev`.

## Limiti noti
- L'importazione da Spotify / YouTube legge le pagine pubbliche di questi siti, il cui formato cambia spesso. Se non riesce, incollare
  un elenco «Artista - Titolo» funziona sempre. Senza account vengono letti solo i primi 100 brani.
- La modalità Fold, il widget e i gesti sono stati verificati in simulazione, non ancora su tutti i dispositivi.
- Il visualizzatore è decorativo.
- L'equalizzatore richiede che il tuo server consenta CORS sui flussi audio (`Access-Control-Allow-Origin`).
