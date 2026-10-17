// Historique d'écoute local (alimenté quand un titre est "scrobblé", c.-à-d. écouté à moitié) — sert au Replay.
import { store } from './store.js';

const KEY = 'history';
const MAX = 4000;
let list = null;

const load = () => (list ||= store.get(KEY, []) || []);

export const playLog = {
  add(s) {
    if (!s || s.isRadio) return;
    const l = load();
    l.push({ id: s.id, t: Date.now(), ti: s.title || '', ar: s.artist || '', arId: s.artistId || '', al: s.album || '', alId: s.albumId || '', cov: s.coverArt || s.albumId || '', d: Math.round(s.duration || 0) });
    if (l.length > MAX) l.splice(0, l.length - MAX);
    store.set(KEY, l);
  },
  all: () => load(),
  clear() { list = []; store.del(KEY); },

  // statistiques sur une période (depuis = timestamp ms, 0 = tout)
  stats(since = 0) {
    const rows = load().filter((r) => r.t >= since);
    const group = (keyFn, labelFn, extra) => {
      const m = new Map();
      for (const r of rows) {
        const k = keyFn(r);
        if (!k) continue;
        const e = m.get(k) || { key: k, label: labelFn(r), n: 0, sec: 0, ...extra(r) };
        e.n++; e.sec += r.d;
        m.set(k, e);
      }
      return [...m.values()].sort((a, b) => b.n - a.n || b.sec - a.sec);
    };
    const hours = new Array(24).fill(0);
    rows.forEach((r) => { hours[new Date(r.t).getHours()]++; });
    return {
      plays: rows.length,
      seconds: rows.reduce((n, r) => n + r.d, 0),
      songs: group((r) => r.id, (r) => r.ti, (r) => ({ sub: r.ar, cov: r.cov, id: r.id, albumId: r.alId })),
      artists: group((r) => r.arId || r.ar, (r) => r.ar, (r) => ({ id: r.arId, cov: r.cov })),
      albums: group((r) => r.alId, (r) => r.al, (r) => ({ sub: r.ar, cov: r.cov, id: r.alId })),
      hours,
    };
  },
};
