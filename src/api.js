// Client de l'API Subsonic / OpenSubsonic (Navidrome).
// Authentification par token : t = md5(mot de passe + sel). Le mot de passe n'est jamais stocké ni envoyé.
import { md5 } from './md5.js';
import { store } from './store.js';

const CLIENT = 'Opus';
const VERSION = '1.16.1';

const randHex = (n) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

class Api {
  constructor() {
    this.cfg = store.get('auth', null);
  }

  get ready() { return !!this.cfg; }
  get user() { return this.cfg?.user || ''; }
  get server() { return this.cfg?.url || ''; }

  async login(url, user, password) {
    url = url.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
    const salt = randHex(8);
    const cfg = { url, user: user.trim(), salt, token: md5(password + salt) };
    await this._call(cfg, 'ping'); // lève une erreur si l'URL ou les identifiants sont faux
    this.cfg = cfg;
    store.set('auth', cfg);
    return cfg;
  }

  logout() {
    this.cfg = null;
    store.del('auth');
  }

  _qs(cfg, params = {}) {
    const q = new URLSearchParams({ u: cfg.user, t: cfg.token, s: cfg.salt, v: VERSION, c: CLIENT, f: 'json' });
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === '') continue;
      if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
      else q.append(k, v);
    }
    return q;
  }

  url(endpoint, params) {
    return `${this.cfg.url}/rest/${endpoint}?${this._qs(this.cfg, params)}`;
  }

  async _call(cfg, endpoint, params) {
    let res;
    try {
      res = await fetch(`${cfg.url}/rest/${endpoint}?${this._qs(cfg, params)}`);
    } catch (e) {
      const err = new Error('Serveur injoignable');
      err.network = true;
      throw err;
    }
    if (!res.ok) {
      const err = new Error('Erreur HTTP ' + res.status);
      err.http = res.status;
      throw err;
    }
    let data;
    try { data = (await res.json())['subsonic-response']; }
    catch { throw new Error('Réponse invalide : est-ce bien un serveur Navidrome ?'); }
    if (!data || data.status !== 'ok') {
      const err = new Error(data?.error?.message || 'Erreur du serveur');
      err.code = data?.error?.code;
      throw err;
    }
    return data;
  }

  call(endpoint, params) { return this._call(this.cfg, endpoint, params); }

  // ---------- URLs médias ----------
  coverUrl(id, size = 300) { return id ? this.url('getCoverArt', { id, size }) : ''; }
  streamUrl(id, { bitrate = 0 } = {}) {
    return this.url('stream', bitrate ? { id, maxBitRate: bitrate, format: 'mp3' } : { id });
  }
  downloadUrl(id) { return this.url('download', { id }); }

  // ---------- Bibliothèque ----------
  async albumList(type, { size = 40, offset = 0, genre } = {}) {
    const r = await this.call('getAlbumList2', { type, size, offset, genre });
    return arr(r.albumList2?.album);
  }
  async album(id) {
    const r = await this.call('getAlbum', { id });
    const a = r.album;
    a.song = arr(a.song);
    return a;
  }
  async artists() {
    const r = await this.call('getArtists');
    return arr(r.artists?.index).map((ix) => ({ name: ix.name, artists: arr(ix.artist) }));
  }
  async artist(id) {
    const r = await this.call('getArtist', { id });
    const a = r.artist;
    a.album = arr(a.album);
    return a;
  }
  async artistInfo(id) {
    try {
      const r = await this.call('getArtistInfo2', { id, count: 8 });
      return r.artistInfo2 || {};
    } catch { return {}; }
  }
  async starred() {
    const r = await this.call('getStarred2');
    const s = r.starred2 || {};
    return { artists: arr(s.artist), albums: arr(s.album), songs: arr(s.song) };
  }
  async search(query, { artists = 8, albums = 20, songs = 40 } = {}) {
    const r = await this.call('search3', { query, artistCount: artists, albumCount: albums, songCount: songs });
    const s = r.searchResult3 || {};
    return { artists: arr(s.artist), albums: arr(s.album), songs: arr(s.song) };
  }
  async randomSongs(size = 50, genre) {
    const r = await this.call('getRandomSongs', { size, genre });
    return arr(r.randomSongs?.song);
  }
  async genres() {
    const r = await this.call('getGenres');
    return arr(r.genres?.genre);
  }
  async radios() {
    try {
      const r = await this.call('getInternetRadioStations');
      return arr(r.internetRadioStations?.internetRadioStation);
    } catch { return []; }
  }
  async song(id) { return (await this.call('getSong', { id })).song; }
  // titres similaires (Navidrome s'appuie sur ses agents : Last.fm, Deezer…) — vide si non configuré
  async similarSongs(id, count = 30) {
    try { return arr((await this.call('getSimilarSongs', { id, count })).similarSongs?.song); } catch { return []; }
  }
  async similarSongs2(id, count = 30) {
    try { return arr((await this.call('getSimilarSongs2', { id, count })).similarSongs2?.song); } catch { return []; }
  }
  // lien de partage public (si le partage est activé côté Navidrome : ND_ENABLESHARING=true)
  async createShare(id, description = '') {
    try {
      const r = await this.call('createShare', { id, description });
      return arr(r.shares?.share)[0]?.url || null;
    } catch { return null; }
  }

  // ---------- Playlists ----------
  async playlists() {
    const r = await this.call('getPlaylists');
    return arr(r.playlists?.playlist);
  }
  async playlist(id) {
    const r = await this.call('getPlaylist', { id });
    const p = r.playlist;
    p.entry = arr(p.entry);
    return p;
  }
  async createPlaylist(name, songIds = []) {
    const r = await this.call('createPlaylist', { name, songId: songIds });
    return r.playlist;
  }
  addToPlaylist(playlistId, songIds) { return this.call('updatePlaylist', { playlistId, songIdToAdd: songIds }); }
  removeFromPlaylist(playlistId, indexes) { return this.call('updatePlaylist', { playlistId, songIndexToRemove: indexes }); }
  renamePlaylist(playlistId, name) { return this.call('updatePlaylist', { playlistId, name }); }
  deletePlaylist(id) { return this.call('deletePlaylist', { id }); }

  // ---------- Interactions ----------
  // kind : 'id' (titre), 'albumId', 'artistId'
  star(kind, id, on = true) { return this.call(on ? 'star' : 'unstar', { [kind]: id }); }
  rate(id, rating) { return this.call('setRating', { id, rating }); }
  scrobble(id, submission) { return this.call('scrobble', { id, submission }).catch(() => {}); }

  async lyrics(id) {
    try {
      const r = await this.call('getLyricsBySongId', { id });
      return arr(r.lyricsList?.structuredLyrics);
    } catch { return []; }
  }

  async scanStatus() {
    try { return (await this.call('getScanStatus')).scanStatus || {}; } catch { return {}; }
  }
  startScan() { return this.call('startScan'); }

  savePlayQueue(ids, current, positionMs) {
    return this.call('savePlayQueue', { id: ids, current, position: Math.floor(positionMs) }).catch(() => {});
  }
  async playQueue() {
    try {
      const r = await this.call('getPlayQueue');
      const q = r.playQueue;
      if (!q) return null;
      return { current: q.current, position: q.position || 0, songs: arr(q.entry) };
    } catch { return null; }
  }
}

export const api = new Api();
