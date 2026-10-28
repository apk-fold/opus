<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · **Polski** · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

Aplikacja na Androida szyta na miarę do słuchania muzyki z serwera [Navidrome](https://www.navidrome.org/) (API Subsonic).
Ciemny motyw z regulowanym kolorem, animacje GSAP, synchronizowane teksty, tryb offline i sterowanie deemix z poziomu aplikacji.
Spakowana jako APK za pomocą [Capacitor](https://capacitorjs.com/), z układem dopasowanym do Galaxy Z Fold (złożonego / rozłożonego).

## Nowości w v6
- **Natywny odtwarzacz Androida (ExoPlayer/Media3), jak w Subtracks**: kolejkę odtwarza usługa Androida, a nie strona internetowa. Utwory lecą jeden po drugim przy wyłączonym ekranie lub z aplikacją w tle, a powiadomienie (odtwórz/pauza/poprzedni/następny) steruje prawdziwym odtwarzaczem.
- Ograniczenia trybu natywnego: brak korektora i przenikania (zastąpione odtwarzaniem bez przerw natywnego odtwarzacza).

## Nowości w v4
- Utwór nie zaczyna się już od środka: stara pozycja wznowienia jest stosowana tylko do utworu, do którego należy.
- Solidniejsze odtwarzanie w tle (blokada CPU/Wi-Fi podczas odtwarzania, pilnowanie przejścia do następnego utworu). Ustawienia › Odtwarzanie w tle: przycisk do zniesienia ograniczenia baterii.
- Offline: sortowanie wykonawców, albumów i playlist (A→Z, ostatnie, najwięcej utworów, największe) oraz menu ⋯ › „Pobierz wszystkie moje playlisty”.
- APK jest kompilowany automatycznie przez GitHub Actions przy każdej aktualizacji (karta Releases).

## Pobierz APK

➡️ **[Pobierz Opus v6 (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, 4,6 MB. Plik widać też
na liście plików repozytorium.

Suma kontrolna SHA-256 do weryfikacji pliku: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Instalacja na Androidzie:
1. Pobierz `opus.apk` bezpośrednio na telefon.
2. Otwórz plik. Android poprosi o zezwolenie na instalację z tego źródła (przeglądarka lub menedżer plików): zaakceptuj.
3. Dotknij **Zainstaluj**.

Uwagi:
- To APK w wersji **debug** (podpisany kluczem debugowania Android Studio). Jeśli masz już wersję Opus podpisaną inaczej,
  najpierw ją odinstaluj.
- Na Androidzie 13+ zezwól Opus na powiadomienia (sterowanie multimediami na ekranie blokady) i ustaw baterię aplikacji na
  „Bez ograniczeń”, żeby odtwarzanie trwało przy wyłączonym ekranie.
- Telefon musi mieć dostęp do twojego serwera Navidrome (na przykład przez Tailscale).

## Główne funkcje

### Nowości w v3
- **Gesty jak na iPhonie** (Ustawienia › Gesty i skróty): pociągnięcie w dół na górze strony otwiera jej menu ⋯, przesunięcie
  w dół na odtwarzaczu otwiera menu utworu, w górę — kolejkę, podwójne dotknięcie okładki = polubienie,
  długie przytrzymanie utworu, albumu, playlisty lub wykonawcy = jego menu, przesunięcie utworu w prawo = odtwórz jako następny, w lewo =
  dodaj do kolejki. Wszystko można ustawić.
- **Motywy**: ciemny, AMOLED (czysta czerń) i jasny.
- **Rozłożony Fold**: biblioteka po lewej, odtwarzacz przypięty po prawej, a pod nim tekst (lub kolejka). Po złożeniu aplikacja
  wraca do normalnego wyglądu.
- **Foldery playlist**: lokalne porządkowanie na telefonie (Navidrome nie obsługuje folderów).
- **Import playlist ze Spotify, YouTube i YouTube Music** przez link, bez klucza API: utwory są dopasowywane w
  bibliotece, brakujące można wysłać do deemix, a playlistę odtworzyć w Navidrome.
- **Wykrywanie duplikatów**: ten sam utwór w kilku kopiach lub jakościach, najlepsza jakość na początku.
- **deemix za każdym razem osobno**: jakość (FLAC, 320, 128) i docelowa playlista wybierane przy każdym pobieraniu.
- **Android**: skróty na ikonie aplikacji (Flow, Offline, Szukaj) i widżet ekranu głównego.

### Słuchanie i odkrywanie
- **Flow** (niekończący się miks według twojego gustu, z nastrojami), **Miks dnia**, **radia** na podstawie utworu lub wykonawcy.
- **Zapomniane perełki**, **Tego dnia**, **Nowości twoich wykonawców**, **Ślepy test**, **Historia**, **Replay**.
- Synchronizowane, klikalne teksty, kolejka, wyłącznik czasowy, korektor, ReplayGain, przenikanie, tryb samochodowy.
- Tryb offline w kartach (Utwory, Wykonawcy, Albumy, Playlisty).
- Ponad 40 funkcji do włączania i wyłączania w Ustawienia › Funkcje.

## Konfiguracja

Przy pierwszym uruchomieniu wpisz adres swojego serwera Navidrome (na przykład `http://mon-serveur:4533`), nazwę użytkownika i
hasło. Kolor motywu zmienisz w Ustawienia › Wygląd.

### deemix (opcjonalnie)
Opus może sterować małą usługą zainstalowaną na twoim serwerze (folder `server/`, zobacz `server/README-serveur.md`), aby
pobierać utwory z Deezera do folderu muzyki Navidrome. ARL Deezera wpisuje się w aplikacji.
Uwaga: takie użycie narusza warunki korzystania z Deezera.

## Samodzielna kompilacja (Windows)

Wymagania: Node.js 20+, Android Studio z Android SDK oraz **JDK 21** (Gradle 8.14 nie czyta jeszcze klas
skompilowanych przez Javę 27 lub nowszą).

```
npm install
npm run android:add     # tworzy folder android/ i nakłada poprawki
npm run sync            # build web + synchronizacja Capacitor
cd android
gradlew.bat assembleDebug
```

APK powstaje w `android/app/build/outputs/apk/debug/app-debug.apk`.

Jeśli Gradle używa niewłaściwej Javy, przed kompilacją ustaw `JAVA_HOME` na JDK 21:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

Aby wypróbować bez serwera: `npm run mock` (udawany Navidrome, dane logowania `test` / `test`), a potem `npm run dev`.

## Znane ograniczenia
- Import ze Spotify / YouTube odczytuje publiczne strony tych serwisów, których format często się zmienia. Gdy się nie uda, wklejenie
  listy „Wykonawca - Tytuł” zawsze działa. Bez konta odczytywane jest tylko pierwsze 100 utworów.
- Tryb Fold, widżet i gesty sprawdzono w symulacji, jeszcze nie na wszystkich urządzeniach.
- Wizualizator jest ozdobny.
- Korektor wymaga, by twój serwer zezwalał na CORS dla strumieni audio (`Access-Control-Allow-Origin`).
