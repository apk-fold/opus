// Pages « outils » : Gestes et raccourcis, Détection des doublons, Import Spotify / YouTube.
// Mêmes conventions que views.js (ctx).
import { api } from './api.js';
import { player } from './player.js';
import { settings, store } from './store.js';
import { $, $$, esc, plural, toast, haptic, fmtTime, fmtSize, isNative } from './ui.js';
import { icon } from './icons.js';
import { emptyState, coverBox } from './components.js';
import { reg, go } from './actions.js';
import { openSheet } from './sheets.js';
import { reveal, animateTitle } from './fx.js';
import { feat } from './flags.js';
import { G_OPTIONS, gLabel, quickMenu } from './gestures.js';
import { importLink, deezerEquivalent } from './importers.js';
import { trackList, bulkActions } from './views-deezer.js';
import { dz, dzGet } from './deezer.js';

const pageHead = (title, sub = '') => `<div class="page-head"><h1 class="title">${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>`;
const tog = (key, label, sub = '') => `<div class="set-row"><div class="lbl"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div><button class="switch tap ${settings.get(key) !== false ? 'on' : ''}" data-gt="${key}" role="switch" aria-checked="${settings.get(key) !== false}"><i></i></button></div>`;
const pick = (key) => `<div class="set-row"><div class="lbl"><b>${esc(cap(G_OPTIONS[key].title.split(' · ')[1] || G_OPTIONS[key].title))}</b><small>${esc((G_OPTIONS[key].options.find(([v]) => v === settings.get(key)) || G_OPTIONS[key].options[0])[2] || '')}</small></div><button class="btn tap" data-gp="${key}">${esc(gLabel(key))} ${icon('down')}</button></div>`;
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const demo = (ic, html) => `<div class="g-demo">${icon(ic)}<span>${html}</span></div>`;

// =============================================================================================
// Thème (utilisé aussi dans Réglages › Apparence)
// =============================================================================================
export const THEME_LIST = [['dark', 'Sombre'], ['amoled', 'AMOLED'], ['light', 'Clair']];
export const themePicker = () => `
  <div class="set-block"><div class="lbl"><b>Thème</b><small>AMOLED : noir pur, les pixels s'éteignent (batterie, écran du Fold) · Clair : pour le plein jour</small></div>
    <div class="theme-pick">${THEME_LIST.map(([id, l]) => `<button class="tap ${(settings.get('theme') || 'dark') === id ? 'on' : ''}" data-theme="${id}"><i></i>${l}</button>`).join('')}</div>
  </div>`;
export function themeClick(e, root) {
  const b = e.target.closest('[data-theme]');
  if (!b) return false;
  settings.set('theme', b.dataset.theme);
  $$('[data-theme]', root).forEach((x) => x.classList.toggle('on', x === b));
  haptic('light');
  return true;
}

// =============================================================================================
// #/gestures : gestes et raccourcis
// =============================================================================================
export async function gesturesView(ctx) {
  ctx.title('Gestes et raccourcis');
  const draw = () => {
    const on = feat('f_touch');
    ctx.root.innerHTML = `
      ${pageHead('Gestes et raccourcis', 'Comme sur iPhone : moins de petits boutons à viser')}
      <section class="card-box"><h4>${icon('hand')} Général</h4>
        ${tog('f_touch', 'Gestes activés', 'Tirer, glisser, appui long, double tap')}
        ${demo('down', '<b>Tirer vers le bas</b> en haut de n\'importe quelle page : son menu ⋯ s\'ouvre (album, playlist, hors-ligne, dossier…), sinon les raccourcis.')}
        ${demo('dots', '<b>Appui long</b> sur un titre, un album, une playlist ou un artiste : son menu, sans viser le petit bouton.')}
      </section>
      <div ${on ? '' : 'class="dim-off"'}>
      <section class="card-box"><h4>${icon('disc')} Lecteur</h4>
        ${pick('g_npDown')}
        ${pick('g_npUp')}
        ${pick('g_coverTap2')}
        ${tog('g_coverSwipe', 'Glisser la pochette', 'Vers la gauche : titre suivant · vers la droite : précédent')}
        ${tog('f_gestures', 'Gestes du mini-lecteur', 'Glisser à gauche / droite pour changer de titre, vers le haut pour ouvrir')}
      </section>
      <section class="card-box"><h4>${icon('list')} Pages et listes</h4>
        ${pick('g_pull')}
        ${tog('g_long', 'Appui long = menu', 'Sur les titres, albums, playlists, artistes, la file d\'attente')}
        ${pick('g_rowRight')}
        ${pick('g_rowLeft')}
      </section>
      </div>
      <section class="card-box"><h4>${icon('grid')} Raccourcis</h4>
        <div class="set-row"><div class="lbl"><b>Menu rapide</b><small>Flow, mix aléatoire, recherche, hors-ligne, import, thème…</small></div><button class="btn tap" data-g="quick">${icon('grid')} Ouvrir</button></div>
        ${demo('phone', '<b>Appui long sur l\'icône Opus</b> (écran d\'accueil Android) : Flow, Hors-ligne, Recherche. Tu peux faire glisser chacun sur l\'écran d\'accueil.')}
        ${demo('layout', '<b>Widget</b> : appui long sur l\'écran d\'accueil › Widgets › Opus. Titre en cours, précédent / lecture / suivant, et accès direct au Flow, au hors-ligne et à la recherche.')}
      </section>`;
  };
  draw();
  animateTitle($('.title', ctx.root));
  reveal(ctx.root, '.card-box', { each: 0.06 });
  ctx.onClick(async (e) => {
    const t = e.target.closest('[data-gt]');
    if (t) { const k = t.dataset.gt; settings.set(k, settings.get(k) === false); haptic('light'); draw(); return; }
    const p = e.target.closest('[data-gp]');
    if (p) {
      const k = p.dataset.gp, cfg = G_OPTIONS[k];
      const v = await openSheet({ title: cfg.title, items: cfg.options.map(([val, l, sub]) => ({ id: val, label: l, sub, active: settings.get(k) === val })) });
      if (v) { settings.set(k, v); draw(); }
      return;
    }
    if (e.target.closest('[data-g="quick"]')) quickMenu();
  });
}

// =============================================================================================
// #/dupes : détection des doublons (même titre en plusieurs exemplaires ou qualités)
// =============================================================================================
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const nrm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s*[([][^)\]]*\b(feat|ft|with|remaster(ed)?|explicit|clean|album version|bonus track|deluxe)\b[^)\]]*[)\]]/g, '')
  .replace(/\s+-\s+.*\b(remaster(ed)?|album version)\b.*$/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
const mainArtist = (s) => nrm(String(s || '').split(/,|&| feat\.? | ft\.? | x | et /i)[0]);
const LOSSLESS = /^(flac|alac|wav|aiff?|ape|wv|dsf)$/i;
const quality = (s) => (LOSSLESS.test(s.suffix || '') ? 1e7 : 0) + (s.bitDepth || 0) * 1e5 + (s.samplingRate || 0) / 10 + (s.bitRate || 0);
const fmtQ = (s) => [String(s.suffix || '?').toUpperCase(), s.bitDepth ? `${s.bitDepth} bits` : '', s.samplingRate ? `${(s.samplingRate / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kHz` : '', s.bitRate ? `${s.bitRate} kbps` : ''].filter(Boolean).join(' · ');

async function allSongs(onProgress, stale) {
  const size = 500;
  const page = async (query, off) => arr((await api.call('search3', { query, songCount: size, songOffset: off, artistCount: 0, albumCount: 0 })).searchResult3?.song);
  let query = '';
  let first = await page(query, 0);
  if (!first.length) { query = '""'; first = await page(query, 0); } // certains serveurs veulent "" littéral
  const out = [...first];
  const seen = new Set(out.map((s) => s.id));
  onProgress(out.length);
  for (let off = size; first.length === size && off < 300000 && !stale(); off += size) {
    const p = await page(query, off);
    const fresh = p.filter((s) => !seen.has(s.id));
    fresh.forEach((s) => seen.add(s.id));
    out.push(...fresh);
    onProgress(out.length);
    if (p.length < size || !fresh.length) break;
  }
  return out;
}

export function findDupes(songs) {
  const byKey = new Map();
  for (const s of songs) {
    if (!s.title) continue;
    const k = mainArtist(s.artist || s.albumArtist) + '|' + nrm(s.title);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(s);
  }
  const groups = [];
  for (const [k, list] of byKey) {
    if (list.length < 2) continue;
    // même titre mais durées très différentes (live, version longue…) : ce n'est pas un doublon
    const sorted = list.slice().sort((a, b) => (a.duration || 0) - (b.duration || 0));
    let cur = [sorted[0]];
    const flush = () => { if (cur.length > 1) groups.push({ key: k + '|' + Math.round((cur[0].duration || 0) / 10), songs: cur.slice().sort((a, b) => quality(b) - quality(a)) }); };
    for (const s of sorted.slice(1)) {
      if (Math.abs((s.duration || 0) - (cur[cur.length - 1].duration || 0)) <= 4) cur.push(s);
      else { flush(); cur = [s]; }
    }
    flush();
  }
  for (const g of groups) {
    const q = g.songs.map((s) => `${String(s.suffix).toLowerCase()}:${Math.round((s.bitRate || 0) / 32)}`);
    g.mixed = new Set(q).size > 1; // qualités différentes
    g.waste = g.songs.slice(1).reduce((n, s) => n + (s.size || 0), 0);
  }
  return groups.sort((a, b) => b.songs.length - a.songs.length || b.waste - a.waste);
}

export async function dupesView(ctx) {
  ctx.title('Doublons');
  const ignored = new Set(store.get('dupIgnore', []) || []);
  let filter = 'all', groups = [];
  ctx.root.innerHTML = `
    ${pageHead('Doublons', 'Même titre en plusieurs exemplaires ou qualités')}
    <div class="note" id="dp-st">${icon('refresh')}<span>Lecture de toute la bibliothèque… <b id="dp-n">0</b> titres</span></div>
    <div id="dp"></div>`;
  animateTitle($('.title', ctx.root));
  const songs = await allSongs((n) => { const el = $('#dp-n', ctx.root); if (el) el.textContent = n.toLocaleString('fr-FR'); }, ctx.stale);
  if (ctx.stale()) return;
  groups = findDupes(songs);
  const draw = () => {
    const vis = groups.filter((g) => !ignored.has(g.key) && (filter === 'all' || (filter === 'mixed' ? g.mixed : !g.mixed)));
    const total = groups.filter((g) => !ignored.has(g.key));
    const extra = total.reduce((n, g) => n + g.songs.length - 1, 0), waste = total.reduce((n, g) => n + g.waste, 0);
    $('#dp-st', ctx.root).innerHTML = `${icon('info')}<span><b>${plural(total.length, 'titre en double', 'titres en double')}</b> sur ${songs.length.toLocaleString('fr-FR')} · ${plural(extra, 'copie en trop', 'copies en trop')}${waste ? ` · ${fmtSize(waste)} récupérables` : ''}. La meilleure qualité est en tête de chaque groupe ; supprime les autres fichiers sur ton serveur (le chemin est indiqué).</span>`;
    $('#dp', ctx.root).innerHTML = `
      <div class="chips" style="margin:0 0 14px">${[['all', 'Tous'], ['mixed', 'Qualités différentes'], ['same', 'Copies identiques']].map(([k, l]) => `<button class="chip tap ${filter === k ? 'on' : ''}" data-df="${k}">${l}</button>`).join('')}${ignored.size ? `<button class="chip tap" data-df="reset">${icon('refresh')} Ignorés (${ignored.size})</button>` : ''}</div>
      ${vis.length ? vis.slice(0, 300).map((g, gi) => {
        const key = reg(g.songs);
        const s0 = g.songs[0];
        return `<section class="card-box dupe" data-dk="${esc(g.key)}">
          <div class="dupe-head">${coverBox(s0, 96, 'xs')}<div class="meta"><b>${esc(s0.title)}</b><span>${esc(s0.artist || '')} · ${plural(g.songs.length, 'exemplaire', 'exemplaires')}${g.mixed ? ' · qualités différentes' : ''}</span></div>
            <button class="ic-btn tap" data-dig="${esc(g.key)}" aria-label="Pas un doublon">${icon('close')}</button></div>
          ${g.songs.map((s, i) => `
          <div class="row tap ripple dupe-row ${i === 0 ? 'best' : ''}" data-act="play" data-list="${key}" data-i="${i}" data-id="${esc(s.id)}">
            <div class="num"><span class="n">${i === 0 ? icon('starFill') : i + 1}</span></div>
            <div class="meta"><div class="t">${esc(fmtQ(s))}</div><div class="s">${i === 0 ? '<em>Meilleure qualité</em> · ' : ''}${esc([s.album, s.year, s.size ? fmtSize(s.size) : ''].filter(Boolean).join(' · '))}</div>${s.path ? `<div class="s path">${esc(s.path)}</div>` : ''}</div>
            <span class="dur">${fmtTime(s.duration)}</span>
            <button class="ic-btn tap" data-act="song-menu" data-list="${key}" data-i="${i}" aria-label="Plus d'options">${icon('dots')}</button>
          </div>`).join('')}
        </section>`;
      }).join('') : emptyState('check', groups.length ? 'Rien dans ce filtre' : 'Aucun doublon', groups.length ? '' : 'Chaque titre n\'existe qu\'une fois dans ta bibliothèque.')}`;
    reveal($('#dp', ctx.root), '.dupe', { each: 0.03 });
  };
  draw();
  ctx.menu(async () => {
    const c = await openSheet({ title: 'Doublons', items: [{ id: 'copy', icon: 'share', label: 'Copier la liste des fichiers en trop' }, { id: 'reset', icon: 'refresh', label: 'Réafficher les groupes ignorés' }, { id: 'scan', icon: 'refresh', label: 'Relancer l\'analyse' }] });
    if (c === 'copy') {
      const text = groups.filter((g) => !ignored.has(g.key)).flatMap((g) => g.songs.slice(1).map((s) => s.path || `${s.artist} - ${s.title} (${s.album})`)).join('\n');
      try { await navigator.clipboard.writeText(text); toast('Liste copiée'); } catch { toast('Copie impossible'); }
    } else if (c === 'reset') { ignored.clear(); store.set('dupIgnore', []); draw(); }
    else if (c === 'scan') window.dispatchEvent(new Event('nv:refresh'));
  });
  ctx.onClick((e) => {
    const f = e.target.closest('[data-df]');
    if (f) {
      if (f.dataset.df === 'reset') { ignored.clear(); store.set('dupIgnore', []); } else filter = f.dataset.df;
      draw(); return;
    }
    const ig = e.target.closest('[data-dig]');
    if (ig) {
      ignored.add(ig.dataset.dig);
      store.set('dupIgnore', [...ignored].slice(-2000));
      haptic('light');
      toast('Groupe ignoré');
      draw();
    }
  });
}

// =============================================================================================
// #/import : playlist Spotify / YouTube / YouTube Music (ou liste collée) → bibliothèque + deemix
// =============================================================================================
export async function importView(ctx) {
  ctx.title('Importer une playlist');
  const recent = store.get('imports', []) || [];
  const initial = ctx.q.get('u') || '';
  ctx.root.innerHTML = `
    ${pageHead('Importer une playlist', 'Spotify, YouTube, YouTube Music ou Deezer')}
    <section class="card-box imp-box">
      <textarea class="set-input imp-in" id="imp" rows="2" autocomplete="off" spellcheck="false" placeholder="Colle un lien de playlist… ou une liste « Artiste - Titre » (une ligne par titre)">${esc(initial)}</textarea>
      <div class="set-actions"><button class="btn primary glow tap" data-imp="go">${icon('link')} Importer</button><button class="btn tap" data-imp="paste">${icon('download')} Coller</button></div>
      <p class="sub imp-help">Les titres sont cherchés dans ta bibliothèque Navidrome. Ceux qui manquent peuvent être téléchargés par deemix (bouton nuage), puis tout peut devenir une playlist Navidrome.${isNative() ? '' : ' <b>Dans le navigateur</b>, Spotify et YouTube bloquent la lecture : colle une liste de titres, ou utilise l\'appli.'}</p>
    </section>
    <div id="imp-out">${recent.length ? `<section class="card-box"><h4>Récents</h4>${recent.map((r) => `<button class="set-row tap imp-recent" data-imp-u="${esc(r.url)}"><div class="lbl"><b>${esc(r.name)}</b><small>${esc(r.src)} · ${plural(r.count, 'titre', 'titres')}</small></div>${icon('right')}</button>`).join('')}</section>` : ''}</div>`;
  animateTitle($('.title', ctx.root));
  const out = $('#imp-out', ctx.root);
  const input = $('#imp', ctx.root);

  const run = async (text) => {
    text = String(text || '').trim();
    if (!text) { toast('Colle d\'abord un lien'); return; }
    out.innerHTML = `<div class="note">${icon('refresh')}<span>Lecture de la playlist…</span></div>`;
    let pl;
    try { pl = await importLink(text); } catch (err) { if (!ctx.stale()) out.innerHTML = `<div class="note warn">${icon('info')}<span>${esc(err.message)}</span></div>`; return; }
    if (ctx.stale()) return;
    if (pl.deezer) {
      let ref = pl.deezer;
      if (ref.kind === 'short') ref = await dz.resolveLink(ref.url) || ref;
      if (ref.kind === 'track') { try { const t = await dzGet('track/' + ref.id); go(`#/dz/album/${t.album.id}`); } catch { toast('Lien introuvable'); } }
      else if (ref.kind !== 'short') go(`#/dz/${ref.kind}/${ref.id}`);
      return;
    }
    if (!pl.tracks.length) { out.innerHTML = `<div class="note warn">${icon('info')}<span>Aucun titre trouvé dans cette playlist (privée ou vide ?).</span></div>`; return; }
    if (pl.url) store.set('imports', [{ url: pl.url, name: pl.name, src: pl.src, count: pl.tracks.length, at: Date.now() }, ...recent.filter((r) => r.url !== pl.url)].slice(0, 8));
    const dur = pl.tracks.reduce((n, t) => n + (t.duration || 0), 0);
    out.innerHTML = `
      <section class="hero-block album-hero">
        <div class="cov sq xl ${pl.cover ? '' : 'imp-cov'}">${pl.cover ? `<img class="cv" alt="" src="${esc(pl.cover)}">` : `<span class="imp-src">${icon('link')}</span>`}</div>
        <div class="hb-meta">
          <h1 class="title">${esc(pl.name)}</h1>
          <p class="meta-line">${esc([pl.src, pl.owner, plural(pl.tracks.length, 'titre', 'titres'), dur ? `${Math.round(dur / 60)} min` : ''].filter(Boolean).join(' · '))}</p>
          ${pl.partial ? `<p class="sub">${icon('info')} Seuls les 100 premiers titres sont lisibles sans compte.</p>` : ''}
          <div class="dz-stats" id="imps"></div>
          ${bulkActions('import')}
        </div>
      </section>
      <div class="tracks" id="impt"></div>`;
    animateTitle($('.title', out));
    ctx.title(pl.name);
    setTimeout(() => $('.hero-block', out)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    await trackList(ctx, $('#impt', out), pl.tracks, { name: pl.name, statsEl: $('#imps', out), cover: pl.cover, resolve: deezerEquivalent });
  };

  // écouteurs posés sur les éléments de la page (ctx.onClick est repris par la liste de titres)
  out.addEventListener('click', (e) => {
    const r = e.target.closest('[data-imp-u]');
    if (r) { input.value = r.dataset.impU; run(r.dataset.impU); }
  });
  $('.imp-box', ctx.root).addEventListener('click', async (e) => {
    const b = e.target.closest('[data-imp]');
    if (!b) return;
    if (b.dataset.imp === 'paste') {
      try { input.value = await navigator.clipboard.readText(); } catch { toast('Presse-papiers inaccessible : colle à la main'); return; }
      if (input.value.trim()) run(input.value);
      return;
    }
    run(input.value);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && /^\s*https?:|spotify:/i.test(input.value)) { e.preventDefault(); run(input.value); } });
  if (initial) run(initial);
}
