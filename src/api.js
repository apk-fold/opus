// Client de l'API Subsonic / OpenSubsonic (Navidrome).
// Authentification par token : t = md5(mot de passe + sel). Le mot de passe n'est jamais stocké ni envoyé.
import { md5 } from './md5.js';
import { store } from './store.js';

const CLIENT = 'Opus';
const VERSION = '1.16.1';

const randHex = (n) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

// identifiant stable d'un serveur (adresse + utilisateur)
const sidOf = (cfg) => (cfg ? `${cfg.url}|${cfg.user}` : '');
const hostOf = (url) => { try { return new URL(url).host; } catch { return url; } };

// marque chaque objet reçu (titre, album, artiste…) avec le serveur d'où il vient : on peut ainsi
// lire / télécharger un titre de n'importe quel serveur, même après avoir changé de serveur actif
function tag(node, sid) {
  if (Array.isArray(node)) { for (const x of node) tag(x, sid); return; }
  if (!node || typeof node !== 'object') return;
  if (node.id != null && node.srv == null) node.srv = sid;
  for (const k in node) { const v = node[k]; if (v && typeof v === 'object') tag(v, sid); }
}

class Api {
  constructor() {
    this.cfg = store.get('auth', null);
    // plusieurs serveurs Navidrome : [{ id, name, cfg }] ; cfg = serveur actif
    this.servers = store.get('servers', []) || [];
    if (this.cfg && !this.servers.some((x) => x.id === sidOf(this.cfg))) {
      this.servers.push({ id: sidOf(this.cfg), name: hostOf(this.cfg.url), cfg: this.cfg });
      store.set('servers', this.servers);
    }
  }

  get ready() { return !!this.cfg; }
  get user() { return this.cfg?.user || ''; }
  get server() { return this.cfg?.url || ''; }
  get activeId() { return sidOf(this.cfg); }
  get activeName() { return this.servers.find((x) => x.id === this.activeId)?.name || hostOf(this.server); }
  cfgFor(srv) { return (srv && this.servers.find((x) => x.id === srv)?.cfg) || this.cfg; }

  // ajoute un serveur (vérifie l'adresse et les identifiants) ; active = le rend actif
  async addServer(url, user, password, name = '', active = false) {
    url = url.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
    const salt = randHex(8);
    const cfg = { url, user: user.trim(), salt, token: md5(password + salt) };
    await this._call(cfg, 'ping');
    const id = sidOf(cfg);
    const entry = { id, name: name.trim() || hostOf(url), cfg };
    const i = this.servers.findIndex((x) => x.id === id);
    if (i >= 0) this.servers[i] = entry; else this.servers.push(entry);
    store.set('servers', this.servers);
    if (active || !this.cfg) this.use(id);
    return entry;
  }
  use(id) {
    const sv = this.servers.find((x) => x.id === id);
    if (!sv) return false;
    this.cfg = sv.cfg;
    store.set('auth', sv.cfg);
    return true;
  }
  removeServer(id) {
    this.servers = this.servers.filter((x) => x.id !== id);
    store.set('servers', this.servers);
    if (this.activeId === id) {
      if (this.servers.length) this.use(this.servers[0].id); else this.logout();
    }
  }

  async login(url, user, password) {
    url = url.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
    const salt = randHex(8);
    const cfg = { url, user: user.trim(), salt, token: md5(password + salt) };
    await this._call(cfg, 'ping'); // lève une erreur si l'URL ou les identifiants sont faux
    this.cfg = cfg;
    store.set('auth', cfg);
    const id = sidOf(cfg);
    const entry = { id, name: hostOf(url), cfg };
    const i = this.servers.findIndex((x) => x.id === id);
    if (i >= 0) this.servers[i] = { ...this.servers[i], cfg }; else this.servers.push(entry);
    store.set('servers', this.servers);
    return cfg;
  }

  // déconnexion du serveur actif (les autres serveurs enregistrés restent)
  logout() {
    const id = this.activeId;
    this.servers = this.servers.filter((x) => x.id !== id);
    store.set('servers', this.servers);
    this.cfg = null;
    store.del('auth');
    if (this.servers.length) this.use(this.servers[0].id);
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

  url(endpoint, params, srv) {
    const cfg = this.cfgFor(srv);
    return `${cfg.url}/rest/${endpoint}?${this._qs(cfg, params)}`;
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
    tag(data, sidOf(cfg));
    return data;
  }

  call(endpoint, params) { return this._call(this.cfg, endpoint, params); }

  // ---------- URLs médias ----------
  coverUrl(id, size = 300, srv) { return id ? this.url('getCoverArt', { id, size }, srv) : ''; }
  streamUrl(id, { bitrate = 0 } = {}, srv) {
    return this.url('stream', bitrate ? { id, maxBitRate: bitrate, format: 'mp3' } : { id }, srv);
  }
  downloadUrl(id, srv) { return this.url('download', { id }, srv); }

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
  scrobble(id, submission, srv) { return this._call(this.cfgFor(srv), 'scrobble', { id, submission }).catch(() => {}); }

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
