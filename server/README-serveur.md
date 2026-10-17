# opus-deemix — le service de téléchargement côté serveur

Opus (le téléphone) n'installe pas deemix : il demande à **ton serveur** de télécharger.

```
Opus ──(Tailscale, jeton)──▶ opus-deemix ──▶ deemix ──▶ dossier musique de Navidrome
  ▲                                                          │
  └──────── scan Navidrome + ajout à ta playlist ◀───────────┘
```

Navidrome et deemix ne se parlent pas : c'est Opus qui fait le lien (il relance le scan, retrouve les titres
et les ajoute à la playlist choisie).

> Télécharger depuis Deezer est contraire à leurs conditions d'utilisation. À utiliser en connaissance de cause.

---

## 1. Prérequis (déjà fait si tu as suivi l'installation de deemix)

Dans la LXC Navidrome (Debian), en root :

```bash
apt update && apt install -y python3 python3-venv ffmpeg
python3 -m venv /opt/deemix
/opt/deemix/bin/pip install --upgrade pip deemix
```

## 2. Trouver le dossier de musique de Navidrome

```bash
grep -ri musicfolder /etc/navidrome /var/lib/navidrome /opt/navidrome 2>/dev/null
systemctl cat navidrome | grep -i -E "config|musicfolder"
```

Le service doit télécharger **dans** ce dossier (ou un sous-dossier). Exemple : si `MusicFolder = "/opt/music"`,
utilise `MUSIC_DIR=/opt/music/deemix`.

## 3. Installer le service

### Méthode A — copier-coller dans la console Proxmox (le plus simple)

1. Ouvre `server/installer-console.sh` sur ton PC, sélectionne tout (Ctrl+A), copie (Ctrl+C).
2. Proxmox → conteneur **116 (Navidrome-LXC)** → Console → colle (clic droit / Ctrl+Maj+V) → Entrée.

Le script décompresse les fichiers dans `/root/opus-deemix-server` et lance `install.sh`.

### Méthode B — depuis Windows (si SSH est actif dans la LXC)

```powershell
scp -r .\server root@100.91.164.116:/root/opus-deemix-server
ssh root@100.91.164.116 "bash /root/opus-deemix-server/install.sh"
```

À la fin, le script affiche **l'adresse** et **le jeton** à recopier dans Opus.

## 4. Régler `/etc/opus-deemix.env`

```bash
nano /etc/opus-deemix.env
systemctl restart opus-deemix
```

| Variable | Rôle | Défaut |
|---|---|---|
| `OPUS_TOKEN` | jeton à mettre dans Opus | généré |
| `OPUS_PORT` / `OPUS_BIND` | port / adresse d'écoute. Mets l'IP Tailscale (`tailscale ip -4`) pour n'écouter que sur Tailscale | `6596` / `0.0.0.0` |
| `MUSIC_DIR` | où deemix range les fichiers (dans le dossier de Navidrome !) | `/srv/music/deemix` |
| `DEEMIX_BIN` | chemin de deemix | `/opt/deemix/bin/deemix` |
| `DEEMIX_CONFIG` | dossier de config deemix (ARL, config.json) | `/root/.config/deemix` |
| `DEFAULT_BITRATE` | `auto` (selon ton compte), `flac`, `320`, `128` | `auto` |
| `FILE_OWNER` | propriétaire des fichiers, ex. `navidrome:navidrome` | vide (root) |
| `ND_USER` / `ND_PASS` | optionnel : le serveur relance lui-même le scan Navidrome | vide (Opus s'en charge) |

## 5. Dans Opus

Réglages › Deezer › **Serveur deemix** :

1. Adresse : `http://100.91.164.116:6596` (IP Tailscale de la LXC), jeton : celui affiché à l'installation.
2. **Enregistrer et tester**.
3. **ARL sur le serveur › Envoyer** : envoie l'ARL enregistré dans Opus (ou colle-en un autre). Il est vérifié
   auprès de Deezer et stocké sur le serveur avec les droits `600`. Il n'apparaît jamais dans les journaux.
4. Qualité (Auto conseillé) et playlist de destination (Demander / Aucune / toujours la même).

Ensuite, dans Deezer : bouton **nuage** sur un titre « Absent », ou **deemix : les manquants** / **deemix : album
complet** sur une page album ou playlist. Le suivi est dans **Plus › Téléchargements serveur**.

## Dépannage

```bash
journalctl -u opus-deemix -f          # journal en direct
systemctl status opus-deemix
curl http://127.0.0.1:6596/           # doit répondre {"service": "opus-deemix", ...}
```

- **« Your account can't stream the track at the desired bitrate »** : ton compte ne lit pas cette qualité.
  Le service active le repli de qualité de deemix (`fallbackBitrate`) et réessaie tout seul en 320 puis 128.
  C'est ce qui laissait ton dossier vide lors du premier essai.
- **« ARL refusé / Paste here your arl »** : l'ARL a expiré (déconnexion de Deezer) → renvoie-en un depuis Opus.
- **Les titres n'apparaissent pas dans Navidrome** : `MUSIC_DIR` n'est pas dans le `MusicFolder` de Navidrome,
  ou Navidrome ne peut pas lire les fichiers → `FILE_OWNER=navidrome:navidrome`.
- **Opus : « serveur deemix injoignable »** : Tailscale actif sur le téléphone ? port 6596 ? `OPUS_BIND` ?

## Désinstaller

```bash
systemctl disable --now opus-deemix
rm -rf /opt/opus-deemix /var/lib/opus-deemix /etc/systemd/system/opus-deemix.service /etc/opus-deemix.env
systemctl daemon-reload
```

## API (pour info)

Toutes les routes demandent l'en-tête `Authorization: Bearer <OPUS_TOKEN>`.

| Méthode | Route | |
|---|---|---|
| GET | `/api/health` | état (deemix, ARL, compte, dossier) |
| POST | `/api/arl` `{arl}` | enregistre l'ARL (vérifié auprès de Deezer) |
| DELETE | `/api/arl` | supprime l'ARL |
| GET | `/api/jobs` | liste des téléchargements |
| POST | `/api/jobs` `{urls, title, cover, bitrate, tracks}` | nouveau téléchargement (liens Deezer uniquement) |
| DELETE | `/api/jobs/<id>` | annule / retire |
| POST | `/api/jobs/<id>/retry` | relance |
| POST | `/api/jobs/clear` | vide les terminés |
| POST | `/api/scan` | scan Navidrome (si `ND_USER`/`ND_PASS`) |
