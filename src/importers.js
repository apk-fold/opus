// Import de playlists par lien : Spotify, YouTube / YouTube Music (et Deezer, géré par ses propres pages).
// Aucune clé d'API : on lit la page publique (lecteur intégré Spotify, page playlist YouTube) via une requête
// native (CapacitorHttp, pas de CORS dans l'appli). Dans un navigateur, ces sites refusent la requête : on peut
// alors coller une liste « Artiste - Titre » (une ligne par titre).
// Chaque titre importé a le format des titres Deezer de l'appli : { id, title, artist, album, duration, cover, link }.
// Le lien Deezer (pour deemix) est cherché plus tard, seulement pour les titres absents de la bibliothèque.
import { Capacitor, CapacitorHttp, CapacitorCookies } from '@capacitor/core';
import { dz, matchScore } from './deezer.js';

const native = () => Capacitor.isNativePlatform();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// ---------------------------------------------------------------------------------------------
// Reconnaissance du lien
// ---------------------------------------------------------------------------------------------
export function parseLink(text) {
  const s = String(text || '').trim();
  let m = /(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?|spotify:)(playlist|album|track)[/:]([A-Za-z0-9]{10,40})/i.exec(s);
  if (m) return { src: 'spotify', kind: m[1].toLowerCase(), id: m[2] };
  if (/spotify\.link\/|spoti\.fi\//i.test(s)) return { src: 'spotify', kind: 'short', url: s.match(/https?:\/\/\S+/)?.[0] || s };
  m = /[?&]list=([A-Za-z0-9_-]{10,})/.exec(s);
  if (m && /youtu/i.test(s)) return { src: 'youtube', kind: 'playlist', id: m[1], music: /music\.youtube/i.test(s) };
  m = /deezer\.com\/(?:[a-z]{2}\/)?(playlist|album|track|artist)\/(\d+)/i.exec(s);
  if (m) return { src: 'deezer', kind: m[1].toLowerCase(), id: m[2] };
  if (/deezer\.page\.link|link\.deezer\.com/i.test(s)) return { src: 'deezer', kind: 'short', url: s };
  // liste collée : une ligne « Artiste - Titre » par titre
  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 1 && !/^https?:/i.test(s) && lines.some((l) => /\s[-–—]\s/.test(l))) return { src: 'text', kind: 'list', lines };
  return null;
}

async function getText(url, headers = {}) {
  if (!native()) throw new Error('Import par lien disponible dans l\'appli Android (le navigateur bloque ces sites). Ici, colle plutôt une liste « Artiste - Titre ».');
  const r = await CapacitorHttp.get({ url, headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8', Accept: 'text/html,*/*', ...headers }, responseType: 'text' });
  if (r.status >= 400) throw new Error(`Page inaccessible (HTTP ${r.status}) — playlist privée ?`);
  return { text: typeof r.data === 'string' ? r.data : JSON.stringify(r.data), url: r.url || url };
}

// parcourt un objet JSON et appelle fn(o) sur chaque objet
function walk(o, fn, depth = 0) {
  if (!o || typeof o !== 'object' || depth > 60) return;
  if (Array.isArray(o)) { for (const x of o) walk(x, fn, depth + 1); return; }
  fn(o);
  for (const k in o) { const v = o[k]; if (v && typeof v === 'object') walk(v, fn, depth + 1); }
}

const txt = (v) => (v == null ? '' : typeof v === 'string' ? v : v.simpleText || (v.runs || []).map((r) => r.text).join('') || v.content || '');

// ---------------------------------------------------------------------------------------------
// Spotify (lecteur intégré : jusqu'à ~100 titres pour une playlist, tout l'album)
// ---------------------------------------------------------------------------------------------
export function parseSpotifyHtml(html, kind = 'playlist') {
  let data = null;
  const nd = /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (nd) { try { data = JSON.parse(nd[1]); } catch { /* format inconnu */ } }
  if (!data) {
    const rs = /<script[^>]+id="(?:resource|initial-state)"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    if (rs) {
      const raw = rs[1].trim();
      for (const dec of [(x) => x, decodeURIComponent, (x) => atob(x)]) { try { data = JSON.parse(dec(raw)); break; } catch { /* suivant */ } }
    }
  }
  if (!data) throw new Error('Spotify a changé sa page : import impossible pour l\'instant');
  const entity = data?.props?.pageProps?.state?.data?.entity || data?.entity || data;
  const tracks = [];
  const seen = new Set();
  walk(entity, (o) => {
    const uri = String(o.uri || '');
    const isTrack = /^spotify:track:/.test(uri) || (o.type === 'track' && (o.id || o.uri));
    if (!isTrack) return;
    const title = o.title || o.name;
    if (!title) return;
    const id = uri.split(':').pop() || o.id;
    if (seen.has(id)) return;
    seen.add(id);
    const artist = o.subtitle || (o.artists || []).map((a) => a.name || a.profile?.name).filter(Boolean).join(', ') || o.artist?.name || '';
    let ms = typeof o.duration === 'number' ? o.duration : o.duration_ms || o.duration?.totalMilliseconds || 0;
    if (ms && ms < 10000) ms *= 1000; // déjà en secondes
    tracks.push({ id: 'sp:' + id, title: String(title), artist: String(artist).replace(/ /g, ' '), album: o.album?.name || '', duration: Math.round(ms / 1000), cover: '', link: '', preview: '' });
  });
  if (kind === 'track' && tracks.length > 1) tracks.length = 1;
  const cover = entity?.coverArt?.sources?.[0]?.url || entity?.visualIdentity?.image?.[0]?.url || entity?.images?.[0]?.url || '';
  return { name: entity?.name || entity?.title || 'Playlist Spotify', owner: entity?.subtitle || entity?.owner?.display_name || '', cover, tracks };
}

async function fromSpotify(ref) {
  if (ref.kind === 'short') {
    const r = await getText(ref.url);
    const m = parseLink(r.url) || parseLink(/open\.spotify\.com\/[^"'\s<]+/.exec(r.text)?.[0] || '');
    if (!m || m.src !== 'spotify' || m.kind === 'short') throw new Error('Lien Spotify non reconnu');
    ref = m;
  }
  const { text } = await getText(`https://open.spotify.com/embed/${ref.kind}/${ref.id}`);
  const out = parseSpotifyHtml(text, ref.kind);
  return { ...out, src: 'Spotify', url: `https://open.spotify.com/${ref.kind}/${ref.id}`, partial: ref.kind === 'playlist' && out.tracks.length >= 100 };
}

// ---------------------------------------------------------------------------------------------
// YouTube / YouTube Music (page playlist publique : 100 premières vidéos)
// ---------------------------------------------------------------------------------------------
const NOISE = /\s*[[(【](?:official|offici[eé]l+e?|clip|music\s*video|video|vid[eé]o|audio|lyrics?|lyric video|paroles|visuali[sz]er|hd|hq|4k|mv|en concert|explicit)[^\])】]*[\])】]/gi;
export function splitYoutube(title, channel = '') {
  let t = String(title || '').replace(NOISE, '').replace(/\s*\|\s*.*$/, '').replace(/\s*#\S+/g, '').trim();
  let artist = String(channel || '').replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').replace(/\s+(official|officiel)$/i, '').trim();
  const m = /^(.+?)\s+[-–—]\s+(.+)$/.exec(t);
  if (m) { artist = m[1].trim(); t = m[2].trim(); }
  t = t.replace(/^["“'«]\s*|\s*["”'»]$/g, '').trim();
  return { artist, title: t || String(title || '') };
}

export function parseYoutubeHtml(html) {
  const m = /ytInitialData\s*=\s*(\{[\s\S]+?\})\s*;\s*(?:<\/script>|var |window\[)/.exec(html);
  if (!m) throw new Error(/consent|Avant d'accéder|Before you continue/i.test(html) ? 'YouTube demande un consentement : réessaie' : 'Playlist YouTube introuvable (privée ?)');
  const data = JSON.parse(m[1]);
  const tracks = [];
  const seen = new Set();
  let name = '', owner = '';
  walk(data, (o) => {
    if (o.playlistMetadataRenderer && !name) name = o.playlistMetadataRenderer.title;
    if (o.playlistHeaderRenderer && !name) { name = txt(o.playlistHeaderRenderer.title); owner = txt(o.playlistHeaderRenderer.ownerText); }
    const v = o.playlistVideoRenderer || o.playlistPanelVideoRenderer;
    if (!v?.videoId || seen.has(v.videoId)) return;
    if (v.isPlayable === false) return;
    seen.add(v.videoId);
    const channel = txt(v.shortBylineText) || txt(v.longBylineText);
    const { artist, title } = splitYoutube(txt(v.title), channel);
    const len = Number(v.lengthSeconds) || (txt(v.lengthText).split(':').reduce((a, x) => a * 60 + Number(x || 0), 0));
    tracks.push({ id: 'yt:' + v.videoId, title, artist, album: '', duration: len || 0, cover: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`, link: '', preview: '' });
  });
  return { name: name || 'Playlist YouTube', owner, cover: tracks[0]?.cover || '', tracks };
}

async function fromYoutube(ref) {
  // « Avant d'accéder à YouTube » : cookies de consentement, posés dans le pot natif (pas d'en-tête Cookie fait main)
  try {
    const exp = new Date(Date.now() + 365 * 864e5).toUTCString();
    await CapacitorCookies.setCookie({ url: 'https://www.youtube.com', key: 'SOCS', value: 'CAI', path: '/', expires: exp });
    await CapacitorCookies.setCookie({ url: 'https://www.youtube.com', key: 'CONSENT', value: 'YES+cb', path: '/', expires: exp });
  } catch { /* navigateur */ }
  const { text } = await getText(`https://www.youtube.com/playlist?list=${encodeURIComponent(ref.id)}&hl=fr&persist_hl=1`);
  const out = parseYoutubeHtml(text);
  return { ...out, src: ref.music ? 'YouTube Music' : 'YouTube', url: `https://www.youtube.com/playlist?list=${ref.id}`, partial: out.tracks.length >= 100 };
}

// ---------------------------------------------------------------------------------------------
// Liste collée
// ---------------------------------------------------------------------------------------------
export function fromText(lines) {
  const tracks = lines.map((l, i) => {
    const clean = l.replace(/^\d+[.)]\s*/, '').replace(/\s*\(?\d{1,2}:\d{2}\)?\s*$/, '');
    const m = /^(.+?)\s+[-–—]\s+(.+)$/.exec(clean);
    const dur = /(\d{1,2}):(\d{2})\)?\s*$/.exec(l);
    return m ? { id: 'tx:' + i + ':' + clean.toLowerCase().slice(0, 60), artist: m[1].trim(), title: m[2].trim(), album: '', duration: dur ? Number(dur[1]) * 60 + Number(dur[2]) : 0, cover: '', link: '', preview: '' } : null;
  }).filter(Boolean);
  return { name: 'Liste importée', owner: '', cover: '', tracks, src: 'Liste', url: '' };
}

export async function importLink(text) {
  const ref = parseLink(text);
  if (!ref) throw new Error('Lien non reconnu : Spotify, YouTube, YouTube Music ou Deezer');
  if (ref.src === 'spotify') return fromSpotify(ref);
  if (ref.src === 'youtube') return fromYoutube(ref);
  if (ref.src === 'text') return fromText(ref.lines);
  return { deezer: ref };
}

// ---------------------------------------------------------------------------------------------
// Équivalent Deezer d'un titre importé (pour l'envoyer à deemix)
// ---------------------------------------------------------------------------------------------
const dzCache = new Map();
export async function deezerEquivalent(t) {
  if (t.link) return t;
  if (dzCache.has(t.id)) return dzCache.get(t.id);
  const main = String(t.artist || '').split(/,|&| feat\.? | ft\.? /i)[0].trim();
  const queries = [`artist:"${main}" track:"${t.title}"`, `${main} ${t.title}`];
  let best = null, bestSc = 0;
  for (const q of queries) {
    let res = [];
    try { res = await dz.search(q, 'track'); } catch { continue; }
    for (const d of res.slice(0, 15)) { const sc = matchScore(t, d); if (sc > bestSc) { best = d; bestSc = sc; } }
    if (bestSc >= 70) break;
  }
  // on garde l'identifiant d'origine (suivi des badges) et on emprunte le lien Deezer
  const out = bestSc >= 70 ? { ...t, link: best.link, isrc: best.isrc || '', album: t.album || best.album, cover: t.cover || best.cover, preview: best.preview || '', dzId: best.id } : null;
  dzCache.set(t.id, out);
  return out;
}
