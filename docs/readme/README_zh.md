<div align="center">

[English](README_en.md) · **简体中文** · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

定制的 Android 应用，用于从 [Navidrome](https://www.navidrome.org/) 服务器（Subsonic API）收听音乐。
可调颜色的深色主题、GSAP 动画、同步歌词、离线模式，还能在应用内控制 deemix。
使用 [Capacitor](https://capacitorjs.com/) 打包为 APK，布局适配 Galaxy Z Fold（折叠 / 展开）。

## v6 新功能
- **Android 原生播放器（ExoPlayer/Media3），与 Subtracks 一样**：播放队列由 Android 服务播放，而不再由网页播放。熄屏或应用在后台时音乐也会连续切歌，通知栏（播放/暂停/上一首/下一首）控制的是真正的播放器。
- 原生模式的限制：没有均衡器和淡入淡出（由原生播放器的无缝播放代替）。

## v4 新功能
- 歌曲不会再从中间开始播放：旧的续播位置只会应用到它所属的那首歌。
- 后台播放更稳定（播放期间保持 CPU/Wi-Fi 唤醒，监控切换到下一首）。设置 › 后台播放：可一键解除电池限制。
- 离线：艺人、专辑和歌单的排序（A→Z、最近、歌曲最多、体积最大），以及 ⋯ 菜单 ›"下载我的全部歌单"。
- 每次更新后 GitHub Actions 都会自动编译 APK（Releases 页面）。

## 下载 APK

➡️ **[下载 Opus v6（`opus.apk`）](https://github.com/apk-fold/opus/raw/main/opus.apk)**，大小 4.6 MB。该文件也可以在
仓库的文件列表中看到。

用于校验文件的 SHA-256 值：`63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

在 Android 上安装：
1. 直接在手机上下载 `opus.apk`。
2. 打开文件。Android 会要求允许从该来源（浏览器或文件管理器）安装：同意即可。
3. 点击**安装**。

说明：
- 这是一个 **debug** APK（使用 Android Studio 的调试密钥签名）。如果你已经装有以其他方式签名的 Opus，
  请先卸载。
- 在 Android 13 及以上版本中，请允许 Opus 发送通知（锁屏上的媒体控件），并把应用的电池设置为
  "不受限制"，这样熄屏后也能继续播放。
- 手机必须能够访问你的 Navidrome 服务器（例如通过 Tailscale）。

## 主要功能

### v3 新功能
- **类似 iPhone 的手势**（设置 › 手势和快捷方式）：在页面顶部下拉会打开该页的 ⋯ 菜单，在播放器上向下
  滑动打开歌曲菜单，向上滑动打开播放队列，双击封面 = 喜欢，
  长按歌曲、专辑、歌单或艺人 = 打开其菜单，歌曲向右滑 = 下一首播放，向左滑 =
  加入队列。全部可自定义。
- **主题**：深色、AMOLED（纯黑）和浅色。
- **展开的 Fold**：左侧为音乐库，右侧固定播放器，下方显示歌词（或播放队列）。折叠后，应用
  恢复为普通布局。
- **歌单文件夹**：在手机本地整理（Navidrome 不支持文件夹）。
- **通过链接导入 Spotify、YouTube 和 YouTube Music 歌单**，无需 API 密钥：在音乐库中查找对应歌曲，
  缺少的歌曲可以发送到 deemix，歌单也可以在 Navidrome 中重新创建。
- **重复检测**：同一首歌的多个副本或不同音质，最佳音质排在最前。
- **逐次设置 deemix**：每次启动下载时选择音质（FLAC、320、128）和目标歌单。
- **Android**：应用图标快捷方式（Flow、离线、搜索）和桌面小组件。

### 聆听与发现
- **Flow**（根据你的口味无限混音，支持心情）、**每日混音**、基于歌曲或艺人的**电台**。
- **被遗忘的好歌**、**那年今日**、**你关注艺人的新作**、**猜歌游戏**、**历史记录**、**回顾**。
- 可点击的同步歌词、播放队列、睡眠定时器、均衡器、ReplayGain、淡入淡出、驾驶模式。
- 按标签页划分的离线模式（歌曲、艺人、专辑、歌单）。
- 超过 40 项功能可在 设置 › 功能 中开启或关闭。

## 配置

首次启动时，输入你的 Navidrome 服务器地址（例如 `http://mon-serveur:4533`）、用户名和
密码。主题颜色可在 设置 › 外观 中更改。

### deemix（可选）
Opus 可以控制安装在你服务器上的一个小服务（`server/` 文件夹，见 `server/README-serveur.md`），
从 Deezer 下载歌曲到 Navidrome 的音乐文件夹。Deezer ARL 在应用内填写。
注意：这种用法违反 Deezer 的使用条款。

## 自行编译（Windows）

前提条件：Node.js 20+、带 Android SDK 的 Android Studio，以及 **JDK 21**（Gradle 8.14 还无法读取
由 Java 27 或更高版本编译的类）。

```
npm install
npm run android:add     # 创建 android/ 文件夹并应用补丁
npm run sync            # Web 构建 + Capacitor 同步
cd android
gradlew.bat assembleDebug
```

APK 生成在 `android/app/build/outputs/apk/debug/app-debug.apk`。

如果 Gradle 使用了错误的 Java，请在编译前将 `JAVA_HOME` 设为 JDK 21：

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

不用服务器试用：先运行 `npm run mock`（模拟 Navidrome，账号 `test` / `test`），再运行 `npm run dev`。

## 已知限制
- Spotify / YouTube 导入读取的是这些网站的公开页面，其格式经常变化。如果导入失败，粘贴
  "艺人 - 歌名"列表始终可用。未登录账号时只能读取前 100 首歌。
- Fold 模式、小组件和手势只在模拟环境中验证过，尚未在所有设备上测试。
- 可视化效果仅作装饰。
- 均衡器要求你的服务器在音频流上允许 CORS（`Access-Control-Allow-Origin`）。
