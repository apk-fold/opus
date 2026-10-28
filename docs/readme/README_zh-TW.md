<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · **繁體中文** · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

量身打造的 Android App，用來從 [Navidrome](https://www.navidrome.org/) 伺服器（Subsonic API）收聽音樂。
可調顏色的深色主題、GSAP 動畫、同步歌詞、離線模式，還能在 App 內控制 deemix。
以 [Capacitor](https://capacitorjs.com/) 封裝為 APK，版面配置適用於 Galaxy Z Fold（摺疊 / 展開）。

## v6 新功能
- **Android 原生播放器（ExoPlayer/Media3），就像 Subtracks**：播放佇列改由 Android 服務播放，不再由網頁播放。螢幕關閉或 App 在背景時音樂也會連續播放下一首，通知（播放/暫停/上一首/下一首）控制的是真正的播放器。
- 原生模式的限制：沒有等化器和交叉淡入淡出（改用原生播放器的無縫播放）。

## v4 新功能
- 歌曲不再從中間開始：舊的續播位置只會套用到它所屬的那首歌。
- 背景播放更穩定（播放期間鎖定 CPU/Wi-Fi，監控切換到下一首）。設定 › 背景播放：一個按鈕即可解除電池限制。
- 離線：藝人、專輯和播放清單的排序（A→Z、最近、最多歌曲、最大）以及 ⋯ 選單 ›「下載我所有的播放清單」。
- 每次更新後 GitHub Actions 都會自動編譯 APK（Releases 分頁）。

## 下載 APK

➡️ **[下載 Opus v6（`opus.apk`）](https://github.com/apk-fold/opus/raw/main/opus.apk)**，大小 4.6 MB。這個檔案也能在
儲存庫的檔案清單中看到。

用來驗證檔案的 SHA-256 雜湊值：`63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

在 Android 上安裝：
1. 直接在手機上下載 `opus.apk`。
2. 開啟檔案。Android 會要求允許從此來源（瀏覽器或檔案管理員）安裝：同意即可。
3. 點選**安裝**。

注意事項：
- 這是 **debug** APK（以 Android Studio 的偵錯金鑰簽署）。如果你已經裝了以其他方式簽署的 Opus，
  請先解除安裝。
- 在 Android 13 以上版本，請允許 Opus 發送通知（鎖定畫面上的媒體控制項），並將 App 的電池設定為
  「不受限制」，這樣螢幕關閉後也能繼續播放。
- 手機必須能連到你的 Navidrome 伺服器（例如透過 Tailscale）。

## 主要功能

### v3 新功能
- **iPhone 風格手勢**（設定 › 手勢與捷徑）：在頁面頂端往下拉會開啟該頁的 ⋯ 選單，在播放器上往下
  滑開啟歌曲選單，往上滑開啟播放佇列，點兩下封面 = 喜歡，
  長按歌曲、專輯、播放清單或藝人 = 開啟其選單，歌曲往右滑 = 下一首播放，往左滑 =
  加入佇列。一切都能設定。
- **主題**：深色、AMOLED（純黑）和淺色。
- **展開的 Fold**：左側為音樂庫，右側固定播放器，下方顯示歌詞（或佇列）。摺疊後，App
  恢復為一般版面。
- **播放清單資料夾**：在手機本機整理（Navidrome 不支援資料夾）。
- **以連結匯入 Spotify、YouTube 和 YouTube Music 播放清單**，不需 API 金鑰：在音樂庫中比對歌曲，
  缺少的歌曲可送往 deemix，播放清單也能在 Navidrome 中重新建立。
- **重複偵測**：同一首歌的多份副本或不同音質，最佳音質排在最前。
- **逐次設定 deemix**：每次開始下載時選擇音質（FLAC、320、128）和目標播放清單。
- **Android**：App 圖示捷徑（Flow、離線、搜尋）和主畫面小工具。

### 聆聽與探索
- **Flow**（依你的喜好無限混音，支援心情）、**每日精選**、以歌曲或藝人為基礎的**電台**。
- **被遺忘的好歌**、**那年今天**、**你的藝人新作**、**猜歌**、**歷史紀錄**、**回顧**。
- 可點選的同步歌詞、播放佇列、睡眠計時器、等化器、ReplayGain、交叉淡入淡出、行車模式。
- 依分頁區分的離線模式（歌曲、藝人、專輯、播放清單）。
- 超過 40 項功能可在 設定 › 功能 中開啟或關閉。

## 設定

第一次啟動時，輸入你的 Navidrome 伺服器位址（例如 `http://mon-serveur:4533`）、帳號和
密碼。主題顏色可在 設定 › 外觀 中更改。

### deemix（選用）
Opus 可以控制安裝在你伺服器上的一個小服務（`server/` 資料夾，請見 `server/README-serveur.md`），
從 Deezer 下載歌曲到 Navidrome 的音樂資料夾。Deezer ARL 在 App 內輸入。
注意：這種用法違反 Deezer 的使用條款。

## 自行編譯（Windows）

需求：Node.js 20+、附 Android SDK 的 Android Studio，以及 **JDK 21**（Gradle 8.14 還無法讀取
由 Java 27 或更新版本編譯的類別）。

```
npm install
npm run android:add     # 建立 android/ 資料夾並套用修正
npm run sync            # Web 建置 + Capacitor 同步
cd android
gradlew.bat assembleDebug
```

APK 會產生在 `android/app/build/outputs/apk/debug/app-debug.apk`。

如果 Gradle 用錯了 Java，請在編譯前把 `JAVA_HOME` 設為 JDK 21：

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

不用伺服器試用：執行 `npm run mock`（模擬的 Navidrome，帳密 `test` / `test`），再執行 `npm run dev`。

## 已知限制
- Spotify / YouTube 匯入讀取的是這些網站的公開頁面，其格式經常變動。若匯入失敗，貼上
  「藝人 - 歌名」清單一定可行。未登入帳號時只能讀取前 100 首歌。
- Fold 模式、小工具和手勢只在模擬環境中驗證過，尚未在所有裝置上測試。
- 視覺化效果僅供裝飾。
- 等化器需要你的伺服器在音訊串流上允許 CORS（`Access-Control-Allow-Origin`）。
