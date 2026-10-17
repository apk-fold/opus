// Feuille modale (bottom sheet) animée : menus d'actions, choix, saisie de texte.
import { gsap } from 'gsap';
import { esc, html, $, haptic } from './ui.js';
import { icon } from './icons.js';
import { fxOn } from './fx.js';

let current = null;

export const sheetOpen = () => !!current;
export function closeSheet(value = null) { current?.close(value); }

/**
 * openSheet({ title, subtitle, cover, items:[{id,icon,label,sub,danger,active}], rating, onRate, input:{placeholder,value,ok} })
 * → Promise<id | texte | null>
 */
export function openSheet(opts = {}) {
  closeSheet();
  return new Promise((resolve) => {
    const { title = '', subtitle = '', cover = '', items = [], onRate, input, body = '', onMount } = opts;
    let rating = opts.rating ?? null;
    const stars = rating == null ? '' : `<div class="rate" role="group" aria-label="Note">${[1, 2, 3, 4, 5]
      .map((n) => `<button class="tap" data-star="${n}" aria-label="${n} étoiles">${icon(n <= rating ? 'starFill' : 'star')}</button>`).join('')}</div>`;
    const list = items.map((it) => `
      <button class="sheet-item tap ripple ${it.danger ? 'danger' : ''} ${it.active ? 'active' : ''}" data-id="${esc(it.id)}">
        ${it.icon ? icon(it.icon) : ''}
        <span class="lbl">${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>
        ${it.active ? icon('check', 'ok') : ''}
      </button>`).join('');
    const inputHtml = input ? `
      <form class="sheet-input"><input type="text" enterkeyhint="done" autocomplete="off" placeholder="${esc(input.placeholder || '')}" value="${esc(input.value || '')}">
      <button type="submit" class="btn primary tap">${esc(input.ok || 'Valider')}</button></form>` : '';

    const root = html(`
      <div class="sheet-wrap">
        <div class="sheet-back"></div>
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="grab"><i></i></div>
          ${title ? `<div class="sheet-head">
            ${cover ? `<div class="cov sm"><img class="cv" src="${esc(cover)}" alt=""></div>` : ''}
            <div class="meta"><b>${esc(title)}</b>${subtitle ? `<span>${esc(subtitle)}</span>` : ''}</div>
          </div>` : ''}
          ${stars}${inputHtml}${body}
          <div class="sheet-list">${list}</div>
        </div>
      </div>`);
    $('#overlays').appendChild(root);
    const sheet = $('.sheet', root);
    const back = $('.sheet-back', root);
    let closed = false;

    const close = (value = null) => {
      if (closed) return;
      closed = true;
      current = null;
      resolve(value);
      if (!fxOn()) { root.remove(); return; }
      gsap.to(back, { opacity: 0, duration: 0.25 });
      gsap.to(sheet, { yPercent: 100, duration: 0.32, ease: 'power3.in', onComplete: () => root.remove() });
    };
    current = { close };
    onMount?.(root, close);

    if (fxOn()) {
      gsap.fromTo(back, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(sheet, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'expo.out' });
      gsap.from($$$('.sheet-item', root), { y: 24, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.03, delay: 0.12 });
    }

    back.addEventListener('click', () => close(null));
    root.addEventListener('click', (e) => {
      const it = e.target.closest('.sheet-item');
      if (it) { haptic('light'); close(it.dataset.id); return; }
      const st = e.target.closest('[data-star]');
      if (st) {
        let n = Number(st.dataset.star);
        if (n === rating) n = 0;
        rating = n;
        root.querySelectorAll('[data-star]').forEach((b) => { b.innerHTML = icon(Number(b.dataset.star) <= n ? 'starFill' : 'star'); });
        haptic('medium');
        onRate?.(n);
      }
    });

    // saisie de texte
    if (input) {
      const f = $('form', root);
      const inp = $('input', root);
      setTimeout(() => { inp.focus(); inp.select(); }, 350);
      f.addEventListener('submit', (e) => { e.preventDefault(); const v = inp.value.trim(); if (v) close(v); });
    }

    // glisser vers le bas pour fermer
    let y0 = null, dy = 0;
    $('.grab', root).addEventListener('pointerdown', (e) => { y0 = e.clientY; dy = 0; e.target.setPointerCapture?.(e.pointerId); });
    $('.grab', root).addEventListener('pointermove', (e) => {
      if (y0 == null) return;
      dy = Math.max(0, e.clientY - y0);
      gsap.set(sheet, { y: dy });
    });
    const end = () => {
      if (y0 == null) return;
      y0 = null;
      if (dy > 90) close(null);
      else gsap.to(sheet, { y: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)' });
    };
    $('.grab', root).addEventListener('pointerup', end);
    $('.grab', root).addEventListener('pointercancel', end);
  });
}

const $$$ = (s, r) => [...r.querySelectorAll(s)];

export const askText = (title, { placeholder = '', value = '', ok = 'Valider' } = {}) =>
  openSheet({ title, input: { placeholder, value, ok } });
