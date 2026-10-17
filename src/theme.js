// Thème : couleur d'accent réglable (toute la palette en dérive) + teinte de la pochette.
// Les couleurs vivent dans des variables CSS ; les valeurs "r,g,b" servent aux rgba(var(--x-rgb), a).
import { gsap } from 'gsap';
import { settings } from './store.js';

export const DEFAULT_ACCENT = '#8b5cf6';

// [id, nom, couleur]
export const PRESETS = [
  ['violet', 'Violet', '#8b5cf6'], ['indigo', 'Indigo', '#6366f1'], ['bleu', 'Bleu', '#3b82f6'], ['cyan', 'Cyan', '#06b6d4'],
  ['menthe', 'Menthe', '#14b8a6'], ['vert', 'Vert', '#22c55e'], ['ambre', 'Ambre', '#f59e0b'], ['orange', 'Orange', '#f97316'],
  ['rouge', 'Rouge', '#ef4444'], ['rose', 'Rose', '#ec4899'], ['magenta', 'Magenta', '#d946ef'],
];

// rgb courants (lus par le canvas de fond, les ombres GSAP…)
export const rgb = { v1: '124,58,237', v2: '139,92,246', v3: '167,139,250', v4: '196,181,253', cov: '124,58,237' };

// ---------- conversions ----------
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  const n = parseInt(m ? m[1] : DEFAULT_ACCENT.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}
export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
export const rgbToHex = (rgbArr) => '#' + rgbArr.map((v) => v.toString(16).padStart(2, '0')).join('');
const hex = (rgbArr) => '#' + rgbArr.map((v) => v.toString(16).padStart(2, '0')).join('');
const trip = (rgbArr) => rgbArr.join(',');
const H = (h, s, l) => hslToRgb(h, s, l);

// ---------- palette ----------
const ORIGINAL = {
  v1: [124, 58, 237], v2: [139, 92, 246], v3: [167, 139, 250], v4: [196, 181, 253], pink: [232, 121, 249],
  bg: [5, 3, 10], bg2: [10, 6, 20], s1: [16, 10, 32], surface: [17, 12, 31], surface2: [26, 18, 48],
  art1: [58, 26, 120], art2: [20, 10, 43], sheet1: [24, 16, 48], sheet2: [13, 8, 24],
  text: [244, 239, 255], muted: [163, 150, 196], dim: [111, 100, 144],
};

export function palette(accentHex) {
  if (!accentHex || accentHex.toLowerCase() === DEFAULT_ACCENT) return ORIGINAL;
  const [r, g, b] = hexToRgb(accentHex);
  const [h, s0, l0] = rgbToHsl(r, g, b);
  const s = clamp(s0, 45, 95), l = clamp(l0, 48, 66);
  return {
    v1: H(h, s, l - 9), v2: H(h, s, l), v3: H(h, s, l + 14), v4: H(h, clamp(s - 12, 30, 90), l + 27), pink: H(h + 32, 85, 66),
    bg: H(h, 52, 3), bg2: H(h, 50, 5.6), s1: H(h, 52, 8), surface: H(h, 46, 8.6), surface2: H(h, 46, 12.6),
    art1: H(h, 62, 29), art2: H(h, 55, 10), sheet1: H(h, 50, 11), sheet2: H(h, 52, 6),
    text: H(h, 100, 96.5), muted: H(h, 24, 69), dim: H(h, 15, 48),
  };
}

// Thème : sombre (défaut), AMOLED (noir pur, idéal pour l'écran du Fold) ou clair.
// On dérive la palette sombre puis on la transforme : seules les variables changent, le CSS suit.
const mode = () => settings.get('theme') || 'dark';
function themed(p) {
  const m = mode();
  if (m === 'dark') return p;
  const [h] = rgbToHsl(...p.v2);
  if (m === 'amoled') {
    return {
      ...p, bg: [0, 0, 0], bg2: [0, 0, 0], s1: H(h, 18, 4), surface: H(h, 22, 5), surface2: H(h, 22, 9),
      art1: H(h, 40, 18), art2: H(h, 30, 5), sheet1: H(h, 24, 7), sheet2: [0, 0, 0],
    };
  }
  // clair : fonds pâles teintés, textes sombres, accents assombris pour rester lisibles sur blanc
  const [, s] = rgbToHsl(...p.v2);
  const sat = clamp(s, 50, 90);
  return {
    v1: H(h, sat, 42), v2: H(h, sat, 50), v3: H(h, sat, 45), v4: H(h, sat, 36), pink: H(h + 32, 75, 52),
    bg: H(h, 40, 96.5), bg2: H(h, 35, 93), s1: H(h, 40, 98.5), surface: H(h, 45, 99), surface2: H(h, 38, 93.5),
    art1: H(h, 55, 80), art2: H(h, 45, 90), sheet1: H(h, 40, 99), sheet2: H(h, 35, 95),
    text: H(h, 45, 11), muted: H(h, 14, 38), dim: H(h, 10, 55),
  };
}

function applyPalette(p) {
  p = themed(p);
  const st = document.documentElement.style;
  const set = (k, v) => st.setProperty(k, v);
  for (const k of ['v1', 'v2', 'v3', 'v4', 'pink', 'bg', 'bg2', 'surface', 'surface2', 'art1', 'art2', 'sheet1', 'sheet2', 'text', 'muted', 'dim']) set('--' + k, hex(p[k]));
  for (const k of ['v1', 'v2', 'v3', 'v4', 'pink', 'bg', 'bg2', 's1', 'surface', 'surface2']) set(`--${k}-rgb`, trip(p[k]));
  set('--line', mode() === 'light' ? `rgba(${trip(p.v1)}, .16)` : `rgba(${trip(p.v3)}, .16)`);
  set('--glow', `0 0 24px rgba(${trip(p.v2)}, .55)`);
  rgb.v1 = trip(p.v1); rgb.v2 = trip(p.v2); rgb.v3 = trip(p.v3); rgb.v4 = trip(p.v4);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hex(p.bg));
  if (!coverActive) set('--cov-rgb', rgb.v1);
}

// interpolation TSL de l'accent (le thème "glisse" d'une couleur à l'autre)
let cur = null, tween = null;
export function setAccent(accentHex, animate = true) {
  const target = rgbToHsl(...hexToRgb(accentHex));
  if (!cur || !animate) {
    cur = { h: target[0], s: target[1], l: target[2] };
    applyPalette(palette(hex(hslToRgb(cur.h, cur.s, cur.l))));
    if (accentHex.toLowerCase() === DEFAULT_ACCENT) applyPalette(ORIGINAL);
    return;
  }
  tween?.kill();
  let dh = target[0] - cur.h;
  if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const from = { ...cur };
  const o = { t: 0 };
  tween = gsap.to(o, {
    t: 1, duration: 0.7, ease: 'power2.inOut',
    onUpdate: () => {
      cur = { h: from.h + dh * o.t, s: from.s + (target[1] - from.s) * o.t, l: from.l + (target[2] - from.l) * o.t };
      applyPalette(palette(hex(hslToRgb(cur.h, cur.s, cur.l))));
    },
    onComplete: () => {
      cur = { h: (target[0] + 360) % 360, s: target[1], l: target[2] };
      applyPalette(palette(accentHex));
    },
  });
}

function applyMode() {
  const m = mode();
  const b = document.body;
  b.classList.toggle('th-amoled', m === 'amoled');
  b.classList.toggle('th-light', m === 'light');
  b.classList.toggle('th-dark', m === 'dark');
  statusBar();
}

// barre d'état Android assortie (icônes sombres sur le thème clair)
async function statusBar() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const light = mode() === 'light';
    await StatusBar.setStyle({ style: light ? Style.Light : Style.Dark });
    await StatusBar.setBackgroundColor({ color: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || (light ? '#f6f3fc' : '#05030a') });
  } catch { /* plugin absent */ }
}

export function initTheme() {
  applyMode();
  setAccent(settings.get('accent') || DEFAULT_ACCENT, false);
  settings.on((k, v) => {
    if (k === 'theme') { applyMode(); setAccent(settings.get('accent') || DEFAULT_ACCENT, false); statusBar(); }
    if (k === 'accent') setAccent(v || DEFAULT_ACCENT, true);
    if (k === 'coverColors' && !v) setCoverTint(null);
  });
}

// ---------- teinte de la pochette ----------
let coverActive = false, coverTween = null, coverCur = [124, 58, 237];
export function setCoverTint(rgbArr) {
  const st = document.documentElement.style;
  coverActive = !!rgbArr && settings.get('coverColors') !== false;
  const to = coverActive ? rgbArr : rgb.v1.split(',').map(Number); // repli : teinte d'accent
  coverTween?.kill();
  const from = coverCur.slice();
  const o = { t: 0 };
  coverTween = gsap.to(o, {
    t: 1, duration: 1.1, ease: 'power2.inOut',
    onUpdate: () => {
      coverCur = from.map((c, i) => Math.round(c + (to[i] - c) * o.t));
      rgb.cov = coverCur.join(',');
      st.setProperty('--cov-rgb', rgb.cov);
    },
  });
}

// couleur dominante d'une pochette : pixels saturés pondérés, regroupés par teinte
const covCache = new Map();
const hashHue = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 360; };

async function loadPixels(url, native) {
  let src = url;
  if (native) {
    const { CapacitorHttp } = await import('@capacitor/core');
    const r = await CapacitorHttp.get({ url, responseType: 'blob' });
    if (r.status !== 200 || !r.data) throw new Error('cover');
    src = `data:image/jpeg;base64,${r.data}`;
  }
  const img = new Image();
  if (!native) img.crossOrigin = 'anonymous';
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
  const c = document.createElement('canvas');
  c.width = c.height = 24;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, 24, 24);
  return g.getImageData(0, 0, 24, 24).data; // lève une SecurityError si le canvas est "tainted"
}

export async function coverColor(key, url, native) {
  if (covCache.has(key)) return covCache.get(key);
  let out;
  try {
    const d = await loadPixels(url, native);
    const bins = new Array(12).fill(0).map(() => ({ w: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < d.length; i += 4) {
      const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      const w = (s / 100) * (1 - Math.abs(l - 50) / 50) + 0.02;
      const bin = bins[Math.floor(h / 30) % 12];
      bin.w += w; bin.r += d[i] * w; bin.g += d[i + 1] * w; bin.b += d[i + 2] * w;
    }
    const best = bins.reduce((a, b) => (b.w > a.w ? b : a));
    const [h, s] = rgbToHsl(best.r / best.w, best.g / best.w, best.b / best.w);
    out = H(h, clamp(s, 45, 90), 46); // teinte de la pochette, luminosité maîtrisée pour rester lisible
  } catch {
    out = H(hashHue(String(key)), 62, 46); // repli : teinte stable dérivée de l'identifiant de l'album
  }
  covCache.set(key, out);
  if (covCache.size > 200) covCache.delete(covCache.keys().next().value);
  return out;
}
