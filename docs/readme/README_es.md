<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · **Español** · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

App de Android hecha a medida para escuchar tu música desde un servidor [Navidrome](https://www.navidrome.org/) (API Subsonic).
Tema oscuro con color ajustable, animaciones GSAP, letras sincronizadas, modo sin conexión y control de deemix desde la app.
Empaquetada como APK con [Capacitor](https://capacitorjs.com/), con una disposición adaptada al Galaxy Z Fold (plegado / desplegado).

## Novedades de la v6
- **Reproductor nativo de Android (ExoPlayer/Media3), como Subtracks**: la cola la reproduce un servicio de Android, ya no la página web. La música pasa de una canción a otra con la pantalla apagada o la app en segundo plano, y la notificación (reproducir/pausa/anterior/siguiente) controla el reproductor real.
- Límites del modo nativo: sin ecualizador ni fundido encadenado (sustituido por la reproducción sin pausas del reproductor nativo).

## Novedades de la v4
- Una canción ya no empieza por la mitad: la antigua posición de reanudación solo se aplica a la canción a la que pertenece.
- Reproducción en segundo plano reforzada (bloqueo de CPU/Wi-Fi durante la reproducción, paso a la siguiente canción vigilado). Ajustes › Reproducción en segundo plano: botón para quitar la restricción de batería.
- Sin conexión: orden de artistas, álbumes y listas (A→Z, recientes, más canciones, más pesados) y menú ⋯ › «Descargar todas mis listas».
- GitHub Actions compila el APK automáticamente con cada actualización (pestaña Releases).

## Descargar el APK

➡️ **[Descargar Opus v6 (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, 4,6 MB. El archivo también aparece
en la lista de archivos del repositorio.

Suma SHA-256 para verificar el archivo: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Instalación en Android:
1. Descarga `opus.apk` directamente en el móvil.
2. Abre el archivo. Android pide permitir la instalación desde este origen (navegador o gestor de archivos): acepta.
3. Pulsa **Instalar**.

Notas:
- Es un APK de **debug** (firmado con la clave de depuración de Android Studio). Si ya tienes una versión de Opus firmada de otra forma,
  desinstálala primero.
- En Android 13+, permite las notificaciones de Opus (controles multimedia en la pantalla de bloqueo) y pon la batería de la app en
  «Sin restricciones» para que la reproducción continúe con la pantalla apagada.
- El móvil tiene que poder llegar a tu servidor Navidrome (por ejemplo a través de Tailscale).

## Funciones principales

### Novedades de la v3
- **Gestos al estilo iPhone** (Ajustes › Gestos y atajos): tirar hacia abajo en la parte superior de una página abre su menú ⋯, deslizar
  hacia abajo en el reproductor abre el menú de la canción, hacia arriba la cola, doble toque en la portada = me gusta,
  pulsación larga en una canción, un álbum, una lista o un artista = su menú, deslizar una canción a la derecha = reproducir a continuación, a la izquierda =
  añadir a la cola. Todo es configurable.
- **Temas**: oscuro, AMOLED (negro puro) y claro.
- **Fold desplegado**: biblioteca a la izquierda, reproductor fijo a la derecha con la letra (o la cola) debajo. Plegado, la app
  vuelve a ser la de siempre.
- **Carpetas de listas**: organización local en el móvil (Navidrome no gestiona carpetas).
- **Importar listas de Spotify, YouTube y YouTube Music** por enlace, sin clave de API: las canciones se buscan en la
  biblioteca, las que faltan pueden mandarse a deemix y la lista puede recrearse en Navidrome.
- **Detección de duplicados**: la misma canción en varias copias o calidades, la mejor calidad primero.
- **deemix caso por caso**: calidad (FLAC, 320, 128) y lista de destino elegidas en cada descarga.
- **Android**: atajos en el icono (Flow, Sin conexión, Búsqueda) y widget de pantalla de inicio.

### Escucha y descubrimiento
- **Flow** (mezcla infinita según tus gustos, con estados de ánimo), **Mix del día**, **radios** a partir de una canción o un artista.
- **Joyas olvidadas**, **Tal día como hoy**, **Novedades de tus artistas**, **Blind test**, **Historial**, **Replay**.
- Letras sincronizadas y táctiles, cola, temporizador de apagado, ecualizador, ReplayGain, fundido encadenado, modo coche.
- Modo sin conexión por pestañas (Canciones, Artistas, Álbumes, Listas).
- Más de 40 funciones que se activan o desactivan en Ajustes › Funciones.

## Configuración

En el primer inicio, introduce la dirección de tu servidor Navidrome (por ejemplo `http://mon-serveur:4533`), tu usuario y
tu contraseña. El color del tema se cambia en Ajustes › Apariencia.

### deemix (opcional)
Opus puede controlar un pequeño servicio instalado en tu servidor (carpeta `server/`, ver `server/README-serveur.md`) para
descargar canciones de Deezer en la carpeta de música de Navidrome. El ARL de Deezer se introduce en la app.
Atención: este uso va en contra de las condiciones de uso de Deezer.

## Compilarlo tú mismo (Windows)

Requisitos: Node.js 20+, Android Studio con el SDK de Android y **JDK 21** (Gradle 8.14 todavía no lee las clases
compiladas con Java 27 o posterior).

```
npm install
npm run android:add     # crea la carpeta android/ y aplica las correcciones
npm run sync            # build web + sincronización de Capacitor
cd android
gradlew.bat assembleDebug
```

El APK se genera en `android/app/build/outputs/apk/debug/app-debug.apk`.

Si Gradle usa el Java equivocado, define `JAVA_HOME` apuntando al JDK 21 antes de compilar:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

Para probar sin servidor: `npm run mock` (Navidrome falso, usuario y contraseña `test` / `test`) y luego `npm run dev`.

## Limitaciones conocidas
- La importación de Spotify / YouTube lee las páginas públicas de esos sitios, cuyo formato cambia a menudo. Si falla, pegar
  una lista «Artista - Título» siempre funciona. Sin cuenta, solo se leen las 100 primeras canciones.
- El modo Fold, el widget y los gestos se han comprobado mediante simulación, todavía no en todos los dispositivos.
- El visualizador es decorativo.
- El ecualizador requiere que tu servidor permita CORS en los flujos de audio (`Access-Control-Allow-Origin`).
