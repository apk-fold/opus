// Pages ajoutées : Découvrir (Flow, mix du jour…), Historique, Fonctionnalités, Titres masqués,
// Téléchargements serveur (deemix), Nouveautés, Blind test. Mêmes conventions que views.js (ctx).
import { gsap } from 'gsap';
import { api } from './api.js';
import { player } from './player.js';
import { settings, store } from './store.js';
import { $, $$, esc, plural, toast, debounce, haptic } from './ui.js';
import { icon } from './icons.js';
import { sectionHead, skeleton, emptyState, coverBox } from './components.js';
import { songMenu, startFlow, startArtistRadio } from './actions.js';
import { openSheet } from './sheets.js';
import { reveal, animateTitle, fxOn, countUp } from './fx.js';
import { playLog } from './history.js';
import { FEATURES, CATS, feat, resetFlags, countOn } from './flags.js';
import { bans } from './bans.js';
import { MOODS, dailyMixes, mixSongs, rediscover, throwbackInfo, throwbackSongs, releases, artistRadio } from './discover.js';
import { dmx, dmxState, watchJobs, STATUS } from './deemix.js';

const pageHead = (title, sub = '') => `<div class="page-head"><h1 class="title">${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>`;
const dzImg = (src, cls = 'sq') => `<div class="cov ${cls}">${src ? `<img class="cv" loading="lazy" decoding="async" alt="" src="${esc(src)}">` : ''}</div>`;
const relCard = (a) => `
  <a class="card tap" href="#/dz/album/${esc(a.id)}">
    ${dzImg(a.cover)}
    <div class="c-t">${esc(a.title)}</div>
    <div class="c-s">${esc(a.artist)} · ${esc(new Date(a.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }))}${a.type && a.type !== 'album' ? ' · ' + esc(a.type) : ''}</div>
  </a>`;

// =============================================================================================
// Blocs de découverte (partagés avec l'accueil)
// =============================================================================================
export const flowBanner = (compact = false) => (feat('f_flow') ? `
  <section class="flow-card ${compact ? 'compact' : ''}">
    <div class="flow-waves" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="flow-body">
      <div class="flow-kicker">${icon('flow')} Flow</div>
      <h2>Ta musique, sans fin</h2>
      <p>Tes favoris, ce que tu écoutes le plus et des titres proches, mélangés en continu.</p>
      <button class="btn primary glow tap ripple" data-flow="all">${icon('play')} Lancer le Flow</button>
    </div>
    <div class="chips hscroll moods">${MOODS.slice(1).map(([id, l, sub]) => `<button class="chip tap" data-flow="${id}" title="${esc(sub)}">${esc(l)}</button>`).join('')}</div>
  </section>` : '');

const mixCard = (m) => `
  <button class="card mix tap" data-mix="${esc(m.id)}" data-name="${esc(m.name)}">
    <div class="cov sq">${m.cover ? `<img class="cv" loading="lazy" alt="" src="${esc(api.coverUrl(m.cover, 300))}">` : ''}<span class="mix-tag">${esc(m.title)}</span><span class="fab">${icon('play')}</span></div>
    <div class="c-t">${esc(m.title)}</div><div class="c-s">${esc(m.name)} et plus</div>
  </button>`;

export async function fillMixes(el, stale) {
  if (!el || !feat('f_mixes')) return;
  el.innerHTML = `${sectionHead('Mix du jour')}${skeleton(4)}`;
  const list = await dailyMixes().catch(() => []);
  if (stale()) return;
  el.innerHTML = list.length ? `${sectionHead('Mix du jour')}<div class="hscroll">${list.map(mixCard).join('')}</div>` : '';
  reveal(el, '.card', { each: 0.04 });
}

// clics des blocs de découverte ; renvoie vrai si le clic est traité
export async function discoverClick(e) {
  const f = e.target.closest('[data-flow]');
  if (f) { await startFlow(f.dataset.flow); return true; }
  const m = e.target.closest('[data-mix]');
  if (m) {
    haptic('medium');
    const id = m.dataset.mix, name = m.dataset.name;
    const list = await mixSongs(id);
    if (!list.length) { toast('Pas assez de titres pour ce mix'); return true; }
    player.playQueue(list, 0, { endless: (ex) => artistRadio(id, ex), label: `Mix · ${name}` });
    toast(`Mix du jour · ${name}`);
    return true;
  }
  const d = e.target.closest('[data-disc]');
  if (d) {
    const k = d.dataset.disc;
    if (k === 'rediscover') {
      toast('Recherche de pépites…');
      const l = await rediscover();
      if (l.length) player.playQueue(l, 0); else toast('Rien d\'oublié : tu écoutes déjà tout !');
    } else if (k === 'throwback') {
      const l = await throwbackSongs();
      if (l.length) player.playQueue(l, 0); else toast('Titres introuvables sur le serveur');
    }
    return true;
  }
  const r = e.target.closest('[data-arradio]');
  if (r) { await startArtistRadio(r.dataset.arradio, r.dataset.name); return true; }
  return false;
}

// =============================================================================================
// #/discover
// =============================================================================================
export async function discover(ctx) {
  ctx.title('Découvrir');
  const tb = feat('f_throwback') ? throwbackInfo() : null;
  const topArtists = playLog.stats(Date.now() - 90 * 864e5).artists.filter((a) => a.id).slice(0, 10);
  ctx.root.innerHTML = `
    ${pageHead('Découvrir', 'Ta bibliothèque, autrement')}
    ${flowBanner()}
    <section class="rowsec" id="mixes"></section>
    <div class="disc-grid">
      ${feat('f_rediscover') ? `<button class="disc-tile tap ripple" data-disc="rediscover">${icon('spark')}<b>Pépites oubliées</b><span>Favoris délaissés et titres jamais joués</span></button>` : ''}
      ${tb ? `<button class="disc-tile tap ripple" data-disc="throwback">${icon('calendar')}<b>Ce jour-là</b><span>${esc(tb.label)} · ${plural(tb.ids.length, 'titre', 'titres')}</span></button>` : ''}
      ${feat('f_blindtest') ? `<a class="disc-tile tap ripple" href="#/blindtest">${icon('game')}<b>Blind test</b><span>Devine le titre en quelques secondes</span></a>` : ''}
      ${feat('f_history') ? `<a class="disc-tile tap ripple" href="#/history">${icon('clock')}<b>Historique</b><span>Tout ce que tu as écouté</span></a>` : ''}
    </div>
    ${feat('f_radio') && topArtists.length ? `<section class="rowsec">${sectionHead('Radios de tes artistes')}<div class="chips wrap">${topArtists.map((a) => `<button class="chip tap" data-arradio="${esc(a.id)}" data-name="${esc(a.label)}">${icon('radio')} ${esc(a.label)}</button>`).join('')}</div></section>` : ''}
    <section class="rowsec" id="rel"></section>`;
  animateTitle($('.title', ctx.root));
  reveal(ctx.root, '.flow-card, .disc-tile', { each: 0.05 });
  ctx.onClick(async (e) => { try { await discoverClick(e); } catch (err) { toast('Erreur : ' + err.message); } });
  fillMixes($('#mixes', ctx.root), ctx.stale);
  if (feat('f_releases')) {
    const box = $('#rel', ctx.root);
    box.innerHTML = `${sectionHead('Nouveautés de tes artistes', '#/releases')}${skeleton(4)}`;
    try {
      const items = await releases();
      if (ctx.stale()) return;
      box.innerHTML = items.length ? `${sectionHead('Nouveautés de tes artistes', '#/releases')}<div class="hscroll">${items.slice(0, 14).map(relCard).join('')}</div>` : '';
      reveal(box, '.card', { each: 0.03 });
    } catch { box.innerHTML = ''; }
  }
}

// =============================================================================================
// #/releases
// =============================================================================================
export async function releasesView(ctx) {
  ctx.title('Nouveautés');
  ctx.root.innerHTML = `${pageHead('Nouveautés', 'Sorties des 4 derniers mois de tes artistes, sur Deezer')}
    <div class="hb-actions pad"><button class="btn tap" data-rel="refresh">${icon('refresh')} Actualiser</button></div>
    <p class="sub" id="relp"></p><div class="grid" id="relg">${skeleton(8)}</div>`;
  animateTitle($('.title', ctx.root));
  const load = async (force) => {
    const g = $('#relg', ctx.root), p = $('#relp', ctx.root);
    g.innerHTML = skeleton(8);
    try {
      const items = await releases({ force, onProgress: (i, n) => { if (!ctx.stale()) p.textContent = `Recherche ${i}/${n} artistes…`; } });
      if (ctx.stale()) return;
      p.textContent = items.length ? plural(items.length, 'sortie', 'sorties') : '';
      g.innerHTML = items.length ? items.map(relCard).join('') : emptyState('calendar', 'Rien de neuf', 'Ajoute des artistes en favoris ou écoute un peu : la liste se base sur tes goûts.');
      reveal(g, '.card', { each: 0.03 });
    } catch (e) { g.innerHTML = emptyState('wave', 'Deezer injoignable', e.message); }
  };
  ctx.onClick((e) => { if (e.target.closest('[data-rel="refresh"]')) load(true); });
  await load(false);
}

// =============================================================================================
// #/history
// =============================================================================================
export async function historyView(ctx) {
  ctx.title('Historique');
  let filter = '';
  const dayLabel = (t) => {
    const d = new Date(t), today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((today - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
    return diff === 0 ? 'Aujourd\'hui' : diff === 1 ? 'Hier' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: today.getFullYear() === d.getFullYear() ? undefined : 'numeric' });
  };
  const render = () => {
    const f = filter.toLowerCase();
    const rows = playLog.all().slice(-800).reverse().filter((r) => !f || `${r.ti} ${r.ar} ${r.al}`.toLowerCase().includes(f));
    const groups = [];
    for (const r of rows) {
      const l = dayLabel(r.t);
      if (!groups.length || groups[groups.length - 1][0] !== l) groups.push([l, []]);
      groups[groups.length - 1][1].push(r);
    }
    $('#hist', ctx.root).innerHTML = rows.length ? groups.map(([l, rs]) => `
      <h4 class="disc-h">${icon('clock')} ${esc(l.charAt(0).toUpperCase() + l.slice(1))} <small>${plural(rs.length, 'écoute', 'écoutes')}</small></h4>
      <div class="tracks">${rs.map((r) => `
        <div class="row tap ripple" data-h="${esc(r.id)}">
          ${coverBox({ coverArt: r.cov }, 96, 'xs')}
          <div class="meta"><div class="t">${esc(r.ti)}</div><div class="s">${esc([r.ar, r.al].filter(Boolean).join(' · '))}</div></div>
          <span class="dur">${new Date(r.t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          <button class="ic-btn tap" data-hm="${esc(r.id)}" aria-label="Plus d'options">${icon('dots')}</button>
        </div>`).join('')}</div>`).join('')
      : emptyState('clock', f ? 'Aucun résultat' : 'Historique vide', f ? 'Rien ne correspond au filtre' : 'Les titres apparaissent ici une fois écoutés à moitié.');
    reveal(ctx.root, '.row', { y: 12, each: 0.02 });
  };
  ctx.root.innerHTML = `
    ${pageHead('Historique', `${plural(playLog.all().length, 'écoute', 'écoutes')} enregistrée${playLog.all().length > 1 ? 's' : ''} sur ce téléphone`)}
    ${settings.get('privateSession') ? `<div class="note">${icon('eyeOff')}<span>Session privée active : les écoutes ne sont pas enregistrées.</span></div>` : ''}
    <div class="off-tools"><input class="set-input" id="hf" type="search" placeholder="Filtrer…"><button class="ic-btn round tap" data-hx="clear" aria-label="Effacer">${icon('trash')}</button></div>
    <div id="hist"></div>`;
  animateTitle($('.title', ctx.root));
  $('#hf', ctx.root).addEventListener('input', debounce((e) => { filter = e.target.value.trim(); render(); }, 200));
  render();
  ctx.onClick(async (e) => {
    const mb = e.target.closest('[data-hm]');
    if (mb) { try { songMenu(await api.song(mb.dataset.hm)); } catch { toast('Titre introuvable sur le serveur'); } return; }
    const row = e.target.closest('[data-h]');
    if (row) {
      try {
        const s = await api.song(row.dataset.h);
        player.playQueue([s], 0);
      } catch { toast('Titre introuvable sur le serveur'); }
      return;
    }
    if (e.target.closest('[data-hx="clear"]')) {
      const c = await openSheet({ title: 'Effacer l\'historique ?', subtitle: 'Le Replay et les suggestions repartiront de zéro.', items: [{ id: 'yes', icon: 'trash', label: 'Effacer', danger: true }, { id: 'no', icon: 'close', label: 'Annuler' }] });
      if (c === 'yes') { playLog.clear(); render(); }
    }
  });
}

// =============================================================================================
// #/features : activer / désactiver chaque fonctionnalité
// =============================================================================================
export async function featuresView(ctx) {
  ctx.title('Fonctionnalités');
  let filter = '';
  const sw = (f) => {
    const own = settings.get(f.key) !== false;
    const blocked = f.needs && settings.get(f.needs) === false;
    const dep = blocked ? FEATURES.find((x) => x.key === f.needs)?.label : '';
    return `<div class="set-row feat ${blocked ? 'blocked' : ''}" data-fk="${f.key}">
      <div class="lbl"><b>${esc(f.label)}</b>${f.sub ? `<small>${esc(f.sub)}</small>` : ''}${blocked ? `<small class="warn">Nécessite « ${esc(dep)} »</small>` : ''}</div>
      ${f.link && own ? `<a class="ic-btn tap" href="${f.link}" aria-label="Régler">${icon('sliders')}</a>` : ''}
      <button class="switch tap ${own ? 'on' : ''}" data-ff="${f.key}" role="switch" aria-checked="${own}"><i></i></button>
    </div>`;
  };
  const render = () => {
    const q = filter.toLowerCase();
    $('#fl', ctx.root).innerHTML = CATS.map(([id, label, ic]) => {
      const list = FEATURES.filter((f) => f.cat === id && (!q || `${f.label} ${f.sub || ''}`.toLowerCase().includes(q)));
      return list.length ? `<section class="card-box"><h4>${icon(ic)} ${esc(label)}</h4>${list.map(sw).join('')}</section>` : '';
    }).join('') || emptyState('search', 'Aucune fonctionnalité', 'Rien ne correspond à la recherche');
    $('#fcount', ctx.root).textContent = `${countOn()} actives sur ${FEATURES.length}`;
  };
  ctx.root.innerHTML = `
    ${pageHead('Fonctionnalités', 'Active seulement ce dont tu as besoin')}
    <p class="sub" id="fcount"></p>
    <div class="off-tools"><input class="set-input" id="ff" type="search" placeholder="Chercher une fonctionnalité…"></div>
    <div class="set-actions" style="margin:0 0 14px">
      <button class="chip tap" data-fa="all">${icon('check')} Tout activer</button>
      <button class="chip tap" data-fa="reset">${icon('refresh')} Valeurs par défaut</button>
      <a class="chip tap" href="#/banned">${icon('ban')} Masqués (${bans.count()})</a>
    </div>
    <div id="fl"></div>`;
  animateTitle($('.title', ctx.root));
  render();
  reveal(ctx.root, '.card-box', { each: 0.05 });
  $('#ff', ctx.root).addEventListener('input', debounce((e) => { filter = e.target.value.trim(); render(); }, 150));
  ctx.onClick((e) => {
    const t = e.target.closest('[data-ff]');
    if (t) {
      const k = t.dataset.ff, v = settings.get(k) === false;
      settings.set(k, v);
      haptic('light');
      render();
      return;
    }
    const a = e.target.closest('[data-fa]');
    if (!a) return;
    if (a.dataset.fa === 'all') { FEATURES.forEach((f) => { if (f.key !== 'privateSession' && f.key !== 'musicHaptics' && f.key !== 'f_keepAwake') settings.set(f.key, true); }); toast('Fonctionnalités activées'); }
    else { resetFlags(); toast('Valeurs par défaut rétablies'); }
    render();
  });
}

// =============================================================================================
// #/banned : titres et artistes masqués
// =============================================================================================
export async function bannedView(ctx) {
  ctx.title('Masqués');
  const render = () => {
    const songs = bans.songs(), artists = bans.artists();
    ctx.root.innerHTML = `
      ${pageHead('Ne plus proposer', 'Écartés du Flow, des mix, des radios et de la lecture automatique')}
      ${!feat('f_ban') ? `<div class="note">${icon('info')}<span>La fonctionnalité est désactivée : ces titres peuvent de nouveau être proposés.</span></div>` : ''}
      ${!songs.length && !artists.length ? emptyState('ban', 'Rien de masqué', 'Menu ⋯ d\'un titre › Ne plus proposer…') : ''}
      ${artists.length ? `<section class="card-box"><h4>Artistes</h4>${artists.map((a) => `<div class="set-row"><div class="lbl"><b>${esc(a.name)}</b></div><button class="btn tap" data-ub="a:${esc(a.id)}">${icon('close')} Retirer</button></div>`).join('')}</section>` : ''}
      ${songs.length ? `<section class="card-box"><h4>Titres</h4>${songs.map((s) => `<div class="set-row"><div class="lbl"><b>${esc(s.title)}</b><small>${esc(s.artist)}</small></div><button class="btn tap" data-ub="s:${esc(s.id)}">${icon('close')} Retirer</button></div>`).join('')}</section>` : ''}
      ${songs.length || artists.length ? `<div class="hb-actions center"><button class="btn tap" data-ub="all">${icon('trash')} Tout retirer</button></div>` : ''}`;
    animateTitle($('.title', ctx.root));
  };
  render();
  ctx.onClick((e) => {
    const b = e.target.closest('[data-ub]');
    if (!b) return;
    const v = b.dataset.ub;
    if (v === 'all') bans.clear();
    else if (v.startsWith('a:')) bans.removeArtist(v.slice(2));
    else bans.removeSong(v.slice(2));
    render();
  });
}

// =============================================================================================
// #/deemix : téléchargements envoyés au serveur
// =============================================================================================
export async function deemixView(ctx) {
  ctx.title('Téléchargements serveur');
  if (!dmx.ready) {
    ctx.root.innerHTML = `${pageHead('Téléchargements serveur')}${emptyState('cloud', 'Serveur deemix non configuré', 'Installe le service sur ton serveur (dossier server/ du projet), puis renseigne son adresse et son jeton dans Réglages › Deezer.')}
      <div class="hb-actions center"><a class="btn primary tap" href="#/settings?s=deemix">${icon('sliders')} Configurer</a></div>`;
    return;
  }
  const jobRow = (j) => {
    const [label, ic] = STATUS[j.status] || [j.status, 'info'];
    const busy = ['queued', 'running', 'scanning'].includes(j.status);
    const n = j.files?.length || 0;
    return `<div class="job ${esc(j.status)}" data-job="${esc(j.id)}">
      ${dzImg(j.cover, 'xs')}
      <div class="meta">
        <div class="t">${esc(j.title)}</div>
        <div class="s">${icon(ic)} ${esc(label)}${j.status === 'running' && j.progress ? ` · ${j.progress} %` : ''}${n ? ` · ${plural(n, 'fichier', 'fichiers')}` : ''}${j.bitrate && !busy ? ` · ${esc(j.bitrate)}` : ''}</div>
        ${j.message && j.status !== 'done' ? `<div class="s msg">${esc(j.message)}</div>` : ''}
        ${busy ? `<div class="dl-track"><i style="width:${j.status === 'queued' ? 0 : Math.max(4, j.progress || 0)}%"></i></div>` : ''}
      </div>
      <button class="ic-btn tap" data-jm="${esc(j.id)}" aria-label="Options">${icon('dots')}</button>
    </div>`;
  };
  ctx.root.innerHTML = `
    ${pageHead('Téléchargements serveur', 'deemix sur ton serveur → bibliothèque Navidrome')}
    <div class="note" id="dmxh">${icon('cloud')}<span>Connexion au serveur…</span></div>
    <div class="set-actions" style="margin:0 0 14px">
      <button class="chip tap" data-dj="refresh">${icon('refresh')} Actualiser</button>
      <button class="chip tap" data-dj="clear">${icon('trash')} Vider les terminés</button>
      <a class="chip tap" href="#/deezer">${icon('deezer')} Chercher sur Deezer</a>
    </div>
    <div id="jobs">${skeleton(3, 'line')}</div>`;
  animateTitle($('.title', ctx.root));
  const draw = () => {
    if (ctx.stale()) return;
    const box = $('#jobs', ctx.root);
    if (dmxState.error && !dmxState.jobs.length) { box.innerHTML = emptyState('wave', 'Serveur deemix injoignable', dmxState.error); return; }
    box.innerHTML = dmxState.jobs.length ? dmxState.jobs.map(jobRow).join('') : emptyState('cloud', 'Aucun téléchargement', 'Depuis Deezer : bouton nuage sur un titre absent, ou « deemix » sur un album / une playlist.');
  };
  const onUpd = () => draw();
  window.addEventListener('nv:dmx', onUpd);
  ctx.onLeave(() => window.removeEventListener('nv:dmx', onUpd));
  dmx.health().then((h) => {
    if (ctx.stale()) return;
    const acc = h.account && !h.account.invalid ? `${h.account.name || 'compte'} · ${h.account.lossless ? 'FLAC' : h.account.hq ? 'MP3 320' : 'MP3 128'}` : h.arl ? 'ARL non vérifié' : 'aucun ARL';
    $('#dmxh', ctx.root).innerHTML = `${icon(h.arl && h.deemix ? 'check' : 'info')}<span>Serveur v${esc(h.version)} · deemix ${h.deemix ? 'OK' : 'introuvable'} · Deezer : ${esc(acc)}${h.writable ? '' : ' · dossier non accessible en écriture'}<br><small>${esc(h.music)}</small></span>`;
  }).catch((e) => { if (!ctx.stale()) $('#dmxh', ctx.root).innerHTML = `${icon('close')}<span>${esc(e.message)}</span>`; });
  watchJobs(true);
  await new Promise((r) => setTimeout(r, 50));
  draw();
  ctx.onClick(async (e) => {
    const a = e.target.closest('[data-dj]');
    if (a) {
      if (a.dataset.dj === 'refresh') watchJobs(true);
      else { try { await dmx.clear(); watchJobs(true); toast('Liste vidée'); } catch (err) { toast(err.message); } }
      return;
    }
    const m = e.target.closest('[data-jm]');
    if (!m) return;
    const j = dmxState.jobs.find((x) => x.id === m.dataset.jm);
    if (!j) return;
    const busy = ['queued', 'running', 'scanning'].includes(j.status);
    const c = await openSheet({
      title: j.title, subtitle: (STATUS[j.status] || [j.status])[0], cover: j.cover,
      items: [
        ...(busy ? [{ id: 'cancel', icon: 'close', label: 'Annuler', danger: true }] : [{ id: 'retry', icon: 'refresh', label: 'Relancer' }, { id: 'del', icon: 'trash', label: 'Retirer de la liste' }]),
        ...(j.files?.length ? [{ id: 'files', icon: 'folder', label: 'Voir les fichiers', sub: plural(j.files.length, 'fichier', 'fichiers') }] : []),
        ...(j.log?.length ? [{ id: 'log', icon: 'info', label: 'Journal deemix' }] : []),
      ],
    });
    try {
      if (c === 'cancel' || c === 'del') { await dmx.cancel(j.id); watchJobs(true); }
      else if (c === 'retry') { await dmx.retry(j.id); watchJobs(true); toast('Relancé'); }
      else if (c === 'files' || c === 'log') {
        const lines = c === 'files' ? j.files : j.log;
        openSheet({ title: c === 'files' ? 'Fichiers' : 'Journal deemix', subtitle: j.title, body: `<pre class="logbox">${esc(lines.join('\n'))}</pre>` });
      }
    } catch (err) { toast(err.message); }
  });
}

// =============================================================================================
// #/blindtest
// =============================================================================================
export async function blindtest(ctx) {
  ctx.title('Blind test');
  const best = () => store.get('btBest', 0);
  let audio = null, timer = null;
  const stop = () => { clearInterval(timer); timer = null; if (audio) { audio.pause(); audio.removeAttribute('src'); audio = null; } };
  ctx.onLeave(stop);
  const ROUNDS = 10, TIME = 15;
  let pool = [], round = 0, score = 0, mode = store.get('btMode', 'title'), src = store.get('btSrc', 'lib'), answered = false, t0 = 0;

  const setup = () => {
    stop();
    ctx.root.innerHTML = `
      ${pageHead('Blind test', `Record : ${best().toLocaleString('fr-FR')} points`)}
      <section class="card-box bt-setup">
        <div class="set-block"><div class="lbl"><b>Deviner</b></div><div class="segm" data-bt="mode"><button class="tap ${mode === 'title' ? 'on' : ''}" data-val="title">Le titre</button><button class="tap ${mode === 'artist' ? 'on' : ''}" data-val="artist">L'artiste</button></div></div>
        <div class="set-block"><div class="lbl"><b>Titres</b><small>Extraits de ta bibliothèque Navidrome</small></div><div class="segm" data-bt="src"><button class="tap ${src === 'lib' ? 'on' : ''}" data-val="lib">Toute la biblio</button><button class="tap ${src === 'fav' ? 'on' : ''}" data-val="fav">Mes favoris</button><button class="tap ${src === 'hist' ? 'on' : ''}" data-val="hist">Mon historique</button></div></div>
        <p class="sub" style="margin-top:12px">${ROUNDS} manches · ${TIME} s par extrait · plus tu réponds vite, plus tu marques de points.</p>
        <div class="hb-actions center"><button class="btn primary glow big tap ripple" data-bt="start">${icon('game')} Jouer</button></div>
      </section>`;
    animateTitle($('.title', ctx.root));
  };

  const loadPool = async () => {
    let list = [];
    if (src === 'fav') list = (await api.starred()).songs;
    else if (src === 'hist') {
      const ids = [...new Set(playLog.all().slice(-400).map((r) => r.id))].sort(() => Math.random() - 0.5).slice(0, 40);
      list = (await Promise.all(ids.map((id) => api.song(id).catch(() => null)))).filter(Boolean);
    }
    if (list.length < 12) list = [...list, ...(await api.randomSongs(80))];
    const seen = new Set();
    return list.filter((s) => s && s.duration > 40 && !seen.has(s.id) && seen.add(s.id)).sort(() => Math.random() - 0.5);
  };

  const label = (s) => (mode === 'artist' ? s.artist || '?' : s.title);
  const playRound = () => {
    stop();
    answered = false;
    const s = pool[round];
    const others = [...new Set(pool.filter((x) => label(x).toLowerCase() !== label(s).toLowerCase()).map(label))].sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [label(s), ...others].sort(() => Math.random() - 0.5);
    ctx.root.innerHTML = `
      <div class="bt-top"><span>Manche <b>${round + 1}</b>/${ROUNDS}</span><span><b class="bt-score">${score.toLocaleString('fr-FR')}</b> pts</span></div>
      <div class="bt-stage"><div class="bt-cover">${coverBox(s, 600, 'sq')}</div><div class="bt-eq"><i></i><i></i><i></i><i></i><i></i></div></div>
      <div class="bt-time"><i></i></div>
      <div class="bt-choices">${choices.map((c) => `<button class="btn tap bt-c" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="bt-after" hidden></div>`;
    if (player.playing) player.pause();
    audio = new Audio(api.streamUrl(s.id, { bitrate: 192 }));
    audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = Math.max(5, Math.min((audio.duration || s.duration) * (0.25 + Math.random() * 0.35), (audio.duration || s.duration) - TIME - 2)); } catch { /* ignoré */ } }, { once: true });
    audio.play().catch(() => {});
    t0 = performance.now();
    const bar = $('.bt-time i', ctx.root);
    timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / (TIME * 1000));
      if (bar) bar.style.width = `${(1 - p) * 100}%`;
      if (p >= 1) answer(null);
    }, 100);
    if (fxOn()) gsap.from($$('.bt-c', ctx.root), { y: 24, autoAlpha: 0, duration: 0.45, ease: 'power3.out', stagger: 0.06 });
  };

  const answer = (choice) => {
    if (answered) return;
    answered = true;
    clearInterval(timer); timer = null;
    const s = pool[round];
    const ok = choice != null && choice === label(s);
    const pts = ok ? Math.round(300 + 700 * Math.max(0, 1 - (performance.now() - t0) / (TIME * 1000))) : 0;
    score += pts;
    haptic(ok ? 'medium' : 'heavy');
    $$('.bt-c', ctx.root).forEach((b) => { b.disabled = true; b.classList.toggle('good', b.dataset.c === label(s)); b.classList.toggle('bad', b.dataset.c === choice && !ok); });
    $('.bt-cover', ctx.root).classList.add('show');
    const after = $('.bt-after', ctx.root);
    after.hidden = false;
    after.innerHTML = `<b>${ok ? `Bravo ! +${pts}` : choice == null ? 'Temps écoulé' : 'Raté'}</b><span>${esc(s.title)} — ${esc(s.artist || '')}</span>
      <button class="btn primary tap" data-bt="next">${round + 1 < ROUNDS ? `Suivant ${icon('right')}` : 'Résultat'}</button>`;
    countUp($('.bt-score', ctx.root), score, { duration: 0.6 });
  };

  const finish = () => {
    stop();
    const rec = score > best();
    if (rec) store.set('btBest', score);
    ctx.root.innerHTML = `${pageHead('Blind test')}
      <section class="rp-hero"><div class="rp-big"><b class="bt-final">0</b><span>points</span></div>
        <div class="rp-top">${rec ? '🏆 Nouveau record !' : `Record : ${best().toLocaleString('fr-FR')} points`}</div></section>
      <div class="hb-actions center"><button class="btn primary glow tap" data-bt="again">${icon('refresh')} Rejouer</button><button class="btn tap" data-bt="setup">${icon('sliders')} Options</button></div>`;
    countUp($('.bt-final', ctx.root), score, { duration: 1.2 });
  };

  const start = async () => {
    ctx.root.innerHTML = `${pageHead('Blind test', 'Préparation…')}${skeleton(4, 'line')}`;
    try { pool = await loadPool(); } catch (e) { toast('Erreur : ' + e.message); setup(); return; }
    if (ctx.stale()) return;
    if (pool.length < 8) { toast('Il faut au moins 8 titres'); setup(); return; }
    pool = pool.slice(0, Math.max(ROUNDS, 30));
    round = 0; score = 0;
    playRound();
  };

  setup();
  ctx.onClick(async (e) => {
    const sg = e.target.closest('[data-bt="mode"] button, [data-bt="src"] button');
    if (sg) {
      const k = sg.parentElement.dataset.bt;
      if (k === 'mode') { mode = sg.dataset.val; store.set('btMode', mode); } else { src = sg.dataset.val; store.set('btSrc', src); }
      $$('button', sg.parentElement).forEach((b) => b.classList.toggle('on', b === sg));
      return;
    }
    const c = e.target.closest('[data-c]');
    if (c) { answer(c.dataset.c); return; }
    const b = e.target.closest('[data-bt]');
    if (!b) return;
    const k = b.dataset.bt;
    if (k === 'start' || k === 'again') start();
    else if (k === 'setup') setup();
    else if (k === 'next') { round += 1; if (round >= ROUNDS) finish(); else playRound(); }
  });
}

