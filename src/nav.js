// Sections de l'appli : [id, lien, icône, libellé]. Partagé par la navigation et les réglages de disposition.
import { feat } from './flags.js';

export const NAV = [
  ['home', '#/home', 'home', 'Accueil'], ['discover', '#/discover', 'flow', 'Découvrir'], ['albums', '#/albums', 'disc', 'Albums'],
  ['artists', '#/artists', 'mic', 'Artistes'], ['playlists', '#/playlists', 'list', 'Playlists'], ['search', '#/search', 'search', 'Recherche'],
  ['starred', '#/starred', 'heart', 'Favoris'], ['genres', '#/genres', 'tag', 'Genres'], ['radios', '#/radios', 'radio', 'Radios'],
  ['offline', '#/offline', 'phone', 'Hors-ligne'], ['deezer', '#/deezer', 'deezer', 'Deezer'], ['history', '#/history', 'clock', 'Historique'],
  ['replay', '#/replay', 'chart', 'Replay'], ['settings', '#/settings', 'sliders', 'Réglages'],
  ['more', '#/more', 'grid', 'Plus'],
];

// section → fonctionnalité qui la commande (Réglages › Fonctionnalités)
export const NAV_FLAG = {
  discover: 'f_discover', genres: 'f_genres', radios: 'f_radios', offline: 'f_offline', deezer: 'deezer', history: 'f_history', replay: 'f_replay',
};

export const navEnabled = (id) => !NAV_FLAG[id] || feat(NAV_FLAG[id]);
