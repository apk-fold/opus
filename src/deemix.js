// Client du service « opus-deemix » qui tourne sur ton serveur (dossier server/ du projet).
// Opus envoie un lien Deezer (titre, album, playlist ou liste de titres) → le serveur lance deemix, range les
// fichiers dans le dossier de musique de Navidrome → Opus relance le scan, retrouve les titres et les ajoute,
// si tu l'as demandé, à une playlist Navidrome.
// Navidrome et deemix ne se parlent pas : c'est Opus qui fait le lien.
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { api } from './api.js';
import { settings, store } from './store.js';
import { feat } from './flags.js';
import { matchTrack, forgetMatch } from './deezer.js';
import { openSheet, askText } from './sheets.js';
import { toast, plural } from './ui.js';

const native = () => Capacitor.isNativePlatform();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ACTIVE = ['queued', 'running', 'scanning'];

function baseUrl() {
  let u = String(settings.get('dmxUrl') || '').trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = 'http://' + u;
  return u;
}

export const dmx = {
  get configured() { return !!baseUrl() && !!settings.get('dmxToken'); },
  get ready() { return feat('f_deemix') && this.configured; },

  async req(method, path, body, { timeout = 20000 } = {}) {
    const url = baseUrl() + path;
    const headers = { Authorization: 'Bearer ' + (settings.get('dmxToken') || ''), Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let status, data;
    try {
      if (native()) {
        const r = await CapacitorHttp.request({ method, url, headers, data: body, connectTimeout: 8000, readTimeout: timeout });
        status = r.status;
        data = typeof r.data === 'string' ? (() => { try { return JSON.parse(r.data); } catch { return null; } })() : r.data;
      } else {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), timeout);
        try {
          const r = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: ctl.signal });
          status = r.status;
          data = await r.json().catch(() => null);
        } finally { clearTimeout(t); }
      }
    } catch {
      const err = new Error('serveur deemix injoignable (adresse, port, Tailscale ?)');
      err.network = true;
      throw err;
    }
    if (status === 401 || status === 403) throw new Error('jeton refusé par le serveur deemix');
    if (status >= 400 || !data) throw new Error(data?.error || `erreur ${status} du serveur deemix`);
    return data;
  },

  health: () => dmx.req('GET', '/api/health', undefined, { timeout: 25000 }),
  sendArl: (arl) => dmx.req('POST', '/api/arl', { arl }, { timeout: 30000 }),
  jobs: () => dmx.req('GET', '/api/jobs'),
  create: (job) => dmx.req('POST', '/api/jobs', job),
  cancel: (id) => dmx.req('DELETE', `/api/jobs/${encodeURIComponent(id)}`),
  retry: (id) => dmx.req('POST', `/api/jobs/${encodeURIComponent(id)}/retry`),
  clear: () => dmx.req('POST', '/api/jobs/clear'),
};

// ---------------------------------------------------------------------------------------------
// État partagé (pages Deezer, page des téléchargements serveur)
// ---------------------------------------------------------------------------------------------
export const dmxState = { jobs: [], error: '', at: 0 };
export const activeJobs = () => dmxState.jobs.filter((j) => ACTIVE.includes(j.status));
export function busyTrackIds() {
  const s = new Set();
  for (const j of activeJobs()) for (const t of j.tracks || []) s.add(String(t.id));
  return s;
}

const links = () => store.get('dmxLinks', {}) || {};
const setLinks = (v) => store.set('dmxLinks', v);
const handled = () => new Set(store.get('dmxDone', []) || []);
const markHandled = (id) => store.set('dmxDone', [...handled(), id].slice(-300));

// ---------------------------------------------------------------------------------------------
// Choix de la playlist de destination
// ---------------------------------------------------------------------------------------------
export async function pickTarget({ force = false } = {}) {
  const pref = settings.get('dmxPlaylist') || 'ask';
  if (!force && pref === 'none') return null;
  if (!force && pref !== 'ask') return { id: pref, name: settings.get('dmxPlaylistName') || 'Playlist' };
  let pls = [];
  try { pls = await api.playlists(); } catch { /* sans playlists */ }
  const c = await openSheet({
    title: 'Une fois sur ton serveur…', subtitle: 'Ajouter automatiquement à une playlist ?',
    items: [
      { id: '__none', icon: 'check', label: 'Juste dans ma bibliothèque' },
      { id: '__new', icon: 'plus', label: 'Nouvelle playlist' },
      ...pls.map((p) => ({ id: p.id, icon: 'list', label: p.name, sub: plural(p.songCount || 0, 'titre', 'titres') })),
    ],
  });
  if (c == null) return undefined; // annulé
  if (c === '__none') return null;
  if (c === '__new') {
    const name = await askText('Nouvelle playlist', { placeholder: 'Nom de la playlist', ok: 'Créer' });
    return name ? { create: true, name } : undefined;
  }
  return { id: c, name: pls.find((p) => p.id === c)?.name || 'Playlist' };
}

export const DMX_BITRATES = [['auto', 'Auto', 'Selon ton compte Deezer'], ['flac', 'FLAC', 'Sans perte (compte HiFi)'], ['320', 'MP3 320', 'Compte Premium'], ['128', 'MP3 128', 'Compte gratuit']];
const brLabel = (v) => (DMX_BITRATES.find((b) => b[0] === v) || DMX_BITRATES[0])[1];

// Au cas par cas : qualité et playlist choisies au moment de lancer (pré-remplies avec les réglages)
async function launchSheet({ title, cover, count }) {
  let br = settings.get('dmxBitrate') || 'auto';
  const pref = settings.get('dmxPlaylist') || 'ask';
  let target = pref === 'none' || pref === 'ask' ? null : { id: pref, name: settings.get('dmxPlaylistName') || 'Playlist' };
  for (;;) {
    const c = await openSheet({
      title: 'Télécharger avec deemix', subtitle: `${title}${count > 1 ? ` · ${plural(count, 'titre', 'titres')}` : ''}`, cover,
      items: [
        { id: 'go', icon: 'cloud', label: 'Lancer le téléchargement', sub: `${brLabel(br)} · ${target ? `puis dans « ${target.name} »` : 'dans ta bibliothèque'}` },
        { id: 'br', icon: 'wave', label: `Qualité : ${brLabel(br)}`, sub: 'Toucher pour changer (ce téléchargement seulement)' },
        { id: 'pl', icon: 'list', label: target ? `Playlist : ${target.create ? 'nouvelle, ' : ''}« ${target.name} »` : 'Playlist : aucune', sub: 'Toucher pour choisir où ranger les titres' },
      ],
    });
    if (c == null) return undefined;
    if (c === 'go') return { bitrate: br, target };
    if (c === 'br') {
      const v = await openSheet({ title: 'Qualité pour ce téléchargement', items: DMX_BITRATES.map(([id, l, sub]) => ({ id, label: l, sub, active: br === id })) });
      if (v) br = v;
    } else if (c === 'pl') {
      const t = await pickTarget({ force: true });
      if (t !== undefined) target = t;
    }
  }
}

/**
 * Envoie un téléchargement au serveur.
 * { urls: [liens Deezer], title, cover, tracks: [titres Deezer normalisés], kind }
 */
export async function sendToDeemix({ urls, title, cover = '', tracks = [], kind = 'tracks', target, bitrate } = {}) {
  if (!dmx.ready) { toast('Configure le serveur deemix : Réglages › Deezer › deemix', 3600); return null; }
  if (!urls?.length) { toast('Rien à télécharger'); return null; }
  if (target === undefined && bitrate === undefined && settings.get('dmxAskEach') !== false) {
    const pick = await launchSheet({ title, cover, count: tracks.length || urls.length });
    if (!pick) return null;
    ({ target, bitrate } = pick);
  }
  if (target === undefined) target = await pickTarget();
  if (target === undefined) return null;
  try {
    const r = await dmx.create({
      urls, title, cover, kind, bitrate: bitrate || settings.get('dmxBitrate') || 'auto',
      tracks: tracks.map((t) => ({ id: String(t.id), title: t.title, artist: t.artist, album: t.album, duration: t.duration || 0, isrc: t.isrc || '' })),
    });
    const job = r.job;
    if (target || tracks.length) setLinks({ ...links(), [job.id]: { target, tracks, title, at: Date.now() } });
    toast(`Envoyé au serveur : ${title}${target ? ` → « ${target.name} »` : ''}`, 3200);
    watchJobs(true);
    return job;
  } catch (e) { toast('deemix : ' + e.message, 4200); return null; }
}

// ---------------------------------------------------------------------------------------------
// Suivi des tâches
// ---------------------------------------------------------------------------------------------
let timer = null, ticking = false;
const emit = () => window.dispatchEvent(new CustomEvent('nv:dmx', { detail: dmxState }));

async function tick() {
  timer = null;
  if (ticking || !dmx.ready) return;
  ticking = true;
  try {
    const r = await dmx.jobs();
    dmxState.jobs = r.jobs || [];
    dmxState.error = '';
  } catch (e) { dmxState.error = e.message; }
  dmxState.at = Date.now();
  ticking = false;
  emit();
  if (store.get('dmxDone', null) == null) {
    // première connexion à ce serveur : l'historique existant n'appelle aucune suite
    store.set('dmxDone', dmxState.jobs.filter((j) => !ACTIVE.includes(j.status)).map((j) => j.id));
  }
  const done = handled();
  const lk = links();
  for (const j of dmxState.jobs) {
    if (done.has(j.id)) continue;
    const old = !lk[j.id] && j.finishedAt && Date.now() - j.finishedAt > 30 * 60e3; // terminé il y a longtemps, sans suite à donner
    if (old && !ACTIVE.includes(j.status)) { markHandled(j.id); continue; }
    if (j.status === 'done' || j.status === 'partial') { markHandled(j.id); onFinished(j); }
    else if (j.status === 'error' || j.status === 'cancelled') {
      markHandled(j.id);
      if (j.status === 'error') toast(`deemix : ${j.title || 'téléchargement'} — ${j.message || 'échec'}`, 5200);
      const l = links(); delete l[j.id]; setLinks(l);
    }
  }
  const busy = activeJobs().length > 0;
  const pending = Object.keys(links()).length > 0;
  if (busy || pending) timer = setTimeout(tick, document.hidden ? 15000 : busy ? 2500 : 10000);
}

export function watchJobs(now = false) {
  if (!dmx.ready) return;
  if (timer) { if (!now) return; clearTimeout(timer); timer = null; }
  if (now) tick(); else timer = setTimeout(tick, 400);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && dmx.ready && (activeJobs().length || Object.keys(links()).length)) watchJobs(true); });

async function waitScan(max = 300000) {
  const t0 = Date.now();
  await sleep(1500);
  while (Date.now() - t0 < max) {
    const s = await api.scanStatus();
    if (!s.scanning) return true;
    await sleep(2500);
  }
  return false;
}

let finishing = Promise.resolve();
function onFinished(job) {
  // une tâche à la fois (scan + correspondances)
  finishing = finishing.then(() => finish(job)).catch(() => {});
}

async function finish(job) {
  const link = links()[job.id] || {};
  const tracks = link.tracks?.length ? link.tracks : (job.tracks || []);
  forgetMatch(tracks.map((t) => t.id));
  if (!job.scanned) {
    try { await api.startScan(); } catch { /* scan déjà en cours */ }
    await waitScan();
  }
  let found = [];
  if (tracks.length) {
    // le scan peut indexer avec un peu de retard : trois essais
    let left = tracks.slice();
    for (let n = 0; n < 3 && left.length; n++) {
      if (n) { await sleep(5000); forgetMatch(left.map((t) => t.id)); }
      const res = await Promise.all(left.map((t) => matchTrack(t).catch(() => null)));
      found.push(...res.filter(Boolean));
      left = left.filter((_, i) => !res[i]);
    }
  }
  const n = job.files?.length || found.length;
  let msg = `${job.title || 'Téléchargement'} : ${plural(n, 'titre ajouté', 'titres ajoutés')} à ta bibliothèque`;
  if (link.target && found.length) {
    try {
      const ids = [...new Set(found.map((s) => s.id))];
      if (link.target.create) await api.createPlaylist(link.target.name, ids);
      else await api.addToPlaylist(link.target.id, ids);
      msg += ` · ${ids.length} dans « ${link.target.name} »`;
    } catch (e) { msg += ` · playlist : ${e.message}`; }
  } else if (link.target && !found.length) msg += ' · titres pas encore visibles dans Navidrome (relance un scan)';
  if (job.status === 'partial') msg += ` · ${job.failed || 'certains'} en échec`;
  toast(msg, 5200);
  const l = links(); delete l[job.id]; setLinks(l);
  window.dispatchEvent(new CustomEvent('nv:dmxdone', { detail: { job, found } }));
}

export const STATUS = {
  queued: ['En attente', 'clock'], running: ['Téléchargement', 'download'], scanning: ['Scan Navidrome', 'refresh'],
  done: ['Terminé', 'check'], partial: ['Terminé (incomplet)', 'check'], error: ['Échec', 'close'], cancelled: ['Annulé', 'close'],
};
