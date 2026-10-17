// Registre des fonctionnalités : chaque entrée peut être activée / désactivée dans Réglages › Fonctionnalités.
// Une fonctionnalité = une clé de réglage booléenne (store.js). Le corps de la page reçoit la classe
// « no-<clé> » quand elle est coupée : le CSS masque alors les boutons concernés, sans recharger la page.
import { settings } from './store.js';

export const CATS = [
  ['nav', 'Pages et menus', 'grid'],
  ['home', 'Accueil et découverte', 'flow'],
  ['play', 'Lecture', 'play'],
  ['np', 'Écran du lecteur', 'disc'],
  ['lib', 'Bibliothèque et téléchargements', 'phone'],
  ['deezer', 'Deezer et deemix', 'deezer'],
  ['ui', 'Interface', 'sliders'],
];

// { key, cat, label, sub, needs?: clé requise, link?: page de réglage liée }
export const FEATURES = [
  // pages
  { key: 'f_discover', cat: 'nav', label: 'Découvrir', sub: 'Page Flow, mix du jour, pépites oubliées, nouveautés, blind test' },
  { key: 'f_history', cat: 'nav', label: 'Historique d\'écoute', sub: 'Tous les titres écoutés, jour par jour' },
  { key: 'f_replay', cat: 'nav', label: 'Replay', sub: 'Ton bilan d\'écoute (minutes, top artistes, heures)' },
  { key: 'f_genres', cat: 'nav', label: 'Genres', sub: 'Page des genres et mix par genre' },
  { key: 'f_radios', cat: 'nav', label: 'Radios', sub: 'Webradios déclarées dans Navidrome' },
  { key: 'f_offline', cat: 'nav', label: 'Page Hors-ligne', sub: 'Liste des titres enregistrés sur le téléphone' },
  { key: 'f_car', cat: 'nav', label: 'Mode voiture', sub: 'Gros boutons, écran allumé' },
  { key: 'deezer', cat: 'nav', label: 'Deezer', sub: 'Catalogue Deezer rapproché de ta bibliothèque' },
  // accueil / découverte
  { key: 'f_flow', cat: 'home', label: 'Flow', sub: 'Mix infini personnalisé, avec humeurs (chill, énergie, découverte…)' },
  { key: 'f_mixes', cat: 'home', label: 'Mix du jour', sub: 'Un mix par artiste que tu écoutes le plus' },
  { key: 'f_rediscover', cat: 'home', label: 'Pépites oubliées', sub: 'Favoris pas écoutés depuis longtemps et titres jamais joués' },
  { key: 'f_throwback', cat: 'home', label: 'Ce jour-là', sub: 'Ce que tu écoutais il y a un an (ou un mois)' },
  { key: 'f_releases', cat: 'home', label: 'Nouveautés de tes artistes', sub: 'Sorties récentes sur Deezer de tes artistes favoris', needs: 'deezer' },
  { key: 'f_blindtest', cat: 'home', label: 'Blind test', sub: 'Devine le titre à partir d\'un extrait de ta bibliothèque' },
  { key: 'f_homeStats', cat: 'home', label: 'Compteur de titres', sub: 'Nombre de titres sous le message d\'accueil' },
  { key: 'f_homeNewest', cat: 'home', label: 'Rangée « Ajoutés récemment »' },
  { key: 'f_homeRecent', cat: 'home', label: 'Rangée « Écoutés récemment »' },
  { key: 'f_homeFrequent', cat: 'home', label: 'Rangée « Les plus écoutés »' },
  { key: 'f_homeRandom', cat: 'home', label: 'Rangée « Au hasard »' },
  { key: 'f_homeStarred', cat: 'home', label: 'Rangée « Tes favoris »' },
  // lecture
  { key: 'autoplay', cat: 'play', label: 'Lecture automatique', sub: 'Continue avec des titres similaires quand la file se termine' },
  { key: 'f_radio', cat: 'play', label: 'Radio d\'un titre ou d\'un artiste', sub: 'Lance une file sans fin de titres proches' },
  { key: 'f_ban', cat: 'play', label: 'Ne plus proposer', sub: 'Masque un titre ou un artiste du Flow, des mix et de la lecture auto' },
  { key: 'privateSession', cat: 'play', label: 'Session privée', sub: 'N\'enregistre pas tes écoutes (historique, Replay, serveur)' },
  { key: 'f_scrobble', cat: 'play', label: 'Envoyer les écoutes au serveur', sub: 'Compteurs de lecture Navidrome (et Last.fm s\'il est relié)' },
  { key: 'f_fadePause', cat: 'play', label: 'Fondu lecture / pause', sub: 'Le son monte et descend en douceur' },
  { key: 'f_resumeLong', cat: 'play', label: 'Reprise des longs titres', sub: 'Mixes, livres audio, podcasts (> 15 min) : reprend là où tu t\'étais arrêté' },
  { key: 'musicHaptics', cat: 'play', label: 'Vibrations avec la musique', sub: 'Le téléphone vibre sur les basses ou au tempo' },
  // lecteur
  { key: 'f_lyrics', cat: 'np', label: 'Paroles', sub: 'Onglet paroles synchronisées et tactiles' },
  { key: 'f_keepAwake', cat: 'np', label: 'Écran allumé sur les paroles', sub: 'L\'écran ne s\'éteint pas pendant que tu lis les paroles' },
  { key: 'f_audioInfo', cat: 'np', label: 'Infos audio', sub: 'Format, résolution et débit sous le titre (FLAC · 24 bits · 96 kHz…)' },
  { key: 'f_sleep', cat: 'np', label: 'Minuterie de sommeil', sub: 'Arrêt après un délai, à la fin du titre ou de l\'album' },
  { key: 'f_speed', cat: 'np', label: 'Vitesse de lecture', sub: '0,75× à 2×' },
  { key: 'viz', cat: 'np', label: 'Visualiseur', sub: 'Barres animées dans le lecteur' },
  { key: 'coverColors', cat: 'np', label: 'Couleurs de la pochette', sub: 'Le lecteur prend les teintes de l\'album' },
  { key: 'f_gestures', cat: 'np', label: 'Gestes du mini-lecteur', sub: 'Glisser à gauche / droite pour changer de titre, vers le haut pour ouvrir' },
  // bibliothèque
  { key: 'f_dlLocal', cat: 'lib', label: 'Téléchargement sur le téléphone', sub: 'Écoute hors-ligne des titres de ton serveur', link: '#/settings?s=dl' },
  { key: 'f_rating', cat: 'lib', label: 'Notes (étoiles)', sub: 'Noter les titres dans le menu ⋯' },
  { key: 'f_share', cat: 'lib', label: 'Partage', sub: 'Partager un titre ou un album' },
  { key: 'f_recentSearch', cat: 'lib', label: 'Recherches récentes', sub: 'Garde tes dernières recherches' },
  { key: 'f_folders', cat: 'lib', label: 'Dossiers de playlists', sub: 'Range tes playlists dans des dossiers' },
  { key: 'f_dupes', cat: 'lib', label: 'Détection des doublons', sub: 'Même titre en plusieurs exemplaires ou qualités', link: '#/dupes' },
  // deezer
  { key: 'f_import', cat: 'deezer', label: 'Import Spotify / YouTube', sub: 'Colle le lien d\'une playlist : retrouvée dans ta bibliothèque, deemix télécharge les manquants', link: '#/import' },
  { key: 'f_deemix', cat: 'deezer', label: 'Téléchargement via deemix', sub: 'Envoie un titre, un album ou une playlist Deezer à ton serveur, qui le range dans Navidrome', needs: 'deezer', link: '#/settings?s=deemix' },
  // interface
  { key: 'haptics', cat: 'ui', label: 'Retour haptique', sub: 'Petites vibrations au toucher' },
  { key: 'f_touch', cat: 'ui', label: 'Gestes façon iPhone', sub: 'Tirer vers le bas = menu, appui long = options, glisser un titre = file d\'attente', link: '#/gestures' },
  { key: 'foldDock', cat: 'ui', label: 'Lecteur ancré (Fold déplié)', sub: 'Bibliothèque à gauche, lecteur et paroles à droite en permanence' },
];

const KEYS = new Set(FEATURES.map((f) => f.key));

// vrai si la fonctionnalité est active (et celle dont elle dépend aussi)
export function feat(key) {
  if (settings.get(key) === false) return false;
  const f = FEATURES.find((x) => x.key === key);
  return !f?.needs || settings.get(f.needs) !== false;
}

export const isFlag = (k) => KEYS.has(k);

export function applyFlagClasses() {
  const b = document.body;
  for (const f of FEATURES) b.classList.toggle('no-' + f.key, !feat(f.key));
  b.classList.toggle('priv-on', !!settings.get('privateSession'));
}

export function initFlags() {
  applyFlagClasses();
  settings.on((k) => { if (KEYS.has(k)) applyFlagClasses(); });
}

export function resetFlags() {
  for (const f of FEATURES) settings.set(f.key, settings.defaultOf(f.key) ?? true);
}

export const countOn = () => FEATURES.filter((f) => feat(f.key)).length;
