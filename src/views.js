// Toutes les pages de l'appli. Chaque vue reçoit un contexte :
//   ctx.root (conteneur), ctx.scroller, ctx.q (URLSearchParams), ctx.args, ctx.stale(), ctx.onLeave(fn), ctx.onClick(fn), ctx.title(t)
import { batteryUnrestricted, requestUnrestricted } from './keepalive.js';
import { gsap } from 'gsap';
import { api } from './api.js';
import { player } from './player.js';
import { downloads, DL_LOCATIONS, describeLocation } from './downloads.js';
import { settings, store } from './store.js';
import { $, $$, esc, fmtLong, fmtSize, fmtTime, greeting, plural, toast, debounce, isNative } from './ui.js';
import { icon } from './icons.js';
import { albumCard, artistCard, playlistCard, songRow, sectionHead, skeleton, emptyState, cover, coverBox } from './components.js';
import { reg, toggleStarKind, albumMenu, downloadSongs, playlistPicker, takeCard, go, songMenu, undownload, cancelDownloads, autoSync } from './actions.js';
import { openSheet, askText } from './sheets.js';
import { reveal, animateTitle, flyFrom, countUp, fxOn } from './fx.js';
import { PRESETS, DEFAULT_ACCENT, hslToRgb, hexToRgb, rgbToHsl, rgbToHex } from './theme.js';
import { playLog } from './history.js';
import { openEq, openCar } from './features.js';
import { NAV } from './nav.js';
import { deezer, dzPage, deezerSettingsHtml, deezerSettingsClick, deezerSettingsMount } from './views-deezer.js';
import { offlineView } from './views-offline.js';
import { discover, releasesView, historyView, featuresView, bannedView, deemixView, blindtest, flowBanner, fillMixes, discoverClick } from './views-extra.js';
import { feat, countOn, FEATURES } from './flags.js';
import { startArtistRadio } from './actions.js';
import { bans } from './bans.js';
import { folders, folderCard, folderMenu, moveToFolder, foldersOn } from './folders.js';
import { gesturesView, dupesView, importView, themePicker, themeClick } from './views-tools.js';

const PAGE = 48;
const hero = (html) => `<section class="hero-block">${html}</section>`;
const pageHead = (title, sub = '') => `<div class="page-head"><h1 class="title">${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>`;
const shuffled = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, '').trim();

async function artistSongs(artist) {
  const albums = await Promise.all(artist.album.map((x) => api.album(x.id)));
  return albums.flatMap((x) => x.song);
}

// =============================================================================================
// ACCUEIL
// =============================================================================================
async function home(ctx) {
  ctx.title('Accueil');
  ctx.root.innerHTML = `
    <section class="hero">
      <div class="hi">${greeting()}</div>
      <h1 class="mega">${esc(api.user || 'toi')}</h1>
      <div class="hero-actions">
        <button class="btn primary glow tap ripple" data-home="mix">${icon('dice')} Mix aléatoire</button>
        <button class="btn tap ripple" data-home="fav">${icon('heart')} Favoris</button>
        <button class="btn tap ripple" data-home="resume" ${player.current ? '' : 'hidden'}>${icon('play')} Reprendre</button>
      </div>
      <div class="stats" id="stats"></div>
    </section>
    ${flowBanner(true)}
    <section class="rowsec" id="hmix"></section>
    <div id="rows">${skeleton(6)}</div>`;
  animateTitle($('.mega', ctx.root), { delay: 0.1 });
  if (fxOn()) gsap.from($$('.hero .hi, .hero-actions .btn', ctx.root), { y: 24, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, delay: 0.15 });

  ctx.onClick(async (e) => {
    try { if (await discoverClick(e)) return; } catch (err) { toast('Erreur : ' + err.message); return; }
    const b = e.target.closest('[data-home]');
    if (!b) return;
    try {
      if (b.dataset.home === 'mix') { const s = await api.randomSongs(100); if (s.length) player.playQueue(s, 0); else toast('Aucun titre trouvé'); }
      else if (b.dataset.home === 'fav') { const st = await api.starred(); if (st.songs.length) player.playQueue(shuffled(st.songs), 0); else toast('Aucun titre en favori pour l\'instant'); }
      else if (b.dataset.home === 'resume') player.play();
    } catch (err) { toast('Erreur : ' + err.message); }
  });

  fillMixes($('#hmix', ctx.root), ctx.stale);
  if (feat('f_homeStats')) api.scanStatus().then((s) => {
    if (ctx.stale() || !s.count) return;
    $('#stats', ctx.root).innerHTML = `<span><b class="n"></b> titres dans ta bibliothèque</span>`;
    countUp($('#stats .n', ctx.root), s.count);
  });

  const defs = [
    ['Ajoutés récemment', 'newest', () => api.albumList('newest', { size: 20 }), 'f_homeNewest'],
    ['Écoutés récemment', 'recent', () => api.albumList('recent', { size: 20 }), 'f_homeRecent'],
    ['Les plus écoutés', 'frequent', () => api.albumList('frequent', { size: 20 }), 'f_homeFrequent'],
    ['Au hasard', 'random', () => api.albumList('random', { size: 20 }), 'f_homeRandom'],
    ['Tes favoris', 'starred', () => api.albumList('starred', { size: 20 }), 'f_homeStarred'],
  ].filter((d) => feat(d[3]));
  const res = await Promise.allSettled(defs.map((d) => d[2]()));
  if (ctx.stale()) return;
  if (res.length && res.every((r) => r.status === 'rejected')) throw res[0].reason;
  const rows = defs.map((d, i) => {
    const list = res[i].status === 'fulfilled' ? res[i].value : [];
    if (!list.length) return '';
    return `<section class="rowsec">${sectionHead(d[0], `#/albums?type=${d[1]}`)}<div class="hscroll">${list.map(albumCard).join('')}</div></section>`;
  }).join('');
  $('#rows', ctx.root).innerHTML = rows || (defs.length ? emptyState('disc', 'Bibliothèque vide', 'Ajoute de la musique à Navidrome, puis lance un scan dans les réglages.') : '');
  reveal(ctx.root, '.hscroll .card', { each: 0.05 });
  reveal(ctx.root, '.sec-head', { y: 14 });
}

// =============================================================================================
// ALBUMS (grille infinie)
// =============================================================================================
const ALBUM_TYPES = [
  ['newest', 'Récents'], ['random', 'Aléatoire'], ['starred', 'Favoris'], ['highest', 'Mieux notés'],
  ['frequent', 'Plus joués'], ['recent', 'Joués récemment'], ['alphabeticalByName', 'A → Z'], ['alphabeticalByArtist', 'Artistes A → Z'],
];

async function albums(ctx) {
  const genre = ctx.q.get('genre');
  const type = genre ? 'byGenre' : (ctx.q.get('type') || 'newest');
  const label = genre || (ALBUM_TYPES.find((t) => t[0] === type)?.[1] ?? 'Albums');
  ctx.title(genre ? genre : 'Albums');
  const view = settings.get('view');
  ctx.root.innerHTML = `
    ${pageHead(genre ? genre : 'Albums', genre ? 'Genre' : label)}
    <div class="toolbar">
      <div class="chips hscroll">${genre ? '' : ALBUM_TYPES.map(([k, l]) => `<a class="chip tap ${k === type ? 'on' : ''}" href="#/albums?type=${k}">${l}</a>`).join('')}</div>
      <button class="ic-btn tap" data-view aria-label="Changer l'affichage">${icon(view === 'grid' ? 'rows' : 'grid')}</button>
    </div>
    <div class="grid ${view}" id="grid"></div>
    <div id="sentinel" class="sentinel"></div>`;
  animateTitle($('.title', ctx.root));
  const grid = $('#grid', ctx.root);
  const seen = new Set();
  let offset = 0, done = false, loading = false, first = true;

  const load = async () => {
    if (loading || done) return;
    loading = true;
    if (first) grid.innerHTML = skeleton(12);
    try {
      const list = await api.albumList(type, { size: PAGE, offset, genre });
      if (ctx.stale()) return;
      if (first) { grid.innerHTML = ''; first = false; }
      const fresh = list.filter((a) => !seen.has(a.id));
      fresh.forEach((a) => seen.add(a.id));
      grid.insertAdjacentHTML('beforeend', fresh.map(albumCard).join(''));
      reveal(grid, '.card');
      offset += list.length;
      if (list.length < PAGE || type === 'random' && offset >= 300) done = true;
      if (!seen.size) grid.innerHTML = emptyState('disc', 'Rien ici pour l\'instant', type === 'starred' ? 'Ajoute des albums à tes favoris.' : '');
    } finally { loading = false; }
  };
  const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) load(); }, { root: null, rootMargin: '600px' });
  io.observe($('#sentinel', ctx.root));
  ctx.onLeave(() => io.disconnect());
  ctx.onClick((e) => {
    if (!e.target.closest('[data-view]')) return;
    const v = settings.get('view') === 'grid' ? 'list' : 'grid';
    settings.set('view', v);
    grid.className = `grid ${v}`;
    $('[data-view]', ctx.root).innerHTML = icon(v === 'grid' ? 'rows' : 'grid');
  });
  await load();
}

// =============================================================================================
// ARTISTES
// =============================================================================================
async function artists(ctx) {
  ctx.title('Artistes');
  ctx.root.innerHTML = `${pageHead('Artistes')}<input class="filter" type="search" placeholder="Filtrer les artistes…" aria-label="Filtrer">${skeleton(10, 'line')}`;
  animateTitle($('.title', ctx.root));
  const groups = await api.artists();
  if (ctx.stale()) return;
  const total = groups.reduce((n, g) => n + g.artists.length, 0);
  $('.page-head', ctx.root).insertAdjacentHTML('beforeend', `<p class="sub">${plural(total, 'artiste', 'artistes')}</p>`);
  const letters = groups.map((g) => g.name);
  $('.skel-wrap', ctx.root).outerHTML = `
    <div id="alist">${groups.map((g) => `
      <section class="agroup" data-l="${esc(g.name)}">
        <h4 class="letter">${esc(g.name)}</h4>
        <div class="alist">${g.artists.map((a) => `
          <a class="arow tap ripple" href="#/artist/${esc(a.id)}" data-n="${esc(a.name.toLowerCase())}">
            <div class="cov round sm" data-ini="${esc(a.name.trim().slice(0, 2).toUpperCase())}">${a.coverArt ? `<img class="cv" loading="lazy" decoding="async" alt="" src="${esc(api.coverUrl(a.coverArt, 120))}">` : ''}</div>
            <div class="meta"><div class="t">${esc(a.name)}</div><div class="s">${plural(a.albumCount || 0, 'album', 'albums')}</div></div>
            ${icon('right', 'chev')}
          </a>`).join('')}</div>
      </section>`).join('')}</div>
    <div class="scrub" aria-hidden="true">${letters.map((l) => `<span data-l="${esc(l)}">${esc(l)}</span>`).join('')}</div>
    <div class="scrub-bubble"></div>`;
  reveal(ctx.root, '.agroup', { y: 18, each: 0.03 });

  // filtre
  $('.filter', ctx.root).addEventListener('input', debounce((e) => {
    const v = e.target.value.trim().toLowerCase();
    $$('.arow', ctx.root).forEach((r) => { r.style.display = !v || r.dataset.n.includes(v) ? '' : 'none'; });
    $$('.agroup', ctx.root).forEach((g) => { g.style.display = $$('.arow', g).some((r) => r.style.display !== 'none') ? '' : 'none'; });
  }, 150));

  // réglette alphabétique (glisser le doigt)
  const scrub = $('.scrub', ctx.root), bubble = $('.scrub-bubble', ctx.root);
  const jump = (e) => {
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.scrub span');
    if (!t) return;
    const g = $(`.agroup[data-l="${CSS.escape(t.dataset.l)}"]`, ctx.root);
    if (!g) return;
    bubble.textContent = t.dataset.l;
    gsap.to(bubble, { autoAlpha: 1, scale: 1, duration: 0.15, overwrite: 'auto' });
    gsap.to(ctx.scroller, { scrollTo: { y: g, offsetY: 64 }, duration: 0.25, overwrite: 'auto' });
  };
  let down = false;
  scrub.addEventListener('pointerdown', (e) => { down = true; scrub.setPointerCapture(e.pointerId); jump(e); });
  scrub.addEventListener('pointermove', (e) => { if (down) jump(e); });
  const up = () => { down = false; gsap.to(bubble, { autoAlpha: 0, scale: 0.8, duration: 0.3, delay: 0.3, overwrite: 'auto' }); };
  scrub.addEventListener('pointerup', up);
  scrub.addEventListener('pointercancel', up);
}

// =============================================================================================
// ARTISTE
// =============================================================================================
async function artist(ctx) {
  const id = ctx.args[0];
  ctx.root.innerHTML = skeleton(1, 'hero') + skeleton(6);
  const [a, info] = await Promise.all([api.artist(id), api.artistInfo(id)]);
  if (ctx.stale()) return;
  ctx.title(a.name);
  const bio = stripTags(info.biography);
  const sim = (Array.isArray(info.similarArtist) ? info.similarArtist : info.similarArtist ? [info.similarArtist] : []).filter((s) => s.id);
  ctx.root.innerHTML = `
    <section class="hero-block artist-hero">
      <div class="cov round xl" data-ini="${esc(a.name.trim().slice(0, 2).toUpperCase())}">${a.coverArt ? `<img class="cv" alt="" src="${esc(api.coverUrl(a.coverArt, 500))}">` : ''}</div>
      <div class="hb-meta">
        <h1 class="title">${esc(a.name)}</h1>
        <p class="sub">${plural(a.album.length, 'album', 'albums')}</p>
        <div class="hb-actions">
          <button class="btn primary glow tap ripple" data-ar="play">${icon('play')} Lire</button>
          <button class="btn tap ripple" data-ar="shuffle">${icon('shuffle')} Aléatoire</button>
          ${feat('f_radio') ? `<button class="ic-btn round tap" data-ar="radio" aria-label="Radio de l'artiste">${icon('radio')}</button>` : ''}
          ${feat('f_ban') ? `<button class="ic-btn round tap" data-ar="ban" aria-label="Ne plus proposer">${icon('ban')}</button>` : ''}
          <button class="ic-btn round tap" data-ar="star" aria-label="Favori">${icon(a.starred ? 'heartFill' : 'heart')}</button>
        </div>
      </div>
    </section>
    ${bio ? `<div class="bio"><p class="clamp">${esc(bio)}</p><button class="link tap" data-ar="bio">Lire la suite</button></div>` : ''}
    <section class="rowsec">${sectionHead('Albums')}<div class="grid">${a.album.map(albumCard).join('')}</div></section>
    ${sim.length ? `<section class="rowsec">${sectionHead('Artistes similaires')}<div class="hscroll">${sim.map((s) => artistCard({ id: s.id, name: s.name, albumCount: s.albumCount, coverArt: s.coverArt })).join('')}</div></section>` : ''}`;
  animateTitle($('.title', ctx.root));
  reveal(ctx.root, '.grid .card, .hscroll .card');
  if (fxOn()) gsap.from($('.artist-hero .cov', ctx.root), { scale: 0.6, rotation: -20, autoAlpha: 0, duration: 1, ease: 'elastic.out(1, 0.6)' });

  let songs = null;
  const all = async () => (songs ||= await artistSongs(a));
  ctx.onClick(async (e) => {
    const b = e.target.closest('[data-ar]');
    if (!b) return;
    try {
      switch (b.dataset.ar) {
        case 'play': { const s = await all(); if (s.length) player.playQueue(s, 0); break; }
        case 'shuffle': { const s = await all(); if (s.length) player.playQueue(s, 0, { shuffle: true }); break; }
        case 'star': { const on = await toggleStarKind('artistId', a, b); b.innerHTML = icon(on ? 'heartFill' : 'heart'); break; }
        case 'radio': await startArtistRadio(a.id, a.name); break;
        case 'ban': {
          if (bans.hasArtist(a.id)) { bans.removeArtist(a.id); toast(`${a.name} peut de nouveau être proposé`); }
          else { bans.addArtist(a.id, a.name); toast(`${a.name} ne sera plus proposé dans le Flow et les mix`); }
          break;
        }
        case 'bio': { const p = $('.bio p', ctx.root); p.classList.toggle('clamp'); b.textContent = p.classList.contains('clamp') ? 'Lire la suite' : 'Réduire'; break; }
        default: break;
      }
    } catch (err) { toast('Erreur : ' + err.message); }
  });
}

// =============================================================================================
// ALBUM
// =============================================================================================
async function album(ctx) {
  const id = ctx.args[0];
  const from = takeCard();
  ctx.root.innerHTML = skeleton(1, 'hero') + skeleton(8, 'line');
  const a = await api.album(id);
  if (ctx.stale()) return;
  ctx.title(a.name);
  const songs = a.song;
  const key = reg(songs);
  const dur = songs.reduce((n, s) => n + (s.duration || 0), 0);
  const discs = [...new Set(songs.map((s) => s.discNumber || 1))];
  const multi = discs.length > 1;
  const tracks = multi
    ? discs.map((d) => `<h4 class="disc-h">${icon('disc')} Disque ${d}</h4>` + songs.map((s, i) => ((s.discNumber || 1) === d ? songRow(s, { list: key, i, num: s.track || i + 1, showArtist: s.artist !== a.artist }) : '')).join('')).join('')
    : songs.map((s, i) => songRow(s, { list: key, i, num: s.track || i + 1, showArtist: s.artist !== a.artist })).join('');

  ctx.root.innerHTML = `
    <section class="hero-block album-hero">
      <div class="cov sq xl" id="acover">${cover(a, 600) ? `<img class="cv" alt="" src="${esc(cover(a, 600))}">` : ''}</div>
      <div class="hb-meta">
        <h1 class="title">${esc(a.name)}</h1>
        <p class="sub">${a.artistId ? `<a class="tap" href="#/artist/${esc(a.artistId)}">${esc(a.artist)}</a>` : esc(a.artist || '')}</p>
        <p class="meta-line">${[a.year, plural(songs.length, 'titre', 'titres'), fmtLong(dur), a.genre].filter(Boolean).map(esc).join(' · ')}</p>
        <div class="hb-actions">
          <button class="btn primary glow tap ripple" data-act="play-all" data-list="${key}">${icon('play')} Lire</button>
          <button class="btn tap ripple" data-act="shuffle-all" data-list="${key}">${icon('shuffle')} Aléatoire</button>
          <button class="ic-btn round tap" data-al="star" aria-label="Favori">${icon(a.starred ? 'heartFill' : 'heart')}</button>
          <button class="ic-btn round tap" data-al="menu" aria-label="Plus">${icon('dots')}</button>
        </div>
      </div>
    </section>
    <div class="tracks">${tracks}</div>`;
  animateTitle($('.title', ctx.root));
  flyFrom($('#acover', ctx.root), from);
  reveal(ctx.root, '.tracks .row', { y: 16, each: 0.03 });
  window.dispatchEvent(new Event('nv:rows'));

  ctx.onClick(async (e) => {
    const b = e.target.closest('[data-al]');
    if (!b) return;
    if (b.dataset.al === 'star') { const on = await toggleStarKind('albumId', a, b); b.innerHTML = icon(on ? 'heartFill' : 'heart'); }
    else if (b.dataset.al === 'dl') downloadSongs(songs);
    else if (b.dataset.al === 'menu') albumMenu(a, songs);
  });
}

// =============================================================================================
// PLAYLISTS
// =============================================================================================
async function playlists(ctx) {
  const fid = ctx.q.get('f');
  const useFolders = foldersOn();
  const folder = fid && useFolders ? folders.get(fid) : null;
  if (fid && !folder) { go('#/playlists'); return; }
  ctx.title(folder ? folder.name : 'Playlists');
  ctx.root.innerHTML = `${folder ? `<div class="page-head row-head"><div><h1 class="title">${esc(folder.name)}</h1><p class="sub">Dossier</p></div><button class="ic-btn round tap" data-fold="menu" aria-label="Plus">${icon('dots')}</button></div>` : pageHead('Playlists')}<div class="grid" id="pl">${skeleton(6)}</div>`;
  animateTitle($('.title', ctx.root));
  const list = await api.playlists();
  if (ctx.stale()) return;
  if (useFolders) folders.prune(list.map((p) => p.id));
  const byId = new Map(list.map((p) => [p.id, p]));
  if (folder) {
    const inside = (folders.get(fid)?.ids || []).map((id) => byId.get(id)).filter(Boolean);
    $('#pl', ctx.root).innerHTML = `
      <button class="card new tap ripple" data-pl="add"><div class="cov sq plus">${icon('plus')}</div><div class="c-t">Ajouter une playlist</div><div class="c-s">&nbsp;</div></button>
      ${inside.map(playlistCard).join('')}`;
  } else {
    const fl = useFolders ? folders.list() : [];
    const filed = new Set(fl.flatMap((f) => f.ids));
    $('#pl', ctx.root).innerHTML = `
      <button class="card new tap ripple" data-pl="new"><div class="cov sq plus">${icon('plus')}</div><div class="c-t">Nouvelle playlist</div><div class="c-s">&nbsp;</div></button>
      ${useFolders ? `<button class="card new tap ripple" data-pl="folder"><div class="cov sq plus">${icon('folder')}</div><div class="c-t">Nouveau dossier</div><div class="c-s">Range tes playlists</div></button>` : ''}
      ${fl.map((f) => folderCard(f, byId)).join('')}
      ${list.filter((p) => !filed.has(p.id)).map(playlistCard).join('')}`;
  }
  reveal($('#pl', ctx.root), '.card');
  ctx.onClick(async (e) => {
    if (e.target.closest('[data-fold="menu"]') || e.target.closest('[data-pl="add"]')) {
      if (e.target.closest('[data-pl="add"]')) {
        const others = list.filter((p) => !folder.ids.includes(p.id));
        if (!others.length) { toast('Toutes tes playlists sont déjà dans ce dossier'); return; }
        const pick = await openSheet({ title: `Ajouter à « ${folder.name} »`, items: others.map((p) => ({ id: p.id, icon: 'list', label: p.name, sub: folders.folderOf(p.id) ? `dans « ${folders.folderOf(p.id).name} »` : plural(p.songCount || 0, 'titre', 'titres') })) });
        if (pick) { folders.move(pick, folder.id); window.dispatchEvent(new Event('nv:refresh')); }
      } else await folderMenu(folders.get(fid), list);
      return;
    }
    if (e.target.closest('[data-pl="folder"]')) {
      const name = await askText('Nouveau dossier', { placeholder: 'Nom du dossier', ok: 'Créer' });
      if (!name) return;
      const f = folders.create(name);
      toast(`Dossier « ${name} » créé · appui long sur une playlist pour l'y ranger`, 3600);
      go('#/playlists?f=' + f.id);
      return;
    }
    if (!e.target.closest('[data-pl="new"]')) return;
    const name = await askText('Nouvelle playlist', { placeholder: 'Nom de la playlist', ok: 'Créer' });
    if (!name) return;
    try {
      const p = await api.createPlaylist(name);
      if (folder && p?.id) folders.move(p.id, folder.id);
      toast(`Playlist « ${name} » créée`); go('#/playlist/' + p.id);
    } catch (err) { toast('Erreur : ' + err.message); }
  });
}

async function playlist(ctx) {
  const id = ctx.args[0];
  ctx.root.innerHTML = skeleton(1, 'hero') + skeleton(8, 'line');
  const render = async () => {
    const p = await api.playlist(id);
    if (ctx.stale()) return;
    ctx.title(p.name);
    const key = reg(p.entry, {
      playlist: id,
      onRemove: async (song) => {
        const idx = p.entry.indexOf(song);
        if (idx < 0) return;
        try { await api.removeFromPlaylist(id, [idx]); toast('Titre retiré'); render(); } catch (err) { toast('Erreur : ' + err.message); }
      },
    });
    const dur = p.entry.reduce((n, s) => n + (s.duration || 0), 0);
    ctx.root.innerHTML = `
      <section class="hero-block album-hero">
        <div class="cov sq xl">${p.coverArt ? `<img class="cv" alt="" src="${esc(api.coverUrl(p.coverArt, 600))}">` : ''}</div>
        <div class="hb-meta">
          <h1 class="title">${esc(p.name)}</h1>
          <p class="meta-line">${[plural(p.entry.length, 'titre', 'titres'), fmtLong(dur), p.owner ? 'par ' + p.owner : ''].filter(Boolean).map(esc).join(' · ')}</p>
          <div class="hb-actions">
            <button class="btn primary glow tap ripple" data-act="play-all" data-list="${key}">${icon('play')} Lire</button>
            <button class="btn tap ripple" data-act="shuffle-all" data-list="${key}">${icon('shuffle')} Aléatoire</button>
            <button class="ic-btn round tap" data-p="dl" aria-label="Télécharger">${icon('download')}</button>
            <button class="ic-btn round tap" data-p="menu" aria-label="Plus">${icon('dots')}</button>
          </div>
        </div>
      </section>
      <div class="tracks">${p.entry.length ? p.entry.map((s, i) => songRow(s, { list: key, i, showCover: true, showAlbum: true })).join('') : emptyState('list', 'Playlist vide', 'Ajoute des titres depuis le menu ⋯ de n\'importe quel morceau.')}</div>`;
    animateTitle($('.title', ctx.root));
    reveal(ctx.root, '.tracks .row', { y: 16, each: 0.03 });
    window.dispatchEvent(new Event('nv:rows'));
    ctx.onClick(async (e) => {
      const b = e.target.closest('[data-p]');
      if (!b) return;
      if (b.dataset.p === 'dl') downloadSongs(p.entry, { playlist: { id, name: p.name } });
      else {
        const c = await openSheet({
          title: p.name, subtitle: 'Playlist',
          items: [
            { id: 'next', icon: 'play', label: 'Lire ensuite' }, { id: 'queue', icon: 'queue', label: 'Ajouter à la file d\'attente' },
            (settings.get('dlSyncPlaylists') || []).includes(id)
              ? { id: 'unsync', icon: 'sync', label: 'Ne plus synchroniser hors-ligne' }
              : { id: 'sync', icon: 'sync', label: 'Synchroniser hors-ligne', sub: 'Les nouveaux titres sont téléchargés automatiquement' },
            ...(foldersOn() ? [{ id: 'folder', icon: 'folder', label: 'Ranger dans un dossier…', sub: folders.folderOf(id)?.name || '' }] : []),
            { id: 'rename', icon: 'sliders', label: 'Renommer' }, { id: 'delete', icon: 'trash', label: 'Supprimer la playlist', danger: true },
          ],
        });
        try {
          if (c === 'next') { [...p.entry].reverse().forEach((s) => player.addNext(s)); toast('Playlist lue ensuite'); }
          else if (c === 'queue') { player.addEnd(p.entry); toast('Playlist ajoutée à la file'); }
          else if (c === 'sync') { settings.set('dlSyncPlaylists', [...new Set([...(settings.get('dlSyncPlaylists') || []), id])]); downloadSongs(p.entry, { playlist: { id, name: p.name } }); }
          else if (c === 'unsync') { settings.set('dlSyncPlaylists', (settings.get('dlSyncPlaylists') || []).filter((x) => x !== id)); toast('Synchro désactivée (les fichiers restent)'); }
          else if (c === 'folder') await moveToFolder(id, p.name);
          else if (c === 'rename') { const n = await askText('Renommer la playlist', { value: p.name, ok: 'Renommer' }); if (n) { await api.renamePlaylist(id, n); render(); } }
          else if (c === 'delete') {
            const ok = await openSheet({ title: `Supprimer « ${p.name} » ?`, subtitle: 'Cette action est définitive.', items: [{ id: 'yes', icon: 'trash', label: 'Supprimer', danger: true }, { id: 'no', icon: 'close', label: 'Annuler' }] });
            if (ok === 'yes') { await api.deletePlaylist(id); toast('Playlist supprimée'); go('#/playlists'); }
          }
        } catch (err) { toast('Erreur : ' + err.message); }
      }
    });
  };
  await render();
}

// =============================================================================================
// RECHERCHE
// =============================================================================================
async function search(ctx) {
  ctx.title('Recherche');
  const initial = ctx.q.get('q') || '';
  ctx.root.innerHTML = `
    ${pageHead('Recherche')}
    <div class="searchbar">${icon('search')}<input id="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Titres, albums, artistes…" value="${esc(initial)}" aria-label="Rechercher"></div>
    <div id="res"></div>`;
  animateTitle($('.title', ctx.root));
  const res = $('#res', ctx.root);
  const input = $('#q', ctx.root);
  let token = 0;

  const suggestions = async () => {
    const recent = feat('f_recentSearch') ? store.get('recent', []) : [];
    res.innerHTML = `
      ${recent.length ? `<section class="rowsec">${sectionHead('Recherches récentes')}<div class="chips wrap">${recent.map((r) => `<button class="chip tap" data-recent="${esc(r)}">${icon('clock')} ${esc(r)}</button>`).join('')}<button class="chip tap dim" data-clear>Effacer</button></div></section>` : ''}
      <section class="rowsec"><div class="sec-head"><h3>Suggestions au hasard</h3><button class="link tap" data-again>${icon('refresh')} Autres</button></div><div id="sug">${skeleton(6, 'line')}</div></section>`;
    const songs = await api.randomSongs(20);
    if (ctx.stale() || input.value.trim()) return;
    const key = reg(songs);
    $('#sug', res).innerHTML = songs.map((s, i) => songRow(s, { list: key, i, showCover: true, showAlbum: true })).join('');
    reveal($('#sug', res), '.row', { y: 14, each: 0.03 });
    window.dispatchEvent(new Event('nv:rows'));
  };

  const run = async (query) => {
    const my = ++token;
    query = query.trim();
    if (!query) { suggestions(); return; }
    res.innerHTML = skeleton(6, 'line');
    let r;
    try { r = await api.search(query); } catch (err) { res.innerHTML = emptyState('search', 'Recherche impossible', err.message); return; }
    if (my !== token || ctx.stale()) return;
    if (feat('f_recentSearch')) store.set('recent', [query, ...store.get('recent', []).filter((x) => x.toLowerCase() !== query.toLowerCase())].slice(0, 8));
    if (!r.artists.length && !r.albums.length && !r.songs.length) { res.innerHTML = emptyState('search', 'Aucun résultat', `Rien pour « ${query} »`); return; }
    const key = reg(r.songs);
    res.innerHTML = `
      ${r.artists.length ? `<section class="rowsec">${sectionHead('Artistes')}<div class="hscroll">${r.artists.map(artistCard).join('')}</div></section>` : ''}
      ${r.albums.length ? `<section class="rowsec">${sectionHead('Albums')}<div class="hscroll">${r.albums.map(albumCard).join('')}</div></section>` : ''}
      ${r.songs.length ? `<section class="rowsec">${sectionHead('Titres')}<div class="tracks">${r.songs.map((s, i) => songRow(s, { list: key, i, showCover: true, showAlbum: true })).join('')}</div></section>` : ''}`;
    reveal(res, '.hscroll .card, .tracks .row', { y: 18, each: 0.035 });
    window.dispatchEvent(new Event('nv:rows'));
  };

  input.addEventListener('input', debounce(() => run(input.value), 350));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  ctx.onClick((e) => {
    const r = e.target.closest('[data-recent]');
    if (r) { input.value = r.dataset.recent; run(input.value); return; }
    if (e.target.closest('[data-clear]')) { store.del('recent'); suggestions(); return; }
    if (e.target.closest('[data-again]')) suggestions();
  });
  await run(initial);
  if (!initial && !matchMedia('(pointer: coarse)').matches) input.focus();
}

// =============================================================================================
// FAVORIS
// =============================================================================================
async function starred(ctx) {
  ctx.title('Favoris');
  ctx.root.innerHTML = `${pageHead('Favoris')}${skeleton(6, 'line')}`;
  animateTitle($('.title', ctx.root));
  const s = await api.starred();
  if (ctx.stale()) return;
  const key = reg(s.songs);
  const none = !s.songs.length && !s.albums.length && !s.artists.length;
  ctx.root.innerHTML = `
    ${pageHead('Favoris', `${plural(s.songs.length, 'titre', 'titres')} · ${plural(s.albums.length, 'album', 'albums')} · ${plural(s.artists.length, 'artiste', 'artistes')}`)}
    ${none ? emptyState('heart', 'Pas encore de favori', 'Touche le cœur d\'un titre, d\'un album ou d\'un artiste.') : ''}
    ${s.songs.length ? `<div class="hb-actions pad"><button class="btn primary glow tap ripple" data-act="play-all" data-list="${key}">${icon('play')} Lire</button><button class="btn tap ripple" data-act="shuffle-all" data-list="${key}">${icon('shuffle')} Aléatoire</button></div>` : ''}
    ${s.artists.length ? `<section class="rowsec">${sectionHead('Artistes')}<div class="hscroll">${s.artists.map(artistCard).join('')}</div></section>` : ''}
    ${s.albums.length ? `<section class="rowsec">${sectionHead('Albums')}<div class="hscroll">${s.albums.map(albumCard).join('')}</div></section>` : ''}
    ${s.songs.length ? `<section class="rowsec">${sectionHead('Titres')}<div class="tracks">${s.songs.map((t, i) => songRow(t, { list: key, i, showCover: true, showAlbum: true })).join('')}</div></section>` : ''}`;
  animateTitle($('.title', ctx.root));
  reveal(ctx.root, '.hscroll .card, .tracks .row', { y: 18, each: 0.03 });
  window.dispatchEvent(new Event('nv:rows'));
}

// =============================================================================================
// GENRES
// =============================================================================================
async function genres(ctx) {
  ctx.title('Genres');
  ctx.root.innerHTML = `${pageHead('Genres')}${skeleton(8)}`;
  animateTitle($('.title', ctx.root));
  const g = (await api.genres()).filter((x) => x.value).sort((a, b) => (b.songCount || 0) - (a.songCount || 0));
  if (ctx.stale()) return;
  const max = Math.max(1, ...g.map((x) => x.songCount || 0));
  $('.skel-wrap', ctx.root).outerHTML = g.length ? `<div class="genres">${g.map((x, i) => `
    <a class="genre tap ripple" href="#/albums?genre=${encodeURIComponent(x.value)}" style="--h:${(i * 37) % 60}; --s:${0.85 + 0.5 * ((x.songCount || 0) / max)}">
      <b>${esc(x.value)}</b><span>${plural(x.albumCount || 0, 'album', 'albums')} · ${plural(x.songCount || 0, 'titre', 'titres')}</span>
      <button class="fab tap" data-gmix="${esc(x.value)}" aria-label="Mix ${esc(x.value)}">${icon('dice')}</button>
    </a>`).join('')}</div>` : emptyState('tag', 'Aucun genre', 'Tes fichiers n\'ont pas de tag de genre.');
  reveal(ctx.root, '.genre', { each: 0.03 });
  ctx.onClick(async (e) => {
    const b = e.target.closest('[data-gmix]');
    if (!b) return;
    e.preventDefault();
    const s = await api.randomSongs(80, b.dataset.gmix);
    if (s.length) player.playQueue(s, 0); else toast('Aucun titre pour ce genre');
  });
}

// =============================================================================================
// RADIOS
// =============================================================================================
async function radios(ctx) {
  ctx.title('Radios');
  ctx.root.innerHTML = `${pageHead('Radios', 'Webradios de ton serveur')}${skeleton(4, 'line')}`;
  animateTitle($('.title', ctx.root));
  const list = await api.radios();
  if (ctx.stale()) return;
  const html = list.length ? `<div class="tracks">${list.map((r, i) => `
      <div class="row tap ripple" data-radio="${i}">
        <div class="cov xs radio-ic">${icon('radio')}</div>
        <div class="meta"><div class="t">${esc(r.name)}</div><div class="s">${esc(r.homePageUrl || r.streamUrl)}</div></div>
        <span class="live-tag">EN DIRECT</span>
      </div>`).join('')}</div>` : emptyState('radio', 'Aucune radio', 'Ajoute des webradios dans Navidrome (menu Radios) et elles apparaîtront ici.');
  $('.skel-wrap', ctx.root).outerHTML = html;
  reveal(ctx.root, '.row', { y: 14, each: 0.04 });
  ctx.onClick((e) => {
    const r = e.target.closest('[data-radio]');
    if (r) player.playRadio(list[Number(r.dataset.radio)]);
  });
}

// =============================================================================================
// PLUS
// =============================================================================================
async function more(ctx) {
  ctx.title('Plus');
  const tiles = [
    ['#/discover', 'flow', 'Découvrir', 'f_discover'], ['#/starred', 'heart', 'Favoris'], ['#/genres', 'tag', 'Genres', 'f_genres'],
    ['#/radios', 'radio', 'Radios', 'f_radios'], ['#/offline', 'phone', 'Hors-ligne', 'f_offline'], ['#/search', 'search', 'Recherche'],
    ['#/history', 'clock', 'Historique', 'f_history'], ['#/replay', 'chart', 'Replay', 'f_replay'], ['#/blindtest', 'game', 'Blind test', 'f_blindtest'],
    ['#/deezer', 'deezer', 'Deezer', 'deezer'], ['#/deemix', 'cloud', 'Téléchargements serveur', 'f_deemix'],
    ['#/import', 'link', 'Importer une playlist', 'f_import'], ['#/dupes', 'copies', 'Doublons', 'f_dupes'], ['#/gestures', 'hand', 'Gestes'],
    ['car', 'car', 'Mode voiture', 'f_car'], ['#/features', 'toggles', 'Fonctionnalités'], ['#/settings', 'sliders', 'Réglages'],
  ].filter((t) => !t[3] || feat(t[3]));
  ctx.root.innerHTML = `${pageHead('Plus')}<div class="tiles">${tiles.map(([h, ic, l]) => (h.startsWith('#') ? `<a class="tile tap ripple" href="${h}">${icon(ic)}<span>${l}</span></a>` : `<button class="tile tap ripple" data-more="${h}">${icon(ic)}<span>${l}</span></button>`)).join('')}</div>`;
  ctx.onClick((e) => { if (e.target.closest('[data-more="car"]')) openCar(); });
  animateTitle($('.title', ctx.root));
  reveal(ctx.root, '.tile', { each: 0.05 });
}

// =============================================================================================
// RÉGLAGES
// =============================================================================================
async function settingsView(ctx) {
  ctx.title('Réglages');
  const seg = (key, opts) => `<div class="segm" data-seg="${key}">${opts.map(([v, l]) => `<button class="tap ${String(settings.get(key)) === String(v) ? 'on' : ''}" data-val="${v}">${l}</button>`).join('')}</div>`;
  const tog = (key, label, sub = '') => `<div class="set-row"><div class="lbl"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div><button class="switch tap ${settings.get(key) ? 'on' : ''}" data-tog="${key}" role="switch" aria-checked="${!!settings.get(key)}"><i></i></button></div>`;
  // choix dans une liste (feuille modale) : PICKS[clé] = { titre, options: [[valeur, libellé, aide]] }
  const PICKS = {
    dlLocation: { title: 'Emplacement des téléchargements', options: Object.entries(DL_LOCATIONS).map(([k, v]) => [k, v[0], v[3]]) },
    dlNaming: { title: 'Nom des fichiers', options: [['flat', 'Artiste - Titre', 'Tous les fichiers dans le même dossier'], ['tree', 'Artiste / Album / NN - Titre', 'Un dossier par artiste et par album'], ['id', 'Identifiant Navidrome', 'Noms techniques']] },
    dlQuality: { title: 'Qualité des téléchargements', options: [[0, 'Fichier original', 'FLAC, MP3… tel que sur le serveur'], [320, 'MP3 320 kbps', 'Transcodé par le serveur'], [192, 'MP3 192 kbps', ''], [128, 'MP3 128 kbps', 'Le plus léger']] },
    startPage: { title: 'Page de démarrage', options: NAV.filter((n) => !['more', 'settings'].includes(n[0])).map((n) => [n[0], n[3], '']) },
  };
  const pickLabel = (key) => (PICKS[key].options.find(([v]) => String(v) === String(settings.get(key))) || PICKS[key].options[0])[1];
  const pick = (key, label, sub = '') => `<div class="set-row"><div class="lbl"><b>${label}</b><small>${sub || esc(pickLabel(key))}</small></div><button class="btn tap" data-pick="${key}">${esc(pickLabel(key))} ${icon('down')}</button></div>`;
  const tabsEditor = () => {
    const on = settings.get('tabs') || [];
    const items = [...on.map((id) => NAV.find((n) => n[0] === id)).filter(Boolean), ...NAV.filter((n) => !on.includes(n[0]))];
    return items.map((n) => {
      const act = on.includes(n[0]);
      return `<div class="tp ${act ? '' : 'off'}">${icon(n[2])}<span>${n[3]}</span>
        ${act ? `<button class="ic-btn tap" data-tab-up="${n[0]}" aria-label="Monter">${icon('up')}</button><button class="ic-btn tap" data-tab-down="${n[0]}" aria-label="Descendre">${icon('down')}</button>` : ''}
        <button class="switch tap ${act ? 'on' : ''}" data-tab="${n[0]}" role="switch" aria-checked="${act}"><i></i></button></div>`;
    }).join('');
  };
  ctx.root.innerHTML = `
    ${pageHead('Réglages')}
    <section class="card-box"><h4>Fonctionnalités</h4>
      <div class="set-row"><div class="lbl"><b>${countOn()} actives sur ${FEATURES.length}</b><small>Active ou coupe chaque fonction de l'appli (Flow, paroles, Deezer, deemix…)</small></div><a class="btn tap" href="#/features">${icon('toggles')} Gérer</a></div>
      <div class="set-row"><div class="lbl"><b>Ne plus proposer</b><small>${plural(bans.count(), 'élément masqué', 'éléments masqués')}</small></div><a class="btn tap" href="#/banned">${icon('ban')} Voir</a></div>
      <div class="set-row"><div class="lbl"><b>Gestes et raccourcis</b><small>Tirer vers le bas = menu, appui long, glisser un titre, double tap…</small></div><a class="btn tap" href="#/gestures">${icon('hand')} Régler</a></div>
    </section>
    <section class="card-box"><h4>Compte</h4>
      <div class="set-row"><div class="lbl"><b>${esc(api.user)}</b><small>${esc(api.server)}</small></div><button class="btn tap" data-s="logout">${icon('logout')} Déconnexion</button></div>
    </section>
    <section class="card-box"><h4>Lecture</h4>
      <div class="set-block"><div class="lbl"><b>Qualité du streaming</b><small>Réduit la consommation de données (transcodage par le serveur)</small></div>${seg('quality', [[0, 'Original'], [320, '320'], [192, '192'], [128, '128']])}</div>
      <div class="set-block"><div class="lbl"><b>Normalisation du volume</b><small>ReplayGain : tous les titres au même niveau (baisse un peu le volume global)</small></div>${seg('replayGain', [['off', 'Off'], ['track', 'Titre'], ['album', 'Album']])}</div>
      <div class="set-block"><div class="lbl"><b>Fondu enchaîné</b><small>Les titres se chevauchent à la fin</small></div>${seg('crossfade', [[0, 'Off'], [3, '3 s'], [6, '6 s'], [9, '9 s'], [12, '12 s']])}</div>
      ${tog('autoplay', 'Lecture automatique', 'Quand la file se termine, continue avec des titres similaires')}
      ${tog('privateSession', 'Session privée', 'N\'enregistre pas tes écoutes (historique, Replay, serveur)')}
      <div class="set-row"><div class="lbl"><b>Égaliseur</b><small>${settings.get('eq') ? 'Actif' : 'Désactivé'} · 10 bandes, préréglages</small></div><button class="btn tap" data-s="eq">${icon('eq')} Régler</button></div>
      ${tog('musicHaptics', 'Vibrations avec la musique', 'Approximation : le téléphone vibre sur les basses ou au tempo')}
      ${feat('f_car') ? `<div class="set-row"><div class="lbl"><b>Mode voiture</b><small>Gros boutons, écran allumé</small></div><button class="btn tap" data-s="car">${icon('car')} Ouvrir</button></div>` : ''}
    </section>
    <section class="card-box"><h4>Apparence</h4>
      ${themePicker()}
      <div class="set-block"><div class="lbl"><b>Couleur du thème</b><small>Toute l'interface s'adapte, en douceur</small></div>
        <div class="swatches">${PRESETS.map(([id, n, c]) => `<button class="sw tap ${String(settings.get('accent')).toLowerCase() === c ? 'on' : ''}" data-accent="${c}" style="--c:${c}" aria-label="${n}"></button>`).join('')}</div>
        <input class="hue-range" type="range" min="0" max="360" value="${Math.round(rgbToHsl(...hexToRgb(settings.get('accent')))[0])}" aria-label="Teinte personnalisée">
      </div>
      ${tog('coverColors', 'Couleurs de la pochette', 'Le lecteur prend les teintes de l\'album en cours')}
      <div class="set-block"><div class="lbl"><b>Effets GSAP</b><small>« Éco » économise la batterie, « Off » coupe les animations</small></div>${seg('fx', [['max', 'Max'], ['eco', 'Éco'], ['off', 'Off']])}</div>
      ${tog('vinyl', 'Pochette vinyle', 'Le disque tourne pendant la lecture')}
      ${tog('viz', 'Visualiseur animé', 'Barres décoratives dans le lecteur')}
      ${tog('haptics', 'Retour haptique', 'Petites vibrations au toucher')}
      <div class="set-block"><div class="lbl"><b>Affichage des albums</b></div>${seg('view', [['grid', 'Grille'], ['list', 'Liste']])}</div>
    </section>
    <section class="card-box" id="set-layout"><h4>Disposition</h4>
      <div class="set-block"><div class="lbl"><b>Navigation — écran déplié</b><small>Fold ouvert, tablette : là où tes pouces tombent</small></div>${seg('navWide', [['left', 'Gauche'], ['right', 'Droite'], ['bottom', 'Bas'], ['fab', 'Bouton']])}</div>
      <div class="set-block"><div class="lbl"><b>Navigation — écran plié</b><small>Barre d'onglets ou bouton flottant</small></div>${seg('navNarrow', [['bottom', 'Barre en bas'], ['fab', 'Bouton flottant']])}</div>
      <div class="set-block"><div class="lbl"><b>Côté du bouton flottant</b><small>Le bouton ouvre toutes les sections (mode « Bouton »)</small></div>${seg('fabSide', [['right', 'Bas droite'], ['left', 'Bas gauche']])}</div>
      <div class="set-block"><div class="lbl"><b>Mini-lecteur</b></div>${seg('miniPos', [['bottom', 'En bas'], ['top', 'En haut']])}</div>
      <div class="set-block"><div class="lbl"><b>Bouton recherche</b><small>Loupe dans la barre du haut</small></div>${seg('searchPos', [['top', 'Affiché'], ['hidden', 'Masqué']])}</div>
      <div class="set-row"><div class="lbl"><b>Lecteur ancré (Fold déplié)</b><small>Bibliothèque à gauche, lecteur et paroles à droite en permanence</small></div><button class="switch tap ${settings.get('foldDock') !== false ? 'on' : ''}" data-tog="foldDock" role="switch" aria-checked="${settings.get('foldDock') !== false}"><i></i></button></div>
      ${pick('startPage', 'Page de démarrage')}
      <div class="set-block"><div class="lbl"><b>Onglets de la barre du bas</b><small>Active jusqu'à 6 onglets et range-les avec les flèches</small></div><div class="tab-pick" id="tabpick">${tabsEditor()}</div></div>
    </section>
    <section class="card-box" id="set-dl"><h4>Téléchargements sur le téléphone</h4>
      ${!feat('f_dlLocal') ? `<div class="note">${icon('info')}<span>Désactivé dans Réglages › Fonctionnalités.</span></div>` : ''}
      ${pick('dlLocation', 'Emplacement', esc(describeLocation()))}
      <div class="set-block" ${settings.get('dlLocation') === 'app' ? 'hidden' : ''} id="dl-folder"><div class="lbl"><b>Sous-dossier</b><small>Créé dans l'emplacement choisi</small></div>
        <input class="set-input" id="dlf" value="${esc(settings.get('dlFolder'))}" placeholder="Opus" autocomplete="off" spellcheck="false"></div>
      ${pick('dlNaming', 'Nom des fichiers')}
      ${pick('dlQuality', 'Qualité')}
      ${tog('dlWifiOnly', 'Wi-Fi uniquement', 'Ne télécharge pas en données mobiles')}
      ${tog('dlSyncStarred', 'Synchroniser les favoris', 'Les titres aimés sont téléchargés automatiquement au lancement')}
      <div class="set-row"><div class="lbl"><b>Playlists synchronisées</b><small>${plural((settings.get('dlSyncPlaylists') || []).length, 'playlist', 'playlists')} · menu ⋯ d'une playlist › Synchroniser</small></div><a class="btn tap" href="#/offline">${icon('phone')} Hors-ligne</a></div>
    </section>
    ${deezerSettingsHtml()}
    <section class="card-box"><h4>Bibliothèque</h4>
      <div class="set-row"><div class="lbl"><b id="scan-count">…</b><small id="scan-sub">État du scan</small></div><button class="btn tap" data-s="scan">${icon('refresh')} Scanner</button></div>
      ${feat('f_dupes') ? `<div class="set-row"><div class="lbl"><b>Doublons</b><small>Même titre en plusieurs exemplaires ou qualités</small></div><a class="btn tap" href="#/dupes">${icon('copies')} Chercher</a></div>` : ''}
      ${feat('f_import') ? `<div class="set-row"><div class="lbl"><b>Importer une playlist</b><small>Spotify, YouTube, YouTube Music, Deezer</small></div><a class="btn tap" href="#/import">${icon('link')} Importer</a></div>` : ''}
    </section>
    ${isNative() ? `<section class="card-box" id="set-bg"><h4>Lecture en arrière-plan</h4>
      <div class="set-row"><div class="lbl"><b id="bg-title">Batterie…</b><small id="bg-sub">Pour que la musique ne s'arrête pas écran éteint ou quand tu quittes l'appli</small></div><button class="btn tap" data-s="battery">${icon('settings')} Autoriser</button></div>
    </section>` : ''}
    <section class="card-box"><h4>Stockage</h4>
      <div class="set-row"><div class="lbl"><b>${plural(downloads.list().length, 'titre hors-ligne', 'titres hors-ligne')}</b><small>${fmtSize(downloads.totalSize())}</small></div><a class="btn tap" href="#/offline">${icon('phone')} Gérer</a></div>
    </section>
    <section class="card-box about"><h4>À propos</h4><p>Opus — client Subsonic pour Navidrome, animé avec GSAP.</p></section>`;
  animateTitle($('.title', ctx.root));
  reveal(ctx.root, '.card-box', { each: 0.07 });
  const jump = { dl: '#set-dl', layout: '#set-layout', deemix: '#set-deemix', deezer: '#set-deezer' }[ctx.q.get('s')];
  if (jump) setTimeout(() => $(jump, ctx.root)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
  deezerSettingsMount(ctx);

  $('.hue-range', ctx.root).addEventListener('input', (e) => {
    const c = rgbToHex(hslToRgb(Number(e.target.value), 82, 62));
    settings.set('accent', c);
    $$('.sw', ctx.root).forEach((b) => b.classList.remove('on'));
  });

  api.scanStatus().then((s) => {
    if (ctx.stale()) return;
    $('#scan-count', ctx.root).textContent = s.count ? `${Number(s.count).toLocaleString('fr-FR')} titres` : 'Bibliothèque';
    $('#scan-sub', ctx.root).textContent = s.scanning ? 'Scan en cours…' : s.lastScan ? `Dernier scan : ${new Date(s.lastScan).toLocaleString('fr-FR')}` : 'Aucun scan récent';
  });

  if (isNative()) {
    batteryUnrestricted().then((ok) => {
      if (ctx.stale()) return;
      const t = $('#bg-title', ctx.root), bt = $('[data-s="battery"]', ctx.root);
      if (!t) return;
      t.textContent = ok ? 'Batterie : sans restriction ✓' : 'Batterie : restreinte (la musique peut se couper)';
      if (ok && bt) bt.hidden = true;
    });
  }

  const dlf = $('#dlf', ctx.root);
  dlf.addEventListener('change', () => {
    settings.set('dlFolder', dlf.value.trim() || 'Opus');
    toast(downloads.list().length ? 'Dossier changé · menu ⋯ de Hors-ligne pour y déplacer les anciens fichiers' : 'Dossier enregistré', 3800);
    ctx.root.querySelector('[data-pick="dlLocation"]').closest('.set-row').querySelector('small').textContent = describeLocation();
  });
  const rerenderTabs = () => { $('#tabpick', ctx.root).innerHTML = tabsEditor(); };

  ctx.onClick(async (e) => {
    if (themeClick(e, ctx.root)) return;
    if (await deezerSettingsClick(e, ctx)) return;
    const pk = e.target.closest('[data-pick]');
    if (pk) {
      const key = pk.dataset.pick, cfg = PICKS[key];
      const v = await openSheet({ title: cfg.title, items: cfg.options.map(([val, l, sub]) => ({ id: String(val), label: l, sub, active: String(settings.get(key)) === String(val) })) });
      if (v == null) return;
      const before = settings.get(key);
      settings.set(key, typeof cfg.options[0][0] === 'number' ? Number(v) : v);
      if (key === 'dlLocation') {
        $('#dl-folder', ctx.root).hidden = v === 'app';
        if (v !== 'app' && !(await downloads.ensurePermission())) { settings.set(key, before); toast('Accès au stockage refusé'); }
        else if (downloads.list().length && before !== v) toast('Nouveaux titres enregistrés ici · menu ⋯ de Hors-ligne pour déplacer les anciens', 4200);
      }
      pk.innerHTML = `${esc(pickLabel(key))} ${icon('down')}`;
      pk.closest('.set-row').querySelector('small').textContent = key === 'dlLocation' ? describeLocation() : pickLabel(key);
      return;
    }
    const tb = e.target.closest('[data-tab]');
    if (tb) {
      const id = tb.dataset.tab;
      let t = settings.get('tabs') || [];
      if (t.includes(id)) { if (t.length <= 2) { toast('Garde au moins 2 onglets'); return; } t = t.filter((x) => x !== id); }
      else { if (t.length >= 6) { toast('6 onglets maximum'); return; } t = [...t, id]; }
      settings.set('tabs', t); rerenderTabs();
      return;
    }
    const mv = e.target.closest('[data-tab-up],[data-tab-down]');
    if (mv) {
      const id = mv.dataset.tabUp || mv.dataset.tabDown, d = mv.dataset.tabUp ? -1 : 1;
      const t = [...(settings.get('tabs') || [])], i = t.indexOf(id), j = i + d;
      if (i < 0 || j < 0 || j >= t.length) return;
      [t[i], t[j]] = [t[j], t[i]];
      settings.set('tabs', t); rerenderTabs();
      return;
    }
    const sg = e.target.closest('[data-seg] button');
    if (sg) {
      const key = sg.parentElement.dataset.seg;
      const raw = sg.dataset.val;
      settings.set(key, key === 'quality' || key === 'crossfade' ? Number(raw) : raw);
      $$('button', sg.parentElement).forEach((b) => b.classList.toggle('on', b === sg));
      if (key === 'quality') toast(raw === '0' ? 'Qualité originale' : `Qualité limitée à ${raw} kbps (prochain titre)`);
      if (key === 'crossfade') toast(raw === '0' ? 'Fondu enchaîné désactivé' : `Fondu enchaîné de ${raw} s`);
      return;
    }
    const acc = e.target.closest('[data-accent]');
    if (acc) {
      settings.set('accent', acc.dataset.accent);
      $$('.sw', ctx.root).forEach((b) => b.classList.toggle('on', b === acc));
      $('.hue-range', ctx.root).value = Math.round(rgbToHsl(...hexToRgb(acc.dataset.accent))[0]);
      return;
    }
    const tg = e.target.closest('[data-tog]');
    if (tg) {
      const v = !settings.get(tg.dataset.tog);
      settings.set(tg.dataset.tog, v); tg.classList.toggle('on', v); tg.setAttribute('aria-checked', String(v));
      if (tg.dataset.tog === 'dlSyncStarred' && v) autoSync();
      if (tg.dataset.tog === 'musicHaptics' && v) toast(isNative() ? 'Vibrations activées (approximation)' : 'Fonction prévue pour le téléphone (vibreur)');
      return;
    }
    const b = e.target.closest('[data-s]');
    if (!b) return;
    if (b.dataset.s === 'eq') { openEq(); return; }
    if (b.dataset.s === 'car') { openCar(); return; }
    if (b.dataset.s === 'battery') { await requestUnrestricted(); toast('Choisis « Autoriser » puis reviens dans Opus', 4200); return; }
    if (b.dataset.s === 'scan') { try { await api.startScan(); toast('Scan lancé'); } catch (err) { toast('Scan refusé : ' + err.message); } }
    else if (b.dataset.s === 'logout') {
      const c = await openSheet({ title: 'Se déconnecter ?', subtitle: 'La file d\'attente locale sera vidée.', items: [{ id: 'yes', icon: 'logout', label: 'Se déconnecter', danger: true }, { id: 'no', icon: 'close', label: 'Annuler' }] });
      if (c === 'yes') { window.dispatchEvent(new Event('nv:logout')); }
    }
  });
}

// =============================================================================================
// REPLAY : bilan d'écoute (historique local + albums les plus écoutés côté serveur)
// =============================================================================================
let replayPeriod = 'month';
const PERIODS = [['month', '30 jours'], ['year', 'Cette année'], ['all', 'Tout']];
const since = (p) => (p === 'month' ? Date.now() - 30 * 864e5 : p === 'year' ? new Date(new Date().getFullYear(), 0, 1).getTime() : 0);

async function replayView(ctx) {
  ctx.title('Replay');
  const draw = () => {
    const st = playLog.stats(since(replayPeriod));
    const mins = Math.round(st.seconds / 60);
    const top = st.artists[0];
    const maxH = Math.max(1, ...st.hours);
    const peak = st.hours.indexOf(Math.max(...st.hours));
    const rank = (list, kind, max) => list.slice(0, 5).map((e, i) => `
      <div class="rp-row tap" data-rp="${kind}" data-id="${esc(e.id || '')}">
        <span class="rp-n">${i + 1}</span>
        ${e.cov ? coverBox({ coverArt: e.cov }, 96, 'xs') : `<div class="cov xs"></div>`}
        <div class="meta"><div class="t">${esc(e.label)}</div><div class="s">${esc(e.sub || '')}${e.sub ? ' · ' : ''}${plural(e.n, 'écoute', 'écoutes')}</div></div>
        <div class="rp-bar"><i style="--w:${Math.round((e.n / max) * 100)}%"></i></div>
      </div>`).join('');
    ctx.root.innerHTML = `
      ${pageHead('Replay', 'Ton année en musique')}
      <div class="chips rp-periods">${PERIODS.map(([v, l]) => `<button class="chip tap ${v === replayPeriod ? 'on' : ''}" data-period="${v}">${l}</button>`).join('')}</div>
      ${st.plays ? `
      <section class="rp-hero">
        <div class="rp-big"><b class="rp-mins">0</b><span>minutes d'écoute</span></div>
        <div class="rp-mini"><div><b class="rp-plays">0</b><span>écoutes</span></div>
          <div><b>${st.artists.length}</b><span>artistes</span></div>
          <div><b>${st.songs.length}</b><span>titres</span></div></div>
        ${top ? `<div class="rp-top">Artiste n°1 <b>${esc(top.label)}</b> · ${plural(top.n, 'écoute', 'écoutes')}</div>` : ''}
      </section>
      <section class="card-box"><h4>Artistes les plus écoutés</h4>${rank(st.artists, 'artist', st.artists[0].n)}</section>
      <section class="card-box"><h4>Titres les plus écoutés</h4>${rank(st.songs, 'song', st.songs[0].n)}
        <div class="hb-actions pad"><button class="btn primary tap" data-rp="playtop">${icon('play')} Lire mon top</button></div></section>
      <section class="card-box"><h4>Albums les plus écoutés</h4>${rank(st.albums, 'album', st.albums[0].n)}</section>
      <section class="card-box"><h4>Quand tu écoutes</h4>
        <div class="rp-hours">${st.hours.map((n, h) => `<div class="rp-h" title="${h} h"><i style="--h:${Math.round((n / maxH) * 100)}%"></i><span>${h % 6 === 0 ? h : ''}</span></div>`).join('')}</div>
        <p class="rp-note">Tu écoutes surtout vers <b>${peak} h</b>.</p></section>
      <div class="hb-actions center"><button class="btn tap" data-rp="clear">${icon('trash')} Effacer l'historique local</button></div>`
      : `<div id="rp-empty">${emptyState('chart', 'Pas encore d\'historique', 'Écoute des titres : ils comptent une fois écoutés à moitié. Ton Replay se remplit tout seul.')}</div>
         <div id="rp-server"></div>`}`;
    animateTitle($('.title', ctx.root));
    if (st.plays) {
      countUp($('.rp-mins', ctx.root), mins, { duration: 1.6 });
      countUp($('.rp-plays', ctx.root), st.plays, { duration: 1.3 });
      if (fxOn()) {
        gsap.from($$('.rp-hero > *', ctx.root), { y: 30, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1 });
        gsap.from($$('.rp-bar i', ctx.root), { scaleX: 0, transformOrigin: '0 50%', duration: 0.9, ease: 'expo.out', stagger: 0.05, delay: 0.3 });
        gsap.from($$('.rp-h i', ctx.root), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.8, ease: 'back.out(1.4)', stagger: 0.025, delay: 0.4 });
        reveal(ctx.root, '.card-box', { each: 0.08 });
      }
    } else {
      api.albumList('frequent', { size: 12 }).then((al) => {
        if (ctx.stale() || !al.length) return;
        $('#rp-server', ctx.root).innerHTML = `${sectionHead('Les plus écoutés sur ton serveur')}<div class="grid">${al.map(albumCard).join('')}</div>`;
        reveal(ctx.root, '#rp-server .card');
      }).catch(() => {});
    }
  };
  draw();

  ctx.onClick(async (e) => {
    const per = e.target.closest('[data-period]');
    if (per) { replayPeriod = per.dataset.period; draw(); return; }
    const r = e.target.closest('[data-rp]');
    if (!r) return;
    const k = r.dataset.rp;
    try {
      if (k === 'artist' && r.dataset.id) go('#/artist/' + r.dataset.id);
      else if (k === 'album' && r.dataset.id) go('#/album/' + r.dataset.id);
      else if (k === 'song' && r.dataset.id) { player.playQueue([await api.song(r.dataset.id)], 0); }
      else if (k === 'playtop') {
        const ids = playLog.stats(since(replayPeriod)).songs.slice(0, 25).map((x) => x.id);
        const songs = (await Promise.all(ids.map((id) => api.song(id).catch(() => null)))).filter(Boolean);
        if (songs.length) player.playQueue(songs, 0); else toast('Titres introuvables sur le serveur');
      } else if (k === 'clear') {
        const c = await openSheet({ title: 'Effacer l\'historique ?', subtitle: 'Ton Replay repartira de zéro.', items: [{ id: 'yes', icon: 'trash', label: 'Effacer', danger: true }, { id: 'no', icon: 'close', label: 'Annuler' }] });
        if (c === 'yes') { playLog.clear(); draw(); }
      }
    } catch (err) { toast('Erreur : ' + err.message); }
  });
}

export const views = {
  home, albums, artists, artist, album, playlists, playlist, search, starred, genres, radios, offline: offlineView, more, settings: settingsView, replay: replayView, deezer, dz: dzPage,
  discover, releases: releasesView, history: historyView, features: featuresView, banned: bannedView, deemix: deemixView, blindtest,
  gestures: gesturesView, dupes: dupesView, import: importView,
};
