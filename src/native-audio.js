// Lecteur natif (ExoPlayer, comme Subtracks) vu comme un « élément audio ».
// Le lecteur web (player.js) l'utilise à la place de <audio> sur Android : la musique est jouée par un service
// Android qui garde la file d'attente, donc elle continue et enchaîne même quand la page web est endormie.
import { Capacitor, registerPlugin } from '@capacitor/core';

const Native = registerPlugin('OpusNative');
export const nativeAvailable = () => {
  try { return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('OpusNative'); } catch { return false; }
};

export class NativeAudio {
  constructor() {
    this.isNative = true;
    this._ev = new EventTarget();
    this._paused = true;
    this._ended = false;
    this._ready = false;
    this._pos = 0;
    this._ts = performance.now();
    this._dur = NaN;
    this._rate = 1;
    this._vol = 1;
    this._cmdAt = 0;
    this._cmdWant = false;
    this.nativeId = '';
    this.nativeIdx = 0;
    this.gain = 1;
    this._src = '';
    this._sig = '';
    this._chain = Promise.resolve();
    this.onTransition = null;   // (e) => void : le service est passé à un autre titre tout seul
    Native.addListener('state', (e) => this._onState(e));
    Native.addListener('transition', (e) => this._onTransition(e));
    Native.addListener('error', (e) => this._emit('error', e));
    setInterval(() => { if (!this._paused && this._ready) this._emit('timeupdate'); }, 250);
    // la page peut dormir : on resynchronise à chaque réveil et régulièrement tant qu'elle est visible
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.resync(); });
    setInterval(() => { if (!document.hidden && this.nativeId) this.resync(); }, 3000);
  }

  // ---------- API proche de HTMLAudioElement ----------
  addEventListener(n, f) { this._ev.addEventListener(n, f); }
  _emit(n, detail) { const ev = new Event(n); ev.detail = detail; this._ev.dispatchEvent(ev); }
  _run(fn) { this._chain = this._chain.then(fn).catch(() => {}); return this._chain; }

  get paused() { return this._paused; }
  get ended() { return this._ended; }
  get duration() { return this._dur; }
  get readyState() { return this._ready ? 4 : 0; }
  get src() { return this._src; }
  set src(v) { /* le titre est chargé par setSong() */ }
  removeAttribute(n) {
    if (n !== 'src') return;
    this._src = ''; this.nativeId = ''; this._ready = false; this._sig = '';
    this._run(() => Native.stop());
  }
  load() {}
  set crossOrigin(v) {}
  get crossOrigin() { return null; }
  set preservesPitch(v) {}
  set preload(v) {}

  get currentTime() {
    if (this._paused || !this._ready) return this._pos;
    const t = this._pos + ((performance.now() - this._ts) / 1000) * this._rate;
    return this._dur > 0 ? Math.min(t, this._dur) : t;
  }
  set currentTime(t) {
    this._pos = Math.max(0, Number(t) || 0);
    this._ts = performance.now();
    this._ended = false;
    const ms = Math.round(this._pos * 1000);
    this._run(() => Native.seek({ ms }));
  }

  get volume() { return this._vol; }
  set volume(v) {
    this._vol = v;
    this._run(() => Native.setVolume({ v, gain: this.gain }));
  }
  get playbackRate() { return this._rate; }
  set playbackRate(r) {
    this._pos = this.currentTime; this._ts = performance.now();
    this._rate = r;
    this._run(() => Native.setSpeed({ rate: r }));
  }

  play() {
    if (this._paused) { this._paused = false; this._ts = performance.now(); this._emit('play'); }
    this._cmdAt = performance.now(); this._cmdWant = true;
    this._run(() => Native.play());
    return Promise.resolve();
  }
  pause() {
    this._cmdAt = performance.now(); this._cmdWant = false;
    if (!this._paused) {
      this._pos = this.currentTime;
      this._paused = true;
      this._emit('pause');
    }
    this._run(() => Native.pause());
  }

  // charge un titre (la lecture démarre si l'élément n'est pas en pause)
  setSong(song, build, startMs = 0) {
    this.nativeId = String(song.id);
    this._src = String(song.id);
    this._ready = false; this._ended = false;
    this._pos = 0; this._ts = performance.now();
    this._dur = song.duration > 0 ? song.duration : NaN;
    this._sig = '';
    this._loadedAt = Date.now();
    return this._run(async () => {
      const item = await build(song);
      this.gain = item.gain ?? 1;
      this._loadedAt = Date.now();
      await Native.load({ item, play: !this._paused, startMs });
    });
  }

  // pousse la suite de la file au service (build : titre → description pour le service)
  syncUpcoming({ expect, prev, up, repeat }, build, sig) {
    if (sig && sig === this._sig) return;
    this._sig = sig;
    return this._run(async () => {
      if (this.nativeId !== expect) return;
      const items = [];
      for (const s of up) items.push(await build(s));
      const p = prev ? await build(prev) : null;
      if (this.nativeId !== expect) return;
      await Native.setUpcoming({ expect, prev: p, items, repeat });
    });
  }

  setSleepAt(at) { return this._run(() => Native.setSleepAt({ at: at || 0 })); }

  // ---------- événements du service ----------
  _onTransition(e) {
    if (e.reason === 3) return; // PLAYLIST_CHANGED : c'est nous qui avons changé la file
    this._adopt(e);
  }
  // le service joue un autre titre que celui connu du web
  _adopt(e) {
    e.prevIdx = this.nativeIdx;
    this.nativeId = e.id;
    this.nativeIdx = e.idx;
    this._src = e.id;
    this._ready = false; this._ended = false;
    this._pos = (e.pos || 0) / 1000; this._ts = performance.now();
    this._dur = e.dur > 0 ? e.dur / 1000 : NaN;
    this._sig = '';
    this.onTransition?.(e);
    this._onState(e);
  }
  resync() {
    Native.snapshot().then((e) => {
      if (!e || !e.id) return;
      if (e.id !== this.nativeId) { if (Date.now() - this._loadedAt > 4000 || !this._loadedAt) this._adopt(e); return; }
      this._onState(e);
    }).catch(() => {});
  }

  _onState(e) {
    if (!e || e.id !== this.nativeId) return; // événement d'un titre déjà remplacé
    this.nativeIdx = e.idx;
    this._pos = (e.pos || 0) / 1000;
    this._ts = performance.now();
    if (e.dur > 0) this._dur = e.dur / 1000;
    if (e.state === 4) {
      if (!this._ended) { this._ended = true; this._emit('ended'); }
      return;
    }
    this._ended = false;
    if (e.state === 3 && !this._ready) { this._ready = true; this._emit('loadedmetadata'); this._emit('canplay'); }
    if (e.state === 2 && e.wanted) this._emit('waiting');
    // on ignore brièvement un état « pause/lecture » contraire à la commande qu'on vient d'envoyer
    const recent = performance.now() - this._cmdAt < 900;
    if (!(recent && e.wanted !== this._cmdWant)) {
      const p = !e.wanted;
      if (p !== this._paused) { this._paused = p; this._emit(p ? 'pause' : 'play'); }
    }
    if (e.playing) this._emit('playing');
  }
}
