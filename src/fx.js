// Tous les effets GSAP de l'appli : fond animé, apparitions, transitions, tilt 3D, visualiseur, particules…
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { settings } from './store.js';
import { $ } from './ui.js';
import { rgb } from './theme.js';

gsap.registerPlugin(ScrollToPlugin);

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const fxLevel = () => (reduceMotion() && settings.get('fx') === 'max' ? 'eco' : settings.get('fx'));
export const fxOn = () => fxLevel() !== 'off';

// ---------------------------------------------------------------------------------------------
// Fond : halos violets qui dérivent + constellation de particules (niveau "max" uniquement)
// ---------------------------------------------------------------------------------------------
let bgTick = null;
let blobTweens = [];

export function initBackground() {
  const canvas = $('#bg');
  const blobs = [...document.querySelectorAll('.blob')];
  blobTweens.forEach((t) => t.kill());
  blobTweens = [];
  if (bgTick) { gsap.ticker.remove(bgTick); bgTick = null; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.display = 'none';

  const level = fxLevel();
  if (level === 'off') { gsap.set(blobs, { x: 0, y: 0, scale: 1 }); return; }

  blobs.forEach((b, i) => {
    blobTweens.push(gsap.to(b, {
      x: () => gsap.utils.random(-140, 140),
      y: () => gsap.utils.random(-180, 180),
      scale: () => gsap.utils.random(0.85, 1.45),
      duration: gsap.utils.random(7, 12) + i,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      repeatRefresh: true,
    }));
  });
  if (level !== 'max') return;

  canvas.style.display = 'block';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;
  const resize = () => {
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const N = 46;
  const P = Array.from({ length: N }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.02, vy: (Math.random() - 0.5) * 0.02 - 0.008,
    r: Math.random() * 1.6 + 0.5, a: Math.random() * 0.5 + 0.2, ph: Math.random() * 6.28,
  }));

  bgTick = (time, dt) => {
    if (document.hidden) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of P) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
    }
    ctx.lineWidth = 0.6;
    for (let i = 0; i < N; i++) {
      const a = P[i];
      for (let j = i + 1; j < N; j++) {
        const b = P[j];
        const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 14000) {
          ctx.strokeStyle = `rgba(${rgb.v3},${(1 - d2 / 14000) * 0.16})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const p of P) {
      const tw = 0.6 + 0.4 * Math.sin(time * 1.4 + p.ph);
      ctx.fillStyle = `rgba(${rgb.v4},${p.a * tw})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
  };
  gsap.ticker.add(bgTick);
}

// ---------------------------------------------------------------------------------------------
// Feedback tactile : léger "press" + onde (ripple) sur tout élément .tap
// ---------------------------------------------------------------------------------------------
export function setupPress() {
  let cur = null;
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest?.('.tap');
    if (!t || !fxOn()) return;
    cur = t;
    gsap.to(t, { scale: t.classList.contains('row') ? 0.985 : 0.94, duration: 0.14, ease: 'power2.out', overwrite: 'auto' });
    if (t.classList.contains('ripple') && fxLevel() === 'max') {
      const r = t.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const s = document.createElement('span');
      s.className = 'rip';
      s.style.cssText = `left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px;width:${size}px;height:${size}px`;
      t.appendChild(s);
      gsap.fromTo(s, { scale: 0, opacity: 0.45 }, { scale: 1, opacity: 0, duration: 0.75, ease: 'power2.out', onComplete: () => s.remove() });
    }
  }, { passive: true });
  const up = () => {
    if (!cur) return;
    gsap.to(cur, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
    cur = null;
  };
  document.addEventListener('pointerup', up, { passive: true });
  document.addEventListener('pointercancel', up, { passive: true });
}

// ---------------------------------------------------------------------------------------------
// Apparition en cascade au défilement (équivalent d'un ScrollTrigger.batch)
// ---------------------------------------------------------------------------------------------
const observers = new Set();
export function cleanupReveals() {
  observers.forEach((o) => o.disconnect());
  observers.clear();
}

export function reveal(root, selector, { y = 26, each = 0.045 } = {}) {
  if (!root) return;
  const items = [...root.querySelectorAll(selector)].filter((el) => !el.dataset.revealed);
  if (!items.length || !fxOn()) return;
  items.forEach((el) => { el.dataset.revealed = '1'; });
  gsap.set(items, { autoAlpha: 0, y, scale: 0.95 });
  let queue = [], scheduled = false, shown = 0;
  const flush = () => {
    scheduled = false;
    const q = queue; queue = [];
    shown += q.length;
    gsap.to(q, { autoAlpha: 1, y: 0, scale: 1, duration: 0.65, ease: 'power3.out', stagger: each, overwrite: 'auto' });
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { io.unobserve(en.target); queue.push(en.target); }
    if (queue.length && !scheduled) { scheduled = true; requestAnimationFrame(flush); }
  }, { rootMargin: '0px 80px 60px 0px', threshold: 0.05 });
  items.forEach((el) => io.observe(el));
  observers.add(io);
  // filet de sécurité : si l'observateur ne déclenche jamais, on affiche tout
  setTimeout(() => { if (!shown) { gsap.to(items, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, overwrite: 'auto' }); } }, 2500);
}

// ---------------------------------------------------------------------------------------------
// Titres découpés lettre par lettre
// ---------------------------------------------------------------------------------------------
export function splitChars(el) {
  if (!el || el.dataset.split) return [];
  const text = el.textContent;
  el.dataset.split = '1';
  el.setAttribute('aria-label', text);
  el.innerHTML = text.split(' ')
    .map((w) => `<span class="w" aria-hidden="true">${[...w].map((c) => `<span class="ch-mask"><span class="ch">${c}</span></span>`).join('')}</span>`)
    .join(' ');
  return [...el.querySelectorAll('.ch')];
}

export function animateTitle(el, { delay = 0 } = {}) {
  if (!el) return;
  const chars = splitChars(el);
  if (!chars.length || !fxOn()) return;
  gsap.fromTo(chars, { yPercent: 115, rotate: 6, opacity: 0 }, {
    yPercent: 0, rotate: 0, opacity: 1, duration: 0.8, ease: 'power4.out', stagger: 0.025, delay,
  });
}

// ---------------------------------------------------------------------------------------------
// Transitions de page et "vol" de la pochette de la carte vers la page album
// ---------------------------------------------------------------------------------------------
export function pageIn(el) {
  if (!fxOn()) return;
  gsap.fromTo(el, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
}

export function pageOut(el) {
  if (!fxOn()) return Promise.resolve();
  return new Promise((res) => gsap.to(el, { autoAlpha: 0, y: -10, duration: 0.16, ease: 'power2.in', onComplete: res }));
}

export function flyFrom(el, rect) {
  if (!el || !rect || !fxOn()) return;
  const t = el.getBoundingClientRect();
  if (!t.width) return;
  gsap.fromTo(el, {
    x: rect.left - t.left, y: rect.top - t.top,
    scaleX: rect.width / t.width, scaleY: rect.height / t.height, transformOrigin: '0 0',
  }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.85, ease: 'expo.out', clearProps: 'transform' });
}

// ---------------------------------------------------------------------------------------------
// Inclinaison 3D d'un élément qui suit le doigt / la souris
// ---------------------------------------------------------------------------------------------
export function tilt(el, { max = 14 } = {}) {
  if (!el) return;
  const move = (e) => {
    if (fxLevel() === 'off') return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    gsap.to(el, { rotationY: dx * max, rotationX: -dy * max, transformPerspective: 900, duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
  };
  const leave = () => gsap.to(el, { rotationX: 0, rotationY: 0, duration: 1.1, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('pointerup', leave);
  el.addEventListener('pointercancel', leave);
}

// ---------------------------------------------------------------------------------------------
// Visualiseur décoratif (barres animées par le ticker GSAP, calmes en pause)
// ---------------------------------------------------------------------------------------------
export function makeViz(container, n = 30) {
  container.innerHTML = Array.from({ length: n }, () => '<i></i>').join('');
  const bars = [...container.children];
  const ph = bars.map(() => Math.random() * 10);
  let energy = 0, target = 0, running = false;
  const tick = (time, dt) => {
    energy += (target - energy) * Math.min(1, dt / 350);
    for (let i = 0; i < n; i++) {
      const wave = 0.5 + 0.5 * Math.sin(time * (2.6 + i * 0.17) + ph[i]);
      const env = 0.35 + 0.65 * Math.pow(Math.sin(time * 0.9 + i * 0.45) * 0.5 + 0.5, 2);
      const v = 0.08 + energy * (0.12 + 0.88 * wave * env);
      bars[i].style.transform = `scaleY(${v.toFixed(3)})`;
    }
  };
  const start = () => { if (!running && fxOn()) { running = true; gsap.ticker.add(tick); } };
  const stop = () => { if (running) { running = false; gsap.ticker.remove(tick); } };
  return {
    setPlaying(p) { target = p ? 1 : 0; },
    start, stop,
  };
}

// ---------------------------------------------------------------------------------------------
// Explosion de particules violettes (favori)
// ---------------------------------------------------------------------------------------------
export function burst(anchor, { n = 10 } = {}) {
  if (!fxOn() || !anchor) return;
  const r = anchor.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    s.style.left = cx + 'px'; s.style.top = cy + 'px';
    document.body.appendChild(s);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const d = gsap.utils.random(26, 60);
    gsap.fromTo(s, { x: 0, y: 0, scale: gsap.utils.random(0.6, 1.3), opacity: 1 }, {
      x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0, opacity: 0,
      duration: gsap.utils.random(0.5, 0.9), ease: 'power3.out', onComplete: () => s.remove(),
    });
  }
  gsap.fromTo(anchor, { scale: 0.6 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1.2, 0.4)', overwrite: 'auto' });
}

// Compteur qui monte (stats)
export function countUp(el, to, { duration = 1.2 } = {}) {
  if (!el) return;
  if (!fxOn()) { el.textContent = Number(to).toLocaleString('fr-FR'); return; }
  const o = { v: 0 };
  gsap.to(o, { v: to, duration, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('fr-FR'); } });
}
