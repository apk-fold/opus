<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · **Roman Urdu** · [Română](README_ro.md)

</div>

# Opus

[Navidrome](https://www.navidrome.org/) server (Subsonic API) se apni music sunne ke liye khaas taur par banayi gayi Android app.
Badalne wale rang ke saath dark theme, GSAP animations, sync hone wale lyrics, offline mode, aur app ke andar se deemix ka control.
[Capacitor](https://capacitorjs.com/) ke saath APK ki soorat mein pack ki gayi, Galaxy Z Fold (band / khula) ke mutabiq layout ke saath.

## v6 mein naya kya hai
- **Native Android player (ExoPlayer/Media3), Subtracks ki tarah**: queue ab web page nahin balke ek Android service chalati hai. Screen band ho ya app background mein ho, gaane aik ke baad aik chalte rehte hain, aur notification (play/pause/pichla/agla) asal player ko control karti hai.
- Native mode ki hadood: equalizer aur crossfade nahin (in ki jagah native player ki baghair waqfe wali playback).

## v4 mein naya kya hai
- Gaana ab beech se shuru nahin hota: purani resume position sirf usi gaane par lagti hai jis ki woh hai.
- Zyada mazboot background playback (chalte waqt CPU/Wi-Fi lock, agle gaane par jaane ki nigrani). Settings › Background playback: battery ki pabandi hatane ka button.
- Offline: artists, albums aur playlists ki tarteeb (A→Z, haaliya, sab se zyada gaane, sab se bhaari) aur ⋯ menu › "Meri tamam playlists download karein".
- Har update par GitHub Actions APK khud-ba-khud build karta hai (Releases tab).

## APK download karein

➡️ **[Opus v6 download karein (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, 4.6 MB. Yeh file
repository ki files ki list mein bhi nazar aati hai.

File ki tasdeeq ke liye SHA-256 hash: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Android par install karna:
1. `opus.apk` seedha phone par download karein.
2. File kholein. Android is source (browser ya file manager) se install karne ki ijazat maangega: qubool karein.
3. **Install** dabayein.

Notes:
- Yeh ek **debug** APK hai (Android Studio ki debug key se signed). Agar aap ke paas pehle se kisi aur tareeqe se signed Opus hai,
  to pehle use uninstall karein.
- Android 13+ par Opus ke notifications ki ijazat dein (lock screen par media controls) aur app ki battery ko
  "Unrestricted" par rakhein taake screen band hone par bhi playback chalti rahe.
- Phone ko aap ke Navidrome server tak pohnchna chahiye (maslan Tailscale ke zariye).

## Ahem features

### v3 mein naya kya hai
- **iPhone jaise gestures** (Settings › Gestures aur shortcuts): page ke upar neeche kheenchne se us ka ⋯ menu khulta hai, player par
  neeche swipe karne se gaane ka menu, upar swipe se queue, cover par double tap = pasand,
  gaane, album, playlist ya artist par lamba dabana = us ka menu, gaana daayen swipe = agla chalayein, baayen =
  queue mein daalein. Sab kuch set ho sakta hai.
- **Themes**: dark, AMOLED (bilkul kaala) aur light.
- **Khula hua Fold**: baayen library, daayen jama hua player aur neeche lyrics (ya queue). Band karne par app
  wapas aam shakal mein aa jati hai.
- **Playlist folders**: phone par local tarteeb (Navidrome folders support nahin karta).
- **Spotify, YouTube aur YouTube Music ki playlists** link se import karein, API key ke baghair: gaane
  library mein dhoonde jaate hain, ghayab gaane deemix ko bheje ja sakte hain, aur playlist Navidrome mein dobara banayi ja sakti hai.
- **Duplicates ki pehchaan**: aik hi gaana kai copies ya qualities mein, behtareen quality sab se upar.
- **Har baar alag deemix**: har download par quality (FLAC, 320, 128) aur manzil wali playlist chunein.
- **Android**: app icon ke shortcuts (Flow, Offline, Search) aur home screen widget.

### Sunna aur dhoondna
- **Flow** (aap ke zauq ke mutabiq kabhi na khatam hone wala mix, moods ke saath), **Aaj ka mix**, kisi gaane ya artist se **radios**.
- **Bhoole bisre heere**, **Aaj ke din**, **Aap ke artists ka naya**, **Blind test**, **History**, **Replay**.
- Chhoo kar chalne wale sync lyrics, queue, sleep timer, equalizer, ReplayGain, crossfade, car mode.
- Tabs ke hisaab se offline mode (Gaane, Artists, Albums, Playlists).
- 40 se zyada features jo Settings › Features mein on ya off kiye ja sakte hain.

## Configuration

Pehli baar kholne par apne Navidrome server ka address (maslan `http://mon-serveur:4533`), username aur
password darj karein. Theme ka rang Settings › Appearance mein badalta hai.

### deemix (ikhtiyari)
Opus aap ke server par install ek chhoti si service (folder `server/`, dekhein `server/README-serveur.md`) ko control kar sakti hai taake
Deezer se gaane Navidrome ke music folder mein download hon. Deezer ka ARL app mein darj kiya jata hai.
Khabardar: yeh istemal Deezer ki terms of service ke khilaf hai.

## Khud build karein (Windows)

Zaroori cheezein: Node.js 20+, Android SDK ke saath Android Studio, aur **JDK 21** (Gradle 8.14 abhi Java 27 ya naye se
compile ki gayi classes nahin parh sakta).

```
npm install
npm run android:add     # android/ folder banata hai aur tabdeeliyan lagata hai
npm run sync            # web build + Capacitor sync
cd android
gradlew.bat assembleDebug
```

APK `android/app/build/outputs/apk/debug/app-debug.apk` mein banta hai.

Agar Gradle ghalat Java istemal kare, to build se pehle `JAVA_HOME` ko JDK 21 par set karein:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

Server ke baghair aazmane ke liye: `npm run mock` (nakli Navidrome, login `test` / `test`), phir `npm run dev`.

## Maloom hadood
- Spotify / YouTube import in sites ke public pages parhta hai, jin ka format aksar badalta hai. Agar kaam na kare, to
  "Artist - Title" ki list paste karna hamesha chalta hai. Account ke baghair sirf pehle 100 gaane parhe jaate hain.
- Fold mode, widget aur gestures simulation mein check kiye gaye hain, abhi tamam devices par nahin.
- Visualizer sirf sajawat ke liye hai.
- Equalizer ke liye zaroori hai ke aap ka server audio streams par CORS ki ijazat de (`Access-Control-Allow-Origin`).
