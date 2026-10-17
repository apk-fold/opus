// Actions partagées : lecture, favoris, playlists, téléchargements, menus contextuels + délégation des clics.
import { api } from './api.js';
import { player, coverFor } from './player.js';
import { downloads, onCellular, explain } from './downloads.js';
import { settings } from './store.js';
import { openSheet, askText } from './sheets.js';
import { toast, haptic, plural, $, $$, esc } from './ui.js';
import { burst } from './fx.js';
import { icon } from './icons.js';
import { shareItem, openEq } from './features.js';
import { feat } from './flags.js';
import { bans } from './bans.js';
import { songRadio, artistRadio, flowBatch, MOODS } from './discover.js';

// ---------- registre des listes affichées (pour retrouver les titres depuis un clic) ----------
const lists = new Map();
let seq = 0;
export function reg(songs, meta = {}) {
  const k = 'l' + ++seq;
  lists.set(k, { songs, meta });
  if (lists.size > 16) lists.delete(lists.keys().next().value);
  return k;
}
export const getList = (k) => lists.get(k);

export const go = (hash) => { location.hash = hash; };
export let lastCard = null;
export const takeCard = () => { const c = lastCard; lastCard = null; return c && Date.now() - c.t < 1500 ? c.rect : null; };

// ---------- favoris ----------
export function syncHeart(id, on) {
  $$(`.row[data-id="${CSS.escape(id)}"]`).forEach((r) => {
    let h = $('.mini-heart', r);
    if (on && !h) {
      h = document.createElement('span');
      h.className = 'mini-heart';
      h.innerHTML = icon('heartFill');
      $('.dur', r)?.before(h);
    } else if (!on && h) h.remove();
  });
}

export async function toggleStar(song, anchor) {
  const on = !song.starred;
  song.starred = on ? new Date().toISOString() : undefined;
  player.patchSong(song.id, { starred: song.starred });
  syncHeart(song.id, on);
  haptic(on ? 'medium' : 'light');
  if (on && anchor) burst(anchor);
  try { await api.star('id', song.id, on); }
  catch {
    song.starred = on ? undefined : new Date().toISOString();
    player.patchSong(song.id, { starred: song.starred });
    syncHeart(song.id, !on);
    toast('Impossible de modifier le favori');
  }
  return on;
}

export async function toggleStarKind(kind, obj, anchor) {
  const on = !obj.starred;
  obj.starred = on ? new Date().toISOString() : undefined;
  if (on && anchor) burst(anchor);
  haptic(on ? 'medium' : 'light');
  try { await api.star(kind, obj.id, on); }
  catch { obj.starred = on ? undefined : new Date().toISOString(); toast('Impossible de modifier le favori'); }
  return !!obj.starred;
}

// ---------- playlists ----------
export async function playlistPicker(songs) {
  songs = songs.filter((s) => !s.isRadio);
  if (!songs.length) return;
  let pls = [];
  try { pls = await api.playlists(); } catch { toast('Playlists indisponibles'); return; }
  const pick = await openSheet({
    title: 'Ajouter à une playlist',
    subtitle: songs.length === 1 ? songs[0].title : plural(songs.length, 'titre', 'titres'),
    items: [
      { id: '__new', icon: 'plus', label: 'Nouvelle playlist' },
      ...pls.map((p) => ({ id: p.id, icon: 'list', label: p.name, sub: plural(p.songCount || 0, 'titre', 'titres') })),
    ],
  });
  if (!pick) return;
  const ids = songs.map((s) => s.id);
  try {
    if (pick === '__new') {
      const name = await askText('Nouvelle playlist', { placeholder: 'Nom de la playlist', ok: 'Créer' });
      if (!name) return;
      await api.createPlaylist(name, ids);
      toast(`Playlist « ${name} » créée`);
    } else {
      await api.addToPlaylist(pick, ids);
      toast(`${plural(ids.length, 'titre ajouté', 'titres ajoutés')}`);
    }
    haptic('medium');
  } catch (e) { toast('Erreur : ' + e.message); }
}

// ---------- téléchargements ----------
// File de téléchargement : un titre à la fois, progression diffusée via l'évènement « nv:dlprogress »
let running = false, batch = { done: 0, failed: 0, total: 0 };
const emitProgress = () => window.dispatchEvent(new CustomEvent('nv:dlprogress', { detail: { active: downloads.active, queue: downloads.queue.length, ...batch } }));

async function runQueue() {
  if (running) return;
  running = true;
  while (downloads.queue.length) {
    const s = downloads.queue.shift();
    downloads.active = { song: s, bytes: 0, total: s.size || 0 };
    emitProgress();
    try {
      await downloads.add(s, (bytes, total) => { if (downloads.active) { downloads.active.bytes = bytes; downloads.active.total = total || downloads.active.total; emitProgress(); } });
      batch.done++;
      downloads.failed = downloads.failed.filter((f) => f.song.id !== s.id);
    } catch (e) {
      batch.failed++;
      const error = explain(e);
      downloads.lastError = error;
      downloads.failed = [...downloads.failed.filter((f) => f.song.id !== s.id), { song: s, error }].slice(-200);
    }
    downloads.active = null;
    window.dispatchEvent(new Event('nv:downloads'));
  }
  running = false;
  if (!batch.silent) {
    haptic('heavy');
    toast(batch.failed ? `${batch.done} téléchargé(s), ${batch.failed} en échec : ${downloads.lastError}` : `${plural(batch.done, 'titre disponible', 'titres disponibles')} hors-ligne`, batch.failed ? 5200 : 2400);
  }
  batch = { done: 0, failed: 0, total: 0 };
  emitProgress();
}

export async function downloadSongs(songs, { silent = false, playlist = null } = {}) {
  if (!feat('f_dlLocal')) { if (!silent) toast('Téléchargement désactivé (Réglages › Fonctionnalités)'); return; }
  // retient la playlist d'origine : elle apparaît dans Hors-ligne › Playlists
  if (playlist?.id) downloads.notePlaylist({ ...playlist, ids: songs.filter((s) => !s.isRadio).map((s) => s.id) });
  if (!downloads.supported) { if (!silent) toast('Le mode hors-ligne fonctionne dans l\'appli Android.'); return; }
  const todo = songs.filter((s) => !s.isRadio && !downloads.has(s.id) && !downloads.queued(s.id));
  if (!todo.length) { if (!silent) toast('Déjà disponible hors-ligne'); return; }
  if (settings.get('dlWifiOnly') && onCellular()) { if (!silent) toast('Téléchargement en pause : Wi-Fi uniquement (voir Réglages)', 3600); return; }
  if (!(await downloads.ensurePermission())) { toast('Accès au stockage refusé : choisis « Privé » ou « Dossier de l\'appli » dans les Réglages', 4600); return; }
  // le bilan final ne s'affiche que si au moins une demande venait de l'utilisateur
  batch.silent = running ? batch.silent && silent : silent;
  downloads.queue.push(...todo);
  batch.total += todo.length;
  if (!silent) toast(`${plural(todo.length, 'titre ajouté', 'titres ajoutés')} aux téléchargements`);
  emitProgress();
  runQueue();
}

export function cancelDownloads() {
  downloads.queue.length = 0;
  emitProgress();
}

// Synchro automatique : télécharge les favoris (et playlists choisies) au démarrage
export async function autoSync() {
  if (!downloads.supported || !feat('f_dlLocal')) return;
  const songs = [];
  try {
    if (settings.get('dlSyncStarred')) {
      const st = (await api.starred()).songs;
      songs.push(...st);
      downloads.notePlaylist({ id: '__starred', name: 'Favoris', ids: st.map((x) => x.id) });
    }
    for (const id of settings.get('dlSyncPlaylists') || []) {
      try {
        const p = await api.playlist(id);
        songs.push(...p.entry);
        downloads.notePlaylist({ id, name: p.name, ids: p.entry.map((x) => x.id) });
      } catch { /* playlist supprimée */ }
    }
  } catch { return; }
  if (songs.length) downloadSongs(songs, { silent: true });
}

export async function undownload(song) {
  await downloads.remove(song.id);
  toast('Supprimé du téléphone');
  window.dispatchEvent(new Event('nv:downloads'));
}

// ---------- radio / Flow ----------
export async function startRadio(song) {
  if (!song || song.isRadio) return;
  toast(`Radio · ${song.title}`);
  const first = await songRadio(song);
  player.playQueue([song, ...first], 0, { endless: (ex) => songRadio(player.queue[player.queue.length - 1] || song, ex), label: `Radio · ${song.title}` });
}

export async function startArtistRadio(id, name) {
  if (!id) return;
  toast(`Radio · ${name || 'artiste'}`);
  const list = await artistRadio(id);
  if (!list.length) { toast('Pas assez de titres pour cette radio'); return; }
  player.playQueue(list, 0, { endless: (ex) => artistRadio(id, ex), label: `Radio · ${name || 'artiste'}` });
}

export async function startFlow(mood = 'all') {
  const m = MOODS.find((x) => x[0] === mood) || MOODS[0];
  haptic('medium');
  const list = await flowBatch(m[0]);
  if (!list.length) { toast('Ta bibliothèque est encore vide'); return; }
  player.playQueue(list, 0, { endless: (ex) => flowBatch(m[0], ex), label: m[0] === 'all' ? 'Flow' : `Flow · ${m[1]}` });
  toast(m[0] === 'all' ? 'Flow : ta musique, sans fin' : `Flow · ${m[1]}`);
}

// ---------- « Ne plus proposer » ----------
async function banMenu(song) {
  const c = await openSheet({
    title: 'Ne plus proposer', subtitle: 'Dans le Flow, les mix, les radios et la lecture automatique',
    items: [
      { id: 'song', icon: 'ban', label: 'Ce titre', sub: song.title },
      ...(song.artist ? [{ id: 'artist', icon: 'mic', label: 'Cet artiste', sub: song.artist }] : []),
    ],
  });
  if (c === 'song') { bans.addSong(song); toast('Ce titre ne sera plus proposé'); }
  else if (c === 'artist') { bans.addArtist(song.artistId, song.artist); toast(`${song.artist} ne sera plus proposé`); }
  if (c && player.current?.id === song.id && player.endless) player.next();
}

// ---------- menus ----------
export async function songMenu(song, meta = {}) {
  const dl = downloads.has(song.id);
  const items = [
    { id: 'next', icon: 'play', label: 'Lire ensuite' },
    { id: 'queue', icon: 'queue', label: 'Ajouter à la file d\'attente' },
    { id: 'playlist', icon: 'list', label: 'Ajouter à une playlist' },
    { id: 'star', icon: song.starred ? 'heartFill' : 'heart', label: song.starred ? 'Retirer des favoris' : 'Ajouter aux favoris' },
    ...(feat('f_radio') ? [{ id: 'radio', icon: 'radio', label: 'Lancer la radio de ce titre', sub: 'Titres proches, sans fin' }] : []),
    ...(feat('f_dlLocal') ? [{ id: dl ? 'undl' : 'dl', icon: 'phone', label: dl ? 'Supprimer du téléphone' : 'Télécharger (hors-ligne)' }] : []),
    ...(feat('f_share') ? [{ id: 'share', icon: 'share', label: 'Partager' }] : []),
  ];
  if (song.albumId) items.push({ id: 'album', icon: 'disc', label: 'Aller à l\'album', sub: song.album });
  if (song.artistId) items.push({ id: 'artist', icon: 'mic', label: 'Aller à l\'artiste', sub: song.artist });
  if (feat('f_ban')) items.push({ id: 'ban', icon: 'ban', label: 'Ne plus proposer…' });
  if (meta.np) {
    const priv = settings.get('privateSession');
    items.push({ id: 'private', icon: 'eyeOff', label: priv ? 'Quitter la session privée' : 'Session privée', sub: 'Tes écoutes ne sont pas enregistrées', active: priv });
    items.push({ id: 'eq', icon: 'eq', label: 'Égaliseur' });
  }
  if (meta.playlist) items.push({ id: 'remove', icon: 'trash', label: 'Retirer de cette playlist', danger: true });

  const choice = await openSheet({
    title: song.title, subtitle: [song.artist, song.album].filter(Boolean).join(' · '), cover: coverFor(song, 96), items,
    rating: feat('f_rating') ? song.userRating || 0 : null,
    onRate: (n) => { song.userRating = n; player.patchSong(song.id, { userRating: n }); api.rate(song.id, n).catch(() => toast('Note non enregistrée')); },
  });
  try {
    switch (choice) {
      case 'next': player.addNext(song); toast('Lu ensuite'); break;
      case 'queue': player.addEnd(song); toast('Ajouté à la file'); break;
      case 'playlist': await playlistPicker([song]); break;
      case 'star': await toggleStar(song); break;
      case 'radio': await startRadio(song); break;
      case 'dl': await downloadSongs([song]); break;
      case 'undl': await undownload(song); break;
      case 'share': await shareItem('song', song); break;
      case 'album': go('#/album/' + song.albumId); break;
      case 'artist': go('#/artist/' + song.artistId); break;
      case 'ban': await banMenu(song); break;
      case 'private': settings.set('privateSession', !settings.get('privateSession')); toast(settings.get('privateSession') ? 'Session privée : tes écoutes ne sont plus enregistrées' : 'Session privée terminée'); break;
      case 'eq': openEq(); break;
      case 'remove': meta.onRemove?.(song); break;
      default: break;
    }
  } catch (err) { toast('Erreur : ' + err.message); }
  return choice;
}

export async function albumMenu(album, songs) {
  const choice = await openSheet({
    title: album.name, subtitle: album.artist, cover: coverFor(album, 96),
    items: [
      { id: 'next', icon: 'play', label: 'Lire ensuite' },
      { id: 'queue', icon: 'queue', label: 'Ajouter à la file d\'attente' },
      { id: 'playlist', icon: 'list', label: 'Ajouter à une playlist' },
      ...(feat('f_dlLocal') ? [{ id: 'dl', icon: 'phone', label: 'Tout télécharger (hors-ligne)' }] : []),
      ...(feat('f_radio') && album.artistId ? [{ id: 'radio', icon: 'radio', label: 'Radio de l\'artiste', sub: album.artist }] : []),
      ...(feat('f_share') ? [{ id: 'share', icon: 'share', label: 'Partager l\'album' }] : []),
      ...(album.artistId ? [{ id: 'artist', icon: 'mic', label: 'Aller à l\'artiste', sub: album.artist }] : []),
    ],
  });
  try {
    if (choice === 'next') { [...songs].reverse().forEach((s) => player.addNext(s)); toast('Album lu ensuite'); }
    else if (choice === 'queue') { player.addEnd(songs); toast('Album ajouté à la file'); }
    else if (choice === 'playlist') await playlistPicker(songs);
    else if (choice === 'dl') await downloadSongs(songs);
    else if (choice === 'radio') await startArtistRadio(album.artistId, album.artist);
    else if (choice === 'share') await shareItem('album', album);
    else if (choice === 'artist') go('#/artist/' + album.artistId);
  } catch (err) { toast('Erreur : ' + err.message); }
}

// ---------- délégation globale des clics ----------
export function initActions() {
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) {
      const card = e.target.closest('[data-card]');
      if (card) lastCard = { rect: $('.cov', card).getBoundingClientRect(), t: Date.now() };
      return;
    }
    if (t.closest('a')) e.preventDefault();
    const act = t.dataset.act;
    const list = t.dataset.list ? getList(t.dataset.list) : null;
    const i = Number(t.dataset.i);
    try {
      switch (act) {
        case 'play':
          if (list) { haptic('light'); player.playQueue(list.songs, i); }
          break;
        case 'song-menu':
          if (list) songMenu(list.songs[i], list.meta);
          break;
        case 'play-all':
          if (list) player.playQueue(list.songs, 0);
          break;
        case 'shuffle-all':
          if (list) player.playQueue(list.songs, 0, { shuffle: true });
          break;
        case 'play-album': {
          haptic('medium');
          const a = await api.album(t.dataset.id);
          player.playQueue(a.song, 0);
          break;
        }
        case 'play-playlist': {
          haptic('medium');
          const p = await api.playlist(t.dataset.id);
          if (p.entry.length) player.playQueue(p.entry, 0);
          else toast('Playlist vide');
          break;
        }
        case 'retry':
          window.dispatchEvent(new Event('nv:refresh'));
          break;
        default: break;
      }
    } catch (err) { toast('Erreur : ' + err.message); }
  });

  // surbrillance du titre en cours dans toutes les listes
  const sync = () => {
    const id = player.current?.id;
    $$('.row[data-id]').forEach((r) => r.classList.toggle('playing', r.dataset.id === id));
  };
  player.on('track', sync);
  window.addEventListener('nv:rows', sync);
}

export { esc };
