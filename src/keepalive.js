// Lecture en arrière-plan : verrous CPU/Wi-Fi natifs pendant la lecture + surveillance du passage au titre suivant.
// Le code natif est dans android/…/OpusKeepAlivePlugin.java (copié par scripts/patch-android.mjs).
import { Capacitor, registerPlugin } from '@capacitor/core';
import { player } from './player.js';

const Native = registerPlugin('OpusKeepAlive');
const isNative = () => Capacitor.isNativePlatform();

export async function batteryUnrestricted() {
  if (!isNative()) return true;
  try { return !!(await Native.batteryStatus()).unrestricted; } catch { return true; }
}
export function requestUnrestricted() {
  if (!isNative()) return Promise.resolve();
  return Native.requestUnrestricted().catch(() => {});
}

export function initKeepAlive() {
  let held = false, asked = false;
  const sync = () => {
    const want = !!player.playing;
    if (want === held) return;
    held = want;
    // 1re lecture : demande l'autorisation d'afficher la notification de lecture (Android 13+)
    if (want && !asked) { asked = true; if (isNative()) Native.requestNotifications().catch(() => {}); }
    // avec le lecteur natif (ExoPlayer), le service garde lui-même le processeur et le Wi-Fi éveillés
    if (isNative() && !player._nativeOn) (want ? Native.hold() : Native.release()).catch(() => { /* ancien APK */ });
  };
  player.on('state', sync);
  player.on('track', sync);

  // Filet de sécurité : si le titre est fini mais que l'événement « ended » n'est jamais arrivé
  // (webview gelée en arrière-plan), ou si la lecture s'est arrêtée seule au milieu de la file, on enchaîne.
  if (player._nativeOn) return;
  let lastT = -1, stuck = 0;
  setInterval(() => {
    try {
      const a = player.audio;
      const s = player.current;
      if (!s || s.isRadio || !a || !a.src) { stuck = 0; return; }
      const d = a.duration;
      if ((a.ended && !a.loop) || (!a.paused && d > 0 && isFinite(d) && a.currentTime >= d - 0.3 && !player._xf)) {
        stuck = 0;
        if (!player._advancing) {
          player._advancing = true;
          setTimeout(() => { player._advancing = false; }, 3000);
          player.next(true);
        }
        return;
      }
      // lecture censée tourner mais le temps n'avance plus (réseau coupé, webview endormie) → on relance
      if (!a.paused && !a.ended && a.readyState >= 2 && a.currentTime === lastT) {
        if (++stuck >= 4) { stuck = 0; a.play().catch(() => {}); }
      } else stuck = 0;
      lastT = a.currentTime;
    } catch { /* ignoré */ }
  }, 2500);
}
