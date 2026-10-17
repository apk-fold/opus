// Blocs d'interface réutilisables (cartes, lignes de titres, titres de section).
import { api } from './api.js';
import { downloads } from './downloads.js';
import { player, coverFor } from './player.js';
import { esc, fmtTime } from './ui.js';
import { icon } from './icons.js';

export const cover = (o, size = 300) => coverFor(o, size);

export const coverBox = (o, size = 300, cls = '') => {
  const src = cover(o, size);
  return `<div class="cov ${cls}">${src ? `<img class="cv" loading="lazy" decoding="async" alt="" src="${esc(src)}">` : ''}</div>`;
};

export function albumCard(a) {
  const name = a.name || a.title || '';
  return `
  <a class="card tap" href="#/album/${esc(a.id)}" data-card>
    <div class="cov sq">
      ${cover(a) ? `<img class="cv" loading="lazy" decoding="async" alt="" src="${esc(cover(a))}">` : ''}
      <button class="fab tap" data-act="play-album" data-id="${esc(a.id)}" aria-label="Lire ${esc(name)}">${icon('play')}</button>
    </div>
    <div class="c-t">${esc(name)}</div>
    <div class="c-s">${esc(a.artist || '')}${a.year ? ' · ' + a.year : ''}</div>
  </a>`;
}

export function artistCard(a) {
  const initials = esc((a.name || '?').trim().slice(0, 2).toUpperCase());
  const src = a.coverArt ? api.coverUrl(a.coverArt, 300) : '';
  return `
  <a class="card artist tap" href="#/artist/${esc(a.id)}">
    <div class="cov round" data-ini="${initials}">${src ? `<img class="cv" loading="lazy" decoding="async" alt="" src="${esc(src)}">` : ''}</div>
    <div class="c-t">${esc(a.name)}</div>
    <div class="c-s">${a.albumCount ? a.albumCount + ' album' + (a.albumCount > 1 ? 's' : '') : ''}</div>
  </a>`;
}

export function playlistCard(p) {
  const src = p.coverArt ? api.coverUrl(p.coverArt, 300) : '';
  return `
  <a class="card tap" href="#/playlist/${esc(p.id)}">
    <div class="cov sq">${src ? `<img class="cv" loading="lazy" decoding="async" alt="" src="${esc(src)}">` : ''}
      <button class="fab tap" data-act="play-playlist" data-id="${esc(p.id)}" aria-label="Lire ${esc(p.name)}">${icon('play')}</button></div>
    <div class="c-t">${esc(p.name)}</div>
    <div class="c-s">${p.songCount ?? 0} titre${p.songCount > 1 ? 's' : ''}</div>
  </a>`;
}

/**
 * Ligne de titre.
 * opts: { list, i, num (numéro à afficher), cover (bool), artist (bool), album (bool) }
 */
export function songRow(s, { list, i, num, showCover = false, showArtist = true, showAlbum = false } = {}) {
  const cur = player.current?.id === s.id;
  const sub = [showArtist ? s.artist : null, showAlbum ? s.album : null].filter(Boolean).map(esc).join(' · ');
  const left = showCover
    ? coverBox(s, 96, 'xs')
    : `<div class="num"><span class="n">${num ?? i + 1}</span><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>`;
  return `
  <div class="row tap ripple ${cur ? 'playing' : ''}" data-act="play" data-list="${list}" data-i="${i}" data-id="${esc(s.id)}">
    ${left}
    <div class="meta"><div class="t">${esc(s.title)}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>
    ${s.starred ? `<span class="mini-heart">${icon('heartFill')}</span>` : ''}
    ${downloads.has(s.id) ? `<span class="mini-dl">${icon('phone')}</span>` : ''}
    <span class="dur">${fmtTime(s.duration)}</span>
    <button class="ic-btn tap" data-act="song-menu" data-list="${list}" data-i="${i}" aria-label="Plus d'options">${icon('dots')}</button>
  </div>`;
}

export const sectionHead = (title, link) =>
  `<div class="sec-head"><h3>${esc(title)}</h3>${link ? `<a class="tap" href="${esc(link)}">Tout voir ${icon('right')}</a>` : ''}</div>`;

export const skeleton = (n = 8, kind = 'card') =>
  `<div class="skel-wrap">${Array.from({ length: n }, () => `<div class="skel ${kind}"></div>`).join('')}</div>`;

export const emptyState = (ic, title, text = '') =>
  `<div class="empty">${icon(ic)}<h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}</div>`;
