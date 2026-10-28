<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · **Bahasa Indonesia** · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

Aplikasi Android buatan sendiri untuk mendengarkan musikmu dari server [Navidrome](https://www.navidrome.org/) (API Subsonic).
Tema gelap dengan warna yang bisa diatur, animasi GSAP, lirik tersinkron, mode offline, dan kendali deemix dari dalam aplikasi.
Dikemas sebagai APK dengan [Capacitor](https://capacitorjs.com/), dengan tata letak yang disesuaikan untuk Galaxy Z Fold (terlipat / terbuka).

## Yang baru di v6
- **Pemutar Android native (ExoPlayer/Media3), seperti Subtracks**: antrean diputar oleh layanan Android, bukan lagi oleh halaman web. Musik tetap berganti lagu saat layar mati atau aplikasi di latar belakang, dan notifikasi (putar/jeda/sebelumnya/berikutnya) mengendalikan pemutar yang sesungguhnya.
- Batasan mode native: tanpa equalizer dan crossfade (diganti dengan pemutaran tanpa jeda dari pemutar native).

## Yang baru di v4
- Lagu tidak lagi mulai dari tengah: posisi lanjutan yang lama hanya diterapkan pada lagu pemiliknya.
- Pemutaran latar belakang lebih andal (kunci CPU/Wi-Fi saat memutar, perpindahan ke lagu berikutnya dipantau). Pengaturan › Pemutaran latar belakang: tombol untuk mencabut batasan baterai.
- Offline: urutan artis, album, dan playlist (A→Z, terbaru, lagu terbanyak, terbesar) dan menu ⋯ › "Unduh semua playlist saya".
- APK dikompilasi otomatis oleh GitHub Actions setiap kali ada pembaruan (tab Releases).

## Unduh APK

➡️ **[Unduh Opus v6 (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, 4,6 MB. File ini juga terlihat
di daftar file repositori.

Checksum SHA-256 untuk memverifikasi file: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Instalasi di Android:
1. Unduh `opus.apk` langsung di ponsel.
2. Buka file-nya. Android akan meminta izin instalasi dari sumber ini (browser atau pengelola file): setujui.
3. Ketuk **Instal**.

Catatan:
- Ini adalah APK **debug** (ditandatangani dengan kunci debug Android Studio). Jika kamu sudah punya versi Opus yang ditandatangani dengan cara lain,
  copot dulu.
- Di Android 13+, izinkan notifikasi untuk Opus (kontrol media di layar kunci) dan atur baterai aplikasi ke
  "Tidak dibatasi" agar pemutaran tetap berjalan saat layar mati.
- Ponsel harus bisa menjangkau server Navidrome-mu (misalnya lewat Tailscale).

## Fitur utama

### Yang baru di v3
- **Gestur ala iPhone** (Pengaturan › Gestur dan pintasan): tarik ke bawah di bagian atas halaman membuka menu ⋯-nya, geser
  ke bawah di pemutar membuka menu lagu, ke atas membuka antrean, ketuk dua kali sampul = suka,
  tekan lama lagu, album, playlist, atau artis = menunya, geser lagu ke kanan = putar berikutnya, ke kiri =
  tambahkan ke antrean. Semuanya bisa diatur.
- **Tema**: gelap, AMOLED (hitam pekat), dan terang.
- **Fold terbuka**: pustaka di kiri, pemutar tertambat di kanan dengan lirik (atau antrean) di bawahnya. Saat dilipat, aplikasi
  kembali normal.
- **Folder playlist**: penataan lokal di ponsel (Navidrome tidak mendukung folder).
- **Impor playlist Spotify, YouTube, dan YouTube Music** lewat tautan, tanpa kunci API: lagu dicocokkan di
  pustaka, yang belum ada bisa dikirim ke deemix, dan playlist bisa dibuat ulang di Navidrome.
- **Deteksi duplikat**: lagu yang sama dalam beberapa salinan atau kualitas, kualitas terbaik di urutan teratas.
- **deemix per kasus**: kualitas (FLAC, 320, 128) dan playlist tujuan dipilih setiap kali mengunduh.
- **Android**: pintasan ikon aplikasi (Flow, Offline, Cari) dan widget layar utama.

### Mendengarkan dan menemukan
- **Flow** (mix tanpa akhir sesuai seleramu, dengan suasana hati), **Mix hari ini**, **radio** dari sebuah lagu atau artis.
- **Permata terlupakan**, **Hari ini dulu**, **Rilisan baru artismu**, **Tebak lagu**, **Riwayat**, **Replay**.
- Lirik tersinkron yang bisa disentuh, antrean, timer tidur, equalizer, ReplayGain, crossfade, mode mobil.
- Mode offline per tab (Lagu, Artis, Album, Playlist).
- Lebih dari 40 fitur yang bisa dinyalakan atau dimatikan di Pengaturan › Fitur.

## Konfigurasi

Saat pertama dibuka, isi alamat server Navidrome-mu (misalnya `http://mon-serveur:4533`), nama pengguna, dan
kata sandi. Warna tema diubah di Pengaturan › Tampilan.

### deemix (opsional)
Opus bisa mengendalikan layanan kecil yang dipasang di servermu (folder `server/`, lihat `server/README-serveur.md`) untuk
mengunduh lagu dari Deezer ke folder musik Navidrome. ARL Deezer diisikan di aplikasi.
Perhatian: penggunaan ini melanggar ketentuan penggunaan Deezer.

## Kompilasi sendiri (Windows)

Prasyarat: Node.js 20+, Android Studio dengan Android SDK, dan **JDK 21** (Gradle 8.14 belum bisa membaca kelas
yang dikompilasi dengan Java 27 atau lebih baru).

```
npm install
npm run android:add     # membuat folder android/ dan menerapkan perbaikan
npm run sync            # build web + sinkronisasi Capacitor
cd android
gradlew.bat assembleDebug
```

APK dihasilkan di `android/app/build/outputs/apk/debug/app-debug.apk`.

Jika Gradle memakai Java yang salah, atur `JAVA_HOME` ke JDK 21 sebelum mengompilasi:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

Untuk mencoba tanpa server: `npm run mock` (Navidrome palsu, kredensial `test` / `test`) lalu `npm run dev`.

## Keterbatasan yang diketahui
- Impor Spotify / YouTube membaca halaman publik situs-situs itu, yang formatnya sering berubah. Jika gagal, menempelkan
  daftar "Artis - Judul" selalu berhasil. Tanpa akun, hanya 100 lagu pertama yang dibaca.
- Mode Fold, widget, dan gestur sudah diperiksa lewat simulasi, belum di semua perangkat.
- Visualisasinya hanya hiasan.
- Equalizer memerlukan servermu mengizinkan CORS pada aliran audio (`Access-Control-Allow-Origin`).
