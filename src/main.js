// Point d'entrée : intro, connexion, navigation, thème, boutons Android.
import 'virtual:native-media';
import { gsap } from 'gsap';
import { api } from './api.js';
import { player } from './player.js';
import { downloads } from './downloads.js';
import { settings, store } from './store.js';
import { $, $$, hideBrokenImages, isNative, toast, haptic } from './ui.js';
import { NAV, navEnabled } from './nav.js';
import { initFlags, isFlag } from './flags.js';
import { dmx, watchJobs } from './deemix.js';
import { icon } from './icons.js';
import { initBackground, setupPress, fxOn, fxLevel, cleanupReveals, pageIn, pageOut } from './fx.js';
import { initActions, go, autoSync } from './actions.js';
import { initNowPlaying, closeNp, npOpen, openNp } from './nowplaying.js';
import { sheetOpen, closeSheet } from './sheets.js';
import { views } from './views.js';
import { emptyState } from './components.js';
import { initTheme, rgb } from './theme.js';
import { initMusicHaptics, closeCar, carOpen } from './features.js';
import { playLog } from './history.js';
import { initGestures, setPageMenu, handleDeepLink } from './gestures.js';
import { initFold, dockWidth } from './fold.js';
import { initWidget } from './widget.js';
import { initKeepAlive } from './keepalive.js';

// ---------------------------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------------------------
const ROOTS = ['home', 'albums', 'artists', 'playlists', 'more', 'search', 'starred', 'genres', 'radios', 'offline', 'settings', 'replay', 'deezer', 'discover', 'history'];
// page de détail → section parente (pour allumer le bon onglet)
const PARENT = { album: 'albums', artist: 'artists', playlist: 'playlists', dz: 'deezer', deemix: 'deezer', releases: 'discover', blindtest: 'discover', features: 'settings', banned: 'settings', gestures: 'settings', dupes: 'settings', import: 'deezer' };
const navList = () => NAV.filter((n) => navEnabled(n[0]));

function tabIds() {
  const ok = new Set(navList().map((n) => n[0]));
  let t = (settings.get('tabs') || []).filter((id) => ok.has(id)).slice(0, 6);
  if (!t.length) t = ['home', 'albums', 'artists', 'playlists', 'more'];
  if (!t.includes('more') && !t.includes('settings')) t.push('more'); // les réglages restent toujours accessibles
  return t;
}
const tabOf = (route) => {
  const t = tabIds();
  const r = PARENT[route] || route;
  return t.includes(r) ? r : t.includes('more') ? 'more' : null;
};

const isWide = () => window.matchMedia('(min-width: 680px)').matches;
function applyLayout() {
  const b = document.body;
  b.dataset.nav = isWide() ? settings.get('navWide') : settings.get('navNarrow');
  b.dataset.fab = settings.get('fabSide');
  b.dataset.mini = settings.get('miniPos');
  b.dataset.search = settings.get('searchPos');
}

function buildNav() {
  const item = (n, cls) => `<a class="nav-item tap ${cls}" data-nav="${n[0]}" href="${n[1]}">${icon(n[2])}<span>${n[3]}</span></a>`;
  const byId = Object.fromEntries(navList().map((n) => [n[0], n]));
  $('#rail-nav').innerHTML = '<i class="ind"></i>' + navList().filter((n) => n[0] !== 'more').map((n) => item(n, 'r')).join('');
  $('#tabs').innerHTML = '<i class="ind"></i>' + tabIds().map((id) => item(byId[id], 't')).join('');
}

// bouton flottant : ouvre la liste complète des sections (pratique d'une main sur un Fold déplié)
let fabEl = null;
const fabOpen = () => !!fabEl;
function closeFab() {
  const el = fabEl;
  if (!el) return;
  fabEl = null;
  gsap.to($('#fab .i'), { rotation: 0, duration: 0.3 });
  if (!fxOn()) { el.remove(); return; }
  gsap.to($$('.nav-item', el), { y: 16, autoAlpha: 0, duration: 0.18, stagger: 0.015 });
  gsap.to($('.fm-back', el), { opacity: 0, duration: 0.25, onComplete: () => el.remove() });
}
function openFab() {
  if (fabEl) { closeFab(); return; }
  haptic('light');
  const items = navList().filter((n) => n[0] !== 'more').reverse(); // la 1re section au plus près du pouce
  const cur = PARENT[activeRoute] || activeRoute;
  fabEl = document.createElement('div');
  fabEl.id = 'fab-menu';
  fabEl.innerHTML = `<div class="fm-back"></div><nav class="fm-list">${items.map((n) => `<a class="nav-item tap ${n[0] === cur ? 'on' : ''}" href="${n[1]}">${icon(n[2])}<span>${n[3]}</span></a>`).join('')}</nav>`;
  $('#overlays').appendChild(fabEl);
  fabEl.addEventListener('click', (e) => { if (e.target.closest('.nav-item') || e.target.classList.contains('fm-back')) closeFab(); });
  gsap.to($('#fab .i'), { rotation: 90, duration: 0.3 });
  if (fxOn()) {
    gsap.fromTo($('.fm-back', fabEl), { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.from([...$$('.nav-item', fabEl)].reverse(), { y: 24, scale: 0.9, autoAlpha: 0, duration: 0.45, ease: 'back.out(1.6)', stagger: 0.025 });
  }
}

function initChrome() {
  $('#back').innerHTML = icon('left');
  $('#top-search').innerHTML = icon('search');
  $('#back').addEventListener('click', () => (history.length > 1 ? history.back() : go('#/home')));
  const fab = document.createElement('button');
  fab.id = 'fab';
  fab.className = 'tap';
  fab.setAttribute('aria-label', 'Menu');
  fab.innerHTML = icon('grid');
  fab.addEventListener('click', openFab);
  $('#app').appendChild(fab);
  buildNav();
  applyLayout();
  settings.on((k) => {
    if (k === 'tabs' || isFlag(k)) { buildNav(); setActiveNav(activeRoute, false); }
    if (['navWide', 'navNarrow', 'fabSide', 'miniPos', 'searchPos'].includes(k)) { applyLayout(); requestAnimationFrame(() => setActiveNav(activeRoute, false)); }
  });
}

let activeRoute = 'home';
function moveIndicator(container, target, vertical, animate = true) {
  const ind = $('.ind', container);
  if (!ind) return;
  if (!target || !target.offsetParent) { gsap.set(ind, { autoAlpha: 0 }); return; }
  const props = vertical ? { y: target.offsetTop, height: target.offsetHeight } : { x: target.offsetLeft, width: target.offsetWidth };
  if (animate && fxOn()) gsap.to(ind, { ...props, autoAlpha: 1, duration: 0.6, ease: 'expo.out' });
  else gsap.set(ind, { ...props, autoAlpha: 1 });
}
function setActiveNav(route, animate = true) {
  activeRoute = route;
  const tab = tabOf(route), rail = route === 'more' ? 'home' : PARENT[route] || route;
  $$('#tabs .nav-item').forEach((a) => a.classList.toggle('on', a.dataset.nav === tab));
  $$('#rail .nav-item').forEach((a) => a.classList.toggle('on', a.dataset.nav === rail));
  moveIndicator($('#tabs'), $(`#tabs .nav-item[data-nav="${tab}"]`), false, animate);
  moveIndicator($('#rail-nav'), $(`#rail .nav-item[data-nav="${rail}"]`), true, animate);
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || 'home', args: parts.slice(1), q: new URLSearchParams(qs || '') };
}

let token = 0, leave = [], clickHandler = null;
const setTitle = (t) => { $('.top-title').textContent = t || ''; };

async function route() {
  if (!api.ready) return;
  const my = ++token;
  leave.forEach((f) => { try { f(); } catch { /* ignoré */ } });
  leave = []; clickHandler = null;
  setPageMenu(null);
  cleanupReveals();
  const { name, args, q } = parseHash();
  const fn = views[name] || views.home;
  const page = $('#page'), scroller = $('#view');
  await pageOut(page);
  if (my !== token) return;
  page.innerHTML = '';
  scroller.scrollTop = 0;
  $('#top').classList.remove('scrolled');
  $('#back').hidden = ROOTS.includes(name) && !q.has('f') && !q.has('k');
  setActiveNav(name);
  const ctx = {
    root: page, scroller, q, args, stale: () => my !== token,
    onLeave: (f) => leave.push(f), onClick: (f) => { clickHandler = f; }, title: setTitle,
    menu: (f) => { if (my === token) setPageMenu(f); }, // menu de la page (tirer vers le bas)
  };
  gsap.set(page, { autoAlpha: 0 });
  const run = fn(ctx);
  pageIn(page);
  if (!fxOn()) gsap.set(page, { autoAlpha: 1 });
  try { await run; } catch (err) {
    if (my !== token) return;
    if (err.code === 40 || err.code === 41 || err.http === 401) { toast('Session expirée : reconnecte-toi'); window.dispatchEvent(new Event('nv:logout')); return; }
    const net = err.network;
    page.innerHTML = `${emptyState(net ? 'wave' : 'close', net ? 'Serveur injoignable' : 'Oups', net ? 'Vérifie que Tailscale est actif sur ce téléphone et que le serveur est allumé.' : err.message)}
      <div class="hb-actions center"><button class="btn primary tap" data-act="retry">${icon('refresh')} Réessayer</button>${downloads.list().length ? `<a class="btn tap" href="#/offline">${icon('phone')} Hors-ligne</a>` : ''}</div>`;
    gsap.set(page, { autoAlpha: 1, y: 0 });
  }
}

// ---------------------------------------------------------------------------------------------
// Thème / réglages
// ---------------------------------------------------------------------------------------------
function applyBody() { document.body.dataset.fx = fxLevel(); }
settings.on((k) => {
  if (k === 'fx') { applyBody(); initBackground(); }
});

// ---------------------------------------------------------------------------------------------
// Intro
// ---------------------------------------------------------------------------------------------
function playIntro() {
  const intro = $('#intro');
  const letters = $$('.intro-logo span', intro);
  const tl = gsap.timeline();
  if (fxOn()) {
    tl.from(letters, { yPercent: 130, rotationX: -90, opacity: 0, duration: 0.9, ease: 'back.out(1.8)', stagger: 0.09 })
      .from('.intro-sub', { opacity: 0, letterSpacing: '1.2em', duration: 1, ease: 'power3.out' }, '-=0.5')
      .fromTo('.intro-line i', { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'expo.inOut' }, '-=0.9')
      .to(letters, { textShadow: `0 0 38px rgba(${rgb.v3},.95), 0 0 8px rgba(${rgb.v4},.9)`, duration: 0.5, yoyo: true, repeat: 1 }, '-=0.5');
  }
  const out = () => new Promise((res) => {
    if (!fxOn()) { intro.style.display = 'none'; res(); return; }
    gsap.fromTo(intro, { clipPath: 'circle(150% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)', duration: 0.95, ease: 'expo.inOut', onComplete: () => { intro.style.display = 'none'; res(); } });
  });
  const done = new Promise((res) => {
    if (tl.duration() === 0) res();
    else tl.eventCallback('onComplete', res);
  });
  return { done, out };
}

// ---------------------------------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------------------------------
function showLogin() {
  const login = $('#login');
  login.hidden = false;
  const card = $('.login-card', login);
  const err = $('.err', login);
  if (fxOn()) {
    gsap.from(card, { y: 60, autoAlpha: 0, scale: 0.94, duration: 0.9, ease: 'expo.out', delay: 0.15 });
    gsap.from($$('.login-card > *', login), { y: 24, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07, delay: 0.3 });
    gsap.fromTo('.logo-mark.big', { rotation: -180, scale: 0.4 }, { rotation: 0, scale: 1, duration: 1.4, ease: 'elastic.out(1, 0.5)', delay: 0.25 });
  }
  const url = card.elements.url, user = card.elements.user, pass = card.elements.pass;
  const savedUrl = store.get('lastUrl'); if (savedUrl) url.value = savedUrl;
  card.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', card);
    btn.disabled = true; btn.classList.add('busy'); err.textContent = '';
    try {
      await api.login(url.value, user.value, pass.value);
      store.set('lastUrl', api.server);
      pass.value = '';
      await new Promise((res) => (fxOn() ? gsap.to(login, { autoAlpha: 0, scale: 1.04, duration: 0.5, ease: 'power2.in', onComplete: res }) : res()));
      login.hidden = true;
      startApp();
    } catch (ex) {
      err.textContent = ex.network ? 'Serveur injoignable. Vérifie l\'adresse et que Tailscale est actif.' : ex.code === 40 ? 'Identifiant ou mot de passe incorrect.' : ex.message;
      gsap.timeline().to(card, { x: -12, duration: 0.06 }).to(card, { x: 12, duration: 0.06 }).to(card, { x: -8, duration: 0.06 }).to(card, { x: 0, duration: 0.12 });
    } finally { btn.disabled = false; btn.classList.remove('busy'); }
  });
}

// ---------------------------------------------------------------------------------------------
// Démarrage de l'appli
// ---------------------------------------------------------------------------------------------
let started = false;
function startApp(offline = false) {
  if (started) return;
  started = true;
  document.body.classList.add('ready');
  if (!location.hash || location.hash === '#') history.replaceState(null, '', offline && downloads.list().length ? '#/offline' : '#/' + (settings.get('startPage') || 'home'));
  route();
  if (fxOn()) {
    gsap.from('#top', { y: -60, autoAlpha: 0, duration: 0.8, ease: 'expo.out', delay: 0.15 });
    gsap.from('#tabs', { y: 90, autoAlpha: 0, duration: 0.9, ease: 'expo.out', delay: 0.2 });
    gsap.from('#rail', { x: -90, autoAlpha: 0, duration: 0.9, ease: 'expo.out', delay: 0.2 });
  }
  player.restoreFromServer().catch(() => {});
  downloads.verify().then((n) => { if (n) toast(`${n} fichier(s) hors-ligne introuvable(s) retiré(s) de la liste`, 3600); });
  if (!offline) setTimeout(autoSync, 4000);
  if (!offline && dmx.ready) setTimeout(() => watchJobs(), 2500); // suites des téléchargements deemix en cours
  if (offline) toast('Serveur injoignable — mode hors-ligne', 4000);
  if (pendingLink) { const u = pendingLink; pendingLink = null; setTimeout(() => handleDeepLink(u), 600); }
}
let pendingLink = null;

window.addEventListener('nv:logout', () => {
  player.pause();
  store.del('queue'); store.del('pos');
  api.logout();
  location.hash = '';
  location.reload();
});
window.addEventListener('nv:refresh', () => route());
window.addEventListener('hashchange', () => { closeFab(); if (started) route(); });
window.addEventListener('resize', () => { applyLayout(); setActiveNav(activeRoute, false); });

async function boot() {
  hideBrokenImages();
  initTheme();
  initFlags();
  applyBody();
  setupPress();
  initActions();
  initChrome();
  initFold();
  initNowPlaying();
  initGestures();
  initWidget();
  initKeepAlive();
  initBackground();
  initMusicHaptics();
  if (location.search.includes('debug')) window.__opus = { player, settings, history: playLog, openNp, npOpen, handleDeepLink }; // crochet de test
  player.on('autoplay', (n, kind) => toast(`Lecture automatique · ${n} titres ${kind}`, 3200));
  player.on('eqfail', () => toast('Égaliseur indisponible : ton serveur Navidrome doit autoriser CORS (voir README)', 5200));
  player.on('eqwarn', () => toast('Audio bloqué par Android : touche l\'écran pour relancer le son', 4200));

  // barre supérieure : titre discret + fond verre quand on défile
  $('#view').addEventListener('scroll', () => $('#top').classList.toggle('scrolled', $('#view').scrollTop > 40), { passive: true });
  $('#view').addEventListener('click', (e) => { clickHandler?.(e); });

  if (isNative()) {
    // barre d'état : réglée par theme.js selon le thème (sombre, AMOLED, clair)
    try {
      const { App } = await import('@capacitor/app');
      App.addListener('backButton', ({ canGoBack }) => {
        if (fabOpen()) closeFab();
        else if (sheetOpen()) closeSheet();
        else if (carOpen()) closeCar();
        else if (npOpen() && !dockWidth()) closeNp();
        else if (canGoBack) history.back();
        else App.minimizeApp();
      });
      // raccourcis de l'icône (appui long) et widget : liens opus://flow, opus://offline…
      App.addListener('appUrlOpen', ({ url }) => { if (started) handleDeepLink(url); else pendingLink = url; });
      const launch = await App.getLaunchUrl().catch(() => null);
      if (launch?.url && /^opus:/i.test(launch.url)) pendingLink = launch.url;
    } catch { /* plugin absent */ }
  }

  const intro = playIntro();
  let pingErr = null;
  if (api.ready) { try { await api.call('ping'); } catch (e) { pingErr = e; } }
  await intro.done;
  const authFail = pingErr && (pingErr.code === 40 || pingErr.code === 41 || pingErr.http === 401);
  if (!api.ready || authFail) {
    if (authFail) api.logout();
    showLogin();
    await intro.out();
  } else {
    startApp(!!pingErr);
    await intro.out();
  }
}

boot();
