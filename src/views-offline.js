// Page Hors-ligne : la musique enregistrée sur le téléphone, rangée en onglets
//   Titres · Artistes · Albums · Playlists
// Chaque artiste / album / playlist se lance en entier (Lire, Aléatoire) ou s'ouvre pour choisir un titre.
// Routes : #/offline?tab=<songs|artists|albums|playlists>  et  #/offline?tab=<…>&k=<clé> (détail)
import { api } from './api.js';
import { player, coverFor } from './player.js';
import { downloads, describeLocation } from './downloads.js';
import { settings, store } from './store.js';
import { $, esc, fmtLong, fmtSize, plural, toast, debounce, haptic } from './ui.js';
import { icon } from './icons.js';
import { songRow, emptyState } from './components.js';
import { reg, go, downloadSongs, cancelDownloads, autoSync } from './actions.js';
import { openSheet } from './sheets.js';
import { reveal, animateTitle } from './fx.js';
import { feat } from './flags.js';

const TABS = [['songs', 'Titres', 'note'], ['artists', 'Artistes', 'mic'], ['albums', 'Albums', 'disc'], ['playlists', 'Playlists', 'list']];
const SORTS = [['date', 'Récents'], ['artist', 'Artiste'], ['album', 'Album'], ['title', 'Titre']];
const GSORTS = [['name', 'A → Z'], ['recent', 'Récents'], ['count', 'Plus de titres'], ['size', 'Plus lourds']];
const cmpText = (a, b) => String(a || '').localeCompare(String(b || ''), 'fr', { sensitivity: 'base' });
const byTrack = (a, b) => (a.discNumber || 1) - (b.discNumber || 1) || (a.track || 0) - (b.track || 0) || cmpText(a.title, b.title);
const SONG_CMP = {
  artist: (a, b) => cmpText(artistOf(a), artistOf(b)) || cmpText(a.album, b.album) || byTrack(a, b),
  album: (a, b) => cmpText(a.album, b.album) || byTrack(a, b),
  title: (a, b) => cmpText(a.title, b.title),
};
const artistOf = (s) => s.albumArtist || s.artist || 'Artiste inconnu';
const albumKey = (s) => s.albumId || `${s.album || 'Sans album'}|${artistOf(s)}`;
const dur = (list) => list.reduce((n, s) => n + (s.duration || 0), 0);
const size = (list) => list.reduce((n, s) => n + (downloads.get(s.id)?.size || 0), 0);
const ini = (n) => esc(String(n || '?').trim().slice(0, 2).toUpperCase());

// regroupe les titres enregistrés
function groups(kind) {
  const all = downloads.list().map((d) => d.song);
  if (kind === 'playlists') {
    return Object.values(downloads.playlists)
      .map((p) => {
        const songs = downloads.playlistSongs(p.id);
        return { key: p.id, name: p.name, songs, at: p.at, sub: `${songs.length}/${p.ids.length} titres hors-ligne`, at: p.at };
      })
      .filter((g) => g.songs.length)
      .sort((a, b) => (a.key === '__starred' ? -1 : b.key === '__starred' ? 1 : b.at - a.at));
  }
  const m = new Map();
  for (const s of all) {
    const k = kind === 'artists' ? artistOf(s) : albumKey(s);
    if (!m.has(k)) m.set(k, { key: k, name: kind === 'artists' ? artistOf(s) : s.album || 'Sans album', artist: artistOf(s), songs: [] });
    m.get(k).songs.push(s);
  }
  return [...m.values()].map((g) => {
    g.at = Math.max(0, ...g.songs.map((x) => downloads.get(x.id)?.at || 0));
    g.songs.sort(kind === 'artists' ? (a, b) => cmpText(a.album, b.album) || byTrack(a, b) : byTrack);
    const albums = new Set(g.songs.map(albumKey)).size;
    g.sub = kind === 'artists' ? `${plural(g.songs.length, 'titre', 'titres')}${albums > 1 ? ` · ${albums} albums` : ''}` : `${g.artist} · ${plural(g.songs.length, 'titre', 'titres')}`;
    return g;
  }).sort((a, b) => cmpText(a.name, b.name));
}

// tri des artistes / albums / playlists (Playlists : « favoris » toujours en tête)
function sortGroups(list, how) {
  const pin = (g) => (g.key === '__starred' ? 0 : 1);
  const by = {
    name: (a, b) => cmpText(a.name, b.name),
    recent: (a, b) => (b.at || 0) - (a.at || 0),
    count: (a, b) => b.songs.length - a.songs.length || cmpText(a.name, b.name),
    size: (a, b) => size(b.songs) - size(a.songs) || cmpText(a.name, b.name),
    artist: (a, b) => cmpText(a.artist, b.artist) || cmpText(a.name, b.name),
  }[how] || ((a, b) => cmpText(a.name, b.name));
  return list.slice().sort((a, b) => pin(a) - pin(b) || by(a, b));
}

const findGroup = (kind, key) => groups(kind).find((g) => g.key === key) || null;

const card = (g, kind) => {
  const round = kind === 'artists';
  const src = coverFor(g.songs[0], 300);
  return `
  <a class="card tap ${round ? 'artist' : ''}" href="#/offline?tab=${kind}&k=${encodeURIComponent(g.key)}">
    <div class="cov ${round ? 'round' : 'sq'}" ${round ? `data-ini="${ini(g.name)}"` : ''}>
      ${src ? `<img class="cv" loading="lazy" decoding="async" alt="" src="${esc(src)}">` : ''}
      <button class="fab tap" data-offplay="${kind}" data-k="${esc(g.key)}" aria-label="Lire ${esc(g.name)}">${icon('play')}</button>
    </div>
    <div class="c-t">${esc(g.name)}</div>
    <div class="c-s">${esc(g.sub)}</div>
  </a>`;
};

function playGroup(kind, key, shuffle = false) {
  const g = findGroup(kind, key);
  if (!g?.songs.length) { toast('Rien d\'enregistré ici'); return; }
  haptic('medium');
  player.playQueue(g.songs, 0, { shuffle });
  toast(`${shuffle ? 'Aléatoire' : 'Lecture'} · ${g.name}`);
}

async function removeSongs(songs) {
  for (const s of songs) await downloads.remove(s.id);
  window.dispatchEvent(new Event('nv:downloads'));
}

export async function offlineView(ctx) {
  ctx.title('Hors-ligne');
  const tab = TABS.some((t) => t[0] === ctx.q.get('tab')) ? ctx.q.get('tab') : store.get('offTab', 'songs');
  const key = ctx.q.get('k');
  store.set('offTab', tab);
  let filter = '', sort = store.get('offSort', 'date'), gsort = store.get('offGSort', 'name');

  ctx.root.innerHTML = `<div id="offh"></div><div id="dlp"></div><div id="offn"></div><div id="offc"></div>`;

  // barre de progression de la file de téléchargement
  const progress = (d = { active: downloads.active, queue: downloads.queue.length }) => {
    const box = $('#dlp', ctx.root);
    if (!box) return;
    if (!d.active) { box.innerHTML = ''; return; }
    const pct = d.active.total ? Math.min(100, Math.round((d.active.bytes / d.active.total) * 100)) : 0;
    if (!$('.dl-bar', box)) box.innerHTML = `<div class="dl-bar"><div class="dl-top">${icon('download')}<b></b><small></small><button class="ic-btn tap" data-off="cancel" aria-label="Annuler la file">${icon('close')}</button></div><div class="dl-track"><i></i></div></div>`;
    $('.dl-top b', box).textContent = d.active.song.title;
    $('.dl-top small', box).textContent = `${pct ? pct + ' % · ' : ''}${d.queue ? d.queue + ' en attente' : 'dernier'}`;
    $('.dl-track i', box).style.width = pct + '%';
  };

  const notes = () => {
    const fails = downloads.failed;
    $('#offn', ctx.root).innerHTML = `
      ${!feat('f_dlLocal') ? `<div class="note">${icon('info')}<span>Le téléchargement est désactivé (Réglages › Fonctionnalités). Les titres déjà enregistrés restent lisibles.</span></div>` : ''}
      ${!downloads.supported ? `<div class="note">${icon('phone')}<span>Le téléchargement fonctionne dans l'appli Android (pas dans le navigateur).</span></div>` : ''}
      ${fails.length ? `<div class="note warn">${icon('close')}<span>${plural(fails.length, 'titre en échec', 'titres en échec')} : ${esc(fails[fails.length - 1].error)}</span><button class="btn tap" data-off="retry">${icon('refresh')} Réessayer</button></div>` : ''}`;
  };

  // ---------- vue d'ensemble (onglets) ----------
  const renderList = (animate = true) => {
    const all = downloads.list().map((d) => d.song);
    const counts = { songs: all.length, artists: groups('artists').length, albums: groups('albums').length, playlists: groups('playlists').length };
    const allKey = reg(all);
    $('#offh', ctx.root).innerHTML = `
      <div class="page-head"><h1 class="title">Hors-ligne</h1>
        <p class="sub">${all.length ? `${plural(all.length, 'titre', 'titres')} · ${fmtSize(downloads.totalSize())} · ` : ''}${esc(describeLocation())}</p></div>
      <div class="hb-actions pad">
        ${all.length ? `<button class="btn primary glow tap ripple" data-act="play-all" data-list="${allKey}">${icon('play')} Tout lire</button>
        <button class="btn tap ripple" data-act="shuffle-all" data-list="${allKey}">${icon('shuffle')} Aléatoire</button>` : ''}
        <button class="ic-btn round tap" data-off="menu" aria-label="Gérer">${icon('dots')}</button>
      </div>
      <div class="off-tabs" role="tablist">${TABS.map(([id, l, ic]) => `<a class="off-tab tap ${id === tab ? 'on' : ''}" role="tab" href="#/offline?tab=${id}">${icon(ic)}<span>${l}</span><b>${counts[id]}</b></a>`).join('')}</div>
      ${all.length ? `<div class="off-tools"><input class="set-input" id="offf" type="search" placeholder="Filtrer…" value="${esc(filter)}"></div>` : ''}`;
    animateTitle($('.title', ctx.root));
    const inp = $('#offf', ctx.root);
    inp?.addEventListener('input', debounce(() => { filter = inp.value; renderBody(false); }, 250));
    notes();
    renderBody(animate);
    progress();
  };

  const renderBody = (animate) => {
    const box = $('#offc', ctx.root);
    const f = filter.trim().toLowerCase();
    const all = downloads.list().map((d) => d.song);
    if (!all.length) {
      box.innerHTML = emptyState('phone', 'Rien de téléchargé', 'Menu ⋯ d\'un titre, d\'un album ou d\'une playlist › Télécharger, ou active la synchro des favoris dans les Réglages.');
      return;
    }
    if (tab === 'songs') {
      let list = f ? all.filter((s) => `${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(f)) : all;
      if (SONG_CMP[sort]) list = list.slice().sort(SONG_CMP[sort]);
      const k = reg(list);
      box.innerHTML = `
        <div class="chips" style="margin-bottom:12px">${SORTS.map(([id, l]) => `<button class="chip tap ${id === sort ? 'on' : ''}" data-sort="${id}">${l}</button>`).join('')}</div>
        <div class="tracks">${list.length ? list.map((s, i) => songRow(s, { list: k, i, showCover: true, showAlbum: true })).join('') : emptyState('search', 'Aucun titre', 'Rien ne correspond au filtre')}</div>`;
      if (animate) reveal(box, '.row', { y: 14, each: 0.02 });
      window.dispatchEvent(new Event('nv:rows'));
      return;
    }
    const gs = tab === 'albums' ? [...GSORTS.slice(0, 1), ['artist', 'Artiste'], ...GSORTS.slice(1)] : GSORTS;
    const list = sortGroups(groups(tab).filter((g) => !f || `${g.name} ${g.artist || ''}`.toLowerCase().includes(f)), gsort);
    const empty = tab === 'playlists'
      ? emptyState('list', 'Aucune playlist hors-ligne', 'Ouvre une playlist et touche le bouton de téléchargement, ou « Synchroniser hors-ligne » dans son menu ⋯.')
      : emptyState('search', 'Rien ici', f ? 'Rien ne correspond au filtre' : '');
    const chips = `<div class="chips" style="margin-bottom:12px">${gs.map(([id, l]) => `<button class="chip tap ${id === gsort ? 'on' : ''}" data-gsort="${id}">${l}</button>`).join('')}</div>`;
    box.innerHTML = list.length ? `${chips}<div class="grid">${list.map((g) => card(g, tab)).join('')}</div>` : empty;
    if (animate) reveal(box, '.card', { each: 0.03 });
  };

  // ---------- détail d'un artiste / album / playlist ----------
  const renderDetail = () => {
    const g = findGroup(tab, key);
    const label = TABS.find((t) => t[0] === tab)[1];
    if (!g) {
      ctx.root.innerHTML = `<a class="link tap off-back" href="#/offline?tab=${tab}">${icon('left')} ${label}</a>${emptyState('phone', 'Plus rien ici', 'Ces titres ne sont plus sur le téléphone.')}`;
      return;
    }
    ctx.title(g.name);
    const k = reg(g.songs);
    const round = tab === 'artists';
    const src = coverFor(g.songs[0], 600);
    const meta = [tab === 'albums' ? g.artist : '', plural(g.songs.length, 'titre', 'titres'), fmtLong(dur(g.songs)), fmtSize(size(g.songs))].filter(Boolean);
    ctx.root.innerHTML = `
      <a class="link tap off-back" href="#/offline?tab=${tab}">${icon('left')} ${label}</a>
      <section class="hero-block album-hero">
        <div class="cov ${round ? 'round' : 'sq'} xl" ${round ? `data-ini="${ini(g.name)}"` : ''}>${src ? `<img class="cv" alt="" src="${esc(src)}">` : ''}</div>
        <div class="hb-meta">
          <h1 class="title">${esc(g.name)}</h1>
          <p class="meta-line">${meta.map(esc).join(' · ')}</p>
          <p class="sub off-badge">${icon('phone')} Sur le téléphone</p>
          <div class="hb-actions">
            <button class="btn primary glow tap ripple" data-act="play-all" data-list="${k}">${icon('play')} Lire</button>
            <button class="btn tap ripple" data-act="shuffle-all" data-list="${k}">${icon('shuffle')} Aléatoire</button>
            <button class="ic-btn round tap" data-offg="menu" aria-label="Plus">${icon('dots')}</button>
          </div>
        </div>
      </section>
      <div id="dlp"></div>
      <div class="tracks">${g.songs.map((s, i) => songRow(s, { list: k, i, showCover: tab !== 'albums', num: tab === 'albums' ? s.track || i + 1 : undefined, showArtist: tab !== 'artists', showAlbum: tab !== 'albums' })).join('')}</div>`;
    animateTitle($('.title', ctx.root));
    reveal(ctx.root, '.tracks .row', { y: 14, each: 0.02 });
    window.dispatchEvent(new Event('nv:rows'));
    progress();
    return g;
  };

  const render = (animate = true) => (key ? renderDetail() : renderList(animate));
  render();

  const again = () => { if (!ctx.stale()) render(false); };
  const onProg = (e) => { if (!ctx.stale()) progress(e.detail); };
  window.addEventListener('nv:downloads', again);
  window.addEventListener('nv:dlprogress', onProg);
  ctx.onLeave(() => { window.removeEventListener('nv:downloads', again); window.removeEventListener('nv:dlprogress', onProg); });

  ctx.onClick(async (e) => {
    const pl = e.target.closest('[data-offplay]');
    if (pl) { e.preventDefault(); playGroup(pl.dataset.offplay, pl.dataset.k); return; }
    const gso = e.target.closest('[data-gsort]');
    if (gso) { gsort = gso.dataset.gsort; store.set('offGSort', gsort); renderBody(false); return; }
    const so = e.target.closest('[data-sort]');
    if (so) { sort = so.dataset.sort; store.set('offSort', sort); renderBody(false); return; }

    // menu d'un artiste / album / playlist
    if (e.target.closest('[data-offg="menu"]')) {
      const g = findGroup(tab, key);
      if (!g) return;
      const isPl = tab === 'playlists';
      const canSync = isPl && (g.key === '__starred' || !String(g.key).startsWith('dz:'));
      const c = await openSheet({
        title: g.name, subtitle: `${plural(g.songs.length, 'titre', 'titres')} sur le téléphone`, cover: coverFor(g.songs[0], 96),
        items: [
          { id: 'next', icon: 'play', label: 'Lire ensuite' },
          { id: 'queue', icon: 'queue', label: 'Ajouter à la file d\'attente' },
          ...(canSync ? [{ id: 'complete', icon: 'download', label: 'Télécharger les titres manquants', sub: 'Nécessite le serveur' }] : []),
          ...(isPl ? [{ id: 'forget', icon: 'close', label: 'Retirer de la liste', sub: 'Les fichiers restent sur le téléphone' }] : []),
          { id: 'delete', icon: 'trash', label: 'Supprimer du téléphone', sub: plural(g.songs.length, 'titre', 'titres'), danger: true },
        ],
      });
      try {
        if (c === 'next') { [...g.songs].reverse().forEach((s) => player.addNext(s)); toast('Lu ensuite'); }
        else if (c === 'queue') { player.addEnd(g.songs); toast('Ajouté à la file'); }
        else if (c === 'complete') {
          const songs = g.key === '__starred' ? (await api.starred()).songs : (await api.playlist(g.key)).entry;
          downloadSongs(songs, { playlist: { id: g.key, name: g.name } });
        } else if (c === 'forget') { downloads.forgetPlaylist(g.key); toast('Playlist retirée'); go('#/offline?tab=playlists'); }
        else if (c === 'delete') {
          const ok = await openSheet({ title: `Supprimer « ${g.name} » du téléphone ?`, subtitle: `${plural(g.songs.length, 'titre', 'titres')} · ${fmtSize(size(g.songs))}`, items: [{ id: 'yes', icon: 'trash', label: 'Supprimer', danger: true }, { id: 'no', icon: 'close', label: 'Annuler' }] });
          if (ok === 'yes') { await removeSongs(g.songs); if (isPl) downloads.forgetPlaylist(g.key); toast('Supprimé du téléphone'); go(`#/offline?tab=${tab}`); }
        }
      } catch (err) { toast('Erreur : ' + err.message); }
      return;
    }

    const b = e.target.closest('[data-off]');
    if (!b) return;
    if (b.dataset.off === 'cancel') { cancelDownloads(); toast('File d\'attente vidée (le titre en cours se termine)'); return; }
    if (b.dataset.off === 'retry') { const l = downloads.failed.map((x) => x.song); downloads.failed = []; downloadSongs(l); notes(); return; }
    const c = await openSheet({
      title: 'Hors-ligne', subtitle: describeLocation(),
      items: [
        { id: 'sync', icon: 'sync', label: 'Synchroniser maintenant', sub: 'Favoris et playlists marqués « hors-ligne »' },
        { id: 'move', icon: 'folder', label: 'Déplacer vers l\'emplacement choisi', sub: 'Réglages › Téléchargements' },
        { id: 'allpl', icon: 'download', label: 'Télécharger toutes mes playlists', sub: 'Elles apparaîtront dans l\'onglet Playlists (nécessite le serveur)' },
        { id: 'verify', icon: 'check', label: 'Vérifier les fichiers' },
        { id: 'settings', icon: 'sliders', label: 'Réglages des téléchargements' },
        { id: 'clear', icon: 'trash', label: 'Tout supprimer du téléphone', danger: true },
      ],
    });
    if (c === 'sync') {
      if (!settings.get('dlSyncStarred') && !(settings.get('dlSyncPlaylists') || []).length) toast('Rien à synchroniser : active la synchro dans les Réglages');
      else { autoSync(); toast('Synchronisation lancée'); }
    } else if (c === 'move') {
      if (!(await downloads.ensurePermission())) { toast('Accès au stockage refusé'); return; }
      toast('Déplacement…', 60000);
      const r = await downloads.moveAll((i, n) => toast(`Déplacement ${i}/${n}`, 60000));
      toast(r.failed ? `${r.moved} déplacé(s), ${r.failed} en échec` : `${plural(r.moved, 'fichier déplacé', 'fichiers déplacés')}`);
      render(false);
    } else if (c === 'allpl') {
      try {
        const pls = await api.playlists();
        if (!pls.length) { toast('Aucune playlist sur le serveur'); return; }
        toast(`${plural(pls.length, 'playlist', 'playlists')} en cours de téléchargement…`, 4000);
        for (const p of pls) {
          const songs = (await api.playlist(p.id)).entry || [];
          if (songs.length) await downloadSongs(songs, { silent: true, playlist: { id: p.id, name: p.name } });
        }
        render(false);
      } catch (err) { toast('Erreur : ' + err.message); }
    } else if (c === 'verify') {
      const n = await downloads.verify();
      toast(n ? `${n} fichier(s) manquant(s) retiré(s)` : 'Tous les fichiers sont présents');
      render(false);
    } else if (c === 'settings') go('#/settings?s=dl');
    else if (c === 'clear') {
      const ok = await openSheet({ title: 'Tout supprimer ?', subtitle: `${plural(downloads.list().length, 'titre', 'titres')} · ${fmtSize(downloads.totalSize())}`, items: [{ id: 'yes', icon: 'trash', label: 'Supprimer', danger: true }, { id: 'no', icon: 'close', label: 'Annuler' }] });
      if (ok === 'yes') { await downloads.removeAll(); toast('Téléchargements supprimés'); window.dispatchEvent(new Event('nv:downloads')); }
    }
  });
}
