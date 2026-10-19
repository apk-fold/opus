// Ajustements du projet Android généré par Capacitor (idempotent, à relancer sans risque) :
//  - autorise le HTTP en clair (ton Navidrome tourne en http:// sur l'IP Tailscale)
//  - fond sombre au lancement + fenêtre/barres système sombres (évite le flash blanc)
//  - nom de l'appli : Opus
//  - raccourcis de l'icône, liens opus:// et widget d'écran d'accueil (scripts/android-extra)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'android');
if (!existsSync(root)) {
  console.log('[patch] Dossier android/ absent : lance d\'abord "npm run android:add".');
  process.exit(0);
}

const log = (m) => console.log('[patch] ' + m);

// 1. AndroidManifest : trafic HTTP en clair
const manifestPath = join(root, 'app/src/main/AndroidManifest.xml');
if (existsSync(manifestPath)) {
  let x = readFileSync(manifestPath, 'utf8');
  if (!x.includes('usesCleartextTraffic')) {
    x = x.replace('<application', '<application\n        android:usesCleartextTraffic="true"');
    writeFileSync(manifestPath, x);
    log('HTTP en clair autorisé (usesCleartextTraffic).');
  } else {
    log('HTTP en clair : déjà en place.');
  }
  // Lecture en arrière-plan (écran verrouillé) : service de premier plan « média » + notification
  const perms = ['FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_MEDIA_PLAYBACK', 'POST_NOTIFICATIONS', 'WAKE_LOCK', 'REQUEST_IGNORE_BATTERY_OPTIMIZATIONS'];
  const missing = perms.filter((p) => !x.includes(`android.permission.${p}"`));
  if (missing.length) {
    x = x.replace('<application', missing.map((p) => `<uses-permission android:name="android.permission.${p}" />`).join('\n    ') + '\n    <application');
    writeFileSync(manifestPath, x);
    log('Permissions de lecture en arrière-plan ajoutées : ' + missing.join(', ') + '.');
  } else {
    log('Permissions de lecture en arrière-plan : déjà en place.');
  }
  // Téléchargements dans les dossiers publics (Musique, Téléchargements, Documents).
  // Android 11+ n'exige rien pour les fichiers créés par l'appli ; ces permissions servent aux versions plus anciennes.
  const storage = [['READ_EXTERNAL_STORAGE', 32], ['WRITE_EXTERNAL_STORAGE', 29]].filter(([p]) => !x.includes(`android.permission.${p}"`));
  if (storage.length) {
    x = x.replace('<application', storage.map(([p, max]) => `<uses-permission android:name="android.permission.${p}" android:maxSdkVersion="${max}" />`).join('\n    ') + '\n    <application');
    log('Permissions de stockage ajoutées (anciens Android).');
  }
  if (!x.includes('requestLegacyExternalStorage')) {
    x = x.replace('<application', '<application\n        android:requestLegacyExternalStorage="true"');
    log('Stockage « legacy » activé (Android 10).');
  }
  writeFileSync(manifestPath, x);
  if (!/configChanges="[^"]*screenSize/.test(x)) {
    log('ATTENTION : configChanges sans screenSize dans le manifest — l\'activité pourrait redémarrer au pliage/dépliage.');
  }
}

// 2. Couleur noire + thèmes de lancement
const colorsPath = join(root, 'app/src/main/res/values/nv_colors.xml');
writeFileSync(colorsPath, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="nv_black">#05030A</color>\n    <color name="nv_bar">#1A0E35</color>\n</resources>\n');
// Fond de fenêtre : violet profond en haut (sous la barre d'état) qui fond vers le noir
const drawDir = join(root, 'app/src/main/res/drawable');
mkdirSync(drawDir, { recursive: true });
writeFileSync(join(drawDir, 'nv_window_bg.xml'), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/nv_black" />
    <item>
        <shape android:shape="rectangle">
            <gradient android:angle="270" android:startColor="#1A0E35" android:endColor="#0005030A" android:type="linear" />
        </shape>
    </item>
</layer-list>
`);

const stylesPath = join(root, 'app/src/main/res/values/styles.xml');
if (existsSync(stylesPath)) {
  let s = readFileSync(stylesPath, 'utf8');
  const before = s;
  s = s.replace(/@drawable\/splash/g, '@color/nv_black');
  s = s.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>[\s\S]*?)<item name="android:background">@null<\/item>/, '$1<item name="android:background">@color/nv_black</item>');
  // Android 15+ (edge-to-edge) : la fenêtre passe derrière les barres système, son fond est visible
  // sous la barre d'état et la barre de navigation. On y met un dégradé violet → noir, et on force
  // des icônes claires (sinon barres blanches + icônes sombres).
  const themeRe = /<style name="AppTheme\.NoActionBar"[^>]*>[\s\S]*?<\/style>/;
  const m = s.match(themeRe);
  if (m) {
    const names = ['android:windowBackground', 'android:statusBarColor', 'android:navigationBarColor', 'android:windowLightStatusBar', 'android:windowLightNavigationBar', 'android:enforceStatusBarContrast', 'android:enforceNavigationBarContrast'];
    let blk = m[0].split('\n').filter((l) => !names.some((n) => l.includes(`name="${n}"`))).join('\n');
    blk = blk.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, `$1
        <item name="android:windowBackground">@drawable/nv_window_bg</item>
        <item name="android:statusBarColor">@color/nv_bar</item>
        <item name="android:navigationBarColor">@color/nv_black</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
        <item name="android:enforceStatusBarContrast">false</item>
        <item name="android:enforceNavigationBarContrast">false</item>`);
    s = s.replace(themeRe, () => blk);
  }
  if (!s.includes('windowSplashScreenBackground')) {
    s = s.replace(/(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)/, '$1\n        <item name="windowSplashScreenBackground">@color/nv_black</item>');
  }
  if (s !== before) {
    writeFileSync(stylesPath, s);
    log('Fond de lancement noir appliqué.');
  } else {
    log('Fond de lancement : déjà en place.');
  }
}

// 3. Nom de l'appli affiché sur le téléphone
const stringsPath = join(root, 'app/src/main/res/values/strings.xml');
if (existsSync(stringsPath)) {
  let t = readFileSync(stringsPath, 'utf8');
  const before = t;
  t = t.replace(/(<string name="app_name">)[^<]*(<\/string>)/, '$1Opus$2').replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, '$1Opus$2');
  if (t !== before) { writeFileSync(stringsPath, t); log('Nom de l\'appli : Opus.'); } else log('Nom de l\'appli : déjà en place.');
}

// 4. Raccourcis de l'icône (appui long : Flow, Hors-ligne, Recherche), liens opus://… et widget d'écran d'accueil.
//    Les fichiers natifs sont dans scripts/android-extra (copiés à chaque passage, ils écrasent les anciens).
const extra = join(process.cwd(), 'scripts/android-extra');
if (existsSync(extra)) {
  const mainDir = join(root, 'app/src/main');
  const copyTree = (from, to) => {
    mkdirSync(to, { recursive: true });
    for (const e of readdirSync(from, { withFileTypes: true })) {
      if (e.isDirectory()) copyTree(join(from, e.name), join(to, e.name));
      else copyFileSync(join(from, e.name), join(to, e.name));
    }
  };
  copyTree(join(extra, 'java'), join(mainDir, 'java'));
  copyTree(join(extra, 'res'), join(mainDir, 'res'));
  log('Widget, raccourcis et MainActivity copiés.');
  if (existsSync(manifestPath)) {
    let x = readFileSync(manifestPath, 'utf8');
    const before = x;
    if (!x.includes('android.app.shortcuts')) {
      x = x.replace(/(<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?)(\n\s*<\/activity>)/, `$1

            <!-- liens opus://flow, opus://offline… (raccourcis de l'icône, widget) -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="opus" />
            </intent-filter>
            <meta-data android:name="android.app.shortcuts" android:resource="@xml/shortcuts" />$2`);
    }
    if (!x.includes('.OpusWidget')) {
      x = x.replace(/(\n\s*<\/application>)/, `

        <!-- widget d'écran d'accueil -->
        <receiver android:name=".OpusWidget" android:exported="true" android:label="Opus">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/opus_widget_info" />
        </receiver>$1`);
    }
    if (x !== before) { writeFileSync(manifestPath, x); log('Manifest : raccourcis, liens opus:// et widget déclarés.'); }
    else log('Manifest : raccourcis et widget déjà déclarés.');
  }
}

// 5. Lecteur natif (Media3 / ExoPlayer) : dépendances Gradle + service de lecture
const gradlePath = join(root, 'app/build.gradle');
if (existsSync(gradlePath)) {
  let g = readFileSync(gradlePath, 'utf8');
  if (!g.includes('androidx.media3:media3-exoplayer')) {
    g = g.replace(/dependencies \{/, `dependencies {
    implementation "androidx.media3:media3-exoplayer:1.8.0"
    implementation "androidx.media3:media3-session:1.8.0"
    implementation "androidx.media3:media3-common:1.8.0"`);
    writeFileSync(gradlePath, g);
    log('Media3 (ExoPlayer) ajouté à Gradle.');
  } else log('Media3 : déjà dans Gradle.');
}
if (existsSync(manifestPath)) {
  let x = readFileSync(manifestPath, 'utf8');
  if (!x.includes('OpusPlaybackService')) {
    x = x.replace(/(\n\s*<\/application>)/, `

        <!-- lecteur natif : ExoPlayer + notification média -->
        <service android:name=".OpusPlaybackService" android:exported="true" android:foregroundServiceType="mediaPlayback">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
            </intent-filter>
        </service>$1`);
    writeFileSync(manifestPath, x);
    log('Manifest : service de lecture natif déclaré.');
  } else log('Manifest : service de lecture déjà déclaré.');
}

log('OK.');
