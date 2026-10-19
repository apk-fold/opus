// Réglages › Serveurs : plusieurs serveurs Navidrome (le tien, celui d'un ami…).
// Un serveur est « actif » (celui qu'on parcourt) ; les titres gardent leur serveur d'origine :
// la file d'attente peut mélanger plusieurs serveurs et chaque titre est lu depuis le bon.
import { api } from './api.js';
import { esc, toast } from './ui.js';
import { icon } from './icons.js';
import { openSheet } from './sheets.js';

export function serversHtml() {
  const rows = api.servers.map((sv) => {
    const on = sv.id === api.activeId;
    return `<div class="set-row" data-srv="${esc(sv.id)}">
      <div class="lbl"><b>${esc(sv.name)}${on ? ' · actif' : ''}</b><small>${esc(sv.cfg.user)} · ${esc(sv.cfg.url)}</small></div>
      <button class="btn tap" data-srv-menu="${esc(sv.id)}">${icon(on ? 'check' : 'dots')} ${on ? 'Options' : 'Choisir'}</button>
    </div>`;
  }).join('');
  return `<section class="card-box" id="set-srv"><h4>Serveurs Navidrome</h4>
    ${rows || '<div class="note"><span>Aucun serveur enregistré.</span></div>'}
    <div class="set-row"><div class="lbl"><b>Ajouter un serveur</b><small>Par exemple celui d'un ami (adresse, identifiant, mot de passe)</small></div><button class="btn tap" data-srv-add>${icon('link')} Ajouter</button></div>
    <form class="srv-form" id="srv-form" hidden autocomplete="off">
      <input class="set-input" name="name" placeholder="Nom (ex. Serveur de Léo)" autocomplete="off">
      <input class="set-input" name="url" placeholder="Adresse (ex. http://100.x.x.x:4533)" autocomplete="off" autocapitalize="off" spellcheck="false" required>
      <input class="set-input" name="user" placeholder="Identifiant" autocomplete="off" autocapitalize="off" spellcheck="false" required>
      <input class="set-input" name="pass" type="password" placeholder="Mot de passe" autocomplete="new-password" required>
      <div class="set-row"><div class="lbl"><small class="err" id="srv-err"></small></div><button class="btn primary tap" type="submit">${icon('check')} Enregistrer</button></div>
    </form>
  </section>`;
}

// changer de serveur recharge l'appli (bibliothèque, accueil, favoris… viennent du serveur actif)
function switchTo(id) {
  if (!api.use(id)) return;
  toast('Changement de serveur…', 1500);
  setTimeout(() => location.reload(), 250);
}

export function serversMount(root) {
  const sec = root.querySelector('#set-srv');
  if (!sec) return;
  const form = sec.querySelector('#srv-form');
  const err = sec.querySelector('#srv-err');
  sec.addEventListener('click', async (e) => {
    if (e.target.closest('[data-srv-add]')) { form.hidden = !form.hidden; if (!form.hidden) form.elements.name.focus(); return; }
    const b = e.target.closest('[data-srv-menu]');
    if (!b) return;
    const id = b.dataset.srvMenu;
    const sv = api.servers.find((x) => x.id === id);
    if (!sv) return;
    const active = id === api.activeId;
    const c = await openSheet({
      title: sv.name, subtitle: sv.cfg.url,
      items: [
        ...(active ? [] : [{ id: 'use', icon: 'check', label: 'Utiliser ce serveur', sub: 'Bibliothèque, favoris et playlists de ce serveur' }]),
        { id: 'ping', icon: 'refresh', label: 'Tester la connexion' },
        { id: 'del', icon: 'trash', label: 'Retirer ce serveur', sub: 'Les titres déjà téléchargés restent sur le téléphone', danger: true },
      ],
    });
    if (c === 'use') switchTo(id);
    else if (c === 'ping') {
      try { await api._call(sv.cfg, 'ping'); toast('Serveur joignable ✓'); }
      catch (ex) { toast(ex.network ? 'Serveur injoignable (VPN / Tailscale actif ?)' : ex.message, 3600); }
    } else if (c === 'del') {
      const ok = await openSheet({ title: `Retirer « ${sv.name} » ?`, items: [{ id: 'yes', icon: 'trash', label: 'Retirer', danger: true }, { id: 'no', icon: 'close', label: 'Annuler' }] });
      if (ok !== 'yes') return;
      const wasActive = active;
      api.removeServer(id);
      if (!api.ready) { window.dispatchEvent(new Event('nv:logout')); return; }
      if (wasActive) location.reload(); else { toast('Serveur retiré'); location.hash = '#/settings'; location.reload(); }
    }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    err.textContent = '';
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const sv = await api.addServer(f.url.value, f.user.value, f.pass.value, f.name.value, false);
      f.pass.value = '';
      const c = await openSheet({ title: `« ${sv.name} » ajouté`, subtitle: 'Le parcourir maintenant ?', items: [{ id: 'use', icon: 'check', label: 'Utiliser ce serveur' }, { id: 'later', icon: 'close', label: 'Plus tard' }] });
      if (c === 'use') switchTo(sv.id); else location.reload();
    } catch (ex) {
      err.textContent = ex.network ? 'Serveur injoignable : vérifie l\'adresse et le VPN.' : ex.code === 40 ? 'Identifiant ou mot de passe incorrect.' : ex.message;
    } finally { btn.disabled = false; }
  });
}
