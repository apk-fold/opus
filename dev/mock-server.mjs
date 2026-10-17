// Faux serveur Navidrome (API Subsonic) pour développer / tester l'interface sans serveur.
//   npm run mock   →  http://localhost:4533   (utilisateur : test / mot de passe : test)
import http from 'node:http';
import { createHash } from 'node:crypto';

const PORT = Number(process.env.PORT || 4533);
const USER = 'test', PASS = 'test';
const md5 = (s) => createHash('md5').update(s).digest('hex');

// ---------- données factices (déterministes) ----------
let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ARTISTS = ['Aurora Nocturne', 'Violet Static', 'Neon Harbor', 'Les Ombres Douces', 'Midnight Cassette', 'Sable & Soleil', 'Kaleido', 'Zéphyr'];
const GENRES = ['Synthwave', 'Électro', 'Pop', 'Rock', 'Ambient', 'Jazz'];
const A_WORDS = ['Nuit', 'Cristal', 'Horizon', 'Mirage', 'Fréquence', 'Orbite', 'Velours', 'Néon', 'Écho', 'Lumière', 'Silence', 'Marée'];
const S_WORDS = ['Voyage', 'Signal', 'Danse', 'Lune', 'Rivage', 'Fusion', 'Pulse', 'Rêve', 'Chrome', 'Aube', 'Vertige', 'Onde', 'Braise', 'Satellite'];

const artists = ARTISTS.map((name, i) => ({ id: 'ar' + (i + 1), name, starred: i === 1 ? '2026-01-01T00:00:00Z' : undefined }));
const albums = [];
const songs = [];
let sid = 1, day = 0;
for (const ar of artists) {
  for (let k = 0; k < 2; k++) {
    const id = 'al' + (albums.length + 1);
    const genre = pick(GENRES);
    const al = { id, name: `${pick(A_WORDS)} ${pick(A_WORDS)}`, artist: ar.name, artistId: ar.id, year: 2015 + Math.floor(rnd() * 11), genre, coverArt: id, created: `2026-0${1 + (day++ % 9)}-15T10:00:00Z`, songs: [] };
    const n = 6 + Math.floor(rnd() * 5);
    for (let t = 1; t <= n; t++) {
      const s = {
        id: 's' + sid++, parent: id, isDir: false, title: `${pick(S_WORDS)} ${pick(['I', 'II', 'de nuit', 'rouge', 'électrique', 'lente', '(live)', 'infinie'])}`,
        album: al.name, artist: ar.name, albumId: id, artistId: ar.id, track: t, discNumber: 1, year: al.year, genre, coverArt: id,
        duration: 150 + Math.floor(rnd() * 130), suffix: 'mp3', bitRate: 320, size: 6e6, contentType: 'audio/mpeg', path: `${ar.name}/${al.name}/${t}.mp3`, playCount: Math.floor(rnd() * 40),
        bpm: 80 + Math.floor(rnd() * 80), replayGain: { trackGain: -12 + Math.floor(rnd() * 14) + rnd(), albumGain: -9 + Math.floor(rnd() * 8), trackPeak: 0.98 },
      };
      al.songs.push(s); songs.push(s);
    }
    al.songCount = n; al.duration = al.songs.reduce((x, y) => x + y.duration, 0);
    albums.push(al);
  }
}
songs[2].starred = '2026-02-01T00:00:00Z'; songs[5].starred = '2026-02-02T00:00:00Z'; albums[1].starred = '2026-02-03T00:00:00Z';
songs[0].userRating = 4;
// un doublon en meilleure qualité (comme un titre retéléchargé par deemix)
songs.push({ ...songs[3], id: 'sdup1', suffix: 'flac', bitRate: 980, bitDepth: 16, samplingRate: 44100, size: 3.1e7, contentType: 'audio/flac', path: `deemix/${songs[3].artist} - ${songs[3].title}.flac`, album: songs[3].album, duration: songs[3].duration + 1 });
const playlists = [
  { id: 'pl1', name: 'Soirée violette', owner: USER, public: false, entry: songs.slice(0, 8) },
  { id: 'pl2', name: 'Focus', owner: USER, public: false, entry: songs.slice(20, 26) },
];
let playQueue = null;
const calls = [];

// ---------- helpers ----------
const albumOut = (a) => ({ id: a.id, name: a.name, title: a.name, album: a.name, artist: a.artist, artistId: a.artistId, year: a.year, genre: a.genre, coverArt: a.coverArt, songCount: a.songCount, duration: a.duration, created: a.created, starred: a.starred, isDir: true });
const artistOut = (a) => ({ id: a.id, name: a.name, coverArt: a.id, albumCount: albums.filter((x) => x.artistId === a.id).length, starred: a.starred });
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const songOf = (id) => songs.find((s) => s.id === id);
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const plOut = (p) => ({ id: p.id, name: p.name, owner: p.owner, public: p.public, songCount: p.entry.length, duration: p.entry.reduce((n, s) => n + s.duration, 0), coverArt: p.entry[0]?.coverArt });

const hue = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
function coverSvg(id, size = 300) {
  const h = 250 + (hue(id) % 70);
  const label = (albums.find((a) => a.id === id)?.name || artists.find((a) => a.id === id)?.name || id).slice(0, 14);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},75%,45%)"/><stop offset="1" stop-color="hsl(${h + 40},70%,12%)"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><circle cx="150" cy="150" r="96" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2"/><circle cx="150" cy="150" r="60" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2"/><circle cx="150" cy="150" r="14" fill="rgba(255,255,255,.55)"/><text x="150" y="272" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="white">${label.replace(/&/g, '&amp;')}</text></svg>`;
}

const wavCache = new Map();
function wav(id, seconds = 40) {
  if (wavCache.has(id)) return wavCache.get(id);
  const rate = 8000, n = rate * seconds, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  const base = 180 + (hue(id) % 8) * 35;
  for (let i = 0; i < n; i++) {
    const note = base * Math.pow(2, [0, 2, 4, 7, 9, 7, 4, 2][Math.floor(i / (rate * 0.5)) % 8] / 12);
    const env = Math.min(1, (i % (rate * 0.5)) / 400) * (1 - (i % (rate * 0.5)) / (rate * 0.55));
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * note * i) / rate) * 9000 * env), 44 + i * 2);
  }
  wavCache.set(id, buf);
  return buf;
}

const LYRICS = ['Dans la nuit violette', 'Les lumières se reflètent', 'Sur le chrome et le verre', 'Un signal dans le noir', 'Je te retrouve encore', 'Sous les néons qui dansent', 'La ville respire lentement', 'Et le temps se suspend', 'Fréquence de minuit', 'Laisse-moi tout oublier', 'Rien que la musique', 'Et l\'aube qui revient'];

// ---------- API ----------
function api(ep, q) {
  const list = (k) => asList(q.getAll(k).length > 1 ? q.getAll(k) : q.get(k));
  switch (ep) {
    case 'ping': return {};
    case 'getScanStatus': return { scanStatus: { scanning: false, count: songs.length * 21, folderCount: 4, lastScan: '2026-09-28T20:00:00Z' } };
    case 'startScan': return { scanStatus: { scanning: true, count: songs.length } };
    case 'getAlbumList2': {
      const type = q.get('type') || 'newest', size = Number(q.get('size') || 40), off = Number(q.get('offset') || 0);
      let l = albums.slice();
      if (type === 'newest') l.sort((a, b) => b.created.localeCompare(a.created));
      else if (type === 'random') l = shuffle(l);
      else if (type === 'starred') l = l.filter((a) => a.starred);
      else if (type === 'highest') l = l.filter((a) => a.songs.some((s) => s.userRating));
      else if (type === 'frequent') l.sort((a, b) => b.songs.reduce((n, s) => n + s.playCount, 0) - a.songs.reduce((n, s) => n + s.playCount, 0));
      else if (type === 'recent') l = l.slice(0, 6);
      else if (type === 'alphabeticalByName') l.sort((a, b) => a.name.localeCompare(b.name));
      else if (type === 'alphabeticalByArtist') l.sort((a, b) => a.artist.localeCompare(b.artist));
      else if (type === 'byGenre') l = l.filter((a) => a.genre === q.get('genre'));
      return { albumList2: { album: l.slice(off, off + size).map(albumOut) } };
    }
    case 'getAlbum': {
      const a = albums.find((x) => x.id === q.get('id'));
      if (!a) throw { code: 70, message: 'Album introuvable' };
      return { album: { ...albumOut(a), song: a.songs } };
    }
    case 'getArtists': {
      const groups = {};
      for (const a of artists) (groups[a.name[0].toUpperCase()] ||= []).push(artistOut(a));
      return { artists: { ignoredArticles: '', index: Object.keys(groups).sort().map((name) => ({ name, artist: groups[name] })) } };
    }
    case 'getArtist': {
      const a = artists.find((x) => x.id === q.get('id'));
      if (!a) throw { code: 70, message: 'Artiste introuvable' };
      return { artist: { ...artistOut(a), album: albums.filter((x) => x.artistId === a.id).map(albumOut) } };
    }
    case 'getArtistInfo2':
      return { artistInfo2: { biography: 'Un projet musical imaginaire créé pour tester l\'interface. <a href="https://example.com">Lire plus</a> Les synthés brillent, les basses vibrent, et la nuit ne finit jamais vraiment. '.repeat(3), similarArtist: artists.slice(2, 5).map(artistOut) } };
    case 'getStarred2':
      return { starred2: { artist: artists.filter((a) => a.starred).map(artistOut), album: albums.filter((a) => a.starred).map(albumOut), song: songs.filter((s) => s.starred) } };
    case 'search3': {
      const t = (q.get('query') || '').toLowerCase();
      const has = (s) => s.toLowerCase().includes(t);
      return { searchResult3: { artist: artists.filter((a) => has(a.name)).map(artistOut), album: albums.filter((a) => has(a.name) || has(a.artist)).map(albumOut), song: songs.filter((s) => has(s.title) || has(s.artist)).slice(Number(q.get('songOffset') || 0), Number(q.get('songOffset') || 0) + Number(q.get('songCount') || 40)) } };
    }
    case 'getRandomSongs': {
      let l = songs; if (q.get('genre')) l = l.filter((s) => s.genre === q.get('genre'));
      return { randomSongs: { song: shuffle(l).slice(0, Number(q.get('size') || 10)) } };
    }
    case 'getGenres': {
      const g = {};
      for (const a of albums) { (g[a.genre] ||= { value: a.genre, songCount: 0, albumCount: 0 }); g[a.genre].albumCount++; g[a.genre].songCount += a.songCount; }
      return { genres: { genre: Object.values(g) } };
    }
    case 'getInternetRadioStations':
      return { internetRadioStations: { internetRadioStation: [{ id: 'r1', name: 'Radio Violette FM', streamUrl: `http://localhost:${PORT}/live.wav`, homePageUrl: 'https://example.com' }, { id: 'r2', name: 'Nocturne Lo-Fi', streamUrl: `http://localhost:${PORT}/live.wav` }] } };
    case 'getPlaylists': return { playlists: { playlist: playlists.map(plOut) } };
    case 'getPlaylist': {
      const p = playlists.find((x) => x.id === q.get('id'));
      if (!p) throw { code: 70, message: 'Playlist introuvable' };
      return { playlist: { ...plOut(p), entry: p.entry } };
    }
    case 'createPlaylist': {
      const p = { id: 'pl' + (playlists.length + 1 + Math.floor(Math.random() * 1000)), name: q.get('name'), owner: USER, public: false, entry: list('songId').map(songOf).filter(Boolean) };
      playlists.push(p);
      return { playlist: { ...plOut(p), entry: p.entry } };
    }
    case 'updatePlaylist': {
      const p = playlists.find((x) => x.id === q.get('playlistId'));
      if (!p) throw { code: 70, message: 'Playlist introuvable' };
      if (q.get('name')) p.name = q.get('name');
      list('songIdToAdd').map(songOf).filter(Boolean).forEach((s) => p.entry.push(s));
      const rm = list('songIndexToRemove').map(Number).sort((a, b) => b - a);
      rm.forEach((i) => p.entry.splice(i, 1));
      return {};
    }
    case 'deletePlaylist': { const i = playlists.findIndex((x) => x.id === q.get('id')); if (i >= 0) playlists.splice(i, 1); return {}; }
    case 'star': case 'unstar': {
      const v = ep === 'star' ? new Date().toISOString() : undefined;
      if (q.get('id')) { const s = songOf(q.get('id')); if (s) s.starred = v; }
      if (q.get('albumId')) { const a = albums.find((x) => x.id === q.get('albumId')); if (a) a.starred = v; }
      if (q.get('artistId')) { const a = artists.find((x) => x.id === q.get('artistId')); if (a) a.starred = v; }
      return {};
    }
    case 'setRating': { const s = songOf(q.get('id')); if (s) s.userRating = Number(q.get('rating')) || undefined; return {}; }
    case 'scrobble': return {};
    case 'getSimilarSongs': case 'getSimilarSongs2': {
      if (process.env.MOCK_NOSIMILAR) return {};
      const base = songOf(q.get('id')) || songs.find((x) => x.artistId === q.get('id'));
      const l = songs.filter((x) => x.genre === base?.genre && x.id !== base?.id).slice(0, Number(q.get('count') || 20));
      return ep === 'getSimilarSongs' ? { similarSongs: { song: l } } : { similarSongs2: { song: l } };
    }
    case 'createShare': return { shares: { share: [{ id: 'sh1', url: 'http://localhost:4533/share/abc123', description: q.get('description') || '', username: USER }] } };
    case 'getSong': { const s = songOf(q.get('id')); if (!s) throw { code: 70, message: 'Titre introuvable' }; return { song: s }; }
    case 'getLyricsBySongId': {
      const n = Number(q.get('id').slice(1));
      if (n % 2) return { lyricsList: {} };
      return { lyricsList: { structuredLyrics: [{ lang: 'fra', synced: true, displayArtist: 'x', displayTitle: 'y', offset: 0, line: LYRICS.map((value, i) => ({ start: i * 1500, value })) }] } };
    }
    case 'savePlayQueue': playQueue = { current: q.get('current'), position: Number(q.get('position') || 0), entry: list('id').map(songOf).filter(Boolean) }; return {};
    case 'getPlayQueue': return playQueue ? { playQueue: { ...playQueue, username: USER, changed: new Date().toISOString(), changedBy: 'test' } } : {};
    default: throw { code: 0, message: 'Endpoint non géré par le mock : ' + ep };
  }
}

// ---------- serveur HTTP ----------
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length' };

http.createServer((req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (u.pathname === '/__calls') { res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' }); return res.end(JSON.stringify(calls)); }
  if (u.pathname === '/__reset') { calls.length = 0; res.writeHead(200, CORS); return res.end('ok'); }
  if (u.pathname === '/live.wav') { const b = wav('live', 60); res.writeHead(200, { ...CORS, 'Content-Type': 'audio/wav', 'Content-Length': b.length }); return res.end(b); }
  const m = u.pathname.match(/^\/rest\/([A-Za-z0-9]+)(?:\.view)?$/);
  if (!m) { res.writeHead(404, CORS); return res.end('not found'); }
  const ep = m[1], q = u.searchParams;
  calls.push({ ep, params: Object.fromEntries(q) });
  const reply = (body) => { res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' }); res.end(JSON.stringify({ 'subsonic-response': { version: '1.16.1', type: 'navidrome', serverVersion: '0.55.0 (mock)', openSubsonic: true, ...body } })); };
  if (q.get('u') !== USER || q.get('t') !== md5(PASS + q.get('s'))) return reply({ status: 'failed', error: { code: 40, message: 'Wrong username or password' } });
  if (ep === 'getCoverArt') { res.writeHead(200, { ...CORS, 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=3600' }); return res.end(coverSvg(q.get('id') || '', Number(q.get('size') || 300))); }
  if (ep === 'stream' || ep === 'download') {
    const b = wav(q.get('id') || 'x');
    const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0, end = range[2] ? Math.min(Number(range[2]), b.length - 1) : b.length - 1;
      res.writeHead(206, { ...(process.env.MOCK_NOCORS ? {} : CORS), 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${b.length}`, 'Content-Length': end - start + 1 });
      return res.end(b.subarray(start, end + 1));
    }
    res.writeHead(200, { ...(process.env.MOCK_NOCORS ? {} : CORS), 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Length': b.length });
    return res.end(b);
  }
  try { reply({ status: 'ok', ...api(ep, q) }); } catch (e) { reply({ status: 'failed', error: { code: e.code ?? 0, message: e.message || String(e) } }); }
}).listen(PORT, () => console.log(`Mock Navidrome sur http://localhost:${PORT}  (utilisateur : ${USER} / mot de passe : ${PASS})`));
