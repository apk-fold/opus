<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · **한국어** · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

[Navidrome](https://www.navidrome.org/) 서버(Subsonic API)의 음악을 듣기 위한 맞춤형 Android 앱입니다.
색상을 바꿀 수 있는 다크 테마, GSAP 애니메이션, 동기화 가사, 오프라인 모드, 앱에서 deemix 제어까지.
[Capacitor](https://capacitorjs.com/)로 APK로 만들었고, Galaxy Z Fold(접힘 / 펼침)에 맞춘 레이아웃을 갖추고 있습니다.

## v6의 새로운 기능
- **Android 네이티브 플레이어(ExoPlayer/Media3), Subtracks와 같은 방식**: 재생 대기열을 웹 페이지가 아니라 Android 서비스가 재생합니다. 화면이 꺼져 있거나 앱이 백그라운드에 있어도 곡이 이어지고, 알림(재생/일시 정지/이전/다음)이 실제 플레이어를 제어합니다.
- 네이티브 모드의 제한: 이퀄라이저와 크로스페이드 없음(네이티브 플레이어의 갭리스 재생으로 대체).

## v4의 새로운 기능
- 곡이 더 이상 중간부터 시작되지 않습니다: 이전 재생 위치는 그 위치가 속한 곡에만 적용됩니다.
- 백그라운드 재생 강화(재생 중 CPU/Wi-Fi 잠금, 다음 곡으로 넘어가는 과정 감시). 설정 › 백그라운드 재생: 배터리 제한을 해제하는 버튼.
- 오프라인: 아티스트, 앨범, 플레이리스트 정렬(A→Z, 최근, 곡 수 많은 순, 용량 큰 순)과 ⋯ 메뉴 › "내 플레이리스트 모두 다운로드".
- 업데이트할 때마다 GitHub Actions가 APK를 자동으로 빌드합니다(Releases 탭).

## APK 다운로드

➡️ **[Opus v6 다운로드(`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, 4.6MB. 이 파일은
저장소의 파일 목록에서도 볼 수 있습니다.

파일 확인용 SHA-256 해시: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Android에 설치하기:
1. 휴대폰에서 `opus.apk`를 직접 다운로드합니다.
2. 파일을 엽니다. Android가 이 출처(브라우저 또는 파일 관리자)에서의 설치를 허용할지 물으면 허용합니다.
3. **설치**를 누릅니다.

참고:
- **debug** APK입니다(Android Studio의 디버그 키로 서명). 다른 방식으로 서명된 Opus가 이미 설치되어 있다면
  먼저 제거하세요.
- Android 13 이상에서는 Opus의 알림을 허용하고(잠금 화면의 미디어 컨트롤), 앱의 배터리 사용을
  "제한 없음"으로 설정해야 화면이 꺼져도 재생이 계속됩니다.
- 휴대폰이 Navidrome 서버에 접속할 수 있어야 합니다(예: Tailscale을 통해).

## 주요 기능

### v3의 새로운 기능
- **iPhone 스타일 제스처**(설정 › 제스처 및 바로 가기): 페이지 맨 위에서 아래로 당기면 그 페이지의 ⋯ 메뉴, 플레이어에서
  아래로 스와이프하면 곡 메뉴, 위로 스와이프하면 재생 대기열, 커버 더블 탭 = 좋아요,
  곡·앨범·플레이리스트·아티스트 길게 누르기 = 해당 메뉴, 곡을 오른쪽으로 스와이프 = 다음에 재생, 왼쪽 =
  대기열에 추가. 모두 설정할 수 있습니다.
- **테마**: 다크, AMOLED(완전한 검정), 라이트.
- **펼친 Fold**: 왼쪽에 보관함, 오른쪽에 고정된 플레이어와 그 아래 가사(또는 대기열). 접으면 앱이
  원래 모습으로 돌아갑니다.
- **플레이리스트 폴더**: 휴대폰에 로컬로 정리(Navidrome은 폴더를 지원하지 않음).
- **Spotify, YouTube, YouTube Music 플레이리스트를 링크로 가져오기**(API 키 불필요): 곡을 보관함에서
  찾아 연결하고, 없는 곡은 deemix로 보낼 수 있으며, 플레이리스트를 Navidrome에 다시 만들 수 있습니다.
- **중복 감지**: 같은 곡의 여러 사본이나 여러 음질, 가장 좋은 음질을 맨 위에.
- **deemix를 그때그때 설정**: 다운로드할 때마다 음질(FLAC, 320, 128)과 대상 플레이리스트를 선택.
- **Android**: 앱 아이콘 바로 가기(Flow, 오프라인, 검색)와 홈 화면 위젯.

### 감상과 발견
- **Flow**(취향에 맞춘 끝없는 믹스, 분위기 선택 가능), **오늘의 믹스**, 곡이나 아티스트 기반 **라디오**.
- **잊힌 명곡**, **그날의 노래**, **내 아티스트의 신곡**, **블라인드 테스트**, **기록**, **리플레이**.
- 탭할 수 있는 동기화 가사, 재생 대기열, 수면 타이머, 이퀄라이저, ReplayGain, 크로스페이드, 운전 모드.
- 탭별 오프라인 모드(곡, 아티스트, 앨범, 플레이리스트).
- 40가지가 넘는 기능을 설정 › 기능에서 켜고 끌 수 있습니다.

## 설정

처음 실행할 때 Navidrome 서버 주소(예: `http://mon-serveur:4533`), 사용자 이름,
비밀번호를 입력합니다. 테마 색상은 설정 › 모양에서 바꿀 수 있습니다.

### deemix(선택 사항)
Opus는 서버에 설치한 작은 서비스(`server/` 폴더, `server/README-serveur.md` 참고)를 제어하여
Deezer에서 Navidrome 음악 폴더로 곡을 다운로드할 수 있습니다. Deezer ARL은 앱에서 입력합니다.
주의: 이 사용 방식은 Deezer 이용 약관에 어긋납니다.

## 직접 빌드하기(Windows)

필요한 것: Node.js 20+, Android SDK가 포함된 Android Studio, **JDK 21**(Gradle 8.14는 아직 Java 27 이상으로
컴파일된 클래스를 읽지 못합니다).

```
npm install
npm run android:add     # android/ 폴더를 만들고 패치를 적용
npm run sync            # 웹 빌드 + Capacitor 동기화
cd android
gradlew.bat assembleDebug
```

APK는 `android/app/build/outputs/apk/debug/app-debug.apk`에 생성됩니다.

Gradle이 잘못된 Java를 쓰고 있다면, 빌드하기 전에 `JAVA_HOME`을 JDK 21로 설정하세요:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

서버 없이 써 보려면: `npm run mock`(가짜 Navidrome, 계정 `test` / `test`) 실행 후 `npm run dev`.

## 알려진 제한 사항
- Spotify / YouTube 가져오기는 해당 사이트의 공개 페이지를 읽기 때문에 형식이 자주 바뀝니다. 실패하면
  "아티스트 - 제목" 목록을 붙여넣는 방법은 항상 됩니다. 계정이 없으면 처음 100곡만 읽습니다.
- Fold 모드, 위젯, 제스처는 시뮬레이션으로 확인했으며, 아직 모든 기기에서 테스트하지는 않았습니다.
- 시각화 효과는 장식용입니다.
- 이퀄라이저를 쓰려면 서버가 오디오 스트림에서 CORS를 허용해야 합니다(`Access-Control-Allow-Origin`).
