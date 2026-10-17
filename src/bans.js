// « Ne plus proposer » : titres et artistes masqués du Flow, des mix, des radios et de la lecture automatique.
// (La lecture d'un album ou d'une playlist que tu choisis n'est jamais filtrée.)
import { store } from './store.js';
import { feat } from './flags.js';

let data = store.get('bans', null) || { songs: {}, artists: {} };
const save = () => store.set('bans', data);
const low = (s) => String(s || '').trim().toLowerCase();

export const bans = {
  songs: () => Object.entries(data.songs).map(([id, v]) => ({ id, ...v })),
  artists: () => Object.entries(data.artists).map(([id, v]) => ({ id, ...v })),
  count: () => Object.keys(data.songs).length + Object.keys(data.artists).length,
  hasSong: (id) => !!data.songs[id],
  hasArtist: (id) => !!data.artists[id],
  addSong(s) { data.songs[s.id] = { title: s.title || '', artist: s.artist || '', at: Date.now() }; save(); },
  addArtist(id, name) { data.artists[id || 'n:' + low(name)] = { name: name || '', at: Date.now() }; save(); },
  removeSong(id) { delete data.songs[id]; save(); },
  removeArtist(id) { delete data.artists[id]; save(); },
  clear() { data = { songs: {}, artists: {} }; save(); },
  // vrai si le titre doit être écarté des suggestions
  hidden(s) {
    if (!s || !feat('f_ban')) return false;
    if (data.songs[s.id]) return true;
    if (s.artistId && data.artists[s.artistId]) return true;
    return !!data.artists['n:' + low(s.artist)];
  },
};

// enlève doublons, titres déjà présents et titres masqués
export function cleanList(list, have = new Set()) {
  const seen = new Set(have);
  return (list || []).filter((s) => s && s.id && !s.isRadio && !seen.has(s.id) && seen.add(s.id) && !bans.hidden(s));
}
