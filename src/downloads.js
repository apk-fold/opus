// Téléchargements hors-ligne (Android uniquement) via @capacitor/filesystem.
// L'emplacement est réglable (Réglages > Téléchargements) : dossier privé de l'appli, dossier de l'appli visible,
// ou dossiers publics du téléphone (Musique, Téléchargements, Documents) avec un sous-dossier au choix.
// L'index des titres est gardé dans localStorage ; chaque entrée retient son propre emplacement.
//
// Correctif (Filesystem 8) : downloadFile() ne crée plus les dossiers parents (l'option « recursive » est ignorée
// par l'implémentation Android), d'où l'échec systématique des téléchargements vers « music/… » et « covers/… ».
// On crée donc le dossier nous-mêmes avant chaque écriture, on vérifie le fichier reçu (une erreur Subsonic
// arrive en HTTP 200 et serait sinon enregistrée comme un faux MP3) et on remonte un message d'erreur lisible.
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { api } from './api.js';
import { store, settings } from './store.js';

const isNative = () => Capacitor.isNativePlatform();

// id → [libellé, Directory, préfixe de chemin, aide]
export const DL_LOCATIONS = {
  app: ['Privé (appli)', Directory.Data, '', 'Invisible pour les autres applis, supprimé avec Opus'],
  external: ['Dossier de l\'appli', Directory.External, '', 'Android/data/fr.naviviolet.app/files — visible avec un gestionnaire de fichiers'],
  music: ['Musique', Directory.ExternalStorage, 'Music', 'Dossier Musique du téléphone : visible par les autres lecteurs'],
  download: ['Téléchargements', Directory.ExternalStorage, 'Download', 'Dossier Téléchargements du téléphone'],
  documents: ['Documents', Directory.Documents, '', 'Dossier Documents du téléphone'],
};

const clean = (s, max = 80) => String(s ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, max) || '_';
const joinPath = (...p) => p.filter(Boolean).join('/').replace(/\/+/g, '/');
const parentOf = (p) => p.split('/').slice(0, -1).join('/');

export function locationOf(loc = settings.get('dlLocation')) {
  const [label, dir, base] = DL_LOCATIONS[loc] || DL_LOCATIONS.app;
  const sub = loc === 'app' ? '' : clean(settings.get('dlFolder') || 'Opus', 60);
  return { loc, label, dir, root: joinPath(base, sub) };
}

export function describeLocation(loc = settings.get('dlLocation')) {
  const l = locationOf(loc);
  const pre = { [Directory.Data]: '(privé)', [Directory.External]: 'Android/data/…/files', [Directory.ExternalStorage]: 'Stockage interne', [Directory.Documents]: 'Documents' }[l.dir];
  return [pre, l.root].filter(Boolean).join(' / ');
}

function relPath(song, ext) {
  const naming = settings.get('dlNaming');
  if (naming === 'id' || settings.get('dlLocation') === 'app') return joinPath('music', `${clean(song.id)}.${ext}`);
  const n = song.track ? String(song.track).padStart(2, '0') + ' - ' : '';
  if (naming === 'tree') return joinPath(clean(song.albumArtist || song.artist || 'Inconnu'), clean(song.album || 'Sans album'), `${n}${clean(song.title)}.${ext}`);
  return `${clean(song.artist || 'Inconnu')} - ${clean(song.title)} [${clean(song.id, 12)}].${ext}`;
}

const uriOf = async (path, directory) => (await Filesystem.getUri({ path, directory })).uri;
const srcOf = async (path, directory) => Capacitor.convertFileSrc(await uriOf(path, directory));

// crée le dossier parent (récursivement) ; « existe déjà » n'est pas une erreur
async function ensureParent(path, directory) {
  const dir = parentOf(path);
  if (!dir) return;
  try { await Filesystem.mkdir({ path: dir, directory, recursive: true }); }
  catch (e) { if (!/exist/i.test(String(e?.message || e))) throw e; }
}

const safeDelete = async (path, directory) => { try { await Filesystem.deleteFile({ path, directory }); } catch { /* absent */ } };

// message d'erreur lisible pour l'utilisateur
export function explain(e) {
  const m = String(e?.message || e || 'erreur inconnue');
  if (/ENOENT|No such file/i.test(m)) return 'dossier introuvable sur le téléphone';
  if (/EACCES|denied|permission/i.test(m)) return 'accès au stockage refusé (choisis « Privé » dans les Réglages)';
  if (/ENOSPC|space/i.test(m)) return 'plus de place sur le téléphone';
  if (/UnknownHost|Unable to resolve|ECONNREFUSED|failed to connect|timeout|timed out|Network/i.test(m)) return 'serveur injoignable (Tailscale actif ?)';
  return m.replace(/^Error downloading file:\s*/i, '');
}

// Wi-Fi uniquement : API Network Information de la WebView (Chrome Android)
export function onCellular() {
  const c = navigator.connection;
  return !!c && (c.type === 'cellular' || (c.type == null && c.saveData));
}

const progressFns = new Set();
let progressHandle = null;
async function listenProgress() {
  if (progressHandle || !isNative()) return;
  try { progressHandle = await Filesystem.addListener('progress', (p) => progressFns.forEach((f) => f(p))); } catch { /* ancien plugin */ }
}

// petit fichier reçu : est-ce une réponse d'erreur Subsonic au lieu de l'audio ?
async function serverError(path, directory, size) {
  if (size > 4096) return null;
  try {
    const r = await Filesystem.readFile({ path, directory, encoding: Encoding.UTF8 });
    const txt = String(r.data || '');
    if (!/subsonic-response|<html|"error"/i.test(txt)) return size < 512 ? 'fichier reçu vide ou incomplet' : null;
    let msg = '';
    try { msg = JSON.parse(txt)?.['subsonic-response']?.error?.message || ''; } catch { msg = /message="([^"]+)"/.exec(txt)?.[1] || ''; }
    return msg ? `refusé par le serveur : ${msg}` : 'refusé par le serveur (téléchargements autorisés pour ton compte Navidrome ?)';
  } catch { return null; }
}

export const downloads = {
  index: store.get('dl', {}),
  queue: [],          // titres en attente
  active: null,       // { song, bytes, total }
  failed: [],         // [{ song, error }] — dernière série
  lastError: '',

  get supported() { return isNative(); },
  get: (id) => downloads.index[id] || null,
  has: (id) => !!downloads.index[id],
  queued: (id) => downloads.active?.song.id === id || downloads.queue.some((s) => s.id === id),
  list: () => Object.values(downloads.index).sort((a, b) => b.at - a.at),
  totalSize: () => Object.values(downloads.index).reduce((n, d) => n + (d.size || 0), 0),
  save() { store.set('dl', downloads.index); },

  // playlists enregistrées hors-ligne : { id: { id, name, ids: [ordre des titres], at } }
  playlists: store.get('dlPl', {}) || {},
  savePl() { store.set('dlPl', downloads.playlists); },
  notePlaylist(p) {
    if (!p?.id || !p.ids?.length) return;
    downloads.playlists[p.id] = { id: p.id, name: p.name || 'Playlist', ids: [...new Set(p.ids)], at: Date.now() };
    downloads.savePl();
  },
  forgetPlaylist(id) { delete downloads.playlists[id]; downloads.savePl(); },
  playlistSongs(id) { return (downloads.playlists[id]?.ids || []).map((x) => downloads.index[x]?.song).filter(Boolean); },

  async ensurePermission() {
    const { dir } = locationOf();
    if (dir !== Directory.ExternalStorage && dir !== Directory.Documents) return true;
    try {
      const p = await Filesystem.checkPermissions();
      if (p.publicStorage === 'granted') return true;
      return (await Filesystem.requestPermissions()).publicStorage === 'granted';
    } catch { return true; }
  },

  async add(song, onProgress) {
    if (!isNative()) throw new Error('Le mode hors-ligne fonctionne uniquement dans l\'appli Android.');
    if (downloads.has(song.id)) return;
    const q = Number(settings.get('dlQuality')) || 0;
    const ext = q ? 'mp3' : String(song.suffix || 'mp3').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp3';
    const { dir, root, loc } = locationOf();
    const path = joinPath(root, relPath(song, ext));
    const url = q ? api.streamUrl(song.id, { bitrate: q }) : api.downloadUrl(song.id);
    await listenProgress();
    await ensureParent(path, dir);
    const fn = (p) => { if (p.url === url) onProgress?.(p.bytes, p.contentLength); };
    progressFns.add(fn);
    try {
      await Filesystem.downloadFile({ url, path, directory: dir, recursive: true, progress: !!onProgress, connectTimeout: 15000, readTimeout: 60000 });
    } catch (e) {
      await safeDelete(path, dir); // fichier partiel
      throw new Error(explain(e));
    } finally { progressFns.delete(fn); }

    let size = 0;
    try { size = (await Filesystem.stat({ path, directory: dir })).size || 0; } catch { /* taille inconnue */ }
    const bad = await serverError(path, dir, size);
    if (bad) { await safeDelete(path, dir); throw new Error(bad); }

    let cover = null;
    if (song.coverArt) {
      try {
        // les pochettes restent dans le dossier privé (n'encombrent pas la galerie du téléphone)
        const coverPath = `covers/${String(song.coverArt).replace(/[^a-z0-9_-]/gi, '_')}.jpg`;
        await ensureParent(coverPath, Directory.Data);
        await Filesystem.downloadFile({ url: api.coverUrl(song.coverArt, 600), path: coverPath, directory: Directory.Data, recursive: true });
        cover = await srcOf(coverPath, Directory.Data);
      } catch { cover = null; }
    }
    downloads.index[song.id] = { song, src: await srcOf(path, dir), path, dir, loc, cover, size: size || song.size || 0, at: Date.now(), q };
    downloads.save();
  },

  async remove(id) {
    const d = downloads.index[id];
    if (!d) return;
    await safeDelete(d.path, d.dir || Directory.Data);
    delete downloads.index[id];
    downloads.save();
  },

  async removeAll() {
    for (const id of Object.keys(downloads.index)) await downloads.remove(id);
  },

  // déplace tous les fichiers vers l'emplacement actuellement choisi dans les réglages
  async moveAll(onStep) {
    const target = locationOf();
    const items = downloads.list().filter((d) => (d.loc || 'app') !== target.loc || !d.path.startsWith(target.root));
    let i = 0, failed = 0;
    for (const d of items) {
      onStep?.(++i, items.length);
      const ext = (d.path.split('.').pop() || 'mp3');
      const to = joinPath(target.root, relPath(d.song, ext));
      try {
        await ensureParent(to, target.dir);
        await Filesystem.copy({ from: d.path, directory: d.dir || Directory.Data, to, toDirectory: target.dir });
        await safeDelete(d.path, d.dir || Directory.Data);
        Object.assign(d, { path: to, dir: target.dir, loc: target.loc, src: await srcOf(to, target.dir) });
      } catch { failed++; }
    }
    downloads.save();
    return { moved: items.length - failed, failed };
  },

  // vérifie que les fichiers existent encore (supprimés à la main depuis un gestionnaire de fichiers…)
  async verify() {
    if (!isNative()) return 0;
    let lost = 0;
    for (const [id, d] of Object.entries(downloads.index)) {
      try { await Filesystem.stat({ path: d.path, directory: d.dir || Directory.Data }); }
      catch { delete downloads.index[id]; lost++; }
    }
    if (lost) downloads.save();
    return lost;
  },
};
