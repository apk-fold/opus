<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · **Deutsch** · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

Maßgeschneiderte Android-App, um deine Musik von einem [Navidrome](https://www.navidrome.org/)-Server (Subsonic-API) zu hören.
Dunkles Theme mit einstellbarer Farbe, GSAP-Animationen, synchronisierte Songtexte, Offline-Modus und Steuerung von deemix direkt aus der App.
Mit [Capacitor](https://capacitorjs.com/) als APK verpackt, mit einem an das Galaxy Z Fold (zu- / aufgeklappt) angepassten Layout.

## Neu in v6
- **Nativer Android-Player (ExoPlayer/Media3), wie bei Subtracks**: Die Warteschlange wird von einem Android-Dienst abgespielt, nicht mehr von der Webseite. Die Musik spielt bei ausgeschaltetem Bildschirm oder mit der App im Hintergrund Titel für Titel weiter, und die Benachrichtigung (Wiedergabe/Pause/Zurück/Weiter) steuert den echten Player.
- Einschränkungen des nativen Modus: kein Equalizer und keine Überblendung (ersetzt durch die lückenlose Wiedergabe des nativen Players).

## Neu in v4
- Ein Titel startet nicht mehr mittendrin: Die alte Fortsetzungsposition wird nur auf den Titel angewendet, zu dem sie gehört.
- Robustere Hintergrundwiedergabe (CPU-/WLAN-Sperre während der Wiedergabe, überwachter Wechsel zum nächsten Titel). Einstellungen › Hintergrundwiedergabe: Schaltfläche, um die Akku-Beschränkung aufzuheben.
- Offline: Sortierung von Künstlern, Alben und Playlists (A→Z, neueste, meiste Titel, größte) und ⋯-Menü › „Alle meine Playlists herunterladen“.
- Die APK wird bei jedem Update automatisch von GitHub Actions gebaut (Tab Releases).

## APK herunterladen

➡️ **[Opus v6 herunterladen (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, 4,6 MB. Die Datei ist auch
in der Dateiliste des Repositorys zu sehen.

SHA-256-Prüfsumme zum Überprüfen der Datei: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Installation unter Android:
1. Lade `opus.apk` direkt auf das Handy herunter.
2. Öffne die Datei. Android fragt, ob die Installation aus dieser Quelle (Browser oder Dateimanager) erlaubt werden soll: zustimmen.
3. Tippe auf **Installieren**.

Hinweise:
- Das ist eine **Debug**-APK (signiert mit dem Debug-Schlüssel von Android Studio). Wenn du schon eine anders signierte Opus-Version hast,
  deinstalliere sie zuerst.
- Unter Android 13+ erlaube Benachrichtigungen für Opus (Mediensteuerung auf dem Sperrbildschirm) und stelle den Akku der App auf
  „Nicht eingeschränkt“, damit die Wiedergabe bei ausgeschaltetem Bildschirm weiterläuft.
- Das Handy muss deinen Navidrome-Server erreichen können (zum Beispiel über Tailscale).

## Hauptfunktionen

### Neu in v3
- **Gesten wie beim iPhone** (Einstellungen › Gesten und Verknüpfungen): Am oberen Rand einer Seite nach unten ziehen öffnet ihr ⋯-Menü,
  auf dem Player nach unten wischen öffnet das Titelmenü, nach oben die Warteschlange, Doppeltippen auf das Cover = Gefällt mir,
  langes Drücken auf einen Titel, ein Album, eine Playlist oder einen Künstler = sein Menü, einen Titel nach rechts wischen = als Nächstes abspielen, nach links =
  zur Warteschlange hinzufügen. Alles ist einstellbar.
- **Themes**: dunkel, AMOLED (reines Schwarz) und hell.
- **Aufgeklapptes Fold**: Mediathek links, Player rechts angedockt, darunter die Songtexte (oder die Warteschlange). Zugeklappt sieht die App
  wieder normal aus.
- **Playlist-Ordner**: lokale Ablage auf dem Handy (Navidrome kennt keine Ordner).
- **Playlists aus Spotify, YouTube und YouTube Music** per Link importieren, ohne API-Schlüssel: Die Titel werden in der
  Mediathek gesucht, fehlende lassen sich an deemix schicken, und die Playlist kann in Navidrome neu angelegt werden.
- **Duplikaterkennung**: derselbe Titel in mehreren Kopien oder Qualitäten, beste Qualität zuerst.
- **deemix im Einzelfall**: Qualität (FLAC, 320, 128) und Ziel-Playlist werden bei jedem Start gewählt.
- **Android**: Verknüpfungen am App-Symbol (Flow, Offline, Suche) und ein Startbildschirm-Widget.

### Hören und Entdecken
- **Flow** (endloser Mix nach deinem Geschmack, mit Stimmungen), **Mix des Tages**, **Radios** zu einem Titel oder Künstler.
- **Vergessene Perlen**, **An diesem Tag**, **Neues von deinen Künstlern**, **Blindtest**, **Verlauf**, **Replay**.
- Synchronisierte, antippbare Songtexte, Warteschlange, Sleep-Timer, Equalizer, ReplayGain, Überblendung, Automodus.
- Offline-Modus nach Tabs (Titel, Künstler, Alben, Playlists).
- Über 40 Funktionen, die sich unter Einstellungen › Funktionen ein- oder ausschalten lassen.

## Einrichtung

Gib beim ersten Start die Adresse deines Navidrome-Servers (zum Beispiel `http://mon-serveur:4533`), deinen Benutzernamen und
dein Passwort ein. Die Theme-Farbe änderst du unter Einstellungen › Darstellung.

### deemix (optional)
Opus kann einen kleinen Dienst auf deinem Server steuern (Ordner `server/`, siehe `server/README-serveur.md`), um
Titel von Deezer in den Musikordner von Navidrome herunterzuladen. Die Deezer-ARL wird in der App eingegeben.
Achtung: Diese Nutzung verstößt gegen die Nutzungsbedingungen von Deezer.

## Selbst kompilieren (Windows)

Voraussetzungen: Node.js 20+, Android Studio mit Android SDK und **JDK 21** (Gradle 8.14 kann noch keine Klassen lesen,
die mit Java 27 oder neuer kompiliert wurden).

```
npm install
npm run android:add     # legt den Ordner android/ an und wendet die Korrekturen an
npm run sync            # Web-Build + Capacitor-Synchronisierung
cd android
gradlew.bat assembleDebug
```

Die APK wird in `android/app/build/outputs/apk/debug/app-debug.apk` erzeugt.

Wenn Gradle das falsche Java verwendet, setze `JAVA_HOME` vor dem Kompilieren auf das JDK 21:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

Zum Ausprobieren ohne Server: `npm run mock` (falsches Navidrome, Zugangsdaten `test` / `test`), dann `npm run dev`.

## Bekannte Einschränkungen
- Der Spotify-/YouTube-Import liest die öffentlichen Seiten dieser Dienste, deren Format sich oft ändert. Wenn er scheitert, funktioniert das Einfügen
  einer Liste „Künstler - Titel“ immer. Ohne Konto werden nur die ersten 100 Titel gelesen.
- Fold-Modus, Widget und Gesten wurden in der Simulation geprüft, aber noch nicht auf allen Geräten.
- Der Visualizer ist rein dekorativ.
- Der Equalizer setzt voraus, dass dein Server CORS für die Audiostreams erlaubt (`Access-Control-Allow-Origin`).
