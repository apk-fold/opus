// Utilitaires d'interface : DOM, formats, toasts, retours haptiques.
import { gsap } from 'gsap';
import { Capacitor } from '@capacitor/core';
import { settings } from './store.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const html = (str) => {
  const t = document.createElement('template');
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
};

export const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

export const fmtLong = (s) => {
  s = Math.round(s || 0);
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
};

export const fmtSize = (b) => (b > 1e9 ? (b / 1e9).toFixed(2) + ' Go' : b > 1e6 ? (b / 1e6).toFixed(1) + ' Mo' : Math.round(b / 1e3) + ' Ko');

export const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

export const isNative = () => Capacitor.isNativePlatform();

let hapticsMod = null;
export async function haptic(kind = 'light') {
  if (!settings.get('haptics') || !isNative()) return;
  try {
    hapticsMod ||= await import('@capacitor/haptics');
    const { Haptics, ImpactStyle } = hapticsMod;
    await Haptics.impact({ style: kind === 'heavy' ? ImpactStyle.Heavy : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light });
  } catch { /* pas de vibreur */ }
}

let toastTimer = null;
export function toast(msg, ms = 2400) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  clearTimeout(toastTimer);
  gsap.killTweensOf(el);
  gsap.fromTo(el, { autoAlpha: 0, y: 18, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.7)' });
  toastTimer = setTimeout(() => gsap.to(el, { autoAlpha: 0, y: 10, duration: 0.3, ease: 'power2.in' }), ms);
}

// image → masque le <img> cassé (le fond dégradé du conteneur reste visible)
export function hideBrokenImages() {
  document.addEventListener('error', (e) => {
    if (e.target?.tagName === 'IMG' && e.target.classList.contains('cv')) e.target.style.opacity = '0';
  }, true);
}

export const debounce = (fn, ms = 300) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

export const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
};
