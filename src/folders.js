// Dossiers de playlists : rangement local (sur ce téléphone) des playlists Navidrome.
// Subsonic ne connaît pas les dossiers, on garde donc { id, name, ids: [ids de playlists] } dans le stockage local.
import { api } from './api.js';
import { player } from './player.js';
import { store, settings } from './store.js';
import { esc, toast, haptic, plural } from './ui.js';
import { icon } from './icons.js';
import { feat } from './flags.js';
import { openSheet, askText } from './sheets.js';
import { go, downloadSongs } from './actions.js';

const KEY = 'plFolders';
const read = () => (store.get(KEY, []) || []).filter((f) => f && f.id);
const write = (v) => { store.set(KEY, v); window.dispatchEvent(new Event('nv:folders')); };

export const folders = {
  list: read,
  get: (id) => read().find((f) => f.id === id) || null,
  create(name) {
    const f = { id: 'f' + Date.now().toString(36), name: name.trim() || 'Dossier', ids: [], at: Date.now() };
    write([...read(), f]);
    return f;
  },
  rename(id, name) { write(read().map((f) => (f.id === id ? { ...f, name } : f))); },
  remove(id) { write(read().filter((f) => f.id !== id)); },
  folderOf: (plId) => read().find((f) => f.ids.includes(plId)) || null,
  // range une playlist dans un dossier (null = hors dossier) ; une playlist n'est que dans un dossier
  move(plId, folderId) {
    write(read().map((f) => ({ ...f, ids: f.id === folderId ? [...new Set([...f.ids, plId])] : f.ids.filter((x) => x !== plId) })));
  },
  // retire les playlists supprimées du serveur
  prune(existing) {
    const ok = new Set(existing);
    const cur = read();
    const next = cur.map((f) => ({ ...f, ids: f.ids.filter((x) => ok.has(x)) }));
    if (JSON.stringify(next) !== JSON.stringify(cur)) write(next);
  },
};

// carte « dossier » : mosaïque des pochettes des premières playlists
export function folderCard(f, byId) {
  const pls = f.ids.map((id) => byId.get(id)).filter(Boolean);
  const covers = pls.filter((p) => p.coverArt).slice(0, 4).map((p) => api.coverUrl(p.coverArt, 150));
  const mosaic = covers.length >= 4
    ? `<div class="mosaic">${covers.map((c) => `<img class="cv" loading="lazy" alt="" src="${esc(c)}">`).join('')}</div>`
    : covers.length ? `<img class="cv" loading="lazy" alt="" src="${esc(covers[0])}">` : '';
  return `
  <a class="card folder tap" href="#/playlists?f=${esc(f.id)}" data-folder="${esc(f.id)}">
    <div class="cov sq">${mosaic}<span class="fold-ic">${icon('folder')}</span></div>
    <div class="c-t">${esc(f.name)}</div>
    <div class="c-s">${plural(pls.length, 'playlist', 'playlists')}</div>
  </a>`;
}

// choisir le dossier d'une playlist
export async function moveToFolder(plId, plName = 'Playlist') {
  const cur = folders.folderOf(plId);
  const list = folders.list();
  const c = await openSheet({
    title: 'Ranger dans un dossier', subtitle: plName,
    items: [
      ...list.map((f) => ({ id: f.id, icon: 'folder', label: f.name, sub: plural(f.ids.length, 'playlist', 'playlists'), active: cur?.id === f.id })),
      { id: '__new', icon: 'plus', label: 'Nouveau dossier…' },
      ...(cur ? [{ id: '__out', icon: 'close', label: 'Sortir du dossier', sub: cur.name }] : []),
    ],
  });
  if (!c) return false;
  if (c === '__out') { folders.move(plId, null); toast('Playlist sortie du dossier'); return true; }
  let fid = c;
  if (c === '__new') {
    const name = await askText('Nouveau dossier', { placeholder: 'Nom du dossier', ok: 'Créer' });
    if (!name) return false;
    fid = folders.create(name).id;
  }
  folders.move(plId, fid);
  haptic('light');
  toast(`Rangée dans « ${folders.get(fid)?.name} »`);
  return true;
}

// menu d'une playlist (appui long sur sa carte)
export async function playlistMenu(id) {
  const p = await api.playlist(id);
  const c = await openSheet({
    title: p.name, subtitle: plural(p.entry.length, 'titre', 'titres'), cover: p.coverArt ? api.coverUrl(p.coverArt, 96) : '',
    items: [
      { id: 'play', icon: 'play', label: 'Lire' },
      { id: 'shuffle', icon: 'shuffle', label: 'Lecture aléatoire' },
      { id: 'next', icon: 'play', label: 'Lire ensuite' },
      { id: 'queue', icon: 'queue', label: 'Ajouter à la file d\'attente' },
      ...(feat('f_folders') ? [{ id: 'folder', icon: 'folder', label: 'Ranger dans un dossier…', sub: folders.folderOf(id)?.name || '' }] : []),
      ...(feat('f_dlLocal') ? [{ id: 'dl', icon: 'phone', label: 'Télécharger (hors-ligne)' }] : []),
      { id: 'open', icon: 'list', label: 'Ouvrir la playlist' },
    ],
  });
  if (!p.entry.length && ['play', 'shuffle', 'next', 'queue', 'dl'].includes(c)) { toast('Playlist vide'); return; }
  if (c === 'play') player.playQueue(p.entry, 0);
  else if (c === 'shuffle') player.playQueue(p.entry, 0, { shuffle: true });
  else if (c === 'next') { [...p.entry].reverse().forEach((s) => player.addNext(s)); toast('Playlist lue ensuite'); }
  else if (c === 'queue') { player.addEnd(p.entry); toast('Playlist ajoutée à la file'); }
  else if (c === 'folder') { if (await moveToFolder(id, p.name)) window.dispatchEvent(new Event('nv:refresh')); }
  else if (c === 'dl') downloadSongs(p.entry, { playlist: { id, name: p.name } });
  else if (c === 'open') go('#/playlist/' + id);
}

// menu d'un dossier
export async function folderMenu(f, all) {
  const others = all.filter((p) => !f.ids.includes(p.id));
  const c = await openSheet({
    title: f.name, subtitle: 'Dossier',
    items: [
      { id: 'playall', icon: 'play', label: 'Tout lire', sub: 'Les playlists du dossier, à la suite' },
      { id: 'shuffle', icon: 'shuffle', label: 'Tout en aléatoire' },
      ...(others.length ? [{ id: 'add', icon: 'plus', label: 'Ajouter une playlist…' }] : []),
      { id: 'rename', icon: 'sliders', label: 'Renommer' },
      { id: 'delete', icon: 'trash', label: 'Supprimer le dossier', sub: 'Les playlists ne sont pas supprimées', danger: true },
    ],
  });
  if (c === 'playall' || c === 'shuffle') {
    const lists = await Promise.all(f.ids.map((id) => api.playlist(id).catch(() => null)));
    const songs = lists.filter(Boolean).flatMap((p) => p.entry);
    if (!songs.length) { toast('Dossier vide'); return; }
    player.playQueue(songs, 0, { shuffle: c === 'shuffle' });
  } else if (c === 'add') {
    const pick = await openSheet({ title: `Ajouter à « ${f.name} »`, items: others.map((p) => ({ id: p.id, icon: 'list', label: p.name, sub: folders.folderOf(p.id)?.name ? `dans « ${folders.folderOf(p.id).name} »` : plural(p.songCount || 0, 'titre', 'titres') })) });
    if (pick) { folders.move(pick, f.id); window.dispatchEvent(new Event('nv:refresh')); }
  } else if (c === 'rename') {
    const n = await askText('Renommer le dossier', { value: f.name, ok: 'Renommer' });
    if (n) { folders.rename(f.id, n); window.dispatchEvent(new Event('nv:refresh')); }
  } else if (c === 'delete') {
    folders.remove(f.id);
    toast('Dossier supprimé (les playlists restent)');
    go('#/playlists');
  }
}

export const foldersOn = () => feat('f_folders') && settings.get('f_folders') !== false;
