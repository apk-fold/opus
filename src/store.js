// Petit stockage persistant (localStorage) + réglages de l'appli.
const P = 'nv:';

export const store = {
  get(k, d = null) {
    try {
      const v = localStorage.getItem(P + k);
      return v == null ? d : JSON.parse(v);
    } catch { return d; }
  },
  set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch { /* quota / privé */ } },
  del(k) { try { localStorage.removeItem(P + k); } catch { /* rien */ } },
};

const DEFAULTS = {
  quality: 0,        // 0 = original, sinon débit max en kbps (transcodage serveur)
  fx: 'max',         // max | eco | off
  vinyl: false,      // pochette vinyle qui tourne
  viz: true,         // visualiseur décoratif
  haptics: true,
  view: 'grid',      // grid | list (albums)
  volume: 1,
  accent: '#8b5cf6', // couleur d'accent du thème
  coverColors: true, // teinte du lecteur d'après la pochette
  replayGain: 'off', // off | track | album (normalisation du volume)
  crossfade: 0,      // durée du fondu enchaîné, en secondes (0 = off)
  autoplay: true,    // continue avec des titres similaires quand la file se termine
  eq: false,         // égaliseur actif
  eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  eqPreset: 'flat',
  musicHaptics: false, // vibrations synchronisées avec la musique (approximation)
  // téléchargements
  dlLocation: 'app',   // app | external | music | download | documents (voir downloads.js)
  dlFolder: 'Opus',    // sous-dossier dans l'emplacement public
  dlNaming: 'flat',    // flat (Artiste - Titre) | tree (Artiste/Album/NN - Titre) | id
  dlQuality: 0,        // 0 = fichier original, sinon MP3 transcodé à ce débit
  dlWifiOnly: false,
  dlSyncStarred: false, // télécharge automatiquement les favoris
  dlSyncPlaylists: [],  // ids de playlists synchronisées hors-ligne
  // disposition
  navWide: 'left',     // écran déplié : left | right | bottom | fab
  navNarrow: 'bottom', // écran plié : bottom | fab
  fabSide: 'right',    // côté du bouton flottant : right | left
  tabs: ['home', 'albums', 'artists', 'playlists', 'more'], // onglets de la barre du bas
  searchPos: 'top',    // bouton recherche : top (barre du haut) | hidden
  miniPos: 'bottom',   // mini-lecteur : bottom | top
  startPage: 'home',
  // Deezer (catalogue / import de playlists)
  deezer: true,
  // deemix (service sur le serveur, voir server/README-serveur.md)
  dmxUrl: '',          // ex. http://100.91.164.116:6596
  dmxToken: '',        // jeton du service (fichier /etc/opus-deemix.env)
  dmxBitrate: 'auto',  // auto | flac | 320 | 128
  dmxPlaylist: 'ask',  // ask | none | <id de playlist Navidrome>
  dmxPlaylistName: '',
  // session privée : n'enregistre ni l'historique local ni les écoutes côté serveur
  privateSession: false,
  // fonctionnalités activables (Réglages › Fonctionnalités, voir flags.js)
  f_discover: true, f_history: true, f_replay: true, f_genres: true, f_radios: true, f_offline: true, f_car: true,
  f_flow: true, f_mixes: true, f_rediscover: true, f_throwback: true, f_releases: true, f_blindtest: true,
  f_homeStats: true, f_homeNewest: true, f_homeRecent: true, f_homeFrequent: true, f_homeRandom: true, f_homeStarred: true,
  f_radio: true, f_ban: true, f_scrobble: true, f_fadePause: true, f_resumeLong: true,
  f_lyrics: true, f_audioInfo: true, f_sleep: true, f_speed: true, f_gestures: true, f_keepAwake: false,
  f_dlLocal: true, f_rating: true, f_share: true, f_recentSearch: true, f_deemix: true,
  f_touch: true, f_folders: true, f_dupes: true, f_import: true,
  // gestes (Réglages › Gestes et raccourcis, voir gestures.js)
  g_npDown: 'menu', g_npUp: 'queue', g_coverTap2: 'like', g_coverSwipe: true, g_pull: 'menu', g_long: true, g_rowRight: 'next', g_rowLeft: 'queue',
  // apparence
  theme: 'dark',       // dark | amoled (noir pur) | light
  foldDock: true,      // Fold déplié : lecteur + paroles ancrés à droite en permanence
  // deemix : demander qualité et playlist à chaque envoi
  dmxAskEach: true,
};

const listeners = new Set();
let cur = { ...DEFAULTS, ...(store.get('settings', {}) || {}) };

export const settings = {
  get: (k) => cur[k],
  all: () => ({ ...cur }),
  set(k, v) {
    cur = { ...cur, [k]: v };
    store.set('settings', cur);
    listeners.forEach((f) => f(k, v));
  },
  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  defaultOf: (k) => DEFAULTS[k],
};
