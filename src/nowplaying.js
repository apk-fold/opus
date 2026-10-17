// Mini-lecteur + lecteur plein écran : pochette 3D / vinyle, visualiseur, paroles synchronisées, file d'attente.
import { gsap } from 'gsap';
import { api } from './api.js';
import { player, coverFor } from './player.js';
import { downloads } from './downloads.js';
import { settings } from './store.js';
import { $, $$, esc, fmtTime, haptic, toast, plural, fmtLong, isNative } from './ui.js';
import { icon } from './icons.js';
import { fxOn, fxLevel, tilt, makeViz, animateTitle, splitChars, burst } from './fx.js';
import { openSheet } from './sheets.js';
import { rgb, coverColor, setCoverTint } from './theme.js';
import { toggleStar, songMenu, playlistPicker, downloadSongs, go } from './actions.js';
import { feat } from './flags.js';
import { dockWidth, foldDocked } from './fold.js';
import { gOn, makePullHint, PULL } from './gestures.js';

const RATES = [1, 1.25, 1.5, 2, 0.75];
let npEl, miniEl, viz, spin = null, tab = 0, isOpen = false, seeking = false;
let lyricsFor = null, lyricsLines = null, lyricsActive = -1, lyricsHold = 0, bgFlip = 0;

const isDocked = () => dockWidth();
const split = () => foldDocked(); // Fold déplié : lecteur + paroles/file en permanence
export const npOpen = () => isOpen;

// ---------------------------------------------------------------------------------------------
// Construction du DOM
// ---------------------------------------------------------------------------------------------
export function initNowPlaying() {
  miniEl = $('#mini');
  npEl = $('#np');

  miniEl.innerHTML = `
    <div class="mini-prog"><i></i></div>
    <div class="mini-main">
      <div class="cov xs"><img class="cv" alt=""></div>
      <div class="meta"><div class="t"></div><div class="s"></div></div>
      <span class="priv-ic" title="Session privée">${icon('eyeOff')}</span>
      <button class="ic-btn tap" data-mini="prev" aria-label="Précédent">${icon('prev')}</button>
      <button class="ic-btn play tap" data-mini="toggle" aria-label="Lecture / pause">${icon('play')}</button>
      <button class="ic-btn tap" data-mini="next" aria-label="Suivant">${icon('next')}</button>
    </div>`;

  npEl.innerHTML = `
    <div class="np-bg"><div class="bgl a"></div><div class="bgl b"></div></div>
    <header class="np-top">
      <button class="ic-btn tap" data-np="close" aria-label="Réduire">${icon('down')}</button>
      <div class="np-seg" role="tablist">
        <i class="seg-ind"></i>
        <button class="on" data-tab="0" role="tab">Lecteur</button>
        <button data-tab="1" role="tab">Paroles</button>
        <button data-tab="2" role="tab">File</button>
      </div>
      <button class="ic-btn tap" data-np="menu" aria-label="Plus d'options">${icon('dots')}</button>
    </header>
    <div class="np-panels">
      <section class="np-panel np-player">
        <div class="stage">
          <div class="cover-wrap">
            <div class="spin">
              <div class="disc"></div>
              <div class="art"><img class="cv" alt=""></div>
            </div>
          </div>
        </div>
        <div class="np-info">
          <h2 class="np-title"></h2>
          <div class="np-artist"><a class="tap" data-np="artist"></a> <span class="dot">•</span> <a class="tap alb" data-np="album"></a></div>
          <div class="np-audio"></div>
        </div>
        <div class="viz" aria-hidden="true"></div>
        <div class="seek">
          <input type="range" min="0" max="1000" step="1" value="0" aria-label="Position">
          <div class="times"><span class="cur">0:00</span><span class="rem">-0:00</span></div>
        </div>
        <div class="ctrl">
          <button class="ic-btn tap" data-np="shuffle" aria-label="Aléatoire">${icon('shuffle')}</button>
          <button class="ic-btn lg tap" data-np="prev" aria-label="Précédent">${icon('prev')}</button>
          <button class="playbtn tap" data-np="toggle" aria-label="Lecture / pause">${icon('play')}</button>
          <button class="ic-btn lg tap" data-np="next" aria-label="Suivant">${icon('next')}</button>
          <button class="ic-btn tap" data-np="repeat" aria-label="Répéter">${icon('repeat')}</button>
        </div>
        <div class="tools">
          <button class="ic-btn tap" data-np="star" aria-label="Favori">${icon('heart')}</button>
          <button class="ic-btn tap" data-np="playlist" aria-label="Ajouter à une playlist">${icon('list')}</button>
          <button class="ic-btn tap" data-np="vinyl" aria-label="Mode vinyle">${icon('disc')}</button>
          <button class="ic-btn tap" data-np="sleep" aria-label="Minuterie">${icon('moon')}<b class="badge"></b></button>
          <button class="ic-btn tap" data-np="speed" aria-label="Vitesse"><span class="rate-txt">1×</span></button>
          <button class="ic-btn tap" data-np="download" aria-label="Télécharger">${icon('download')}</button>
        </div>
        <div class="vol"><span>${icon('volume')}</span><input type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume"></div>
      </section>
      <section class="np-panel np-lyrics"><div class="ly-inner"></div></section>
      <section class="np-panel np-queue"><div class="q-inner"></div></section>
    </div>`;

  viz = makeViz($('.viz', npEl));
  tilt($('.cover-wrap', npEl));
  bindEvents();
  bindPlayer();
  applyVinyl(false);
  $('input[aria-label="Volume"]', npEl).value = settings.get('volume');
  refreshTrack(true);
  refreshState();
}

// ---------------------------------------------------------------------------------------------
// Ouverture / fermeture (plein écran sur téléphone plié, panneau ancré sur écran déplié)
// ---------------------------------------------------------------------------------------------
export function openNp() {
  if (!player.current || isOpen) return;
  isOpen = true;
  const docked = isDocked();
  if (split() && !allowedTabs().includes(tab)) tab = allowedTabs()[0];
  npEl.dataset.tab = String(tab);
  document.body.classList.add('np-open');
  document.body.classList.toggle('np-docked', docked);
  npEl.style.display = 'flex';
  npEl.setAttribute('aria-hidden', 'false');
  segIndicator(false);
  viz.start();
  if (fxOn()) {
    gsap.fromTo(npEl, docked ? { xPercent: 100 } : { yPercent: 100 }, { xPercent: 0, yPercent: 0, duration: 0.75, ease: 'expo.out' });
    gsap.from($$('.np-top, .stage, .np-info, .viz, .seek, .ctrl, .tools', npEl), {
      y: 40, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06, delay: 0.15, clearProps: 'transform,opacity,visibility',
    });
  }
  if (tab === 1) loadLyrics();
  if (tab === 2) renderQueue(true);
  keepAwake();
}

export function closeNp(force = false) {
  if (!isOpen || (split() && !force)) return;
  isOpen = false;
  keepAwake();
  const docked = document.body.classList.contains('np-docked');
  document.body.classList.remove('np-open');
  npEl.setAttribute('aria-hidden', 'true');
  const done = () => { npEl.style.display = 'none'; document.body.classList.remove('np-docked'); viz.stop(); };
  if (!fxOn()) { done(); return; }
  gsap.to(npEl, docked ? { xPercent: 100, duration: 0.45, ease: 'power3.in', onComplete: done } : { yPercent: 100, duration: 0.5, ease: 'power3.in', onComplete: done });
}

// ---------------------------------------------------------------------------------------------
// Événements DOM
// ---------------------------------------------------------------------------------------------
function bindEvents() {
  // mini-lecteur : boutons + balayage (gauche/droite = suivant/précédent, haut = ouvrir)
  miniEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mini]'); // « button » : le <body> porte aussi un attribut data-mini (disposition)
    if (b) {
      e.stopPropagation();
      const k = b.dataset.mini;
      haptic('light');
      if (k === 'toggle') player.toggle(); else if (k === 'next') player.next(); else player.prev();
      return;
    }
    openNp();
  });
  let sx = 0, sy = 0, dragging = false, moved = false;
  const main = $('.mini-main', miniEl);
  miniEl.addEventListener('pointerdown', (e) => { if (e.target.closest('button') || !feat('f_gestures')) return; sx = e.clientX; sy = e.clientY; dragging = true; moved = false; });
  miniEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 8) { moved = true; gsap.set(main, { x: dx * 0.6 }); }
  });
  const endSwipe = (e) => {
    if (!dragging) return;
    dragging = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (dy < -45 && Math.abs(dy) > Math.abs(dx)) { gsap.to(main, { x: 0, duration: 0.3 }); openNp(); return; }
    if (moved && Math.abs(dx) > 70) {
      const dir = dx < 0 ? 1 : -1;
      gsap.to(main, { x: -dir * 120, autoAlpha: 0, duration: 0.18, ease: 'power2.in', onComplete: () => {
        dir === 1 ? player.next() : player.prev();
        gsap.fromTo(main, { x: dir * 120, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' });
      } });
      return;
    }
    gsap.to(main, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
  };
  miniEl.addEventListener('pointerup', endSwipe);
  miniEl.addEventListener('pointercancel', endSwipe);

  // lecteur plein écran
  npEl.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-np]');
    if (t) {
      const k = t.dataset.np;
      haptic('light');
      const s = player.current;
      switch (k) {
        case 'close': closeNp(); break;
        case 'toggle': player.toggle(); break;
        case 'next': player.next(); break;
        case 'prev': player.prev(); break;
        case 'shuffle': player.setShuffle(!player.shuffle); break;
        case 'repeat': player.cycleRepeat(); break;
        case 'star': if (s && !s.isRadio) toggleStar(s, t); break;
        case 'playlist': if (s && !s.isRadio) playlistPicker([s]); break;
        case 'download': if (s && !s.isRadio) downloadSongs([s]); break;
        case 'vinyl': settings.set('vinyl', !settings.get('vinyl')); break;
        case 'speed': player.setRate(RATES[(RATES.indexOf(player.rate) + 1) % RATES.length]); toast(`Vitesse ${player.rate}×`); break;
        case 'sleep': sleepMenu(); break;
        case 'menu': if (s && !s.isRadio) songMenu(s, { np: true }); break;
        case 'artist': if (s?.artistId) { closeNp(); go('#/artist/' + s.artistId); } break;
        case 'album': if (s?.albumId) { closeNp(); go('#/album/' + s.albumId); } break;
        default: break;
      }
      return;
    }
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { setTab(Number(tabBtn.dataset.tab)); return; }
    // file : lecture, suppression
    const rm = e.target.closest('[data-qrm]');
    if (rm) { player.remove(Number(rm.dataset.qrm)); return; }
    const qi = e.target.closest('.q-item');
    if (qi && !e.target.closest('.grip')) { player.playIndex(Number(qi.dataset.i)); return; }
    const q = e.target.closest('[data-q]');
    if (q) {
      if (q.dataset.q === 'clear') { player.clearUpcoming(); toast('File vidée'); }
      else if (q.dataset.q === 'shuffle') { player.setShuffle(!player.shuffle); }
      else if (q.dataset.q === 'save') saveQueueAsPlaylist();
      return;
    }
    const ly = e.target.closest('.ly-line[data-t]');
    if (ly) {
      // façon Apple Music : toucher une ligne = aller à cet instant, relancer si en pause, recentrer
      const t = Number(ly.dataset.t) / 1000;
      haptic('light');
      player.seek(t);
      if (!player.playing) player.play();
      lyricsHold = 0; lyricsActive = -1;
      syncLyrics(t);
    }
  });
  // l'utilisateur fait défiler les paroles : on suspend le recentrage automatique quelques secondes
  const lyPanel = $('.np-lyrics', npEl);
  const holdLyrics = () => { lyricsHold = performance.now() + 3500; };
  lyPanel.addEventListener('touchstart', holdLyrics, { passive: true });
  lyPanel.addEventListener('touchmove', holdLyrics, { passive: true });
  lyPanel.addEventListener('wheel', holdLyrics, { passive: true });

  // barre de progression
  const seek = $('.seek input', npEl);
  seek.addEventListener('input', () => {
    seeking = true;
    paintSeek(Number(seek.value) / 1000 * player.duration);
  });
  seek.addEventListener('change', () => { player.seek(Number(seek.value) / 1000 * player.duration); seeking = false; });
  $('input[aria-label="Volume"]', npEl).addEventListener('input', (e) => player.setVolume(Number(e.target.value)));

  // glisser pour changer d'onglet
  const panels = $('.np-panels', npEl);
  let px = 0, py = 0, pd = false;
  let onCover = false;
  panels.addEventListener('pointerdown', (e) => { if (e.target.closest('input,.grip')) return; px = e.clientX; py = e.clientY; pd = true; onCover = !!e.target.closest('.cover-wrap'); });
  panels.addEventListener('pointerup', (e) => {
    if (!pd) return; pd = false;
    const dx = e.clientX - px, dy = e.clientY - py;
    if (onCover && gOn() && settings.get('g_coverSwipe') !== false && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      haptic('light');
      if (dx < 0) player.next(); else player.prev();
      return;
    }
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      const tabs = allowedTabs(), k = tabs.indexOf(tab);
      setTab(tabs[Math.max(0, Math.min(tabs.length - 1, k + (dx < 0 ? 1 : -1)))]);
    }
  });

  const relayout = () => {
    syncFold();
    if (!isOpen) return;
    const d = isDocked();
    document.body.classList.toggle('np-docked', d);
    gsap.set(npEl, { xPercent: 0, yPercent: 0 });
    if (split() && !allowedTabs().includes(tab)) setTab(allowedTabs()[0]);
    else segIndicator(false);
  };
  window.addEventListener('resize', relayout);
  window.addEventListener('nv:fold', relayout);
  bindNpGestures();
  settings.on((k) => {
    if (k === 'viz') refreshState();
    if (k === 'vinyl' || k === 'fx') { applyVinyl(true); refreshState(); }
  });
}

// ---------------------------------------------------------------------------------------------
// Mode Fold déplié : le lecteur reste ouvert à droite (et se range quand on replie le téléphone)
// ---------------------------------------------------------------------------------------------
let autoDocked = false;
function syncFold() {
  if (split()) {
    if (player.current && !isOpen) { openNp(); autoDocked = true; }
  } else if (autoDocked) {
    autoDocked = false;
    if (isOpen) closeNp(true);
  }
}

// ---------------------------------------------------------------------------------------------
// Gestes du lecteur : glisser vers le bas (menu par défaut), vers le haut (file), double tap pochette
// ---------------------------------------------------------------------------------------------
function npAction(kind) {
  const s = player.current;
  switch (kind) {
    case 'menu': if (s && !s.isRadio) songMenu(s, { np: true }); break;
    case 'close': closeNp(); break;
    case 'queue': setTab(2); break;
    case 'lyrics': if (feat('f_lyrics')) setTab(1); break;
    case 'like': if (s && !s.isRadio) toggleStar(s, $('.cover-wrap', npEl)); break;
    case 'toggle': player.toggle(); break;
    default: break;
  }
}

function bindNpGestures() {
  const panels = $('.np-panels', npEl);
  const hint = makePullHint(npEl);
  const LABEL = { menu: 'Menu', close: 'Réduire', queue: 'File d\'attente', lyrics: 'Paroles' };
  let y0 = null, x0 = 0, atTop = false, atBottom = false, onPlayer = false, dy = 0, dx = 0, active = 0;
  panels.addEventListener('touchstart', (e) => {
    y0 = null;
    if (!gOn() || e.touches.length !== 1 || e.target.closest('input, .grip, .q-item.lift')) return;
    const panel = e.target.closest('.np-panel');
    if (!panel) return;
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0; dx = 0; active = 0;
    atTop = panel.scrollTop <= 0;
    atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2;
    onPlayer = panel.classList.contains('np-player');
  }, { passive: true });
  panels.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    const t = e.touches[0];
    dy = t.clientY - y0; dx = t.clientX - x0;
    if (!active) {
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) { y0 = null; return; }
      if (dy > 16 && atTop) active = 1;
      else if (dy < -16 && atBottom && onPlayer) active = -1;
      else if (Math.abs(dy) > 16) { y0 = null; return; }
      else return;
    }
    if (active === 1) {
      const k = settings.get('g_npDown') || 'menu';
      if (k !== 'none' && !(k === 'close' && split())) hint.show(dy - 16, LABEL[k] || 'Menu');
    }
  }, { passive: true });
  const end = (fire) => {
    if (y0 == null) return;
    y0 = null;
    hint.hide();
    if (!fire || !active) return;
    if (active === 1 && dy - 16 >= PULL && Math.abs(dy) > Math.abs(dx) * 1.3) { haptic('medium'); npAction(settings.get('g_npDown') || 'menu'); }
    else if (active === -1 && -dy - 16 >= PULL * 0.8 && Math.abs(dy) > Math.abs(dx) * 1.3) { haptic('light'); npAction(settings.get('g_npUp') || 'queue'); }
  };
  panels.addEventListener('touchend', () => end(true));
  panels.addEventListener('touchcancel', () => end(false));

  // double tap sur la pochette
  let lastTap = 0;
  $('.cover-wrap', npEl).addEventListener('click', (e) => {
    if (!gOn()) return;
    const now = Date.now();
    if (now - lastTap < 320) {
      lastTap = 0;
      const k = settings.get('g_coverTap2') || 'like';
      if (k === 'like' && player.current?.starred) { haptic('light'); burst($('.cover-wrap', npEl)); return; } // déjà aimé : juste l'effet
      npAction(k);
      if (k === 'like') heartPop();
    } else lastTap = now;
  });
}

// grand cœur qui apparaît sur la pochette (double tap)
function heartPop() {
  if (!fxOn()) return;
  const h = document.createElement('div');
  h.className = 'heart-pop';
  h.innerHTML = icon('heartFill');
  $('.cover-wrap', npEl).appendChild(h);
  gsap.fromTo(h, { scale: 0.3, autoAlpha: 0 }, { scale: 1.15, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.5)' });
  gsap.to(h, { scale: 1.4, autoAlpha: 0, duration: 0.4, delay: 0.55, ease: 'power2.in', onComplete: () => h.remove() });
}

// ---------------------------------------------------------------------------------------------
// Onglets
// ---------------------------------------------------------------------------------------------
function segIndicator(animate) {
  const btns = $$('.np-seg button', npEl);
  btns.forEach((b, n) => b.classList.toggle('on', n === tab));
  const b = btns[tab];
  const props = { x: b.offsetLeft, width: b.offsetWidth };
  if (animate && fxOn()) gsap.to($('.seg-ind', npEl), { ...props, duration: 0.5, ease: 'expo.out' });
  else gsap.set($('.seg-ind', npEl), props);
}

const allowedTabs = () => (split() ? (feat('f_lyrics') ? [1, 2] : [2]) : feat('f_lyrics') ? [0, 1, 2] : [0, 2]);

function setTab(i) {
  if (!allowedTabs().includes(i)) i = 0;
  tab = i;
  npEl.dataset.tab = String(i);
  keepAwake();
  segIndicator(true);
  const panels = $$('.np-panel', npEl);
  if (split()) { gsap.set(panels, { xPercent: 0 }); if (i === 1) loadLyrics(); if (i === 2) renderQueue(true); return; }
  if (fxOn()) gsap.to(panels, { xPercent: -100 * i, duration: 0.55, ease: 'expo.out' });
  else gsap.set(panels, { xPercent: -100 * i });
  if (i === 1) loadLyrics();
  if (i === 2) renderQueue(true);
}

// ---------------------------------------------------------------------------------------------
// Synchronisation avec le lecteur
// ---------------------------------------------------------------------------------------------
function bindPlayer() {
  player.on('track', (s) => { refreshTrack(false); syncFold(); if (isOpen && tab === 1) loadLyrics(); });
  player.on('state', refreshState);
  player.on('time', refreshTime);
  player.on('queue', () => { refreshState(); if (tab === 2) renderQueue(false); });
  player.on('patch', refreshStar);
  player.on('sleep', refreshSleep);
  player.on('error', (s) => toast(`Lecture impossible : ${s.title}`));
  window.addEventListener('nv:downloads', refreshDownload);
  settings.on((k) => {
    if (k === 'coverColors') refreshTint();
    if (k === 'f_audioInfo' || k === 'quality') refreshAudio();
    if (k === 'f_lyrics' && !feat('f_lyrics') && tab === 1) setTab(0);
  });
}

// écran allumé tant que les paroles sont affichées
let wakeLock = null;
function keepAwake() {
  const want = isOpen && tab === 1 && feat('f_keepAwake') && !document.hidden;
  if (want && !wakeLock) navigator.wakeLock?.request('screen').then((w) => { wakeLock = w; w.addEventListener?.('release', () => { wakeLock = null; }); }).catch(() => {});
  else if (!want && wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
document.addEventListener('visibilitychange', () => keepAwake());

// format, résolution, débit (OpenSubsonic) + origine du son
function refreshAudio() {
  const el = npEl && $('.np-audio', npEl);
  if (!el) return;
  const s = player.current;
  if (!s || s.isRadio || !feat('f_audioInfo')) { el.innerHTML = ''; return; }
  const local = downloads.get(s.id);
  const q = Number(settings.get('quality')) || 0;
  const parts = [];
  if (local && local.q) parts.push(`MP3 · ${local.q} kbps`);
  else if (!local && q && (!s.bitRate || s.bitRate > q)) parts.push(`MP3 · ${q} kbps`, 'transcodé');
  else {
    if (s.suffix) parts.push(String(s.suffix).toUpperCase());
    if (s.bitDepth) parts.push(`${s.bitDepth} bits`);
    if (s.samplingRate) parts.push(`${(s.samplingRate / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kHz`);
    if (s.bitRate) parts.push(`${s.bitRate.toLocaleString('fr-FR')} kbps`);
  }
  const lossless = /^(flac|alac|wav|aiff?|ape|wv|dsf)$/i.test(s.suffix || '') && !(q && !local) && !(local && local.q);
  el.innerHTML = parts.length ? `${lossless ? `<b class="hq">${(s.bitDepth || 16) > 16 || (s.samplingRate || 0) > 48000 ? 'HI-RES' : 'LOSSLESS'}</b>` : ''}<span>${esc(parts.join(' · '))}</span>${local ? `<span class="loc">${icon('phone')} hors-ligne</span>` : ''}` : '';
}

// teinte du lecteur d'après la pochette (mini-lecteur, fond, halo, bouton lecture)
function refreshTint() {
  const s = player.current;
  if (!s || s.isRadio || settings.get('coverColors') === false) { setCoverTint(null); return; }
  const key = s.coverArt || s.albumId || s.id;
  coverColor(key, api.coverUrl(key, 48), isNative()).then((c) => { if (player.current === s) setCoverTint(c); });
}

function setCover(el, src) { const img = $('img', el); if (img) { img.style.opacity = ''; img.src = src || ''; } }

function refreshTrack(initial) {
  const s = player.current;
  document.body.classList.toggle('has-track', !!s);
  if (!s) {
    if (miniEl) gsap.set(miniEl, { yPercent: 120 });
    return;
  }
  const src = coverFor(s, 600);
  setCover($('.cov', miniEl), coverFor(s, 96));
  $('.mini-main .t', miniEl).textContent = s.title;
  $('.mini-main .s', miniEl).textContent = s.artist || '';
  setCover($('.art', npEl), src);

  const title = $('.np-title', npEl);
  title.textContent = s.title;
  title.removeAttribute('data-split');
  const artist = $('[data-np="artist"]', npEl);
  const album = $('[data-np="album"]', npEl);
  artist.textContent = s.artist || '';
  album.textContent = s.isRadio ? '' : (s.album || '');
  $('.dot', npEl).style.display = s.album && !s.isRadio ? '' : 'none';

  // fond flou de la pochette (fondu enchaîné entre deux calques)
  const layers = $$('.bgl', npEl);
  const next = layers[bgFlip = 1 - bgFlip], prev = layers[1 - bgFlip];
  next.style.backgroundImage = src ? `url("${src}")` : 'none';
  if (fxOn() && !initial) {
    gsap.fromTo(next, { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'power2.inOut' });
    gsap.to(prev, { opacity: 0, duration: 1.1, ease: 'power2.inOut' });
  } else { gsap.set(next, { opacity: 1 }); gsap.set(prev, { opacity: 0 }); }

  // animations d'entrée du morceau
  if (!initial && fxOn()) {
    const dir = player.dir;
    animateTitle(title);
    gsap.fromTo($('.cover-wrap', npEl), { x: 90 * dir, autoAlpha: 0, scale: 0.86 }, { x: 0, autoAlpha: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)', overwrite: 'auto' });
    gsap.fromTo($$('.np-artist', npEl), { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', delay: 0.1 });
  } else splitChars(title);

  // mini-lecteur : apparition à la première piste
  if (fxOn()) gsap.to(miniEl, { yPercent: 0, duration: 0.7, ease: 'expo.out', overwrite: 'auto' });
  else gsap.set(miniEl, { yPercent: 0 });

  lyricsFor = null; lyricsLines = null; lyricsActive = -1;
  refreshTint();
  refreshStar(); refreshDownload(); refreshTime(); refreshAudio();
  $('.seek input', npEl).disabled = !!s.isRadio;
  $('.seek', npEl).classList.toggle('live', !!s.isRadio);
  window.dispatchEvent(new Event('nv:rows'));
}

function refreshState() {
  if (!npEl) return;
  const playing = player.playing;
  const pIcon = icon(playing ? 'pause' : 'play');
  $('.play', miniEl).innerHTML = pIcon;
  $('.playbtn', npEl).innerHTML = pIcon;
  $('.playbtn', npEl).classList.toggle('on', playing);
  document.body.classList.toggle('is-playing', playing);
  const sh = $('[data-np="shuffle"]', npEl), rp = $('[data-np="repeat"]', npEl);
  sh.classList.toggle('active', player.shuffle);
  rp.classList.toggle('active', player.repeat !== 'off');
  rp.innerHTML = icon(player.repeat === 'one' ? 'repeat1' : 'repeat');
  $('.rate-txt', npEl).textContent = `${player.rate}×`;
  $('[data-np="speed"]', npEl).classList.toggle('active', player.rate !== 1);
  $('[data-np="vinyl"]', npEl).classList.toggle('active', settings.get('vinyl'));
  viz.setPlaying(playing && settings.get('viz'));
  $('.viz', npEl).style.display = settings.get('viz') ? '' : 'none';
  if (spin) gsap.to(spin, { timeScale: playing ? 1 : 0, duration: playing ? 0.8 : 1.2, ease: 'power2.out', overwrite: true });
  const pulse = $('.playbtn', npEl);
  gsap.killTweensOf(pulse, 'boxShadow');
  if (playing && fxLevel() === 'max') {
    gsap.fromTo(pulse, { boxShadow: `0 0 22px rgba(${rgb.v2},.55), 0 0 0 0 rgba(${rgb.v2},.5)` }, { boxShadow: `0 0 34px rgba(${rgb.v3},.75), 0 0 0 16px rgba(${rgb.v2},0)`, duration: 1.6, repeat: -1, ease: 'power2.out' });
  } else gsap.set(pulse, { boxShadow: `0 0 22px rgba(${rgb.v2},.55)` });
}

function paintSeek(t) {
  const d = player.duration;
  const pct = d ? Math.min(100, (t / d) * 100) : 0;
  const inp = $('.seek input', npEl);
  inp.style.setProperty('--p', pct + '%');
  $('.times .cur', npEl).textContent = fmtTime(t);
  $('.times .rem', npEl).textContent = player.current?.isRadio ? 'EN DIRECT' : '-' + fmtTime(Math.max(0, d - t));
}

function refreshTime() {
  if (!npEl) return;
  const t = player.time, d = player.duration;
  const pct = d ? Math.min(100, (t / d) * 100) : 0;
  $('.mini-prog i', miniEl).style.width = pct + '%';
  if (!seeking) {
    $('.seek input', npEl).value = d ? (t / d) * 1000 : 0;
    paintSeek(t);
  }
  if (isOpen && tab === 1) syncLyrics(t);
}

function refreshStar() {
  const s = player.current;
  const b = $('[data-np="star"]', npEl);
  if (!b) return;
  b.innerHTML = icon(s?.starred ? 'heartFill' : 'heart');
  b.classList.toggle('active', !!s?.starred);
}
function refreshDownload() {
  const s = player.current;
  const b = $('[data-np="download"]', npEl);
  if (!b) return;
  const has = s && downloads.has(s.id);
  b.innerHTML = icon(has ? 'check' : 'download');
  b.classList.toggle('active', !!has);
}
function refreshSleep() {
  const b = $('[data-np="sleep"]', npEl);
  const on = player.sleepEnd || player.sleepAtTrackEnd || player.sleepAtAlbumEnd;
  b.classList.toggle('active', !!on);
  $('.badge', b).textContent = player.sleepAtTrackEnd ? '1' : player.sleepAtAlbumEnd ? 'A' : player.sleepEnd ? Math.max(1, Math.round((player.sleepEnd - Date.now()) / 60000)) : '';
}

// ---------------------------------------------------------------------------------------------
// Pochette carrée ↔ vinyle qui tourne
// ---------------------------------------------------------------------------------------------
function applyVinyl(animate) {
  const vinyl = settings.get('vinyl');
  const art = $('.art', npEl), disc = $('.disc', npEl), sp = $('.spin', npEl), wrap = $('.cover-wrap', npEl);
  spin?.kill(); spin = null;
  wrap.classList.toggle('vinyl', vinyl);
  const d = animate && fxOn() ? 0.8 : 0;
  if (vinyl) {
    gsap.to(art, { scale: 0.62, borderRadius: '50%', duration: d, ease: 'expo.out' });
    gsap.to(disc, { autoAlpha: 1, scale: 1, duration: d, ease: 'expo.out' });
    if (fxOn()) {
      spin = gsap.to(sp, { rotation: '+=360', duration: 9, ease: 'none', repeat: -1 });
      spin.timeScale(player.playing ? 1 : 0);
    }
  } else {
    gsap.to(art, { scale: 1, borderRadius: '26px', duration: d, ease: 'expo.out' });
    gsap.to(disc, { autoAlpha: 0, scale: 0.8, duration: d, ease: 'expo.out' });
    gsap.to(sp, { rotation: 0, duration: d, ease: 'expo.out' });
  }
  $('[data-np="vinyl"]', npEl).classList.toggle('active', vinyl);
}

// ---------------------------------------------------------------------------------------------
// Minuterie de sommeil
// ---------------------------------------------------------------------------------------------
async function sleepMenu() {
  const active = player.sleepEnd || player.sleepAtTrackEnd || player.sleepAtAlbumEnd;
  const c = await openSheet({
    title: 'Minuterie de sommeil',
    subtitle: player.sleepEnd ? `Arrêt dans ${Math.max(1, Math.round((player.sleepEnd - Date.now()) / 60000))} min` : player.sleepAtTrackEnd ? 'Arrêt à la fin du titre' : player.sleepAtAlbumEnd ? 'Arrêt à la fin de l\'album' : 'La musique s\'arrêtera en fondu',
    items: [
      { id: '15', icon: 'moon', label: '15 minutes' }, { id: '30', icon: 'moon', label: '30 minutes' },
      { id: '45', icon: 'moon', label: '45 minutes' }, { id: '60', icon: 'moon', label: '1 heure' },
      { id: '90', icon: 'moon', label: '1 h 30' }, { id: 'end', icon: 'clock', label: 'À la fin du titre' },
      ...(player.current?.albumId ? [{ id: 'album', icon: 'disc', label: 'À la fin de l\'album' }] : []),
      ...(active ? [{ id: 'off', icon: 'close', label: 'Désactiver', danger: true }] : []),
    ],
  });
  if (!c) return;
  if (c === 'off') { player.setSleep(null); toast('Minuterie désactivée'); return; }
  player.setSleep(c === 'end' || c === 'album' ? c : Number(c));
  toast(c === 'end' ? 'Arrêt à la fin du titre' : c === 'album' ? 'Arrêt à la fin de l\'album' : `Arrêt dans ${c} min`);
}

// ---------------------------------------------------------------------------------------------
// Paroles (OpenSubsonic getLyricsBySongId) — synchronisées si le serveur les fournit
// ---------------------------------------------------------------------------------------------
async function loadLyrics() {
  const s = player.current;
  const box = $('.ly-inner', npEl);
  if (!s) { box.innerHTML = ''; return; }
  if (lyricsFor === s.id) return;
  lyricsFor = s.id;
  lyricsLines = null; lyricsActive = -1;
  if (s.isRadio) { box.innerHTML = '<p class="ly-empty">Pas de paroles pour une radio.</p>'; return; }
  box.innerHTML = '<p class="ly-empty">Recherche des paroles…</p>';
  const list = await api.lyrics(s.id);
  if (lyricsFor !== s.id) return;
  const l = list.find((x) => x.synced) || list[0];
  if (!l?.line?.length) {
    box.innerHTML = `<p class="ly-empty">Aucune parole pour ce titre.<small>Navidrome lit les paroles intégrées aux fichiers ou les fichiers .lrc placés à côté.</small></p>`;
    return;
  }
  lyricsLines = l.synced ? l.line.map((x) => x.start ?? 0) : null;
  box.innerHTML = `<div class="ly-pad"></div>${l.line.map((x, i) => `<p class="ly-line ${l.synced ? 'sync' : ''}" ${l.synced ? `data-t="${x.start ?? 0}"` : ''} data-i="${i}">${esc(x.value || '♪')}</p>`).join('')}<div class="ly-pad"></div>`;
  if (fxOn()) gsap.from($$('.ly-line', box).slice(0, 14), { y: 30, autoAlpha: 0, duration: 0.6, ease: 'power3.out', stagger: 0.04 });
}

function syncLyrics(t) {
  if (!lyricsLines) return;
  const ms = t * 1000 + 250;
  let idx = -1;
  for (let i = 0; i < lyricsLines.length; i++) { if (lyricsLines[i] <= ms) idx = i; else break; }
  if (idx === lyricsActive) return;
  const lines = $$('.ly-line', npEl);
  if (lyricsActive >= 0 && lines[lyricsActive]) gsap.to(lines[lyricsActive], { opacity: 0.32, scale: 1, duration: 0.4, overwrite: 'auto' });
  lyricsActive = idx;
  const cur = lines[idx];
  if (!cur) return;
  const panel = $('.np-lyrics', npEl);
  gsap.to(cur, { opacity: 1, scale: 1.06, duration: 0.45, ease: 'back.out(2)', overwrite: 'auto' });
  // flou progressif des lignes éloignées (effet Apple Music)
  lines.forEach((el, i) => {
    const d = Math.abs(i - idx);
    const b = d === 0 ? 0 : Math.min(d, 4) * 0.7;
    if (d > 7) gsap.set(el, { filter: `blur(${b}px)` });
    else gsap.to(el, { filter: `blur(${b}px)`, duration: 0.4, overwrite: 'auto' });
  });
  if (performance.now() < lyricsHold) return; // l'utilisateur regarde ailleurs
  gsap.to(panel, { scrollTo: { y: cur, offsetY: panel.clientHeight / 2 - 40 }, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
}

// ---------------------------------------------------------------------------------------------
// File d'attente : lecture, suppression, réordonnancement par glisser
// ---------------------------------------------------------------------------------------------
function renderQueue(scroll) {
  const box = $('.q-inner', npEl);
  const q = player.queue;
  if (!q.length) { box.innerHTML = '<p class="ly-empty">La file d\'attente est vide.</p>'; return; }
  const total = q.reduce((n, s) => n + (s.duration || 0), 0);
  box.innerHTML = `
    <div class="q-head">
      <div><b>${plural(q.length, 'titre', 'titres')}</b><span>${fmtLong(total)}</span>${player.endless ? `<span class="q-endless">${icon('flow')} ${esc(player.endlessLabel || 'Sans fin')}</span>` : ''}</div>
      <div class="q-actions">
        <button class="chip tap ${player.shuffle ? 'on' : ''}" data-q="shuffle">${icon('shuffle')} Mélanger</button>
        <button class="chip tap" data-q="save">${icon('plus')} Playlist</button>
        <button class="chip tap" data-q="clear">${icon('trash')} Vider</button>
      </div>
    </div>
    <div class="q-list">
      ${q.map((s, i) => `
      <div class="q-item ${i === player.index ? 'cur' : ''}" data-i="${i}">
        <div class="grip" aria-label="Déplacer">${icon('drag')}</div>
        <div class="cov xs"><img class="cv" loading="lazy" alt="" src="${esc(coverFor(s, 96))}"></div>
        <div class="meta"><div class="t">${esc(s.title)}</div><div class="s">${esc(s.artist || '')}</div></div>
        <span class="dur">${fmtTime(s.duration)}</span>
        <button class="ic-btn tap" data-qrm="${i}" aria-label="Retirer">${icon('close')}</button>
      </div>`).join('')}
    </div>`;
  bindQueueDrag($('.q-list', box));
  if (scroll) {
    const cur = $('.q-item.cur', box);
    const panel = $('.np-queue', npEl);
    if (cur) panel.scrollTop = Math.max(0, cur.offsetTop - 140);
  }
}

function bindQueueDrag(list) {
  let item = null, startY = 0, idx = 0, h = 0;
  list.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('.grip');
    if (!g) return;
    item = g.closest('.q-item');
    idx = Number(item.dataset.i);
    h = item.getBoundingClientRect().height;
    startY = e.clientY;
    g.setPointerCapture(e.pointerId);
    item.classList.add('lift');
    gsap.to(item, { scale: 1.03, duration: 0.2 });
    haptic('medium');
  });
  list.addEventListener('pointermove', (e) => {
    if (!item) return;
    gsap.set(item, { y: e.clientY - startY });
  });
  const end = (e) => {
    if (!item) return;
    const dy = e.clientY - startY;
    const to = Math.max(0, Math.min(player.queue.length - 1, idx + Math.round(dy / h)));
    const el = item;
    item = null;
    el.classList.remove('lift');
    gsap.to(el, { y: 0, scale: 1, duration: 0.3, ease: 'power3.out' });
    if (to !== idx) player.move(idx, to);
  };
  list.addEventListener('pointerup', end);
  list.addEventListener('pointercancel', end);
}

async function saveQueueAsPlaylist() {
  const ids = player.queue.filter((s) => !s.isRadio).map((s) => s.id);
  if (!ids.length) return;
  const { askText } = await import('./sheets.js');
  const name = await askText('Enregistrer la file en playlist', { placeholder: 'Nom de la playlist', ok: 'Créer', value: 'Ma file du ' + new Date().toLocaleDateString('fr-FR') });
  if (!name) return;
  try { await api.createPlaylist(name, ids); toast(`Playlist « ${name} » créée`); } catch (e) { toast('Erreur : ' + e.message); }
}
