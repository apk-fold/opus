<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · **日本語** · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

[Navidrome](https://www.navidrome.org/) サーバー（Subsonic API）の音楽を聴くための、オーダーメイドの Android アプリ。
色を変えられるダークテーマ、GSAP アニメーション、同期歌詞、オフラインモード、アプリからの deemix 操作に対応。
[Capacitor](https://capacitorjs.com/) で APK 化し、Galaxy Z Fold（折りたたみ / 展開）に合わせたレイアウトを備えています。

## v6 の新機能
- **Android ネイティブプレーヤー（ExoPlayer/Media3）、Subtracks と同じ方式**：再生キューは Web ページではなく Android のサービスで再生されます。画面オフでもアプリがバックグラウンドでも曲が途切れず次へ進み、通知（再生/一時停止/前へ/次へ）が本物のプレーヤーを操作します。
- ネイティブモードの制限：イコライザーとクロスフェードはなし（ネイティブプレーヤーのギャップレス再生で代替）。

## v4 の新機能
- 曲が途中から始まらなくなりました：以前の再開位置は、その位置が属する曲にだけ適用されます。
- バックグラウンド再生を強化（再生中の CPU/Wi-Fi ロック、次の曲への移行を監視）。設定 › バックグラウンド再生：バッテリー制限を解除するボタン。
- オフライン：アーティスト、アルバム、プレイリストの並べ替え（A→Z、最近、曲数が多い順、容量が大きい順）と ⋯ メニュー ›「すべてのプレイリストをダウンロード」。
- 更新のたびに GitHub Actions が APK を自動でビルドします（Releases タブ）。

## APK のダウンロード

➡️ **[Opus v6 をダウンロード（`opus.apk`）](https://github.com/apk-fold/opus/raw/main/opus.apk)**（4.6 MB）。このファイルは
リポジトリのファイル一覧にも表示されています。

ファイル確認用の SHA-256 ハッシュ：`63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Android へのインストール：
1. スマホで `opus.apk` を直接ダウンロードします。
2. ファイルを開きます。Android がこの提供元（ブラウザまたはファイルマネージャー）からのインストール許可を求めるので、許可します。
3. **インストール**をタップします。

補足：
- これは **debug** 版の APK です（Android Studio のデバッグ鍵で署名）。別の署名の Opus がすでに入っている場合は、
  先にアンインストールしてください。
- Android 13 以降では、Opus の通知を許可し（ロック画面のメディア操作）、アプリのバッテリー設定を
  「制限なし」にすると、画面オフでも再生が続きます。
- スマホから Navidrome サーバーにアクセスできる必要があります（たとえば Tailscale 経由）。

## 主な機能

### v3 の新機能
- **iPhone 風ジェスチャー**（設定 › ジェスチャーとショートカット）：ページ上端で下に引くとそのページの ⋯ メニュー、プレーヤーで
  下にスワイプすると曲のメニュー、上にスワイプすると再生キュー、ジャケットをダブルタップ = お気に入り、
  曲・アルバム・プレイリスト・アーティストを長押し = そのメニュー、曲を右にスワイプ = 次に再生、左 =
  キューに追加。すべて設定可能です。
- **テーマ**：ダーク、AMOLED（純粋な黒）、ライト。
- **開いた Fold**：左にライブラリ、右に固定されたプレーヤー、その下に歌詞（またはキュー）。折りたたむと、アプリは
  通常の表示に戻ります。
- **プレイリストのフォルダー**：スマホ上でローカルに整理（Navidrome はフォルダーに対応していません）。
- **Spotify、YouTube、YouTube Music のプレイリストをリンクでインポート**（API キー不要）：曲をライブラリで
  照合し、足りない曲は deemix に送れます。プレイリストを Navidrome に作り直すこともできます。
- **重複の検出**：同じ曲が複数のコピーや音質で存在する場合、最高音質を先頭に表示。
- **deemix をその都度設定**：ダウンロードのたびに音質（FLAC、320、128）と追加先のプレイリストを選択。
- **Android**：アプリアイコンのショートカット（Flow、オフライン、検索）とホーム画面ウィジェット。

### 聴く・見つける
- **Flow**（好みに合わせた終わりのないミックス、ムード付き）、**今日のミックス**、曲やアーティストからの**ラジオ**。
- **忘れかけた名曲**、**この日の曲**、**お気に入りアーティストの新作**、**イントロクイズ**、**履歴**、**リプレイ**。
- タップできる同期歌詞、再生キュー、スリープタイマー、イコライザー、ReplayGain、クロスフェード、カーモード。
- タブ別のオフラインモード（曲、アーティスト、アルバム、プレイリスト）。
- 40 を超える機能を 設定 › 機能 でオン / オフできます。

## 設定

初回起動時に、Navidrome サーバーのアドレス（例：`http://mon-serveur:4533`）、ユーザー名、
パスワードを入力します。テーマの色は 設定 › 外観 で変更できます。

### deemix（任意）
Opus は、サーバーにインストールした小さなサービス（`server/` フォルダー、`server/README-serveur.md` を参照）を操作して、
Deezer から Navidrome の音楽フォルダーに曲をダウンロードできます。Deezer の ARL はアプリ内で入力します。
注意：この使い方は Deezer の利用規約に反します。

## 自分でビルドする（Windows）

必要なもの：Node.js 20+、Android SDK 入りの Android Studio、**JDK 21**（Gradle 8.14 は Java 27 以降で
コンパイルされたクラスをまだ読み込めません）。

```
npm install
npm run android:add     # android/ フォルダーを作成し、修正を適用
npm run sync            # Web ビルド + Capacitor の同期
cd android
gradlew.bat assembleDebug
```

APK は `android/app/build/outputs/apk/debug/app-debug.apk` に生成されます。

Gradle が違う Java を使っている場合は、ビルド前に `JAVA_HOME` を JDK 21 に設定します：

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

サーバーなしで試すには：`npm run mock`（偽の Navidrome、ID とパスワードは `test` / `test`）のあと `npm run dev`。

## 既知の制限
- Spotify / YouTube のインポートはそれらのサイトの公開ページを読み取るため、形式がよく変わります。失敗したときは、
  「アーティスト - 曲名」の一覧を貼り付ければ必ずインポートできます。アカウントなしでは最初の 100 曲までしか読み取れません。
- Fold モード、ウィジェット、ジェスチャーはシミュレーションで確認済みですが、すべての端末ではまだ試していません。
- ビジュアライザーは装飾です。
- イコライザーを使うには、サーバーが音声ストリームで CORS を許可している必要があります（`Access-Control-Allow-Origin`）。
