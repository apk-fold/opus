// Découverte « à la Deezer / Spotify », calculée à partir de ta bibliothèque Navidrome et de ton historique local :
//  - Flow (mix infini, avec humeurs), radio d'un titre ou d'un artiste
//  - Mix du jour (un par artiste écouté), Pépites oubliées, Ce jour-là
//  - Nouveautés de tes artistes (catalogue Deezer)
// Rien n'est envoyé ailleurs que vers ton serveur (et l'API publique Deezer pour les nouveautés).
import { api } from './api.js';
import { store } from './store.js';
import { playLog } from './history.js';
import { cleanList } from './bans.js';
import { dzGet } from './deezer.js';

const DAY = 864e5;
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const settle = async (ps) => (await Promise.allSettled(ps)).flatMap((r) => (r.status === 'fulfilled' ? r.value || [] : []));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// favoris (mis en cache 10 min : sollicités par plusieurs générateurs)
let starCache = null;
async function starred() {
  if (starCache && Date.now() - starCache.at < 6e5) return starCache.data;
  const data = await api.starred().catch(() => ({ songs: [], albums: [], artists: [] }));
  starCache = { at: Date.now(), data };
  return data;
}
export const invalidateStarred = () => { starCache = null; };

// titres joués récemment (pour ne pas les reproposer tout de suite)
const recentIds = (n = 60) => new Set(playLog.all().slice(-n).map((r) => r.id));

// ---------------------------------------------------------------------------------------------
// Flow et humeurs
// ---------------------------------------------------------------------------------------------
export const MOODS = [
  ['all', 'Flow', 'Ta musique, sans fin'],
  ['chill', 'Chill', 'Calme, posé'],
  ['energy', 'Énergie', 'Pour bouger'],
  ['focus', 'Focus', 'Instrumental, peu de paroles'],
  ['discover', 'Découverte', 'Ce que tu écoutes peu'],
  ['favs', 'Coups de cœur', 'Tes favoris et leurs voisins'],
];
const RX = {
  chill: /(chill|ambient|lounge|jazz|acoust|folk|classi|piano|soul|r&b|rnb|lo-?fi|downtempo|bossa|indie|soft|ballad)/i,
  energy: /(rock|metal|dance|electro|électro|edm|house|techno|hip.?hop|rap|drill|drum|punk|trap|reggaeton|dubstep|hardstyle|funk|disco|pop)/i,
  focus: /(ambient|classi|piano|instrument|lo-?fi|soundtrack|bande originale|score|post-rock|jazz|chill|downtempo|électro|electro)/i,
};
function moodOk(s, mood) {
  if (mood === 'all' || mood === 'favs') return true;
  if (mood === 'discover') return (s.playCount || 0) <= 1;
  const bpm = Number(s.bpm) || 0;
  if (mood === 'chill' && bpm) return bpm < 108;
  if (mood === 'energy' && bpm) return bpm >= 115;
  return RX[mood]?.test(`${s.genre || ''} ${(s.genres || []).map((g) => g.name).join(' ')}`) ?? true;
}

/**
 * Une « fournée » de titres pour le Flow (≈ 25). `exclude` = ids déjà dans la file.
 */
export async function flowBatch(mood = 'all', exclude = new Set()) {
  const st = await starred();
  const top = playLog.stats(Date.now() - 60 * DAY).songs.slice(0, 20).map((x) => ({ id: x.id }));
  const favs = shuffle(st.songs);
  const seeds = shuffle([...favs.slice(0, 6), ...shuffle(top).slice(0, 6)]).slice(0, mood === 'favs' ? 6 : 5);
  const lists = await settle([
    ...seeds.map((s) => api.similarSongs(s.id, 20)),
    mood === 'discover' ? api.randomSongs(120) : api.randomSongs(40),
  ]);
  const avoid = new Set([...exclude, ...recentIds()]);
  let pool = cleanList([...(mood === 'favs' || mood === 'all' ? favs.slice(0, mood === 'favs' ? 18 : 8) : []), ...lists], avoid);
  let out = pool.filter((s) => moodOk(s, mood));
  if (out.length < 12) out = [...out, ...pool.filter((s) => !out.includes(s))].slice(0, 25); // humeur trop stricte : on complète
  if (out.length < 10) out = [...out, ...cleanList(await api.randomSongs(50).catch(() => []), new Set([...avoid, ...out.map((s) => s.id)]))];
  return shuffle(out).slice(0, 25);
}

// ---------------------------------------------------------------------------------------------
// Radios
// ---------------------------------------------------------------------------------------------
export async function songRadio(song, exclude = new Set()) {
  let list = await api.similarSongs(song.id, 50);
  if (list.length < 10 && song.artistId) list = [...list, ...(await api.similarSongs2(song.artistId, 40))];
  if (list.length < 10) list = [...list, ...(await api.randomSongs(40, song.genre).catch(() => []))];
  return shuffle(cleanList(list, new Set([...exclude, song.id]))).slice(0, 30);
}

export async function artistSongs(artistId, max = 30) {
  try {
    const a = await api.artist(artistId);
    const albums = await Promise.all(shuffle(a.album).slice(0, 4).map((x) => api.album(x.id).catch(() => ({ song: [] }))));
    return shuffle(albums.flatMap((x) => x.song)).slice(0, max);
  } catch { return []; }
}

export async function artistRadio(artistId, exclude = new Set()) {
  const [own, sim] = await Promise.all([artistSongs(artistId, 12), api.similarSongs2(artistId, 50)]);
  const others = cleanList(sim, exclude).filter((s) => s.artistId !== artistId);
  const mine = cleanList(own, exclude);
  // ~1 titre de l'artiste pour 2 titres proches
  const out = [];
  while (out.length < 30 && (mine.length || others.length)) {
    if (mine.length) out.push(mine.shift());
    if (others.length) out.push(others.shift());
    if (others.length) out.push(others.shift());
  }
  if (out.length < 8) out.push(...cleanList(await api.randomSongs(30).catch(() => []), new Set(out.map((s) => s.id))));
  return out;
}

// ---------------------------------------------------------------------------------------------
// Mix du jour : les artistes les plus écoutés (historique) puis tes artistes favoris
// ---------------------------------------------------------------------------------------------
export async function dailyMixes(n = 6) {
  const day = new Date().toDateString();
  const c = store.get('mixes', null);
  if (c?.day === day && c.list?.length) return c.list;
  const hist = playLog.stats(Date.now() - 90 * DAY).artists.filter((a) => a.id).map((a) => ({ id: a.id, name: a.label, cover: a.cov, n: a.n }));
  const st = await starred();
  const fav = st.artists.map((a) => ({ id: a.id, name: a.name, cover: a.coverArt, n: 0 }));
  const seen = new Set();
  let list = [...hist, ...shuffle(fav)].filter((a) => a.id && !seen.has(a.id) && seen.add(a.id)).slice(0, n);
  if (list.length < 3) {
    // bibliothèque neuve : artistes d'albums au hasard
    const al = await api.albumList('random', { size: 20 }).catch(() => []);
    for (const a of al) if (a.artistId && !seen.has(a.artistId) && list.length < n) { seen.add(a.artistId); list.push({ id: a.artistId, name: a.artist, cover: a.coverArt, n: 0 }); }
  }
  list = list.map((a, i) => ({ ...a, title: `Mix du jour ${i + 1}` }));
  store.set('mixes', { day, list });
  return list;
}

export const mixSongs = (artistId) => artistRadio(artistId);

// ---------------------------------------------------------------------------------------------
// Pépites oubliées : favoris non écoutés depuis 90 jours + titres jamais joués
// ---------------------------------------------------------------------------------------------
export async function rediscover() {
  const since = Date.now() - 90 * DAY;
  const played = new Set(playLog.all().filter((r) => r.t >= since).map((r) => r.id));
  const st = await starred();
  const old = shuffle(st.songs.filter((s) => !played.has(s.id))).slice(0, 20);
  const fresh = (await api.randomSongs(250).catch(() => [])).filter((s) => !(s.playCount > 0) && !played.has(s.id));
  return shuffle(cleanList([...old, ...fresh.slice(0, 40 - old.length)])).slice(0, 40);
}

// ---------------------------------------------------------------------------------------------
// Ce jour-là : écoutes d'il y a un an (± 4 jours), sinon d'il y a un mois
// ---------------------------------------------------------------------------------------------
export function throwbackInfo() {
  const all = playLog.all();
  if (!all.length) return null;
  const at = (ms) => all.filter((r) => Math.abs(r.t - (Date.now() - ms)) < 4 * DAY);
  for (const [ms, label] of [[365 * DAY, 'Il y a un an'], [182 * DAY, 'Il y a six mois'], [30 * DAY, 'Il y a un mois']]) {
    const rows = at(ms);
    const ids = [...new Set(rows.map((r) => r.id))];
    if (ids.length >= 3) return { label, ids: ids.slice(0, 40), covers: [...new Set(rows.map((r) => r.cov).filter(Boolean))].slice(0, 4) };
  }
  return null;
}

export async function throwbackSongs(info = throwbackInfo()) {
  if (!info) return [];
  const songs = await Promise.all(info.ids.map((id) => api.song(id).catch(() => null)));
  return songs.filter(Boolean);
}

// ---------------------------------------------------------------------------------------------
// Nouveautés de tes artistes (Deezer) : sorties de moins de 4 mois, cache 12 h
// ---------------------------------------------------------------------------------------------
export async function releases({ force = false, onProgress } = {}) {
  const c = store.get('releases', null);
  if (!force && c && Date.now() - c.at < 12 * 36e5) return c.items;
  const st = await starred();
  const names = [...new Set([
    ...playLog.stats(Date.now() - 120 * DAY).artists.map((a) => a.label),
    ...st.artists.map((a) => a.name),
    ...st.albums.map((a) => a.artist),
  ].filter(Boolean).map((n) => n.split(/,| feat\.? | & /i)[0].trim()))].slice(0, 24);
  const since = Date.now() - 120 * DAY;
  const items = [];
  let done = 0, next = 0;
  const worker = async () => {
    while (next < names.length) {
      const name = names[next++];
      try {
        const r = await dzGet('search/artist', { q: name, limit: 3 });
        const ar = (r.data || []).find((a) => norm(a.name) === norm(name));
        if (ar) {
          const al = await dzGet(`artist/${ar.id}/albums`, { limit: 12 });
          for (const a of al.data || []) {
            const t = Date.parse(a.release_date || '');
            if (t && t >= since && t <= Date.now() + DAY) items.push({ id: String(a.id), title: a.title, artist: ar.name, cover: a.cover_medium || '', date: a.release_date, type: a.record_type || 'album', at: t });
          }
        }
      } catch { /* artiste suivant */ }
      onProgress?.(++done, names.length);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  const seen = new Set();
  const out = items.filter((a) => !seen.has(a.id) && seen.add(a.id)).sort((a, b) => b.at - a.at).slice(0, 60);
  store.set('releases', { at: Date.now(), items: out });
  return out;
}
