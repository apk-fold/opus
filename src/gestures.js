// Gestes façon iPhone, réglables dans Réglages › Gestes et raccourcis :
//  - tirer vers le bas en haut d'une page  → menu ⋯ de la page (ou les raccourcis s'il n'y en a pas)
//  - appui long sur un titre / une carte    → son menu, sans viser le petit bouton ⋯
//  - glisser un titre à droite / à gauche   → lire ensuite / ajouter à la file (au choix)
// Le lecteur plein écran a ses propres gestes (nowplaying.js) qui réutilisent l'indicateur d'ici.
// Ce module gère aussi les raccourcis (menu rapide, raccourcis de l'icône Android et widget : liens opus://…).
import { gsap } from 'gsap';
import { api } from './api.js';
import { player } from './player.js';
import { settings } from './store.js';
import { $, haptic, toast, esc } from './ui.js';
import { icon } from './icons.js';
import { feat } from './flags.js';
import { fxOn } from './fx.js';
import { openSheet, sheetOpen } from './sheets.js';
import { getList, songMenu, albumMenu, go, startFlow, toggleStar, startArtistRadio } from './actions.js';

export const PULL = 86; // distance (px) à tirer pour déclencher

// ---------------------------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------------------------
export const G_OPTIONS = {
  g_npDown: { title: 'Lecteur · glisser vers le bas', options: [['menu', 'Menu du titre', 'Playlist, favori, radio, partage…'], ['close', 'Réduire le lecteur', 'Comme sur iPhone'], ['queue', 'File d\'attente', ''], ['none', 'Rien', '']] },
  g_npUp: { title: 'Lecteur · glisser vers le haut', options: [['queue', 'File d\'attente', ''], ['lyrics', 'Paroles', ''], ['menu', 'Menu du titre', ''], ['none', 'Rien', '']] },
  g_coverTap2: { title: 'Lecteur · double tap sur la pochette', options: [['like', 'J\'aime', 'Ajoute aux favoris (cœur)'], ['toggle', 'Lecture / pause', ''], ['none', 'Rien', '']] },
  g_pull: { title: 'Pages · tirer vers le bas', options: [['menu', 'Menu de la page', 'Le ⋯ de l\'album, de la playlist… sinon les raccourcis'], ['quick', 'Raccourcis', 'Toujours le menu rapide'], ['none', 'Rien', '']] },
  g_rowRight: { title: 'Titre · glisser vers la droite', options: [['next', 'Lire ensuite', ''], ['queue', 'Ajouter à la file', ''], ['like', 'J\'aime', ''], ['none', 'Rien', '']] },
  g_rowLeft: { title: 'Titre · glisser vers la gauche', options: [['queue', 'Ajouter à la file', ''], ['next', 'Lire ensuite', ''], ['like', 'J\'aime', ''], ['none', 'Rien', '']] },
};
export const gOn = () => feat('f_touch');
const g = (k) => settings.get(k);
export const gLabel = (k) => (G_OPTIONS[k].options.find(([v]) => v === g(k)) || G_OPTIONS[k].options[0])[1];

// ---------------------------------------------------------------------------------------------
// Indicateur « tirer » (pastille qui descend avec le doigt)
// ---------------------------------------------------------------------------------------------
export function makePullHint(host) {
  const el = document.createElement('div');
  el.className = 'pull-hint';
  el.innerHTML = `<span class="ph-ic">${icon('dots')}</span><span class="ph-t"></span>`;
  host.appendChild(el);
  let ready = false;
  return {
    show(dy, label) {
      const p = Math.max(0, Math.min(1, dy / PULL));
      $('.ph-t', el).textContent = label;
      gsap.set(el, { y: Math.min(dy, PULL * 1.4) * 0.55, autoAlpha: Math.min(1, p * 1.3), scale: 0.7 + p * 0.3 });
      if (p >= 1 && !ready) { ready = true; el.classList.add('ready'); haptic('light'); }
      else if (p < 1 && ready) { ready = false; el.classList.remove('ready'); }
      return p >= 1;
    },
    hide() {
      ready = false; el.classList.remove('ready');
      if (fxOn()) gsap.to(el, { y: 0, autoAlpha: 0, scale: 0.7, duration: 0.25, ease: 'power2.in' });
      else gsap.set(el, { autoAlpha: 0 });
    },
  };
}

// le clic qui suit un appui long ou un glissé ne doit pas lancer la lecture
let swallowUntil = 0;
const swallowNext = () => { swallowUntil = Infinity; };
const releaseSwallow = () => { if (swallowUntil === Infinity) swallowUntil = Date.now() + 450; };
document.addEventListener('click', (e) => {
  if (!swallowUntil) return;
  if (Date.now() > swallowUntil) { swallowUntil = 0; return; }
  if (!e.isTrusted) return; // nos propres .click() passent
  swallowUntil = 0;
  e.stopPropagation(); e.preventDefault();
}, true);

// ---------------------------------------------------------------------------------------------
// Menu de la page (tirer vers le bas)
// ---------------------------------------------------------------------------------------------
let pageMenu = null;
export const setPageMenu = (fn) => { pageMenu = fn || null; };
const MENU_BTN = '[data-page-menu], [data-al="menu"], [data-p="menu"], [data-off="menu"], [data-offg="menu"], [data-fold="menu"]';
const visibleMenuBtn = () => [...document.querySelectorAll('#page ' + MENU_BTN)].find((b) => b.offsetParent);
const hasPageMenu = () => !!pageMenu || !!visibleMenuBtn();

export function openPageMenu() {
  if (g('g_pull') === 'quick') return quickMenu();
  if (pageMenu) return pageMenu();
  const b = visibleMenuBtn();
  if (b) { b.click(); return null; }
  return quickMenu();
}

function bindPull(view) {
  const hint = makePullHint($('#main'));
  let y0 = null, x0 = 0, active = false, armed = false;
  view.addEventListener('touchstart', (e) => {
    y0 = null;
    if (!gOn() || g('g_pull') === 'none' || e.touches.length !== 1 || view.scrollTop > 0 || sheetOpen()) return;
    if (e.target.closest('input, textarea, select, .no-pull')) return;
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; active = false; armed = false;
  }, { passive: true });
  view.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    const t = e.touches[0], dy = t.clientY - y0, dx = t.clientX - x0;
    if (!active) {
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) { y0 = null; return; }
      if (dy < -8 || view.scrollTop > 0) { y0 = null; return; }
      if (dy < 16) return;
      active = true;
    }
    armed = hint.show(dy - 16, g('g_pull') === 'menu' && hasPageMenu() ? 'Menu' : 'Raccourcis');
    if (fxOn()) gsap.set('#page', { y: Math.min(dy - 16, PULL * 1.4) * 0.28 });
  }, { passive: true });
  const end = (fire) => {
    if (y0 == null) return;
    y0 = null;
    if (!active) return;
    hint.hide();
    if (fxOn()) gsap.to('#page', { y: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)' });
    if (fire && armed) { haptic('medium'); openPageMenu(); }
  };
  view.addEventListener('touchend', () => end(true));
  view.addEventListener('touchcancel', () => end(false));
}

// ---------------------------------------------------------------------------------------------
// Appui long : menu de l'élément
// ---------------------------------------------------------------------------------------------
const ITEM = '.row, .card, .q-item, .job, .set-row.pl-row';
const ITEM_MENU = '[data-act="song-menu"], [data-dzm], [data-hm], [data-jm], [data-offm], [data-flm], button[aria-label="Plus d\'options"], button[aria-label="Options"]';
let pressTimer = 0, pressEl = null, px = 0, py = 0;
const cancelPress = () => { clearTimeout(pressTimer); pressTimer = 0; pressEl = null; };

async function itemMenu(el) {
  if (el.matches('.q-item')) { const s = player.queue[Number(el.dataset.i)]; if (s && !s.isRadio) songMenu(s); return; }
  const btn = el.querySelector(ITEM_MENU);
  if (btn) { btn.click(); return; }
  const href = el.getAttribute('href') || '';
  const m = /^#\/(album|playlist|artist)\/([^/?]+)/.exec(href);
  if (!m) { el.querySelector('[data-offplay], .fab')?.click(); return; }
  const id = decodeURIComponent(m[2]);
  try {
    if (m[1] === 'album') { const a = await api.album(id); await albumMenu(a, a.song); }
    else if (m[1] === 'playlist') { const { playlistMenu } = await import('./folders.js'); await playlistMenu(id); }
    else await artistMenu(id, $('.c-t', el)?.textContent || '');
  } catch (err) { toast('Erreur : ' + err.message); }
}

async function artistMenu(id, name) {
  const c = await openSheet({
    title: name || 'Artiste', subtitle: 'Artiste',
    items: [
      { id: 'open', icon: 'mic', label: 'Ouvrir la page' },
      ...(feat('f_radio') ? [{ id: 'radio', icon: 'radio', label: 'Radio de l\'artiste', sub: 'Titres proches, sans fin' }] : []),
      { id: 'shuffle', icon: 'shuffle', label: 'Lecture aléatoire' },
    ],
  });
  if (c === 'open') go('#/artist/' + encodeURIComponent(id));
  else if (c === 'radio') await startArtistRadio(id, name);
  else if (c === 'shuffle') {
    const { artistSongs } = await import('./discover.js');
    const list = await artistSongs(id, 200);
    if (list.length) player.playQueue(list, 0, { shuffle: true }); else toast('Aucun titre');
  }
}

function bindLongPress(root) {
  root.addEventListener('touchstart', (e) => {
    cancelPress();
    if (!gOn() || !g('g_long') || e.touches.length !== 1) return;
    const el = e.target.closest(ITEM);
    if (!el || e.target.closest('input, .grip, .switch')) return;
    pressEl = el; px = e.touches[0].clientX; py = e.touches[0].clientY;
    pressTimer = setTimeout(() => {
      const target = pressEl;
      pressTimer = 0; pressEl = null;
      if (!target?.isConnected) return;
      haptic('heavy');
      if (fxOn()) gsap.fromTo(target, { scale: 0.96 }, { scale: 1, duration: 0.45, ease: 'back.out(3)', overwrite: 'auto' });
      itemMenu(target);
      swallowNext();
    }, 460);
  }, { passive: true });
  root.addEventListener('touchmove', (e) => {
    if (!pressTimer) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - px) > 10 || Math.abs(t.clientY - py) > 10) cancelPress();
  }, { passive: true });
  root.addEventListener('touchend', () => { cancelPress(); releaseSwallow(); });
  root.addEventListener('touchcancel', () => { cancelPress(); releaseSwallow(); });
  // pas de menu contextuel du navigateur (WebView) sur nos éléments
  root.addEventListener('contextmenu', (e) => { if (gOn() && e.target.closest(ITEM)) e.preventDefault(); });
}

// ---------------------------------------------------------------------------------------------
// Glisser un titre (gauche / droite)
// ---------------------------------------------------------------------------------------------
const ROW_ACT = {
  next: ['play', 'Lire ensuite', (s) => { player.addNext(s); toast(`Lu ensuite · ${s.title}`); }],
  queue: ['queue', 'À la file', (s) => { player.addEnd(s); toast(`Ajouté à la file · ${s.title}`); }],
  like: ['heart', 'J\'aime', (s, row) => toggleStar(s, row.querySelector('.meta'))],
};

function rowSong(row) {
  const l = row.dataset.list ? getList(row.dataset.list) : null;
  return l?.songs[Number(row.dataset.i)] || null;
}

function bindRowSwipe(root) {
  let row = null, sx = 0, sy = 0, dx = 0, horiz = null, armed = false, hint = null;
  const hintEl = () => {
    if (!hint) { hint = document.createElement('div'); hint.className = 'swipe-hint'; $('#overlays').appendChild(hint); }
    return hint;
  };
  root.addEventListener('touchstart', (e) => {
    row = null;
    if (!gOn() || e.touches.length !== 1) return;
    if (g('g_rowRight') === 'none' && g('g_rowLeft') === 'none') return;
    const r = e.target.closest('.row[data-list]');
    if (!r || e.target.closest('button, input')) return;
    row = r; sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; horiz = null; armed = false;
  }, { passive: true });
  root.addEventListener('touchmove', (e) => {
    if (!row) return;
    const t = e.touches[0];
    dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (horiz == null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      horiz = Math.abs(dx) > Math.abs(dy) * 1.4;
      if (!horiz) { row = null; return; }
      cancelPress();
      swallowNext();
    }
    if (e.cancelable) e.preventDefault();
    const act = ROW_ACT[dx > 0 ? g('g_rowRight') : g('g_rowLeft')];
    const lim = act ? 150 : 24;
    const x = Math.max(-lim, Math.min(lim, dx * 0.85));
    gsap.set(row, { x });
    const h = hintEl(), r = row.getBoundingClientRect();
    const now = !!act && Math.abs(dx) > 92;
    if (now !== armed) { armed = now; if (armed) haptic('light'); }
    if (act) {
      h.innerHTML = `${icon(act[0])}<span>${esc(act[1])}</span>`;
      h.className = `swipe-hint ${dx > 0 ? 'l' : 'r'} ${armed ? 'on' : ''}`;
      Object.assign(h.style, { top: r.top + 'px', height: r.height + 'px', left: dx > 0 ? r.left - x + 'px' : '', right: dx < 0 ? (window.innerWidth - r.right - x) + 'px' : '', width: Math.abs(x) + 'px', opacity: Math.min(1, Math.abs(x) / 70) });
    }
  }, { passive: false });
  const end = () => {
    if (!row) return;
    const r = row; row = null;
    releaseSwallow();
    if (!horiz) return;
    gsap.to(r, { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.7)' });
    if (hint) gsap.to(hint, { opacity: 0, duration: 0.2 });
    const key = dx > 0 ? g('g_rowRight') : g('g_rowLeft');
    if (armed && ROW_ACT[key]) {
      const s = rowSong(r);
      if (s) { haptic('medium'); ROW_ACT[key][2](s, r); }
    }
  };
  root.addEventListener('touchend', end);
  root.addEventListener('touchcancel', () => { if (row) { gsap.to(row, { x: 0, duration: 0.3 }); row = null; } if (hint) hint.style.opacity = 0; releaseSwallow(); });
}

// ---------------------------------------------------------------------------------------------
// Raccourcis : menu rapide + liens opus://… (icône de l'appli, widget)
// ---------------------------------------------------------------------------------------------
export const SHORTCUTS = [
  ['flow', 'flow', 'Lancer le Flow', 'Ta musique, sans fin', 'f_flow'],
  ['random', 'dice', 'Mix aléatoire', '50 titres au hasard'],
  ['toggle', 'play', 'Lecture / pause', ''],
  ['player', 'disc', 'Ouvrir le lecteur', ''],
  ['search', 'search', 'Recherche', ''],
  ['offline', 'phone', 'Hors-ligne', 'Ta musique sur le téléphone', 'f_offline'],
  ['discover', 'spark', 'Découvrir', '', 'f_discover'],
  ['import', 'link', 'Importer une playlist', 'Spotify, YouTube, Deezer', 'f_import'],
  ['deezer', 'deezer', 'Deezer', '', 'deezer'],
  ['car', 'car', 'Mode voiture', '', 'f_car'],
  ['theme', 'palette', 'Changer de thème', 'Sombre, AMOLED, clair'],
  ['gestures', 'hand', 'Gestes et raccourcis', 'Régler les glissés'],
];

const THEMES = ['dark', 'amoled', 'light'];
const THEME_NAMES = { dark: 'Sombre', amoled: 'AMOLED noir pur', light: 'Clair' };

export async function runShortcut(id) {
  switch (id) {
    case 'flow': await startFlow(); break;
    case 'random': {
      const list = await api.randomSongs(50);
      if (list.length) { player.playQueue(list, 0); toast('Mix aléatoire'); } else toast('Bibliothèque vide');
      break;
    }
    case 'toggle': if (player.current) player.toggle(); else await startFlow(); break;
    case 'next': player.next(); break;
    case 'prev': player.prev(); break;
    case 'player': { const { openNp } = await import('./nowplaying.js'); openNp(); break; }
    case 'search': go('#/search'); setTimeout(() => $('#page input[type=search], #page input')?.focus(), 450); break;
    case 'car': { const { openCar } = await import('./features.js'); openCar(); break; }
    case 'theme': {
      const cur = settings.get('theme') || 'dark';
      const nxt = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      settings.set('theme', nxt);
      toast(`Thème ${THEME_NAMES[nxt]}`);
      break;
    }
    case 'offline': case 'discover': case 'deezer': case 'import': case 'gestures': case 'settings': case 'home':
      go('#/' + id); break;
    default: break;
  }
}

export async function quickMenu() {
  const items = SHORTCUTS.filter((s) => (!s[4] || feat(s[4])) && !(s[0] === 'player' && !player.current))
    .map(([id, ic, label, sub]) => ({ id, icon: id === 'toggle' && player.playing ? 'pause' : ic, label, sub }));
  const c = await openSheet({ title: 'Raccourcis', subtitle: 'Tire vers le bas sur n\'importe quelle page', items });
  if (c) { try { await runShortcut(c); } catch (err) { toast('Erreur : ' + err.message); } }
  return c;
}

// lien opus://flow, opus://offline… (raccourcis de l'icône, widget) ou opus://open?h=/album/123
export function handleDeepLink(url) {
  const m = /^opus:\/\/([a-z]+)\/?(?:\?(.*))?$/i.exec(String(url || ''));
  if (!m) return false;
  const id = m[1].toLowerCase();
  const q = new URLSearchParams(m[2] || '');
  if (id === 'open' && q.get('h')) { go('#' + q.get('h')); return true; }
  runShortcut(id).catch((e) => toast('Erreur : ' + e.message));
  return true;
}

// ---------------------------------------------------------------------------------------------
export function initGestures() {
  const view = $('#view');
  bindPull(view);
  bindLongPress(view);
  bindRowSwipe(view);
  // appui long aussi dans le lecteur (file d'attente) et les feuilles
  bindLongPress($('#np'));
}
