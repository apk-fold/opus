// Deezer : catalogue public (recherche, classements, playlists, albums) + compte via l'ARL (lecture des playlists
// et coups de cœur), et correspondance avec la bibliothèque Navidrome pour lire / télécharger / ajouter aux playlists.
// Ce module ne télécharge rien depuis Deezer : seuls les titres présents sur ton serveur sont lus ou enregistrés.
// Les extraits de 30 s fournis publiquement par Deezer peuvent être écoutés. Le téléchargement depuis Deezer, s'il
// est activé, passe par le service deemix de ton serveur (deemix.js) — à utiliser en connaissance de cause :
// les conditions d'utilisation de Deezer l'interdisent.
import { Capacitor, CapacitorHttp, CapacitorCookies } from '@capacitor/core';
import { api } from './api.js';
import { store } from './store.js';

const API = 'https://api.deezer.com';
const GW = 'https://www.deezer.com/ajax/gw-light.php';
const native = () => Capacitor.isNativePlatform();
const pic = (hash, kind = 'cover', size = 250) => (hash ? `https://e-cdns-images.dzcdn.net/images/${kind}/${hash}/${size}x${size}-000000-80-0-0.jpg` : '');

// ---------------------------------------------------------------------------------------------
// API publique (sans compte). Dans l'appli : requête native (pas de CORS). Dans le navigateur : JSONP.
// ---------------------------------------------------------------------------------------------
let jsonpSeq = 0;
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = '__dz' + ++jsonpSeq;
    const s = document.createElement('script');
    const t = setTimeout(() => { cleanup(); reject(new Error('Deezer ne répond pas')); }, 12000);
    const cleanup = () => { clearTimeout(t); delete window[cb]; s.remove(); };
    window[cb] = (data) => { cleanup(); resolve(data); };
    s.onerror = () => { cleanup(); reject(new Error('Deezer injoignable')); };
    s.src = `${url}${url.includes('?') ? '&' : '?'}output=jsonp&callback=${cb}`;
    document.head.appendChild(s);
  });
}

export async function dzGet(path, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
  const url = `${API}/${path.replace(/^\//, '')}${q.toString() ? '?' + q : ''}`;
  let data;
  if (native()) {
    const r = await CapacitorHttp.get({ url, headers: { Accept: 'application/json' } });
    data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  } else data = await jsonp(url);
  if (data?.error) throw new Error(data.error.message || 'Erreur Deezer');
  return data;
}

// ---------------------------------------------------------------------------------------------
// Compte (ARL) : passerelle web de Deezer, utilisée uniquement pour LIRE tes playlists et coups de cœur.
// L'ARL est un cookie de session : il reste sur ce téléphone et n'est envoyé qu'à deezer.com.
// ---------------------------------------------------------------------------------------------
let session = null; // { token, sid, user }

// Sous Android, Capacitor ajoute à chaque requête les cookies déjà stockés pour deezer.com (sans l'ARL) :
// un en-tête « Cookie » fait main se retrouvait doublé et Deezer répondait « ARL invalide ».
// On place donc l'ARL dans le pot à cookies natif, comme le ferait un navigateur.
const DZ = 'https://www.deezer.com';
let jar = false;
async function primeJar() {
  jar = false;
  if (!native()) return;
  try {
    await CapacitorCookies.clearCookies({ url: DZ });
    await CapacitorCookies.setCookie({ url: DZ, key: 'arl', value: arl.get(), path: '/', expires: new Date(Date.now() + 180 * 864e5).toUTCString() });
    jar = true;
  } catch { /* repli : en-tête Cookie manuel */ }
}

export const arl = {
  get: () => store.get('dzArl', ''),
  // accepte aussi « arl=… », des guillemets ou des espaces collés par erreur
  set(v) { session = null; jar = false; v = String(v || '').trim().replace(/^arl\s*=\s*/i, '').replace(/[\s"';]/g, ''); v ? store.set('dzArl', v) : store.del('dzArl'); },
  get ready() { return !!arl.get(); },
};

async function gw(method, body = {}, retry = true) {
  if (!native()) throw new Error('Le compte Deezer fonctionne uniquement dans l\'appli Android.');
  if (!arl.ready) throw new Error('Aucun ARL configuré (Réglages > Deezer).');
  if (!session && method !== 'deezer.getUserData') await login();
  const token = method === 'deezer.getUserData' ? '' : session.token;
  const cookie = `arl=${arl.get()}${session?.sid ? '; sid=' + session.sid : ''}`;
  const r = await CapacitorHttp.post({
    url: `${GW}?method=${encodeURIComponent(method)}&input=3&api_version=1.0&api_token=${encodeURIComponent(token)}`,
    headers: { ...(jar ? {} : { Cookie: cookie }), 'Content-Type': 'application/json', Accept: 'application/json' },
    data: body,
  });
  const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  const err = data?.error && (Array.isArray(data.error) ? data.error.length : Object.keys(data.error).length);
  if (err) {
    if (retry && method !== 'deezer.getUserData' && JSON.stringify(data.error).includes('TOKEN')) { session = null; return gw(method, body, false); }
    throw new Error('Deezer : ' + JSON.stringify(data.error));
  }
  if (method === 'deezer.getUserData') {
    const setCookie = Object.entries(r.headers || {}).find(([k]) => k.toLowerCase() === 'set-cookie')?.[1] || '';
    const sid = /sid=([^;]+)/.exec(String(setCookie))?.[1];
    return { ...data.results, __sid: sid };
  }
  return data.results;
}

async function login() {
  session = null;
  await primeJar();
  let u;
  try { u = await gw('deezer.getUserData'); }
  catch (e) { throw new Error(/Deezer :/.test(e.message) ? e.message : 'Deezer injoignable (connexion internet ?)'); }
  const id = Number(u?.USER?.USER_ID || 0);
  if (!id) throw new Error(`ARL refusé par Deezer (${arl.get().length} caractères ; un ARL valide en fait 192 — expiré ou copié incomplet ?)`);
  session = { token: u.checkForm, sid: u.__sid, user: { id, name: u.USER.BLOG_NAME || 'Moi', picture: pic(u.USER.USER_PICTURE, 'user'), loved: u.USER.LOVEDTRACKS_ID } };
  return session.user;
}

export async function me() {
  if (!session) await login();
  return session.user;
}

// ---------------------------------------------------------------------------------------------
// Normalisation : un seul format pour l'API publique et la passerelle
// ---------------------------------------------------------------------------------------------
export const normTrack = (t) => (t.SNG_ID ? {
  id: String(t.SNG_ID), title: t.SNG_TITLE + (t.VERSION ? ' ' + t.VERSION : ''), artist: t.ART_NAME, album: t.ALB_TITLE,
  duration: Number(t.DURATION) || 0, cover: pic(t.ALB_PICTURE), isrc: t.ISRC,
  preview: (t.MEDIA || []).find((m) => m.TYPE === 'preview')?.HREF || '', link: `https://www.deezer.com/track/${t.SNG_ID}`,
} : {
  id: String(t.id), title: t.title, artist: t.artist?.name, album: t.album?.title, duration: t.duration || 0,
  cover: t.album?.cover_medium || t.album?.cover || '', isrc: t.isrc, preview: t.preview || '', link: t.link || `https://www.deezer.com/track/${t.id}`,
});

const normPlaylist = (p) => (p.PLAYLIST_ID ? {
  id: String(p.PLAYLIST_ID), title: p.TITLE, count: Number(p.NB_SONG) || 0, cover: pic(p.PLAYLIST_PICTURE, p.PICTURE_TYPE || 'playlist'), owner: p.PARENT_USERNAME || '',
} : { id: String(p.id), title: p.title, count: p.nb_tracks || 0, cover: p.picture_medium || '', owner: p.user?.name || p.creator?.name || '' });

const normAlbum = (a) => ({ id: String(a.id), title: a.title, artist: a.artist?.name || '', cover: a.cover_medium || '', year: (a.release_date || '').slice(0, 4), count: a.nb_tracks || 0 });
const normArtist = (a) => ({ id: String(a.id), name: a.name, cover: a.picture_medium || '', fans: a.nb_fan || 0 });

// ---------------------------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------------------------
async function pages(path, max = 1000) {
  const out = [];
  let index = 0;
  while (out.length < max) {
    const r = await dzGet(path, { index, limit: 100 });
    out.push(...(r.data || []));
    if (!r.next || !(r.data || []).length) break;
    index += 100;
  }
  return out;
}

export const dz = {
  async search(q, kind = 'track') {
    const r = await dzGet(`search/${kind === 'track' ? '' : kind}`.replace(/\/$/, ''), { q, limit: 40 });
    const d = r.data || [];
    return kind === 'track' ? d.map(normTrack) : kind === 'album' ? d.map(normAlbum) : kind === 'artist' ? d.map(normArtist) : d.map(normPlaylist);
  },
  async chart() {
    const r = await dzGet('chart/0', { limit: 30 });
    return { tracks: (r.tracks?.data || []).map(normTrack), albums: (r.albums?.data || []).map(normAlbum), playlists: (r.playlists?.data || []).map(normPlaylist) };
  },
  async playlist(id) {
    // playlist publique d'abord, sinon (privée) via le compte
    try {
      const p = await dzGet(`playlist/${id}`);
      const tracks = p.nb_tracks > (p.tracks?.data || []).length ? await pages(`playlist/${id}/tracks`, 2000) : p.tracks?.data || [];
      return { ...normPlaylist(p), cover: p.picture_big || p.picture_medium, tracks: tracks.map(normTrack) };
    } catch (e) {
      if (!arl.ready) throw e;
      const r = await gw('deezer.pagePlaylist', { playlist_id: id, lang: 'fr', nb: 2000, start: 0, tab: 0, tags: true, header: true });
      return { ...normPlaylist(r.DATA), tracks: (r.SONGS?.data || []).map(normTrack) };
    }
  },
  async album(id) {
    const a = await dzGet(`album/${id}`);
    return { ...normAlbum(a), cover: a.cover_big || a.cover_medium, tracks: (a.tracks?.data || []).map((t) => normTrack({ ...t, album: { title: a.title, cover_medium: a.cover_medium } })) };
  },
  async artist(id) {
    const [a, top, albums] = await Promise.all([dzGet(`artist/${id}`), dzGet(`artist/${id}/top`, { limit: 25 }), dzGet(`artist/${id}/albums`, { limit: 50 })]);
    return { ...normArtist(a), cover: a.picture_big || a.picture_medium, tracks: (top.data || []).map(normTrack), albums: (albums.data || []).map(normAlbum) };
  },
  async myPlaylists() {
    const u = await me();
    try {
      const r = await gw('deezer.pageProfile', { USER_ID: u.id, tab: 'playlists', nb: 500 });
      return (r?.TAB?.playlists?.data || []).map(normPlaylist);
    } catch {
      return (await pages(`user/${u.id}/playlists`, 500)).map(normPlaylist);
    }
  },
  async loved() {
    const u = await me();
    if (u.loved) {
      const p = await dz.playlist(u.loved);
      return { ...p, title: 'Coups de cœur' };
    }
    return { id: 'loved', title: 'Coups de cœur', cover: '', tracks: (await pages(`user/${u.id}/tracks`, 2000)).map(normTrack) };
  },
  // lien collé (deezer.com/…/playlist/123, album, track, artist, lien court deezer.page.link)
  async resolveLink(text) {
    let url = String(text).trim();
    if (/deezer\.page\.link|link\.deezer\.com/.test(url) && native()) {
      try { const r = await CapacitorHttp.get({ url }); url = r.url || url; } catch { /* on tente quand même */ }
    }
    const m = /deezer\.com\/(?:[a-z]{2}\/)?(playlist|album|track|artist)\/(\d+)/i.exec(url);
    return m ? { kind: m[1].toLowerCase(), id: m[2] } : null;
  },
};

// ---------------------------------------------------------------------------------------------
// Correspondance Deezer → Navidrome
// ---------------------------------------------------------------------------------------------
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s*[([].*?(feat|ft\.|with|remaster|version|edit|live|mono|stereo|deluxe|bonus).*?[)\]]/g, '')
  .replace(/\s+-\s+.*(remaster|version|edit|live|mix).*$/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
const mainArtist = (s) => norm(String(s || '').split(/,|&| feat\.? | ft\.? | x | et /i)[0]);

function score(t, s) {
  const tt = norm(t.title), st = norm(s.title);
  if (!tt || !st) return 0;
  let sc = tt === st ? 60 : (st.includes(tt) || tt.includes(st)) ? 40 : 0;
  if (!sc) return 0;
  const ta = mainArtist(t.artist), sa = norm(`${s.artist || ''} ${s.albumArtist || ''}`);
  if (ta && sa.includes(ta)) sc += 30; else if (ta && ta.split(' ').some((w) => w.length > 2 && sa.includes(w))) sc += 12;
  if (t.duration && s.duration) { const d = Math.abs(t.duration - s.duration); sc += d <= 3 ? 10 : d <= 10 ? 5 : d > 40 ? -15 : 0; }
  if (t.album && s.album && norm(t.album) === norm(s.album)) sc += 5;
  return sc;
}

export const matchScore = (t, s) => score(t, s);

const cache = new Map(Object.entries(store.get('dzMatch', {})));
let saveT = null;
const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set('dzMatch', Object.fromEntries([...cache].slice(-3000))), 800); };
const songs = new Map(); // id Navidrome → objet titre (session)

export async function matchTrack(t) {
  const c = cache.get(t.id);
  if (c && (c.s || Date.now() - c.at < 864e5)) { // un « absent » est revérifié au bout d'un jour
    if (!c.s) return null;
    if (songs.has(c.s)) return songs.get(c.s);
    try { const s = await api.song(c.s); songs.set(s.id, s); return s; } catch { cache.delete(t.id); }
  }
  const queries = [`${mainArtist(t.artist)} ${norm(t.title)}`, norm(t.title)];
  let best = null, bestSc = 0;
  for (const q of queries) {
    let res;
    try { res = await api.search(q, { artists: 0, albums: 0, songs: 15 }); } catch (e) { if (e.network) throw e; continue; }
    for (const s of res.songs) { const sc = score(t, s); if (sc > bestSc) { best = s; bestSc = sc; } }
    if (bestSc >= 70) break;
  }
  const ok = bestSc >= 70 ? best : null;
  cache.set(t.id, { s: ok?.id || null, at: Date.now() });
  persist();
  if (ok) songs.set(ok.id, ok);
  return ok;
}

// correspondance de toute une liste, 4 recherches en parallèle ; onEach(i, song|null) au fil de l'eau
export async function matchAll(tracks, onEach, stale = () => false) {
  const out = new Array(tracks.length).fill(undefined);
  let next = 0;
  const worker = async () => {
    while (next < tracks.length && !stale()) {
      const i = next++;
      try { out[i] = await matchTrack(tracks[i]); } catch { out[i] = null; }
      onEach?.(i, out[i]);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return out;
}

export function forgetMatches() { cache.clear(); store.del('dzMatch'); }

// oublie quelques correspondances (titres que deemix vient d'ajouter au serveur)
export function forgetMatch(ids) {
  for (const id of ids || []) cache.delete(String(id));
  persist();
}

// ---------------------------------------------------------------------------------------------
// Extraits de 30 s (lecteur séparé : met la lecture principale en pause)
// ---------------------------------------------------------------------------------------------
let prev = null;
export const preview = {
  current: null,
  play(t, onEnd) {
    preview.stop();
    if (!t.preview) return false;
    prev = new Audio(t.preview);
    preview.current = t.id;
    prev.addEventListener('ended', () => { preview.current = null; onEnd?.(); });
    prev.play().catch(() => {});
    return true;
  },
  stop() { if (prev) { prev.pause(); prev.removeAttribute('src'); prev = null; } preview.current = null; },
};
