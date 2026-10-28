<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · **Türkçe** · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

Bir [Navidrome](https://www.navidrome.org/) sunucusundan (Subsonic API) müziğini dinlemek için kişiye özel Android uygulaması.
Rengi ayarlanabilen koyu tema, GSAP animasyonları, senkronize şarkı sözleri, çevrimdışı mod ve uygulamadan deemix kontrolü.
[Capacitor](https://capacitorjs.com/) ile APK olarak paketlendi, Galaxy Z Fold'a (katlı / açık) uyarlanmış bir yerleşimle.

## v6'daki yenilikler
- **Yerel Android oynatıcı (ExoPlayer/Media3), Subtracks gibi**: çalma sırası artık web sayfası tarafından değil, bir Android servisi tarafından çalınır. Ekran kapalıyken ya da uygulama arka plandayken parçalar kesintisiz sürer ve bildirim (oynat/duraklat/önceki/sonraki) gerçek oynatıcıyı kontrol eder.
- Yerel modun sınırları: ekolayzer ve geçiş efekti yok (yerel oynatıcının boşluksuz çalmasıyla değiştirildi).

## v4'teki yenilikler
- Bir parça artık ortasından başlamıyor: eski kaldığın yer bilgisi yalnızca ait olduğu parçaya uygulanır.
- Daha sağlam arka planda çalma (çalarken CPU/Wi-Fi kilidi, sonraki parçaya geçişin izlenmesi). Ayarlar › Arka planda çalma: pil kısıtlamasını kaldırmak için bir düğme.
- Çevrimdışı: sanatçı, albüm ve çalma listelerini sıralama (A→Z, en son, en çok parça, en büyük) ve ⋯ menüsü › "Tüm çalma listelerimi indir".
- APK her güncellemede GitHub Actions tarafından otomatik olarak derlenir (Releases sekmesi).

## APK'yı indir

➡️ **[Opus v6'yı indir (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, 4,6 MB. Dosya ayrıca
deponun dosya listesinde de görünür.

Dosyayı doğrulamak için SHA-256 özeti: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Android'e kurulum:
1. `opus.apk` dosyasını doğrudan telefona indir.
2. Dosyayı aç. Android bu kaynaktan (tarayıcı ya da dosya yöneticisi) yüklemeye izin vermeni ister: kabul et.
3. **Yükle**'ye dokun.

Notlar:
- Bu bir **debug** APK'dır (Android Studio'nun hata ayıklama anahtarıyla imzalanmış). Başka şekilde imzalanmış bir Opus sürümün varsa
  önce onu kaldır.
- Android 13+ sürümlerinde Opus için bildirimlere izin ver (kilit ekranındaki medya kontrolleri) ve uygulamanın pil ayarını
  "Kısıtlanmamış" yap ki ekran kapalıyken de çalmaya devam etsin.
- Telefonun Navidrome sunucuna erişebilmesi gerekir (örneğin Tailscale üzerinden).

## Başlıca özellikler

### v3'teki yenilikler
- **iPhone tarzı hareketler** (Ayarlar › Hareketler ve kısayollar): bir sayfanın en üstünde aşağı çekmek o sayfanın ⋯ menüsünü açar, oynatıcıda
  aşağı kaydırmak parça menüsünü, yukarı kaydırmak çalma sırasını açar, kapağa çift dokunma = beğen,
  bir parçaya, albüme, çalma listesine ya da sanatçıya uzun basma = menüsü, bir parçayı sağa kaydırma = sıradaki olarak çal, sola =
  sıraya ekle. Her şey ayarlanabilir.
- **Temalar**: koyu, AMOLED (saf siyah) ve açık.
- **Açık Fold**: solda kitaplık, sağda sabitlenmiş oynatıcı ve altında şarkı sözleri (ya da çalma sırası). Katlandığında uygulama
  normal görünümüne döner.
- **Çalma listesi klasörleri**: telefonda yerel düzenleme (Navidrome klasörleri desteklemez).
- **Spotify, YouTube ve YouTube Music çalma listelerini bağlantıyla içe aktarma**, API anahtarı gerekmeden: parçalar kitaplıkta
  eşleştirilir, eksik olanlar deemix'e gönderilebilir ve çalma listesi Navidrome'da yeniden oluşturulabilir.
- **Kopya tespiti**: aynı parçanın birden çok kopyası ya da kalitesi, en iyi kalite en üstte.
- **Duruma göre deemix**: her indirme başlatılırken kalite (FLAC, 320, 128) ve hedef çalma listesi seçilir.
- **Android**: uygulama simgesi kısayolları (Flow, Çevrimdışı, Arama) ve ana ekran widget'ı.

### Dinleme ve keşif
- **Flow** (zevkine göre sonsuz miks, ruh hâli seçenekleriyle), **Günün miksi**, bir parçadan ya da sanatçıdan **radyolar**.
- **Unutulmuş cevherler**, **Bugün geçmişte**, **Sanatçılarından yenilikler**, **Kör test**, **Geçmiş**, **Replay**.
- Dokunulabilir senkronize sözler, çalma sırası, uyku zamanlayıcısı, ekolayzer, ReplayGain, geçiş efekti, araç modu.
- Sekmelere ayrılmış çevrimdışı mod (Parçalar, Sanatçılar, Albümler, Çalma listeleri).
- Ayarlar › Özellikler'den açılıp kapatılabilen 40'tan fazla özellik.

## Yapılandırma

İlk açılışta Navidrome sunucunun adresini (örneğin `http://mon-serveur:4533`), kullanıcı adını ve
parolanı gir. Tema rengi Ayarlar › Görünüm'den değiştirilir.

### deemix (isteğe bağlı)
Opus, sunucuna kurulu küçük bir servisi (`server/` klasörü, bkz. `server/README-serveur.md`) yöneterek
Deezer'dan Navidrome'un müzik klasörüne parça indirebilir. Deezer ARL'si uygulamaya girilir.
Dikkat: bu kullanım Deezer'ın kullanım koşullarına aykırıdır.

## Kendin derle (Windows)

Gerekenler: Node.js 20+, Android SDK'lı Android Studio ve **JDK 21** (Gradle 8.14 henüz Java 27 veya üstüyle
derlenmiş sınıfları okuyamıyor).

```
npm install
npm run android:add     # android/ klasörünü oluşturur ve düzeltmeleri uygular
npm run sync            # web derlemesi + Capacitor senkronizasyonu
cd android
gradlew.bat assembleDebug
```

APK, `android/app/build/outputs/apk/debug/app-debug.apk` konumunda üretilir.

Gradle yanlış Java'yı kullanıyorsa, derlemeden önce `JAVA_HOME` değişkenini JDK 21'e ayarla:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

Sunucusuz denemek için: `npm run mock` (sahte Navidrome, kimlik bilgileri `test` / `test`), sonra `npm run dev`.

## Bilinen sınırlamalar
- Spotify / YouTube içe aktarımı bu sitelerin herkese açık sayfalarını okur ve biçimleri sık değişir. Başarısız olursa
  "Sanatçı - Parça" listesi yapıştırmak her zaman işe yarar. Hesap olmadan yalnızca ilk 100 parça okunur.
- Fold modu, widget ve hareketler simülasyonla doğrulandı, henüz tüm cihazlarda denenmedi.
- Görselleştirici süs amaçlıdır.
- Ekolayzer, sunucunun ses akışlarında CORS'a izin vermesini gerektirir (`Access-Control-Allow-Origin`).
