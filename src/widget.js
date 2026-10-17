// Widget d'écran d'accueil (Android) : on lui transmet le titre en cours et l'état lecture / pause.
// Le code natif est dans android/…/OpusWidget.java (copié par scripts/patch-android.mjs).
import { Capacitor, registerPlugin } from '@capacitor/core';
import { player } from './player.js';

const OpusWidget = registerPlugin('OpusWidget');

export function initWidget() {
  if (!Capacitor.isNativePlatform()) return;
  let timer = 0, last = '';
  const push = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const s = player.current;
      const data = { title: s?.title || 'Opus', artist: s ? s.artist || '' : '', playing: !!player.playing };
      const key = JSON.stringify(data);
      if (key === last) return;
      last = key;
      OpusWidget.update(data).catch(() => { /* ancien APK sans widget */ });
    }, 300);
  };
  player.on('track', push);
  player.on('state', push);
  push();
}
