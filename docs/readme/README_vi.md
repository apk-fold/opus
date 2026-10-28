<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · **Tiếng Việt** · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

Ứng dụng Android làm riêng để nghe nhạc từ máy chủ [Navidrome](https://www.navidrome.org/) (Subsonic API).
Giao diện tối với màu tùy chỉnh, hiệu ứng GSAP, lời bài hát đồng bộ, chế độ ngoại tuyến, và điều khiển deemix ngay trong ứng dụng.
Đóng gói thành APK bằng [Capacitor](https://capacitorjs.com/), với bố cục phù hợp cho Galaxy Z Fold (gập / mở).

## Có gì mới ở v6
- **Trình phát Android native (ExoPlayer/Media3), giống Subtracks**: hàng đợi được phát bởi một dịch vụ Android chứ không còn bởi trang web. Nhạc vẫn chuyển bài khi tắt màn hình hoặc khi ứng dụng chạy nền, và thông báo (phát/tạm dừng/trước/sau) điều khiển trình phát thật.
- Hạn chế của chế độ native: không có bộ chỉnh âm và chuyển tiếp mờ dần (thay bằng phát liền mạch của trình phát native).

## Có gì mới ở v4
- Bài hát không còn bắt đầu từ giữa: vị trí nghe tiếp cũ chỉ áp dụng cho bài hát mà nó thuộc về.
- Phát nền ổn định hơn (giữ CPU/Wi-Fi khi đang phát, theo dõi việc chuyển sang bài tiếp theo). Cài đặt › Phát nền: nút gỡ giới hạn pin.
- Ngoại tuyến: sắp xếp nghệ sĩ, album và danh sách phát (A→Z, gần đây, nhiều bài nhất, dung lượng lớn nhất) và menu ⋯ › "Tải tất cả danh sách phát của tôi".
- APK được GitHub Actions tự động biên dịch sau mỗi lần cập nhật (thẻ Releases).

## Tải APK

➡️ **[Tải Opus v6 (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, dung lượng 4,6 MB. Tệp này cũng hiển thị
trong danh sách tệp của kho mã.

Mã băm SHA-256 để kiểm tra tệp: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Cài đặt trên Android:
1. Tải `opus.apk` trực tiếp về điện thoại.
2. Mở tệp. Android sẽ yêu cầu cho phép cài đặt từ nguồn này (trình duyệt hoặc trình quản lý tệp): hãy đồng ý.
3. Nhấn **Cài đặt**.

Lưu ý:
- Đây là APK **debug** (ký bằng khóa debug của Android Studio). Nếu bạn đã có một bản Opus được ký theo cách khác,
  hãy gỡ nó trước.
- Trên Android 13+, hãy cho phép Opus gửi thông báo (điều khiển phát nhạc trên màn hình khóa) và đặt pin của ứng dụng ở chế độ
  "Không hạn chế" để nhạc vẫn phát khi tắt màn hình.
- Điện thoại phải truy cập được máy chủ Navidrome của bạn (ví dụ qua Tailscale).

## Tính năng chính

### Có gì mới ở v3
- **Cử chỉ kiểu iPhone** (Cài đặt › Cử chỉ và lối tắt): kéo xuống ở đầu trang để mở menu ⋯ của trang đó, vuốt
  xuống trên trình phát để mở menu bài hát, vuốt lên để mở hàng đợi, chạm hai lần vào ảnh bìa = thích,
  nhấn giữ một bài hát, album, danh sách phát hoặc nghệ sĩ = menu của nó, vuốt bài hát sang phải = phát tiếp theo, sang trái =
  thêm vào hàng đợi. Mọi thứ đều tùy chỉnh được.
- **Giao diện**: tối, AMOLED (đen tuyền) và sáng.
- **Fold khi mở**: thư viện bên trái, trình phát cố định bên phải với lời bài hát (hoặc hàng đợi) ở dưới. Khi gập lại, ứng dụng
  trở về bố cục bình thường.
- **Thư mục danh sách phát**: sắp xếp cục bộ trên điện thoại (Navidrome không hỗ trợ thư mục).
- **Nhập danh sách phát Spotify, YouTube và YouTube Music** bằng liên kết, không cần khóa API: các bài hát được tìm trong
  thư viện, bài còn thiếu có thể gửi sang deemix, và danh sách phát có thể tạo lại trong Navidrome.
- **Phát hiện trùng lặp**: cùng một bài với nhiều bản sao hoặc chất lượng, chất lượng tốt nhất lên đầu.
- **deemix theo từng lần**: chọn chất lượng (FLAC, 320, 128) và danh sách phát đích mỗi lần bắt đầu tải.
- **Android**: lối tắt trên biểu tượng ứng dụng (Flow, Ngoại tuyến, Tìm kiếm) và widget màn hình chính.

### Nghe và khám phá
- **Flow** (bản phối vô tận theo gu của bạn, có tâm trạng), **Mix trong ngày**, **radio** từ một bài hát hoặc nghệ sĩ.
- **Viên ngọc bị lãng quên**, **Ngày này năm xưa**, **Bài mới của nghệ sĩ bạn nghe**, **Đoán bài hát**, **Lịch sử**, **Replay**.
- Lời bài hát đồng bộ có thể chạm, hàng đợi, hẹn giờ ngủ, bộ chỉnh âm, ReplayGain, chuyển tiếp mờ dần, chế độ lái xe.
- Chế độ ngoại tuyến theo thẻ (Bài hát, Nghệ sĩ, Album, Danh sách phát).
- Hơn 40 tính năng có thể bật hoặc tắt trong Cài đặt › Tính năng.

## Cấu hình

Ở lần mở đầu tiên, nhập địa chỉ máy chủ Navidrome của bạn (ví dụ `http://mon-serveur:4533`), tên đăng nhập và
mật khẩu. Màu giao diện được đổi trong Cài đặt › Giao diện.

### deemix (tùy chọn)
Opus có thể điều khiển một dịch vụ nhỏ cài trên máy chủ của bạn (thư mục `server/`, xem `server/README-serveur.md`) để
tải bài hát từ Deezer vào thư mục nhạc của Navidrome. ARL của Deezer được nhập trong ứng dụng.
Lưu ý: cách dùng này vi phạm điều khoản sử dụng của Deezer.

## Tự biên dịch (Windows)

Yêu cầu: Node.js 20+, Android Studio có Android SDK, và **JDK 21** (Gradle 8.14 chưa đọc được các lớp
biên dịch bằng Java 27 trở lên).

```
npm install
npm run android:add     # tạo thư mục android/ và áp dụng các bản vá
npm run sync            # build web + đồng bộ Capacitor
cd android
gradlew.bat assembleDebug
```

APK được tạo tại `android/app/build/outputs/apk/debug/app-debug.apk`.

Nếu Gradle dùng sai bản Java, hãy đặt `JAVA_HOME` trỏ tới JDK 21 trước khi biên dịch:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

Để thử mà không cần máy chủ: `npm run mock` (Navidrome giả, tài khoản `test` / `test`) rồi `npm run dev`.

## Hạn chế đã biết
- Tính năng nhập từ Spotify / YouTube đọc các trang công khai của những trang đó, vốn thường xuyên đổi định dạng. Nếu thất bại,
  dán một danh sách "Nghệ sĩ - Tên bài" luôn hoạt động. Không có tài khoản thì chỉ đọc được 100 bài đầu tiên.
- Chế độ Fold, widget và cử chỉ mới được kiểm tra bằng mô phỏng, chưa thử trên mọi thiết bị.
- Hiệu ứng trực quan chỉ để trang trí.
- Bộ chỉnh âm yêu cầu máy chủ của bạn cho phép CORS trên luồng âm thanh (`Access-Control-Allow-Origin`).
