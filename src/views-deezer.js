// Pages Deezer : #/deezer (recherche, classements, compte) et #/dz/<playlist|album|artist|loved>/<id>
// Chaque titre Deezer est rapproché d'un titre de ta bibliothèque Navidrome : lecture, téléchargement local
// (le fichier de ton serveur) et ajout aux playlists. Les titres absents peuvent être écoutés en extrait de 30 s,
// ou envoyés au service deemix de ton serveur (bouton nuage) qui les range dans Navidrome.
import { api } from './api.js';
import { player } from './player.js';
import { store, settings } from './store.js';
import { $, $$, esc, fmtTime, fmtLong, plural, toast, debounce, haptic, isNative } from './ui.js';
import { icon } from './icons.js';
import { sectionHead, skeleton, emptyState } from './components.js';
import { playlistPicker, downloadSongs, songMenu, go } from './actions.js';
import { openSheet, askText } from './sheets.js';
import { reveal, animateTitle } from './fx.js';
import { dz, dzGet, arl, me, matchAll, matchTrack, preview, forgetMatches } from './deezer.js';
import { dmx, sendToDeemix, busyTrackIds, activeJobs, watchJobs, pickTarget, DMX_BITRATES } from './deemix.js';
import { feat } from './flags.js';

const pageHead = (title, sub = '') => `<div class="page-head"><h1 class="title">${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>`;
const img = (src, cls = 'sq') => `<div class="cov ${cls}">${src ? `<img class="cv" loading="lazy" decoding="async" alt="" src="${esc(src)}">` : ''}</div>`;

const dzCard = (href, cover, title, sub, round = false) => `
  <a class="card tap ${round ? 'artist' : ''}" href="${esc(href)}">
    ${img(cover, round ? 'round' : 'sq')}
    <div class="c-t">${esc(title)}</div><div class="c-s">${esc(sub || '')}</div>
  </a>`;
const plCard = (p) => dzCard(`#/dz/playlist/${p.id}`, p.cover, p.title, [p.count ? plural(p.count, 'titre', 'titres') : '', p.owner].filter(Boolean).join(' · '));
const alCard = (a) => dzCard(`#/dz/album/${a.id}`, a.cover, a.title, [a.artist, a.year].filter(Boolean).join(' · '));
const arCard = (a) => dzCard(`#/dz/artist/${a.id}`, a.cover, a.name, a.fans ? `${a.fans.toLocaleString('fr-FR')} fans` : '', true);

// ---------- ligne de titre Deezer, avec état de correspondance ----------
const dmxOn = () => feat('f_deemix');
const badge = (m, t) => (m === undefined ? `<span class="dz-badge wait">…</span>`
  : m ? `<span class="dz-badge ok">${icon('check')} Biblio</span>`
  : busyTrackIds().has(String(t.id)) ? `<span class="dz-badge srv">${icon('cloud')} Serveur…</span>`
  : dmxOn() ? `<button class="dz-badge no dmx tap" data-dmx="${t._i}" aria-label="Télécharger sur le serveur">${icon('cloud')} Absent</button>`
  : `<span class="dz-badge no">Absent</span>`);
const dzRow = (t, i, m) => `
  <div class="row dz tap ripple ${m === null ? 'missing' : ''}" data-dz="${i}" ${m ? `data-id="${esc(m.id)}"` : ''}>
    ${img(t.cover, 'xs')}
    <div class="meta"><div class="t">${esc(t.title)}</div><div class="s">${esc([t.artist, t.album].filter(Boolean).join(' · '))}</div></div>
    ${badge(m, { ...t, _i: i })}
    <span class="dur">${fmtTime(t.duration)}</span>
    <button class="ic-btn tap" data-dzm="${i}" aria-label="Plus d'options">${icon('dots')}</button>
  </div>`;

// liste de titres + actions groupées (utilisée par les pages playlist / album / artiste / coups de cœur)
export function trackList(ctx, host, tracks, { name = 'Deezer', statsEl, stale = ctx.stale, cover = '', albumUrl = '', resolve = null } = {}) {
  const matches = new Array(tracks.length).fill(undefined);
  host.innerHTML = tracks.map((t, i) => dzRow(t, i, undefined)).join('');
  reveal(host, '.row', { y: 14, each: 0.02 });
  const found = () => matches.map((m) => m || null).filter(Boolean);
  const stats = () => {
    if (!statsEl) return;
    const done = matches.filter((m) => m !== undefined).length, ok = found().length;
    statsEl.innerHTML = `<span>${icon('check')} ${ok} / ${tracks.length} dans ta bibliothèque</span>${done < tracks.length ? `<span>· recherche ${done}/${tracks.length}…</span>` : ''}`;
  };
  stats();
  const ready = matchAll(tracks, (i, m) => {
    if (stale()) return;
    matches[i] = m;
    const row = $(`.row[data-dz="${i}"]`, host);
    if (row) { row.outerHTML = dzRow(tracks[i], i, m); }
    stats();
    window.dispatchEvent(new Event('nv:rows'));
  }, stale).catch((e) => toast('Bibliothèque injoignable : ' + e.message));
  ctx.onLeave(() => preview.stop());
  const redraw = (i) => { const row = $(`.row[data-dz="${i}"]`, host); if (row) row.outerHTML = dzRow(tracks[i], i, matches[i]); };
  // deemix : badges « Serveur… » pendant le téléchargement, puis nouvelle recherche dans la bibliothèque
  const onJobs = () => { if (!stale()) matches.forEach((m, i) => { if (m === null) redraw(i); }); };
  const onDone = async (e) => {
    if (stale()) return;
    const ids = new Set((e.detail?.job?.tracks || []).map((t) => String(t.id)));
    for (let i = 0; i < tracks.length; i++) {
      if (matches[i] !== null || (ids.size && !ids.has(String(tracks[i].id)))) continue;
      try { matches[i] = await matchTrack(tracks[i]); } catch { /* suivant */ }
      if (stale()) return;
      redraw(i);
    }
    stats();
    window.dispatchEvent(new Event('nv:rows'));
  };
  window.addEventListener('nv:dmx', onJobs);
  window.addEventListener('nv:dmxdone', onDone);
  ctx.onLeave(() => { window.removeEventListener('nv:dmx', onJobs); window.removeEventListener('nv:dmxdone', onDone); });
  const toServer = async (list, title, extra = {}) => {
    // titres importés (Spotify, YouTube…) : on cherche d'abord leur équivalent Deezer
    if (resolve && list.some((t) => !t.link)) {
      toast(`Recherche sur Deezer · ${plural(list.length, 'titre', 'titres')}…`, 3000);
      const out = [];
      let k = 0;
      await Promise.all([0, 1, 2, 3].map(async () => { while (k < list.length) { const t = list[k++]; out.push(await resolve(t).catch(() => null)); } }));
      const ok = out.filter(Boolean);
      const miss = list.length - ok.length;
      if (!ok.length) { toast('Aucun de ces titres n\'a été trouvé sur Deezer'); return; }
      if (miss) toast(`${plural(miss, 'titre introuvable', 'titres introuvables')} sur Deezer · ${ok.length} envoyés`, 3600);
      list = ok;
    }
    const job = await sendToDeemix({ urls: list.map((t) => t.link), title, cover: list[0]?.cover || cover, tracks: list, kind: list.length > 1 ? 'tracks' : 'track', ...extra });
    if (job) onJobs();
  };

  const playFrom = (i) => {
    const list = found();
    if (!list.length) { toast('Aucun titre de cette liste dans ta bibliothèque'); return; }
    preview.stop();
    const m = matches[i];
    player.playQueue(list, m ? Math.max(0, list.indexOf(m)) : 0);
  };

  const missingMenu = async (t) => {
    const c = await openSheet({
      title: t.title, subtitle: [t.artist, t.album].filter(Boolean).join(' · '), cover: t.cover,
      items: [
        ...(t.preview ? [{ id: 'prev', icon: 'play', label: preview.current === t.id ? 'Arrêter l\'extrait' : 'Écouter l\'extrait (30 s)' }] : []),
        ...(resolve && !t.link && t.id.startsWith('yt:') ? [{ id: 'yt', icon: 'link', label: 'Ouvrir sur YouTube' }] : []),
        ...(dmxOn() ? [{ id: 'dmx', icon: 'cloud', label: 'Télécharger sur le serveur (deemix)', sub: 'Puis l\'ajouter à ta bibliothèque Navidrome' }] : []),
        { id: 'search', icon: 'search', label: 'Chercher dans ma bibliothèque' },
        { id: 'open', icon: 'link', label: 'Ouvrir dans Deezer' },
        { id: 'copy', icon: 'share', label: 'Copier « artiste – titre »' },
      ],
    });
    if (c === 'prev') togglePreview(t);
    else if (c === 'dmx') toServer([t], `${t.artist} – ${t.title}`);
    else if (c === 'search') go('#/search?q=' + encodeURIComponent(`${t.artist} ${t.title}`));
    else if (c === 'open') { if (t.link) window.open(t.link, '_blank'); else { const d = resolve ? await resolve(t).catch(() => null) : null; if (d?.link) window.open(d.link, '_blank'); else toast('Introuvable sur Deezer'); } }
    else if (c === 'yt') window.open('https://www.youtube.com/watch?v=' + t.id.slice(3), '_blank');
    else if (c === 'copy') { try { await navigator.clipboard.writeText(`${t.artist} – ${t.title}`); toast('Copié'); } catch { toast(`${t.artist} – ${t.title}`, 4000); } }
  };
  const togglePreview = (t) => {
    if (preview.current === t.id) { preview.stop(); return; }
    if (player.playing) player.pause();
    if (preview.play(t)) toast(`Extrait · ${t.title}`); else toast('Pas d\'extrait disponible');
  };

  ctx.onClick(async (e) => {
    const dm = e.target.closest('[data-dmx]');
    if (dm) { haptic('light'); const t = tracks[Number(dm.dataset.dmx)]; toServer([t], `${t.artist} – ${t.title}`); return; }
    const mb = e.target.closest('[data-dzm]');
    if (mb) {
      const i = Number(mb.dataset.dzm), m = matches[i];
      if (m) songMenu(m); else missingMenu(tracks[i]);
      return;
    }
    const row = e.target.closest('[data-dz]');
    if (row) {
      haptic('light');
      const i = Number(row.dataset.dz), m = matches[i];
      if (m) playFrom(i);
      else if (m === null) togglePreview(tracks[i]);
      else toast('Recherche dans ta bibliothèque…');
      return;
    }
    const b = e.target.closest('[data-bulk]');
    if (!b) return;
    const k = b.dataset.bulk;
    if (k === 'dmx-all') { toServer(tracks, name, { urls: [albumUrl], kind: 'album' }); return; }
    await ready;
    const list = found();
    if (k === 'dmx-missing') {
      const miss = tracks.filter((t, i) => !matches[i] && !busyTrackIds().has(String(t.id)));
      if (!miss.length) { toast('Rien ne manque !'); return; }
      toServer(miss, `${name} · ${plural(miss.length, 'titre manquant', 'titres manquants')}`);
      return;
    }
    if (k === 'share-missing') {
      const miss = tracks.filter((_, i) => !matches[i]);
      if (!miss.length) { toast('Rien ne manque !'); return; }
      const text = `Titres manquants — ${name}\n` + miss.map((t) => `${t.artist} – ${t.title}`).join('\n');
      try {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: `Manquants · ${name}`, text });
      } catch { try { await navigator.clipboard.writeText(text); toast('Liste copiée'); } catch { toast('Partage impossible'); } }
      return;
    }
    if (!list.length) { toast('Aucun titre de cette liste dans ta bibliothèque'); return; }
    if (k === 'play') playFrom(-1);
    else if (k === 'shuffle') { preview.stop(); player.playQueue(list, 0, { shuffle: true }); }
    else if (k === 'dl') downloadSongs(list, { playlist: { id: 'dz:' + name, name } });
    else if (k === 'add') playlistPicker(list);
    else if (k === 'import') {
      const n = await askText('Créer la playlist dans Navidrome', { value: name, ok: 'Créer' });
      if (!n) return;
      try {
        const p = await api.createPlaylist(n, list.map((s) => s.id));
        toast(`Playlist « ${n} » créée · ${plural(list.length, 'titre', 'titres')}`);
        haptic('medium');
        const c = await openSheet({ title: 'Playlist créée', subtitle: n, items: [{ id: 'go', icon: 'list', label: 'Ouvrir la playlist' }, { id: 'dl', icon: 'download', label: 'La télécharger sur le téléphone' }, { id: 'no', icon: 'close', label: 'Fermer' }] });
        if (c === 'go') go('#/playlist/' + (p?.id || ''));
        else if (c === 'dl') downloadSongs(list, { playlist: { id: p?.id || 'dz:' + n, name: n } });
      } catch (err) { toast('Erreur : ' + err.message); }
    }
  });
  return ready;
}

export const bulkActions = (kind = '') => `
  <div class="hb-actions">
    <button class="btn primary glow tap ripple" data-bulk="play">${icon('play')} Lire</button>
    <button class="btn tap ripple" data-bulk="shuffle">${icon('shuffle')} Aléatoire</button>
    <button class="ic-btn round tap" data-bulk="dl" aria-label="Télécharger les titres trouvés">${icon('download')}</button>
    <button class="ic-btn round tap" data-bulk="add" aria-label="Ajouter à une playlist">${icon('plus')}</button>
  </div>
  <div class="set-actions">
    <button class="chip tap" data-bulk="import">${icon('list')} Importer comme playlist Navidrome</button>
    <button class="chip tap" data-bulk="share-missing">${icon('share')} Liste des manquants</button>
    ${dmxOn() ? `<button class="chip tap dmx" data-bulk="dmx-missing">${icon('cloud')} deemix : les manquants</button>` : ''}
    ${dmxOn() && kind === 'album' ? `<button class="chip tap dmx" data-bulk="dmx-all">${icon('cloud')} deemix : album complet</button>` : ''}
  </div>`;

// =============================================================================================
// #/deezer
// =============================================================================================
export async function deezer(ctx) {
  ctx.title('Deezer');
  const initial = ctx.q.get('q') || '';
  let kind = store.get('dzKind', 'track');
  const KINDS = [['track', 'Titres'], ['album', 'Albums'], ['artist', 'Artistes'], ['playlist', 'Playlists']];
  ctx.root.innerHTML = `
    ${pageHead('Deezer', 'Catalogue Deezer, rapproché de ta bibliothèque Navidrome')}
    <div class="set-actions" style="margin:-6px 0 12px">${dmxOn() ? `<a class="chip tap dmx" href="#/deemix" id="dmxchip">${icon('cloud')} Téléchargements serveur</a>` : ''}${feat('f_releases') ? `<a class="chip tap" href="#/releases">${icon('calendar')} Nouveautés</a>` : ''}${feat('f_import') ? `<a class="chip tap" href="#/import">${icon('link')} Importer Spotify / YouTube</a>` : ''}</div>
    <div class="searchbar">${icon('search')}<input id="dzq" type="search" enterkeyhint="search" autocomplete="off" placeholder="Chercher sur Deezer ou coller un lien…" value="${esc(initial)}" aria-label="Chercher sur Deezer"></div>
    <div class="chips" id="dzk" style="margin:12px 0 6px">${KINDS.map(([k, l]) => `<button class="chip tap ${k === kind ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
    <div id="dzres"></div>`;
  animateTitle($('.title', ctx.root));
  const chip = $('#dmxchip', ctx.root);
  if (chip && dmx.ready) {
    const upd = () => { const n = activeJobs().length; chip.innerHTML = `${icon('cloud')} Téléchargements serveur${n ? ` · ${n} en cours` : ''}`; };
    window.addEventListener('nv:dmx', upd);
    ctx.onLeave(() => window.removeEventListener('nv:dmx', upd));
    watchJobs();
  }
  const res = $('#dzres', ctx.root), input = $('#dzq', ctx.root);
  let token = 0;

  const home = async () => {
    res.innerHTML = `<section class="rowsec" id="dz-me"></section><section class="rowsec" id="dz-chart">${skeleton(4, 'line')}</section>`;
    const meBox = $('#dz-me', res);
    if (!arl.ready) {
      meBox.innerHTML = `<div class="note">${icon('key')}<span>Ajoute ton ARL Deezer dans <a href="#/settings" style="color:var(--v3)">Réglages › Deezer</a> pour voir tes playlists et tes coups de cœur.</span></div>`;
    } else if (!isNative()) {
      meBox.innerHTML = `<div class="note">${icon('phone')}<span>Le compte Deezer fonctionne dans l'appli Android.</span></div>`;
    } else {
      meBox.innerHTML = `${sectionHead('Mon compte')}${skeleton(4, 'card')}`;
      try {
        const [u, pls] = await Promise.all([me(), dz.myPlaylists()]);
        if (ctx.stale()) return;
        meBox.innerHTML = `${sectionHead(`Playlists de ${u.name}`)}<div class="hscroll">
          ${dzCard('#/dz/loved/me', '', 'Coups de cœur', 'Tes titres aimés')}${pls.map(plCard).join('')}</div>`;
        reveal(meBox, '.card', { each: 0.03 });
      } catch (e) {
        meBox.innerHTML = `<div class="note">${icon('close')}<span>Compte Deezer : ${esc(e.message)}. Vérifie l'ARL dans les Réglages.</span></div>`;
      }
    }
    try {
      const c = await dz.chart();
      if (ctx.stale() || input.value.trim()) return;
      $('#dz-chart', res).innerHTML = `
        ${c.playlists.length ? `${sectionHead('Playlists du moment')}<div class="hscroll">${c.playlists.map(plCard).join('')}</div>` : ''}
        ${c.albums.length ? `${sectionHead('Albums du moment')}<div class="hscroll">${c.albums.map(alCard).join('')}</div>` : ''}
        ${sectionHead('Top titres')}<div class="tracks" id="dz-top"></div>`;
      const my = token;
      trackList(ctx, $('#dz-top', res), c.tracks, { name: 'Top Deezer', stale: () => my !== token || ctx.stale() });
      reveal($('#dz-chart', res), '.hscroll .card', { each: 0.03 });
    } catch (e) { $('#dz-chart', res).innerHTML = emptyState('wave', 'Deezer injoignable', e.message); }
  };

  const run = async (q) => {
    const my = ++token;
    q = q.trim();
    preview.stop();
    if (!q) { home(); return; }
    if (/spotify\.(com|link)|spoti\.fi|spotify:|youtu\.?be|music\.youtube/i.test(q) && my === token) { go('#/import?u=' + encodeURIComponent(q)); return; }
    if (/deezer\.(com|page\.link)|link\.deezer/.test(q)) {
      const l = await dz.resolveLink(q);
      if (l && my === token) {
        if (l.kind === 'track') { try { const t = await dzGet('track/' + l.id); go(`#/dz/album/${t.album.id}`); } catch { toast('Lien introuvable'); } }
        else go(`#/dz/${l.kind}/${l.id}`);
        return;
      }
    }
    res.innerHTML = skeleton(6, 'line');
    let r;
    try { r = await dz.search(q, kind); } catch (e) { res.innerHTML = emptyState('search', 'Recherche Deezer impossible', e.message); return; }
    if (my !== token || ctx.stale()) return;
    if (!r.length) { res.innerHTML = emptyState('search', 'Aucun résultat', `Rien pour « ${q} » sur Deezer`); return; }
    if (kind === 'track') { res.innerHTML = '<div class="tracks" id="dz-t"></div>'; trackList(ctx, $('#dz-t', res), r, { name: q, stale: () => my !== token || ctx.stale() }); return; }
    const card = kind === 'album' ? alCard : kind === 'artist' ? arCard : plCard;
    res.innerHTML = `<div class="grid">${r.map(card).join('')}</div>`;
    reveal(res, '.card', { each: 0.03 });
  };

  input.addEventListener('input', debounce(() => run(input.value), 450));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  $('#dzk', ctx.root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    kind = b.dataset.k; store.set('dzKind', kind);
    $$('[data-k]', ctx.root).forEach((x) => x.classList.toggle('on', x === b));
    run(input.value);
  });
  await run(initial);
}

// =============================================================================================
// #/dz/<kind>/<id>
// =============================================================================================
export async function dzPage(ctx) {
  const [kind, id] = ctx.args;
  ctx.root.innerHTML = skeleton(1, 'hero') + skeleton(8, 'line');
  let d;
  if (kind === 'playlist') d = await dz.playlist(id);
  else if (kind === 'album') d = await dz.album(id);
  else if (kind === 'artist') d = await dz.artist(id);
  else if (kind === 'loved') d = await dz.loved();
  else throw new Error('Page Deezer inconnue');
  if (ctx.stale()) return;
  const title = d.title || d.name;
  ctx.title(title);
  const dur = (d.tracks || []).reduce((n, t) => n + (t.duration || 0), 0);
  const sub = kind === 'artist' ? 'Artiste · titres populaires' : [d.artist || d.owner, plural(d.tracks.length, 'titre', 'titres'), fmtLong(dur), d.year].filter(Boolean).join(' · ');
  ctx.root.innerHTML = `
    <section class="hero-block album-hero">
      ${img(d.cover, kind === 'artist' ? 'round xl' : 'sq xl')}
      <div class="hb-meta">
        <h1 class="title">${esc(title)}</h1>
        <p class="meta-line">${esc(sub)}</p>
        <div class="dz-stats" id="dzs"></div>
        ${bulkActions(kind)}
      </div>
    </section>
    <div class="tracks" id="dzt">${d.tracks.length ? '' : emptyState('list', 'Aucun titre')}</div>
    ${kind === 'artist' && d.albums.length ? `<section class="rowsec">${sectionHead('Albums')}<div class="hscroll">${d.albums.map(alCard).join('')}</div></section>` : ''}
    <div class="set-actions"><button class="chip tap" data-open>${icon('link')} Ouvrir dans Deezer</button></div>`;
  animateTitle($('.title', ctx.root));
  $('[data-open]', ctx.root).addEventListener('click', () => window.open(kind === 'loved' ? 'https://www.deezer.com/' : `https://www.deezer.com/${kind}/${id}`, '_blank'));
  if (d.tracks.length) await trackList(ctx, $('#dzt', ctx.root), d.tracks, { name: title, statsEl: $('#dzs', ctx.root), cover: d.cover, albumUrl: kind === 'album' ? `https://www.deezer.com/album/${id}` : '' });
}

// réglages Deezer + deemix (sections de la page Réglages)
const BITRATES = DMX_BITRATES;
const plLabel = () => {
  const v = settings.get('dmxPlaylist') || 'ask';
  return v === 'ask' ? 'Demander à chaque fois' : v === 'none' ? 'Aucune (bibliothèque seulement)' : `« ${settings.get('dmxPlaylistName') || 'Playlist'} »`;
};

export const deezerSettingsHtml = () => `
  <section class="card-box" id="set-deezer"><h4>Deezer</h4>
    <div class="set-row"><div class="lbl"><b>Menu Deezer</b><small>Catalogue, classements et import de playlists vers Navidrome</small></div><button class="switch tap ${settings.get('deezer') ? 'on' : ''}" data-tog="deezer" role="switch" aria-checked="${!!settings.get('deezer')}"><i></i></button></div>
    <div class="set-block"><div class="lbl"><b>ARL (compte Deezer)</b><small>Cookie « arl » de deezer.com. Sert à lire tes playlists et coups de cœur ; il reste sur ce téléphone, sauf si tu l'envoies à ton serveur deemix. Ne le partage jamais.</small></div>
      <input class="set-input" id="dz-arl" type="password" autocomplete="off" spellcheck="false" placeholder="${arl.ready ? '•••••• (enregistré)' : 'Colle ton ARL ici'}">
      <div class="set-actions"><button class="btn tap" data-dz-s="save">${icon('key')} Enregistrer</button><button class="btn tap" data-dz-s="test">${icon('check')} Tester</button>${arl.ready ? `<button class="btn tap" data-dz-s="del">${icon('trash')} Oublier</button>` : ''}</div>
    </div>
    <div class="set-row"><div class="lbl"><b>Correspondances</b><small>Titres Deezer déjà rapprochés de ta bibliothèque (cache local)</small></div><button class="btn tap" data-dz-s="forget">${icon('refresh')} Réinitialiser</button></div>
  </section>
  ${feat('f_deemix') ? `
  <section class="card-box" id="set-deemix"><h4>Serveur deemix</h4>
    <div class="note">${icon('info')}<span>Le service <b>opus-deemix</b> tourne sur ton serveur (voir <b>server/README-serveur.md</b>) : il télécharge depuis Deezer dans le dossier de musique de Navidrome. Télécharger depuis Deezer est contraire à leurs conditions d'utilisation : à toi de voir.</span></div>
    <div class="set-block"><div class="lbl"><b>Adresse du service</b><small>IP Tailscale de la LXC Navidrome et port du service (6596 par défaut)</small></div>
      <input class="set-input" id="dmx-url" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="http://100.91.164.116:6596" value="${esc(settings.get('dmxUrl') || '')}">
      <input class="set-input" id="dmx-tok" type="password" autocomplete="off" spellcheck="false" placeholder="${settings.get('dmxToken') ? '•••••• (jeton enregistré)' : 'Jeton (OPUS_TOKEN dans /etc/opus-deemix.env)'}">
      <div class="set-actions"><button class="btn tap" data-dz-s="dmx-save">${icon('check')} Enregistrer et tester</button>${dmx.configured ? `<a class="btn tap" href="#/deemix">${icon('cloud')} Téléchargements</a>` : ''}</div>
      <p class="sub" id="dmx-st" style="margin-top:10px"></p>
    </div>
    <div class="set-row"><div class="lbl"><b>ARL sur le serveur</b><small>deemix a besoin de ton ARL pour télécharger. Envoie celui enregistré ci-dessus (ou un autre).</small></div><button class="btn tap" data-dz-s="dmx-arl">${icon('key')} Envoyer</button></div>
    <div class="set-row"><div class="lbl"><b>Choisir à chaque téléchargement</b><small>Au lancement : qualité et playlist de destination, pré-remplies avec les choix ci-dessous</small></div><button class="switch tap ${settings.get('dmxAskEach') !== false ? 'on' : ''}" data-tog="dmxAskEach" role="switch" aria-checked="${settings.get('dmxAskEach') !== false}"><i></i></button></div>
    <div class="set-row"><div class="lbl"><b>Qualité par défaut</b><small>${esc((BITRATES.find((b) => b[0] === settings.get('dmxBitrate')) || BITRATES[0])[2])}</small></div><button class="btn tap" data-dz-s="dmx-br">${esc((BITRATES.find((b) => b[0] === settings.get('dmxBitrate')) || BITRATES[0])[1])} ${icon('down')}</button></div>
    <div class="set-row"><div class="lbl"><b>Playlist par défaut</b><small>Les titres téléchargés y sont ajoutés une fois dans Navidrome</small></div><button class="btn tap" data-dz-s="dmx-pl">${esc(plLabel())} ${icon('down')}</button></div>
  </section>` : ''}`;

async function dmxStatus(root) {
  const el = $('#dmx-st', root);
  if (!el || !dmx.configured) return;
  el.textContent = 'Test de la connexion…';
  try {
    const h = await dmx.health();
    const acc = h.account && !h.account.invalid ? `compte ${h.account.name || 'Deezer'} (${h.account.lossless ? 'FLAC' : h.account.hq ? 'MP3 320' : 'MP3 128'})` : h.account?.invalid ? 'ARL refusé par Deezer : renvoie un ARL valide' : h.arl ? 'ARL présent (non vérifié)' : 'aucun ARL : utilise « Envoyer » ci-dessous';
    el.innerHTML = `${icon('check')} Connecté · deemix ${h.deemix ? 'trouvé' : '<b>introuvable</b>'} · ${esc(acc)}${h.writable ? '' : ' · <b>dossier musique non accessible en écriture</b>'}`;
  } catch (e) { el.innerHTML = `${icon('close')} ${esc(e.message)}`; }
}

// à l'affichage de la page Réglages : état du serveur deemix
export function deezerSettingsMount(ctx) { dmxStatus(ctx.root); }

export async function deezerSettingsClick(e, ctx) {
  const b = e.target.closest('[data-dz-s]');
  if (!b) return false;
  const k = b.dataset.dzS;
  if (k === 'save') {
    const v = $('#dz-arl', ctx.root).value.trim();
    if (!v) { toast('Colle ton ARL d\'abord'); return true; }
    arl.set(v); $('#dz-arl', ctx.root).value = ''; toast('ARL enregistré');
    window.dispatchEvent(new Event('nv:refresh'));
  } else if (k === 'del') { arl.set(''); toast('ARL supprimé'); window.dispatchEvent(new Event('nv:refresh')); }
  else if (k === 'test') {
    try { const u = await me(); toast(`Connecté à Deezer : ${u.name}`); } catch (err) { toast('Échec : ' + err.message, 4000); }
  } else if (k === 'forget') {
    forgetMatches(); toast('Correspondances réinitialisées');
  } else if (k === 'dmx-save') {
    settings.set('dmxUrl', $('#dmx-url', ctx.root).value.trim());
    const t = $('#dmx-tok', ctx.root).value.trim();
    if (t) { settings.set('dmxToken', t); $('#dmx-tok', ctx.root).value = ''; $('#dmx-tok', ctx.root).placeholder = '•••••• (jeton enregistré)'; }
    if (!dmx.configured) { toast('Renseigne l\'adresse et le jeton'); return true; }
    await dmxStatus(ctx.root);
    watchJobs();
  } else if (k === 'dmx-arl') {
    if (!dmx.configured) { toast('Configure d\'abord l\'adresse et le jeton'); return true; }
    let v = arl.get();
    if (!v) v = (await askText('ARL à envoyer au serveur', { placeholder: 'Colle ton ARL', ok: 'Envoyer' })) || '';
    if (!v) return true;
    try {
      const r = await dmx.sendArl(v);
      toast(r.account ? `ARL accepté : ${r.account.name || 'compte Deezer'} (${r.account.lossless ? 'FLAC' : r.account.hq ? 'MP3 320' : 'MP3 128'})` : 'ARL enregistré sur le serveur (Deezer injoignable pour le vérifier)', 4200);
      dmxStatus(ctx.root);
    } catch (err) { toast('Refusé : ' + err.message, 4200); }
  } else if (k === 'dmx-br') {
    const v = await openSheet({ title: 'Qualité deemix', items: BITRATES.map(([id, l, sub]) => ({ id, label: l, sub, active: (settings.get('dmxBitrate') || 'auto') === id })) });
    if (v) { settings.set('dmxBitrate', v); b.innerHTML = `${esc(BITRATES.find((x) => x[0] === v)[1])} ${icon('down')}`; b.closest('.set-row').querySelector('small').textContent = BITRATES.find((x) => x[0] === v)[2]; }
  } else if (k === 'dmx-pl') {
    const cur = settings.get('dmxPlaylist') || 'ask';
    const v = await openSheet({ title: 'Playlist de destination', items: [
      { id: 'ask', icon: 'list', label: 'Demander à chaque fois', active: cur === 'ask' },
      { id: 'none', icon: 'close', label: 'Aucune', sub: 'Bibliothèque seulement', active: cur === 'none' },
      { id: 'pick', icon: 'plus', label: 'Toujours la même playlist…', active: !['ask', 'none'].includes(cur), sub: !['ask', 'none'].includes(cur) ? settings.get('dmxPlaylistName') : '' },
    ] });
    if (!v) return true;
    if (v === 'pick') {
      const t = await pickTarget({ force: true });
      if (!t) return true;
      let id = t.id;
      if (t.create) { try { id = (await api.createPlaylist(t.name)).id; } catch (err) { toast('Erreur : ' + err.message); return true; } }
      settings.set('dmxPlaylist', id); settings.set('dmxPlaylistName', t.name);
    } else settings.set('dmxPlaylist', v);
    b.innerHTML = `${esc(plLabel())} ${icon('down')}`;
  }
  return true;
}
