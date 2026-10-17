// Mode Fold déplié : bibliothèque à gauche, lecteur ancré à droite en permanence avec les paroles
// (ou la file) en dessous. Réglages › Disposition › « Lecteur ancré (Fold déplié) ».
// L'écran intérieur du Galaxy Z Fold fait ~690 × 830 px CSS : le seuil est donc bien plus bas que
// celui du panneau ancré « grand écran » (1000 px), qui reste valable sur tablette et PC.
import { settings } from './store.js';

export const FOLD_MIN = 600;
const wide = () => window.innerWidth >= FOLD_MIN;

// lecteur ancré en permanence (Fold déplié + réglage actif)
export const foldDocked = () => settings.get('foldDock') !== false && wide();
// le lecteur s'ouvre en panneau à droite plutôt qu'en plein écran
export const dockWidth = () => window.innerWidth >= 1000 || foldDocked();

export function applyFold() {
  const b = document.body;
  b.classList.toggle('dock-ok', dockWidth());
  b.classList.toggle('fold-split', foldDocked());
}

export function initFold() {
  applyFold();
  window.addEventListener('resize', applyFold);
  settings.on((k) => { if (k === 'foldDock') { applyFold(); window.dispatchEvent(new Event('nv:fold')); } });
}
