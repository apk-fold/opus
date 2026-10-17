#!/usr/bin/env bash
# Installation du service opus-deemix dans la LXC Navidrome (Debian), en root :
#   cd /root/opus-deemix-server && bash install.sh
# Relancer le script met à jour le programme sans toucher à la configuration (/etc/opus-deemix.env).
set -euo pipefail
cd "$(dirname "$0")"

[ "$(id -u)" = 0 ] || { echo "Lance ce script en root."; exit 1; }

install -d /opt/opus-deemix /var/lib/opus-deemix
install -m 755 opus-deemix.py /opt/opus-deemix/opus-deemix.py
install -m 644 opus-deemix.service /etc/systemd/system/opus-deemix.service

# Dossier de musique de Navidrome (détection automatique) et utilisateur du service Navidrome
ND_MUSIC=$(grep -rhiE '^[[:space:]]*MusicFolder[[:space:]]*=' /etc/navidrome /var/lib/navidrome /opt/navidrome 2>/dev/null | head -1 | sed -E "s/^[^=]*=[[:space:]]*['\"]?([^'\"]+)['\"]?[[:space:]]*$/\\1/" || true)
if [ -z "$ND_MUSIC" ]; then ND_MUSIC=$(systemctl show navidrome -p Environment 2>/dev/null | grep -oE 'ND_MUSICFOLDER=[^ ]+' | cut -d= -f2- || true); fi
MUSIC_DIR=${ND_MUSIC:+${ND_MUSIC%/}/deemix}
MUSIC_DIR=${MUSIC_DIR:-/srv/music/deemix}
ND_RUNAS=$(systemctl show navidrome -p User --value 2>/dev/null || true)
OWNER=""
if [ -n "$ND_RUNAS" ] && [ "$ND_RUNAS" != "root" ] && id "$ND_RUNAS" >/dev/null 2>&1; then OWNER="$ND_RUNAS:$(id -gn "$ND_RUNAS")"; fi

if [ ! -f /etc/opus-deemix.env ]; then
  echo "Dossier de musique Navidrome : ${ND_MUSIC:-non trouvé} → téléchargements dans $MUSIC_DIR"
  TOKEN=$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')
  cat > /etc/opus-deemix.env <<EOF
# --- opus-deemix : configuration (relancer : systemctl restart opus-deemix) ---
# Jeton à recopier dans Opus (Réglages › Deezer › deemix)
OPUS_TOKEN=$TOKEN
# Port et adresse d'écoute (0.0.0.0 = toutes les interfaces, dont Tailscale)
OPUS_PORT=6596
OPUS_BIND=0.0.0.0
# Dossier où deemix range la musique : DOIT être dans le dossier de musique de Navidrome
MUSIC_DIR=$MUSIC_DIR
# deemix installé dans un environnement Python (voir README-serveur.md)
DEEMIX_BIN=/opt/deemix/bin/deemix
DEEMIX_CONFIG=/root/.config/deemix
# Qualité par défaut : auto (selon ton compte Deezer), flac, 320, 128
DEFAULT_BITRATE=auto
# Propriétaire des fichiers téléchargés (vide = root). Exemple : navidrome:navidrome
FILE_OWNER=$OWNER
# Optionnel : relancer le scan Navidrome depuis le serveur (sinon c'est Opus qui le fait)
ND_URL=http://127.0.0.1:4533
ND_USER=
ND_PASS=
EOF
  chmod 600 /etc/opus-deemix.env
  echo "Configuration créée : /etc/opus-deemix.env"
fi

systemctl daemon-reload
systemctl enable opus-deemix >/dev/null
systemctl restart opus-deemix
sleep 1
systemctl --no-pager --lines=5 status opus-deemix || true

TOKEN=$(grep '^OPUS_TOKEN=' /etc/opus-deemix.env | cut -d= -f2-)
PORT=$(grep '^OPUS_PORT=' /etc/opus-deemix.env | cut -d= -f2-)
TSIP=$(command -v tailscale >/dev/null && tailscale ip -4 2>/dev/null | head -1 || true)
IP=${TSIP:-$(hostname -I | awk '{print $1}')}
echo
echo "=============================================================="
echo " Dans Opus › Réglages › Deezer › Serveur deemix :"
echo "   Adresse : http://$IP:${PORT:-6596}"
echo "   Jeton   : $TOKEN"
echo "=============================================================="
