// Fonctions "à la Apple Music" : égaliseur, partage, mode voiture, vibrations synchronisées.
import { gsap } from 'gsap';
import { api } from './api.js';
import { player, coverFor } from './player.js';
import { settings } from './store.js';
import { $, $$, esc, fmtTime, toast, isNative, html } from './ui.js';
import { icon } from './icons.js';
import { openSheet } from './sheets.js';
import { fxOn } from './fx.js';
import { EQ_PRESETS, BAND_LABELS, presetGains, matchPreset } from './eq.js';

// =============================================================================================
// Égaliseur
// =============================================================================================
export function openEq() {
  const gains = () => (settings.get('eqGains') || []).slice(0, 10).concat(new Array(10).fill(0)).slice(0, 10);
  const fmt = (g) => (g > 0 ? '+' : '') + g;
  const body = `
    <div class="eq-panel">
      <div class="set-row eq-top">
        <div class="lbl"><b>Égaliseur</b><small class="eq-note"></small></div>
        <button class="switch tap ${settings.get('eq') ? 'on' : ''}" data-eq="toggle" role="switch" aria-checked="${!!settings.get('eq')}"><i></i></button>
      </div>
      <div class="eq-presets">${EQ_PRESETS.map(([id, name]) => `<button class="chip tap" data-preset="${id}">${esc(name)}</button>`).join('')}</div>
      <div class="eq-bands">
        ${gains().map((g, i) => `
        <div class="eqb-col"><b class="eqb-val">${fmt(g)}</b>
          <div class="eqb tap-free" data-band="${i}"><i class="eqb-fill"></i><i class="eqb-thumb"></i></div>
          <span>${BAND_LABELS[i]}</span></div>`).join('')}
      </div>
      <button class="btn tap eq-reset" data-eq="reset">${icon('refresh')} Réinitialiser</button>
    </div>`;

  openSheet({
    title: 'Égaliseur', subtitle: 'Graves ← → aigus · ±12 dB', items: [], body,
    onMount(root) {
      const cols = $$('.eqb', root);
      const H = 150;
      const paint = (animate = true) => {
        const g = gains(), on = settings.get('eq');
        cols.forEach((el, i) => {
          const y = ((12 - g[i]) / 24) * H; // position du curseur
          const mid = H / 2;
          const fill = $('.eqb-fill', el), thumb = $('.eqb-thumb', el);
          const props = { top: Math.min(y, mid), height: Math.abs(y - mid) };
          if (animate && fxOn()) { gsap.to(fill, { ...props, duration: 0.4, ease: 'power3.out' }); gsap.to(thumb, { top: y, duration: 0.4, ease: 'power3.out' }); }
          else { gsap.set(fill, props); gsap.set(thumb, { top: y }); }
          $('.eqb-val', el.parentElement).textContent = fmt(g[i]);
        });
        $$('[data-preset]', root).forEach((b) => b.classList.toggle('on', b.dataset.preset === matchPreset(g)));
        root.classList.toggle('eq-off', !on);
        const sw = $('[data-eq="toggle"]', root);
        sw.classList.toggle('on', !!on); sw.setAttribute('aria-checked', String(!!on));
        $('.eq-note', root).textContent = !player.eqAvailable ? 'Indisponible : le serveur doit autoriser CORS (voir README)'
          : on ? 'Actif' : 'Désactivé';
      };
      const set = (arr) => { settings.set('eqGains', arr); if (!settings.get('eq') && player.eqAvailable) settings.set('eq', true); paint(false); };
      paint(false);

      root.addEventListener('click', (e) => {
        const p = e.target.closest('[data-preset]');
        if (p) { set(presetGains(p.dataset.preset)); paint(true); return; }
        const a = e.target.closest('[data-eq]');
        if (!a) return;
        if (a.dataset.eq === 'toggle') { settings.set('eq', !settings.get('eq')); paint(false); }
        else if (a.dataset.eq === 'reset') { set(presetGains('flat')); paint(true); }
      });

      // curseurs verticaux (pointeur)
      cols.forEach((el, i) => {
        const setFrom = (e) => {
          const r = el.getBoundingClientRect();
          const v = Math.round(12 - ((e.clientY - r.top) / r.height) * 24);
          const g = gains(); g[i] = Math.max(-12, Math.min(12, v));
          set(g);
        };
        let down = false;
        el.addEventListener('pointerdown', (e) => { down = true; el.setPointerCapture?.(e.pointerId); setFrom(e); });
        el.addEventListener('pointermove', (e) => { if (down) setFrom(e); });
        const up = () => { down = false; };
        el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
      const off = player.on('eqfail', () => paint(false));
      const mo = new MutationObserver(() => { if (!root.isConnected) { off(); mo.disconnect(); } });
      mo.observe(document.getElementById('overlays'), { childList: true });
    },
  });
}

// =============================================================================================
// Partage
// =============================================================================================
async function doShare({ title, text, url }) {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url, dialogTitle: 'Partager' });
      return;
    } catch (e) { if (/cancel/i.test(String(e?.message))) return; }
  }
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText([text, url].filter(Boolean).join('\n')); toast('Copié dans le presse-papiers'); }
  catch { toast('Partage impossible sur cet appareil'); }
}

export async function shareItem(kind, obj) {
  const title = kind === 'song' ? obj.title : obj.name;
  const by = obj.artist ? ` — ${obj.artist}` : '';
  const text = `${kind === 'song' ? '🎵' : '💿'} ${title}${by}`;
  toast('Préparation du partage…');
  const url = await api.createShare(obj.id, `${title}${by}`); // lien public si le partage est activé sur Navidrome
  if (!url && !shareItem._hinted) { shareItem._hinted = true; toast('Lien indisponible : active ND_ENABLESHARING sur Navidrome pour partager un lien', 4200); }
  await doShare({ title, text, url: url || undefined });
}

// =============================================================================================
// Mode voiture : gros boutons, pochette, lisible d'un coup d'œil
// =============================================================================================
let carEl = null, carOffs = [], wake = null;
export const carOpen = () => !!carEl;

export function openCar() {
  if (carEl) return;
  carEl = html(`
    <div class="car" role="dialog" aria-label="Mode voiture">
      <div class="car-bg"></div>
      <button class="car-close tap" aria-label="Quitter le mode voiture">${icon('close')}</button>
      <div class="car-clock"></div>
      <div class="car-cover"><img alt=""></div>
      <div class="car-side">
        <div class="car-title"></div>
        <div class="car-artist"></div>
        <div class="car-seek"><i></i></div>
        <div class="car-times"><span class="cur">0:00</span><span class="rem">-0:00</span></div>
        <div class="car-ctrl">
          <button class="car-btn tap" data-car="prev" aria-label="Précédent">${icon('prev')}</button>
          <button class="car-btn play tap" data-car="toggle" aria-label="Lecture / pause">${icon('play')}</button>
          <button class="car-btn tap" data-car="next" aria-label="Suivant">${icon('next')}</button>
        </div>
      </div>
    </div>`);
  $('#app').appendChild(carEl);
  document.body.classList.add('car-open');
  const q = (s) => $(s, carEl);
  const update = () => {
    const s = player.current;
    q('.car-title').textContent = s?.title || 'Rien en lecture';
    q('.car-artist').textContent = s ? [s.artist, s.album].filter(Boolean).join(' · ') : '';
    const img = q('.car-cover img'); const src = s ? coverFor(s, 600) : '';
    if (img.getAttribute('src') !== src) { img.style.opacity = ''; img.src = src; }
    q('.car-btn.play').innerHTML = icon(player.playing ? 'pause' : 'play');
  };
  const time = () => {
    const d = player.duration, t = player.time;
    q('.car-seek i').style.width = (d ? Math.min(100, (t / d) * 100) : 0) + '%';
    q('.cur').textContent = fmtTime(t);
    q('.rem').textContent = player.current?.isRadio ? 'EN DIRECT' : '-' + fmtTime(Math.max(0, d - t));
  };
  const clock = () => { q('.car-clock').textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };
  update(); time(); clock();
  const tick = setInterval(clock, 20000);
  carOffs = [player.on('track', () => { update(); time(); if (fxOn()) gsap.fromTo([q('.car-title'), q('.car-artist')], { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out', stagger: 0.06 }); }), player.on('state', update), player.on('time', time), () => clearInterval(tick)];

  carEl.addEventListener('click', (e) => {
    if (e.target.closest('.car-close')) { closeCar(); return; }
    const b = e.target.closest('[data-car]');
    if (!b) return;
    if (b.dataset.car === 'toggle') player.toggle(); else if (b.dataset.car === 'next') player.next(); else player.prev();
  });
  // balayage horizontal sur la pochette = titre suivant / précédent
  let sx = null;
  const cv = q('.car-cover');
  cv.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  cv.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 60) (dx < 0 ? player.next() : player.prev()); else player.toggle(); });

  navigator.wakeLock?.request('screen').then((w) => { wake = w; }).catch(() => {});
  if (fxOn()) {
    gsap.fromTo(carEl, { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
    gsap.from([q('.car-cover'), ...$$('.car-side > *', carEl)], { y: 30, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07, delay: 0.1 });
  }
}

export function closeCar() {
  if (!carEl) return;
  const el = carEl;
  carEl = null;
  carOffs.forEach((f) => f()); carOffs = [];
  document.body.classList.remove('car-open');
  try { wake?.release(); } catch { /* ignoré */ }
  wake = null;
  if (fxOn()) gsap.to(el, { autoAlpha: 0, duration: 0.3, onComplete: () => el.remove() });
  else el.remove();
}

// =============================================================================================
// Vibrations synchronisées avec la musique (approximation)
//  - si l'analyse audio est disponible (égaliseur actif) : détection des coups de basse
//  - sinon : impulsions au tempo (BPM) du titre, si le serveur le fournit
// =============================================================================================
let hapticsMod = null;
async function pulse(strength) {
  if (isNative()) {
    try {
      hapticsMod ||= await import('@capacitor/haptics');
      const { Haptics, ImpactStyle } = hapticsMod;
      await Haptics.impact({ style: strength > 0.6 ? ImpactStyle.Medium : ImpactStyle.Light });
      return;
    } catch { /* repli */ }
  }
  navigator.vibrate?.(strength > 0.6 ? 22 : 12);
}

export function initMusicHaptics() {
  let avg = 0.2, last = 0, lastPhase = 0;
  setInterval(() => {
    if (!settings.get('musicHaptics') || !player.playing || document.hidden) return;
    const now = performance.now();
    const lvl = player.bassLevel();
    if (lvl >= 0) {
      avg = avg * 0.94 + lvl * 0.06;
      if (lvl > 0.3 && lvl > avg * 1.35 && now - last > 170) { last = now; pulse(Math.min(1, lvl)); }
      return;
    }
    const bpm = Number(player.current?.bpm);
    if (!bpm) return;
    const period = 60 / bpm;
    const phase = (player.time % period) / period;
    if (phase < lastPhase && now - last > 200) { last = now; pulse(0.5); }
    lastPhase = phase;
  }, 55);
}
