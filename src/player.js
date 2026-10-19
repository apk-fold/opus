// Lecteur audio : file d'attente, aléatoire, répétition, minuterie de sommeil, MediaSession, scrobble,
// normalisation du volume (ReplayGain), fondu enchaîné, égaliseur (Web Audio) et lecture automatique.
// Rien ici ne dépend de GSAP ni de requestAnimationFrame : ça doit continuer à tourner écran éteint.
import { api } from './api.js';
import { store, settings } from './store.js';
import { downloads } from './downloads.js';
import { playLog } from './history.js';
import { BANDS } from './eq.js';
import { feat } from './flags.js';
import { cleanList } from './bans.js';
import { NativeAudio, nativeAvailable } from './native-audio.js';

const LONG = 900; // « longs titres » (s) : position mémorisée par titre

const shuffleArr = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export const coverFor = (s, size = 300) => {
  if (!s) return '';
  const d = downloads.get(s.id);
  if (d?.cover) return d.cover;
  const id = s.coverArt || s.albumId || (s.isRadio ? null : s.id);
  return id ? api.coverUrl(id, size, s.srv) : '';
};

class Player {
  constructor() {
    this._l = {};
    this.queue = [];
    this._orig = null;
    this.index = -1;
    this.shuffle = false;
    this.repeat = 'off'; // off | all | one
    this.rate = 1;
    this.sleepEnd = null;
    this.sleepAtTrackEnd = false;
    this.sleepAtAlbumEnd = false;
    this._sleepFade = 1;
    this._pf = 1;             // fondu lecture / pause (0..1)
    this._pfT = null;
    this.endless = null;      // générateur de titres (Flow, radio) : la file ne se termine jamais
    this.endlessLabel = '';
    this._longPos = store.get('longPos', {}) || {};
    this._scrobbled = false;
    this._errors = 0;
    this._resumeAt = 0;
    this._resumeId = null; // titre auquel la reprise s'applique (évite de démarrer un autre titre au milieu)
    this._lastSave = 0;
    this._lastServerSave = 0;
    this._lastPos = 0;
    this._xf = null;          // fondu enchaîné en cours
    this._graph = null;       // Web Audio : { ctx, filters, an, buf }
    this._connected = false;  // l'élément principal passe par le graphe (nécessite CORS)
    this._corsOK = true;
    this._extending = false;
    this._plainEl = null;     // élément sans graphe, pour les radios (pas de CORS)
    // Android : ExoPlayer (service natif) joue la musique ; ailleurs : élément <audio> classique
    this._nativeOn = nativeAvailable();
    if (this._nativeOn) {
      this._corsOK = false; // pas d'égaliseur Web Audio avec le lecteur natif
      const n = new NativeAudio();
      n.onTransition = (e) => this._nativeAdvanced(e);
      this._bindAudio(n);
      this.audio = this._main = n;
      this.on('queue', () => this._syncNativeSoon());
      this.on('state', () => this._syncNativeSoon());
      this.on('sleep', () => this._syncNativeSoon());
    } else {
      this.audio = this._main = this._makeAudio();
    }
    this._applyVolume();
    this._bindMediaSession();
    this._restore();
    settings.on((k) => {
      if (k === 'replayGain' || k === 'volume') this._applyVolume();
      else if (k === 'eq') { this._applyEq(); if (settings.get('eq')) this._enableEq(); }
      else if (k === 'eqGains') this._applyEq();
    });
  }

  // ---------- mini émetteur ----------
  on(ev, fn) { (this._l[ev] ||= new Set()).add(fn); return () => this._l[ev].delete(fn); }
  emit(ev, ...a) { this._l[ev]?.forEach((f) => f(...a)); }

  get current() { return this.queue[this.index] || null; }
  get playing() { return !this.audio.paused; }
  get time() { return this.audio.currentTime || 0; }
  get duration() {
    const d = this.audio.duration;
    return Number.isFinite(d) && d > 0 ? d : (this.current?.duration || 0);
  }

  // ---------- éléments audio ----------
  _makeAudio() {
    const a = new Audio();
    a.preload = 'auto';
    this._bindAudio(a);
    return a;
  }

  _bindAudio(a) {
    const me = () => a === this.audio;
    a.addEventListener('play', () => {
      if (!me()) return;
      if (this._xf?.paused) { this._xf.paused = false; this._xf.el.play().catch(() => {}); }
      this._syncSession(); this.emit('state');
    });
    a.addEventListener('pause', () => {
      if (!me() || a.ended) return;
      if (this._xf) { this._xf.paused = true; this._xf.el.pause(); }
      this._syncSession();
      this.emit('state');
      this._persistPos(true);
      this._saveServer(true);
    });
    a.addEventListener('playing', () => {
      if (!me()) return;
      this._errors = 0;
      this.emit('state');
      const s = this.current;
      if (s && !s.isRadio && !this._nowSent) { this._nowSent = true; if (this._report()) api.scrobble(s.id, false, s.srv); }
      this._checkCtx();
    });
    a.addEventListener('waiting', () => { if (me()) this.emit('state'); });
    a.addEventListener('loadedmetadata', () => {
      a._ok = true;
      if (!me()) return;
      if (a.crossOrigin && this._graph && !a._src) this._connectEl(a);
      const cur = this.current;
      const dur = a.duration;
      if (this._resumeAt > 0 && cur && this._resumeId === cur.id && !(dur > 0 && this._resumeAt > dur - 5)) {
        try { a.currentTime = this._resumeAt; } catch { /* ignoré */ }
      }
      this._resumeAt = 0; this._resumeId = null;
      this._positionState();
      this.emit('time');
    });
    a.addEventListener('timeupdate', () => { if (me()) this._onTime(); });
    a.addEventListener('ended', () => {
      if (!me()) return;
      this._forgetLong(this.current);
      if (this._xf) this._finishCrossfade(); else this.next(true);
    });
    a.addEventListener('error', () => { if (me()) this._onError(); });
  }

  _onTime() {
    const a = this.audio;
    const s = this.current;
    this.emit('time');
    if (!s) return;
    // scrobble : à la moitié du titre ou après 4 min
    if (!this._scrobbled && !s.isRadio && this.duration > 30 && (a.currentTime > this.duration / 2 || a.currentTime > 240)) {
      this._scrobbled = true;
      if (!settings.get('privateSession')) {
        if (feat('f_scrobble')) api.scrobble(s.id, true, s.srv);
        playLog.add(s);
      }
    }
    // minuterie de sommeil (vérifiée ici pour fonctionner en arrière-plan)
    if (this.sleepEnd) {
      const left = (this.sleepEnd - Date.now()) / 1000;
      if (left <= 0) { this._finishSleep(); return; }
      if (left < 12) { this._sleepFade = Math.max(0, left / 12); this._applyVolume(); }
    }
    // fondu enchaîné : démarre quand il reste `fade` secondes
    const fade = Number(settings.get('crossfade')) || 0;
    if (fade > 0 && !this._nativeOn && !this._xf && this.playing && !s.isRadio && this.repeat !== 'one' && !this.sleepAtTrackEnd && !this.sleepAtAlbumEnd && this.duration > fade * 2 + 4) {
      const left = this.duration - a.currentTime;
      const sleepLeft = this.sleepEnd ? (this.sleepEnd - Date.now()) / 1000 : Infinity;
      if (left <= fade + 0.05 && sleepLeft > fade + 3) this._startCrossfade(fade);
    }
    const now = Date.now();
    if (now - this._lastSave > 4000) { this._lastSave = now; this._persistPos(); this._positionState(); this._saveLong(s); }
    if (now - this._lastServerSave > 30000) this._saveServer();
  }

  _onError() {
    const s = this.current;
    const a = this.audio;
    if (!s || !a.src) return;
    // 1re erreur sur un flux chargé en mode CORS : le serveur n'envoie pas d'en-têtes CORS → pas d'égaliseur
    if (a.crossOrigin && !a._ok && this._corsOK && !this._connected) {
      this._corsOK = false;
      try { this._graph?.ctx.close(); } catch { /* ignoré */ }
      this._graph = null;
      if (settings.get('eq')) settings.set('eq', false);
      this.emit('eqfail');
      this._reloadCurrent(true);
      return;
    }
    this._errors++;
    this.emit('error', s);
    if (this._errors >= 3 || this.queue.length < 2) { this._errors = 0; return; }
    setTimeout(() => this.next(true), 400);
  }

  srcFor(s) {
    if (s.isRadio) return s.streamUrl;
    const d = downloads.get(s.id);
    if (d) return d.src;
    return api.streamUrl(s.id, { bitrate: settings.get('quality') }, s.srv);
  }

  _needCors(s) { return !s.isRadio && this._corsOK && (settings.get('eq') || this._connected); }

  _setSrc(a, s) {
    if (a.isNative) {
      const rg = this._rg(s);
      a.gain = rg;
      a.setSong(s, (x) => this._nativeItem(x), 0);
      return;
    }
    a._ok = false;
    if (this._needCors(s)) a.crossOrigin = 'anonymous'; else a.removeAttribute('crossorigin');
    a.src = this.srcFor(s);
  }

  _load(autoplay, fromNative = false) {
    this._cancelXf();
    const s = this.current;
    if (!s) {
      const a = this.audio;
      a.pause();
      a.removeAttribute('src');
      a.load();
      this.emit('track', null);
      this.emit('queue');
      return;
    }
    // les radios n'ont pas de CORS : elles passent par un élément à part, hors du graphe Web Audio
    const want = s.isRadio ? (this._plainEl ||= this._makeAudio()) : this._main;
    if (this.audio !== want) { this.audio.pause(); this.audio = want; }
    const a = this.audio;
    this._scrobbled = false;
    this._nowSent = false;
    // une reprise en attente ne vaut que pour le titre auquel elle a été associée : jamais pour un autre
    if (this._resumeAt && this._resumeId !== s.id) this._resumeAt = 0;
    if (settings.get('eq') && this._corsOK) this._ensureGraph();
    if (!this._resumeAt && feat('f_resumeLong') && (s.duration || 0) > LONG) {
      const p = this._longPos[s.id];
      if (p > 15 && p < s.duration - 20) { this._resumeAt = p; this._resumeId = s.id; }
    }
    if (!fromNative) this._setSrc(a, s);
    if (a.playbackRate !== this.rate) a.playbackRate = this.rate;
    a.preservesPitch = true;
    this._sleepFade = this.sleepEnd ? this._sleepFade : 1;
    this._applyVolume();
    if (autoplay && !fromNative) {
      this._resumeCtx();
      // la notification reste en « lecture » pendant le changement de titre (sinon Android peut couper le service)
      try { navigator.mediaSession.playbackState = 'playing'; } catch { /* ignoré */ }
      a.play().catch(() => {});
    }
    this._meta();
    this.emit('track', s);
    this.emit('queue');
    this._persist();
    this._maybeExtend();
    if (a.isNative) this._syncNative(true);
  }

  // ---------- lecteur natif : description des titres, file envoyée au service ----------
  async _nativeItem(s) {
    let uri = null;
    if (downloads.get(s.id)) { try { uri = await downloads.nativeUri(s.id); } catch { uri = null; } }
    if (!uri) uri = api.streamUrl(s.id, { bitrate: settings.get('quality') }, s.srv);
    let art = '';
    try { art = s.isRadio ? '' : api.coverUrl(s.coverArt || s.albumId || s.id, 512, s.srv); } catch { art = ''; }
    return { id: String(s.id), uri, title: s.title || '', artist: s.artist || '', album: s.album || '', art, duration: s.duration || 0, gain: this._rg(s) };
  }
  _nativePlan() {
    const n = this.queue.length, cur = this.index, s = this.current;
    const plan = { expect: String(s.id), prev: null, up: [], repeat: 0 };
    if (this.repeat === 'one') { plan.repeat = 1; return plan; }
    if (this.sleepAtTrackEnd) return plan;
    const all = this.repeat === 'all';
    const idx = [];
    let i = cur + 1;
    for (let k = 0; k < 40; k++) {
      if (i >= n) { if (!all) break; i = 0; }
      if (i === cur) break;
      const t = this.queue[i];
      if (!t || t.isRadio) break;
      if (this.sleepAtAlbumEnd && t.albumId !== s.albumId) break;
      idx.push(i); i++;
    }
    plan.upIdx = idx;
    plan.up = idx.map((j) => this.queue[j]);
    if (all && idx.length === n - 1 && !this.sleepAtAlbumEnd) plan.repeat = 2; // toute la file tient : le service boucle seul
    else if (cur > 0 && !this.queue[cur - 1].isRadio) plan.prev = this.queue[cur - 1];
    return plan;
  }
  _syncNativeSoon() { clearTimeout(this._snT); this._snT = setTimeout(() => this._syncNative(false), 300); }
  _syncNative(force) {
    const a = this.audio;
    if (!this._nativeOn || !a?.isNative) return;
    const s = this.current;
    if (!s || s.isRadio) return;
    const plan = this._nativePlan();
    const sig = [plan.repeat, plan.prev?.id, s.id, ...plan.up.map((x) => x.id)].join(',');
    a.syncUpcoming(plan, (x) => this._nativeItem(x), force ? sig + '#' + Date.now() : sig);
    a.setSleepAt(this.sleepEnd || 0);
  }
  // le service a enchaîné sur un autre titre (la page dormait, bouton de la notification…)
  _nativeAdvanced(e) {
    const a = this.audio;
    if (!a?.isNative || !this.queue.length) return;
    const n = this.queue.length;
    const forward = e.reason !== 2 || e.idx > (e.prevIdx ?? -1);
    let qi = -1;
    for (let k = 0; k < n && qi < 0; k++) {
      const i = forward ? (this.index + (e.reason === 0 ? k : k + 1)) % n : ((this.index - k - 1) % n + n) % n;
      if (String(this.queue[i]?.id) === e.id) qi = i;
    }
    if (qi < 0) qi = this.queue.findIndex((x) => String(x.id) === e.id);
    if (qi < 0) return;
    this._forgetLong(this.current);
    this._dir = forward ? 1 : -1;
    this.index = qi;
    a.gain = this._rg(this.queue[qi]);
    this._load(true, true);
  }

  // recharge le titre courant à la même position (activation de l'égaliseur, repli CORS)
  _reloadCurrent(forcePlay = false) {
    const s = this.current;
    if (!s) return;
    const t = this.time, was = this.playing || forcePlay;
    const sc = this._scrobbled, ns = this._nowSent;
    this._resumeAt = t; this._resumeId = s.id;
    this._load(was);
    this._scrobbled = sc; this._nowSent = ns;
  }

  // ---------- volume : réglage × ReplayGain × fondu de sommeil ----------
  _rg(s) {
    const mode = settings.get('replayGain');
    if (mode === 'off' || !s || s.isRadio) return 1;
    const rg = s.replayGain || {};
    let g = mode === 'album' ? (rg.albumGain ?? rg.trackGain) : (rg.trackGain ?? rg.albumGain);
    if (typeof g !== 'number') g = -6; // pas de donnée : niveau moyen d'un titre récent
    return Math.min(1, Math.pow(10, (g + 1) / 20));
  }
  _setVol(el, song, factor = 1) { el.volume = clamp01(settings.get('volume') * this._rg(song) * this._sleepFade * factor * (el === this.audio ? this._pf : 1)); }
  _applyVolume() {
    if (this._xf) { this._xfStep(); return; }
    this._setVol(this.audio, this.current);
  }

  // ---------- fondu enchaîné ----------
  _nextIndex(auto) {
    let i = this.index + 1;
    if (i >= this.queue.length) i = (this.repeat === 'all' || !auto) ? 0 : -1;
    return i;
  }

  _startCrossfade(fade) {
    const i = this._nextIndex(true);
    const next = this.queue[i];
    if (i < 0 || !next || next.isRadio || i === this.index) return;
    const x = this._makeAudio();
    x.playbackRate = this.rate;
    x.preservesPitch = true;
    x._ok = false;
    if (this._needCors(next)) x.crossOrigin = 'anonymous';
    if (this._connected && this._graph) this._connectEl(x);
    x.src = this.srcFor(next);
    this._setVol(x, next, 0);
    x.play().catch(() => {});
    this._xf = { el: x, i, fade, paused: false, timer: setInterval(() => this._xfStep(), 90) };
  }

  _xfStep() {
    const xf = this._xf;
    if (!xf) return;
    const a = this.audio;
    const p = clamp01(1 - Math.max(0, this.duration - a.currentTime) / xf.fade);
    this._setVol(a, this.current, Math.cos(p * Math.PI / 2));
    this._setVol(xf.el, this.queue[xf.i], Math.sin(p * Math.PI / 2));
    if (p >= 0.999 || a.ended) this._finishCrossfade();
  }

  _finishCrossfade() {
    const xf = this._xf;
    if (!xf) return;
    clearInterval(xf.timer);
    this._xf = null;
    const old = this.audio;
    this.audio = this._main = xf.el;
    this.index = xf.i;
    try { old.pause(); old.removeAttribute('src'); old.load(); } catch { /* ignoré */ }
    if (!xf.paused && xf.el.paused) xf.el.play().catch(() => {});
    this._scrobbled = false;
    this._nowSent = true;
    this._dir = 1;
    const s = this.current;
    if (s && !s.isRadio && this._report()) api.scrobble(s.id, false, s.srv);
    this._applyVolume();
    this._meta();
    this._syncSession();
    this._positionState();
    this.emit('track', s);
    this.emit('queue');
    this.emit('state');
    this._persist();
  }

  _cancelXf() {
    const xf = this._xf;
    if (!xf) return;
    clearInterval(xf.timer);
    this._xf = null;
    try { xf.el.pause(); xf.el.removeAttribute('src'); xf.el.load(); } catch { /* ignoré */ }
    this._applyVolume();
  }

  // ---------- égaliseur (Web Audio) ----------
  // Le graphe n'est utilisé que si le serveur autorise CORS (sinon Web Audio rend le son muet).
  _ensureGraph() {
    if (this._graph || !this._corsOK) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this._corsOK = false; return; }
      const ctx = new AC();
      const filters = BANDS.map((f, i) => {
        const b = ctx.createBiquadFilter();
        b.type = i === 0 ? 'lowshelf' : i === BANDS.length - 1 ? 'highshelf' : 'peaking';
        b.frequency.value = f;
        b.Q.value = 1.1;
        b.gain.value = 0;
        return b;
      });
      filters.reduce((p, n) => { p.connect(n); return n; });
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      an.smoothingTimeConstant = 0.25;
      const last = filters[filters.length - 1];
      last.connect(ctx.destination);
      last.connect(an);
      this._graph = { ctx, filters, an, buf: new Uint8Array(an.frequencyBinCount) };
      this._applyEq(true);
    } catch { this._graph = null; this._corsOK = false; }
  }

  _connectEl(a) {
    const g = this._graph;
    if (!g || a._src) return;
    try {
      a._src = g.ctx.createMediaElementSource(a);
      a._src.connect(g.filters[0]);
      if (a === this._main || a === this.audio) this._connected = true;
      this._resumeCtx();
    } catch { /* déjà connecté */ }
  }

  _resumeCtx() { const c = this._graph?.ctx; if (c && c.state === 'suspended') c.resume().catch(() => {}); }
  _checkCtx() {
    const c = this._graph?.ctx;
    if (!c || !this._connected || c.state === 'running') return;
    c.resume().catch(() => {});
    setTimeout(() => { if (this._graph && this._graph.ctx.state !== 'running' && this.playing) this.emit('eqwarn'); }, 800);
  }

  // à appeler depuis un geste utilisateur (activation dans les réglages)
  _enableEq() {
    if (!this._corsOK) { settings.set('eq', false); this.emit('eqfail'); return; }
    this._ensureGraph();
    this._resumeCtx();
    const s = this.current;
    if (s && !s.isRadio && !this._connected) this._reloadCurrent();
  }

  _applyEq(instant = false) {
    const g = this._graph;
    if (!g) return;
    const on = settings.get('eq');
    const gains = settings.get('eqGains') || [];
    g.filters.forEach((f, i) => {
      const v = on ? (Number(gains[i]) || 0) : 0;
      if (instant) f.gain.value = v; else f.gain.setTargetAtTime(v, g.ctx.currentTime, 0.04);
    });
  }

  get eqAvailable() { return this._corsOK; }
  get eqActive() { return !!this._connected && !!settings.get('eq'); }

  // énergie des basses (0..1), pour les vibrations synchronisées ; -1 si l'analyse n'est pas disponible
  bassLevel() {
    const g = this._graph;
    if (!g || !this._connected || g.ctx.state !== 'running') return -1;
    g.an.getByteFrequencyData(g.buf);
    return (g.buf[0] + g.buf[1] + g.buf[2] + g.buf[3]) / 4 / 255;
  }

  // ---------- commandes ----------
  playQueue(songs, start = 0, { shuffle = false, endless = null, label = '' } = {}) {
    if (!songs.length) return;
    this.endless = endless;
    this.endlessLabel = endless ? label : '';
    this._orig = null;
    this.shuffle = false;
    this.queue = songs.slice();
    this.index = shuffle ? Math.floor(Math.random() * songs.length) : Math.max(0, Math.min(start, songs.length - 1));
    if (shuffle) this.setShuffle(true, true);
    this._dir = 1;
    this._load(true);
    this.emit('state');
  }

  playRadio(st) {
    this.playQueue([{ id: 'radio-' + st.id, title: st.name, artist: 'Radio', album: 'Radio en direct', isRadio: true, streamUrl: st.streamUrl, duration: 0 }]);
  }

  playIndex(i) {
    if (i < 0 || i >= this.queue.length) return;
    this._dir = i >= this.index ? 1 : -1;
    this.index = i;
    this._load(true);
  }

  toggle() {
    this._resumeCtx();
    const a = this.audio;
    if (!this.current) return;
    if (!a.src || a.src === location.href) { this._load(true); return; }
    const fade = feat('f_fadePause') && !document.hidden && !this._xf;
    if (a.paused) {
      if (fade) { this._pf = 0; this._applyVolume(); }
      a.play().catch(() => {});
      if (fade) this._fadeTo(1, 320);
    } else if (fade) this._fadeTo(0, 220, () => { a.pause(); this._pf = 1; this._applyVolume(); });
    else a.pause();
  }
  play() { if (!this.playing) this.toggle(); }
  pause() {
    if (this._pfT) { clearInterval(this._pfT); this._pfT = null; this._pf = 1; this._applyVolume(); }
    this.audio.pause();
  }

  // fondu lecture / pause : fait varier _pf jusqu'à `to` en `ms`
  _fadeTo(to, ms, done) {
    clearInterval(this._pfT);
    const from = this._pf, t0 = performance.now();
    this._pfT = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      this._pf = from + (to - from) * p;
      this._applyVolume();
      if (p >= 1) { clearInterval(this._pfT); this._pfT = null; done?.(); }
    }, 16);
  }

  // n'enregistre rien côté serveur en session privée
  _report() { return !settings.get('privateSession') && feat('f_scrobble'); }

  // ---------- reprise des longs titres ----------
  _saveLong(s) {
    if (!s || s.isRadio || !feat('f_resumeLong') || (s.duration || 0) <= LONG) return;
    const t = this.time;
    if (t > 15 && t < s.duration - 20) this._longPos[s.id] = Math.floor(t); else delete this._longPos[s.id];
    const ids = Object.keys(this._longPos);
    if (ids.length > 60) delete this._longPos[ids[0]];
    store.set('longPos', this._longPos);
  }
  _forgetLong(s) { if (s && this._longPos[s.id]) { delete this._longPos[s.id]; store.set('longPos', this._longPos); } }

  // ---------- file sans fin (Flow, radio) ----------
  async _maybeExtend(force = false) {
    if (!this.endless || this._extending) return false;
    if (!force && this.queue.length - this.index > 4) return false;
    this._extending = true;
    try {
      const gen = this.endless;
      const more = cleanList(await gen(new Set(this.queue.map((x) => x.id))), new Set(this.queue.map((x) => x.id)));
      if (gen !== this.endless || !more.length) return false;
      this.queue.push(...more);
      this._orig?.push(...more);
      this.emit('queue');
      this._persist();
      return true;
    } catch { return false; } finally { this._extending = false; }
  }

  seek(t) {
    if (!this.current || this.current.isRadio) return;
    if (this._xf) this._cancelXf();
    this.audio.currentTime = Math.max(0, Math.min(t, this.duration || t));
    this._positionState();
  }

  next(auto = false) {
    if (!this.queue.length) return;
    if (auto && this.sleepAtTrackEnd) { this.sleepAtTrackEnd = false; this.emit('sleep'); this.pause(); return; }
    if (auto && this.sleepAtAlbumEnd) {
      const nx = this.queue[this._nextIndex(true)];
      if (!nx || nx.albumId !== this.current?.albumId) { this.sleepAtAlbumEnd = false; this.emit('sleep'); this.pause(); return; }
    }
    if (auto && this.repeat === 'one') { this.audio.currentTime = 0; this.audio.play().catch(() => {}); return; }
    let i = this._nextIndex(auto);
    if (i <= this.index && this.endless && this.repeat !== 'one') {
      // file sans fin : on ajoute une fournée puis on enchaîne
      this._maybeExtend(true).then((ok) => { if (ok) { this._dir = 1; this.index += 1; this._load(true); } });
      return;
    }
    if (i < 0) {
      // fin de file : lecture automatique de titres similaires, sinon arrêt
      if (auto && settings.get('autoplay') && api.ready && !this.current?.isRadio) { this._autoExtend(); return; }
      this.audio.pause(); this.audio.currentTime = 0; this.emit('state');
      return;
    }
    this._dir = 1;
    this.index = i;
    this._load(true);
  }

  prev() {
    if (!this.queue.length) return;
    if (this.time > 3 || this.index === 0) { this.seek(0); return; }
    this._dir = -1;
    this.index -= 1;
    this._load(true);
  }

  get dir() { return this._dir || 1; }

  // ---------- lecture automatique ----------
  async _autoExtend() {
    if (this._extending) return;
    const s = this.current;
    if (!s) return;
    this._extending = true;
    try {
      const have = new Set(this.queue.map((x) => x.id));
      const fresh = (list) => cleanList(list, have); // sans doublons ni titres masqués (« Ne plus proposer »)
      let songs = fresh(await api.similarSongs(s.id, 30));
      let kind = 'similaires';
      if (songs.length < 5 && s.artistId) songs = fresh([...songs, ...(await api.similarSongs2(s.artistId, 30))]);
      if (songs.length < 5) { songs = fresh([...songs, ...(await api.randomSongs(30, s.genre))]); kind = s.genre ? `du genre ${s.genre}` : 'aléatoires'; }
      if (songs.length < 5) { songs = fresh([...songs, ...(await api.randomSongs(30))]); kind = 'aléatoires'; }
      songs = songs.slice(0, 25);
      if (!songs.length) { this.audio.pause(); this.emit('state'); return; }
      const at = this.queue.length;
      this.queue.push(...songs);
      this._orig?.push(...songs);
      this._dir = 1;
      this.index = at;
      this._load(true);
      this.emit('autoplay', songs.length, kind);
    } catch {
      this.audio.pause();
      this.emit('state');
    } finally { this._extending = false; }
  }

  setShuffle(on, silent = false) {
    if (on === this.shuffle) return;
    const cur = this.current;
    if (on) {
      this._orig = this.queue.slice();
      const rest = shuffleArr(this.queue.filter((_, i) => i !== this.index));
      this.queue = cur ? [cur, ...rest] : rest;
      this.index = cur ? 0 : -1;
    } else {
      const o = this._orig || this.queue;
      this.queue = o;
      this.index = cur ? Math.max(0, o.indexOf(cur)) : -1;
      this._orig = null;
    }
    this.shuffle = on;
    if (!silent) { this.emit('queue'); this.emit('state'); this._persist(); }
  }

  cycleRepeat() {
    this.repeat = this.repeat === 'off' ? 'all' : this.repeat === 'all' ? 'one' : 'off';
    this.emit('state');
    this._persist();
  }

  setRate(r) {
    this.rate = r;
    this.audio.playbackRate = r;
    if (this._xf) this._xf.el.playbackRate = r;
    this.emit('state');
  }

  setVolume(v) { settings.set('volume', v); }

  // ---------- file d'attente ----------
  addNext(song) {
    const at = this.index + 1;
    if (!this.queue.length) { this.playQueue([song]); return; }
    this.queue.splice(at, 0, song);
    this._orig?.push(song);
    this.emit('queue');
    this._persist();
  }
  addEnd(songs) {
    songs = Array.isArray(songs) ? songs : [songs];
    if (!this.queue.length) { this.playQueue(songs); return; }
    this.queue.push(...songs);
    this._orig?.push(...songs);
    this.emit('queue');
    this._persist();
  }
  remove(i) {
    if (i < 0 || i >= this.queue.length) return;
    const [song] = this.queue.splice(i, 1);
    if (this._orig) { const k = this._orig.indexOf(song); if (k >= 0) this._orig.splice(k, 1); }
    if (i < this.index) this.index--;
    else if (i === this.index) {
      const was = this.playing;
      if (!this.queue.length) { this.index = -1; this._load(false); return; }
      if (this.index >= this.queue.length) this.index = this.queue.length - 1;
      this._load(was);
      return;
    }
    this._cancelXf();
    this.emit('queue');
    this._persist();
  }
  move(from, to) {
    if (from === to || from < 0 || to < 0 || from >= this.queue.length || to >= this.queue.length) return;
    const [s] = this.queue.splice(from, 1);
    this.queue.splice(to, 0, s);
    if (from === this.index) this.index = to;
    else if (from < this.index && to >= this.index) this.index--;
    else if (from > this.index && to <= this.index) this.index++;
    this._cancelXf();
    this.emit('queue');
    this._persist();
  }
  clearUpcoming() {
    this._cancelXf();
    this.queue = this.queue.slice(0, this.index + 1);
    this._orig = null;
    this.emit('queue');
    this._persist();
  }

  // met à jour un titre (favori, note…) partout où il apparaît
  patchSong(id, patch) {
    let hit = false;
    for (const s of this.queue) if (s.id === id) { Object.assign(s, patch); hit = true; }
    if (hit) { this.emit('patch', id); this._persist(); }
  }

  // ---------- minuterie de sommeil ----------
  setSleep(minutes) {
    this.sleepAtTrackEnd = false;
    this.sleepAtAlbumEnd = false;
    this.sleepEnd = null;
    this._sleepFade = 1;
    this._applyVolume();
    if (minutes === 'end') this.sleepAtTrackEnd = true;
    else if (minutes === 'album') this.sleepAtAlbumEnd = true;
    else if (minutes) this.sleepEnd = Date.now() + minutes * 60000;
    this.emit('sleep');
  }
  _finishSleep() {
    this.sleepEnd = null;
    this._cancelXf();
    this.audio.pause();
    this._sleepFade = 1;
    this._applyVolume();
    this.emit('sleep');
  }

  // ---------- persistance ----------
  _persist() {
    store.set('queue', { queue: this.queue.slice(0, 500), index: this.index, repeat: this.repeat, shuffle: this.shuffle });
  }
  _persistPos(force) {
    if (!this.current) return;
    const t = this.time;
    if (force || Math.abs(t - this._lastPos) > 1) { this._lastPos = t; store.set('pos', t); }
  }
  _saveServer(force) {
    const s = this.current;
    if (!s || s.isRadio || !api.ready) return;
    if (!force && Date.now() - this._lastServerSave < 25000) return;
    this._lastServerSave = Date.now();
    api.savePlayQueue(this.queue.slice(0, 500).filter((x) => !x.isRadio && (!x.srv || x.srv === api.activeId)).map((x) => x.id), s.id, this.time * 1000);
  }
  _restore() {
    const q = store.get('queue', null);
    if (!q?.queue?.length) return;
    this.queue = q.queue;
    this.index = Math.min(Math.max(q.index, 0), q.queue.length - 1);
    this.repeat = q.repeat || 'off';
    this.shuffle = false; // l'ordre d'origine n'est pas conservé
    this._resumeAt = store.get('pos', 0) || 0;
    this._resumeId = this.current?.id ?? null;
  }
  // reprise de la file enregistrée sur le serveur (autre appareil), si rien en local
  async restoreFromServer() {
    if (this.queue.length) return false;
    const q = await api.playQueue();
    if (!q?.songs?.length) return false;
    this.queue = q.songs;
    this.index = Math.max(0, q.songs.findIndex((s) => s.id === q.current));
    this._resumeAt = q.position / 1000;
    this._resumeId = this.current?.id ?? null;
    this.emit('track', this.current);
    this.emit('queue');
    return true;
  }

  // ---------- MediaSession (notification, écran de verrouillage, casque) ----------
  _meta() {
    if (this._nativeOn) return; // la notification vient du service natif
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const s = this.current;
    if (!s) return;
    try {
      const art = s.isRadio ? [] : [96, 256, 512].map((z) => ({ src: coverFor(s, z), sizes: `${z}x${z}`, type: 'image/jpeg' }));
      navigator.mediaSession.metadata = new MediaMetadata({ title: s.title || '', artist: s.artist || '', album: s.album || '', artwork: art });
    } catch { /* ignoré */ }
  }
  _syncSession() {
    if (this._nativeOn || !('mediaSession' in navigator)) return;
    try { navigator.mediaSession.playbackState = this.audio.paused ? 'paused' : 'playing'; } catch { /* ignoré */ }
  }
  _positionState() {
    if (this._nativeOn || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    const d = this.audio.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    try { navigator.mediaSession.setPositionState({ duration: d, playbackRate: this.rate, position: Math.min(this.time, d) }); } catch { /* ignoré */ }
  }
  _bindMediaSession() {
    if (this._nativeOn || !('mediaSession' in navigator)) return;
    const set = (name, fn) => { try { navigator.mediaSession.setActionHandler(name, fn); } catch { /* action non supportée */ } };
    set('play', () => this.play());
    set('pause', () => this.pause());
    set('previoustrack', () => this.prev());
    set('nexttrack', () => this.next());
    set('seekbackward', (d) => this.seek(this.time - (d?.seekOffset || 10)));
    set('seekforward', (d) => this.seek(this.time + (d?.seekOffset || 10)));
    set('seekto', (d) => { if (d?.seekTime != null) this.seek(d.seekTime); });
    set('stop', () => this.pause());
  }
}

export const player = new Player();
