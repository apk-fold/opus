<div align="center">

**English** · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

Custom Android app for listening to your music from a [Navidrome](https://www.navidrome.org/) server (Subsonic API).
Dark theme with an adjustable color, GSAP animations, synced lyrics, offline mode, and deemix control from inside the app.
Packaged as an APK with [Capacitor](https://capacitorjs.com/), with a layout adapted to the Galaxy Z Fold (folded / unfolded).

## What's new in v6
- **Native Android player (ExoPlayer/Media3), like Subtracks**: the queue is played by an Android service instead of the web page. Music moves from track to track with the screen off or the app in the background, and the notification (play/pause/previous/next) controls the real player.
- Native mode limitations: no equalizer or crossfade (replaced by the native player's gapless playback).

## What's new in v4
- A track no longer starts halfway through: the old resume position is only applied to the track it belongs to.
- Stronger background playback (CPU/Wi-Fi lock during playback, monitored skip to the next track). Settings › Background playback: a button to remove the battery restriction.
- Offline: sorting of artists, albums and playlists (A→Z, recent, most tracks, largest) and ⋯ menu › "Download all my playlists".
- The APK is built automatically by GitHub Actions on every update (Releases tab).

## Download the APK

➡️ **[Download Opus v6 (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, 4.6 MB. The file is also visible
in the repository's file list.

SHA-256 checksum to verify the file: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Installing on Android:
1. Download `opus.apk` directly on the phone.
2. Open the file. Android asks you to allow installs from this source (browser or file manager): accept.
3. Tap **Install**.

Notes:
- This is a **debug** APK (signed with Android Studio's debug key). If you already have a version of Opus signed differently,
  uninstall it first.
- On Android 13+, allow notifications for Opus (media controls on the lock screen) and set the app's battery usage to
  "Unrestricted" so playback keeps going with the screen off.
- The phone must be able to reach your Navidrome server (for example via Tailscale).

## Main features

### What's new in v3
- **iPhone-style gestures** (Settings › Gestures and shortcuts): pulling down at the top of a page opens its ⋯ menu, swiping
  down on the player opens the track menu, swiping up opens the queue, double tap on the cover = like,
  long press on a track, album, playlist or artist = its menu, swipe a track right = play next, left =
  add to queue. Everything is configurable.
- **Themes**: dark, AMOLED (pure black) and light.
- **Unfolded Fold**: library on the left, player docked on the right with the lyrics (or the queue) below. Folded, the app
  goes back to normal.
- **Playlist folders**: stored locally on the phone (Navidrome doesn't support folders).
- **Import playlists from Spotify, YouTube and YouTube Music** by link, with no API key: tracks are matched in the
  library, missing ones can be sent to deemix, and the playlist can be recreated in Navidrome.
- **Duplicate detection**: the same track in several copies or qualities, best quality first.
- **deemix case by case**: quality (FLAC, 320, 128) and target playlist chosen each time you start a download.
- **Android**: app icon shortcuts (Flow, Offline, Search) and a home screen widget.

### Listening and discovery
- **Flow** (endless mix based on your taste, with moods), **Mix of the day**, **radios** from a track or an artist.
- **Forgotten gems**, **On this day**, **New from your artists**, **Blind test**, **History**, **Replay**.
- Synced, tappable lyrics, queue, sleep timer, equalizer, ReplayGain, crossfade, car mode.
- Offline mode with tabs (Tracks, Artists, Albums, Playlists).
- More than 40 features you can turn on or off in Settings › Features.

## Setup

On first launch, enter your Navidrome server address (for example `http://mon-serveur:4533`), your username and
password. The theme color can be changed in Settings › Appearance.

### deemix (optional)
Opus can control a small service installed on your server (`server/` folder, see `server/README-serveur.md`) to
download tracks from Deezer into Navidrome's music folder. The Deezer ARL is entered in the app.
Warning: this use goes against Deezer's terms of service.

## Build it yourself (Windows)

Requirements: Node.js 20+, Android Studio with the Android SDK, and **JDK 21** (Gradle 8.14 can't yet read classes
compiled by Java 27 or later).

```
npm install
npm run android:add     # creates the android/ folder and applies the patches
npm run sync            # web build + Capacitor sync
cd android
gradlew.bat assembleDebug
```

The APK is produced in `android/app/build/outputs/apk/debug/app-debug.apk`.

If Gradle uses the wrong Java, set `JAVA_HOME` to JDK 21 before building:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

To try it without a server: `npm run mock` (fake Navidrome, credentials `test` / `test`), then `npm run dev`.

## Known limitations
- The Spotify / YouTube import reads those sites' public pages, whose format changes often. If it fails, pasting
  an "Artist - Title" list always works. Without an account, only the first 100 tracks are read.
- Fold mode, the widget and the gestures have been checked in simulation, not yet on every device.
- The visualizer is decorative.
- The equalizer requires your server to allow CORS on audio streams (`Access-Control-Allow-Origin`).
