#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
opus-deemix — petit service HTTP qui lance deemix sur ton serveur pour l'appli Opus.

  Opus (téléphone) ──HTTP + jeton──▶ opus-deemix ──▶ deemix ──▶ MUSIC_DIR (dossier lu par Navidrome)

- Python 3 standard uniquement (aucun paquet à installer en plus de deemix).
- Une seule tâche à la fois ; file d'attente persistante (redémarrage sans perte).
- Débit automatique selon ton compte Deezer (FLAC / MP3 320 / MP3 128) avec repli si le titre
  n'existe pas dans la qualité demandée (cause des « Your account can't stream the track at the desired bitrate »).
- Optionnel : relance le scan Navidrome à la fin (ND_USER / ND_PASS). Sinon c'est Opus qui le fait.

Configuration : variables d'environnement (fichier /etc/opus-deemix.env, voir README-serveur.md).
Rappel : télécharger depuis Deezer est contraire à leurs conditions d'utilisation. À utiliser en connaissance de cause.
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

VERSION = "1.0.0"
AUDIO_EXT = {".mp3", ".flac", ".m4a", ".ogg", ".opus", ".wav"}


def env(name, default=""):
    v = os.environ.get(name)
    return default if v is None or v == "" else v


CFG = {
    "bind": env("OPUS_BIND", "0.0.0.0"),
    "port": int(env("OPUS_PORT", "6596")),
    "token": env("OPUS_TOKEN"),
    "music": Path(env("MUSIC_DIR", "/srv/music/deemix")),
    "deemix": env("DEEMIX_BIN", "/opt/deemix/bin/deemix"),
    "config": Path(env("DEEMIX_CONFIG", str(Path.home() / ".config" / "deemix"))),
    "state": Path(env("STATE_DIR", "/var/lib/opus-deemix")),
    "bitrate": env("DEFAULT_BITRATE", "auto"),
    "owner": env("FILE_OWNER"),  # ex. « navidrome:navidrome » (chown des fichiers téléchargés)
    "nd_url": env("ND_URL", "http://127.0.0.1:4533").rstrip("/"),
    "nd_user": env("ND_USER"),
    "nd_pass": env("ND_PASS"),
    "patch": env("PATCH_DEEMIX_CONFIG", "1") == "1",
    "timeout": int(env("JOB_TIMEOUT", "3600")),
}

LOCK = threading.RLock()
WAKE = threading.Event()
JOBS = []            # liste de dicts (les plus récents à la fin)
CURRENT = {"proc": None, "job": None}
ACCOUNT = {"info": None, "at": 0}


def log(*a):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), *a, flush=True)


def now_ms():
    return int(time.time() * 1000)


def hide_secrets(s):
    # n'écrit jamais un ARL (longue chaîne hexadécimale) dans les journaux
    return re.sub(r"\b[0-9a-fA-F]{80,}\b", "[ARL masqué]", str(s))


# ------------------------------------------------------------------------------------------------
# État persistant
# ------------------------------------------------------------------------------------------------
def state_file():
    return CFG["state"] / "jobs.json"


def save_jobs():
    with LOCK:
        data = JOBS[-200:]
        tmp = state_file().with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        tmp.replace(state_file())


def load_jobs():
    try:
        data = json.loads(state_file().read_text(encoding="utf-8"))
    except Exception:
        data = []
    for j in data:
        if j.get("status") in ("running", "scanning"):
            j["status"] = "queued"  # interrompue par un redémarrage : on reprend
            j["message"] = "reprise après redémarrage"
    JOBS.extend(data)


def ensure_token():
    if CFG["token"]:
        return
    f = CFG["state"] / "token"
    if f.exists():
        CFG["token"] = f.read_text().strip()
    if not CFG["token"]:
        CFG["token"] = secrets.token_urlsafe(24)
        f.write_text(CFG["token"])
        os.chmod(f, 0o600)
    log("Jeton (OPUS_TOKEN non défini) :", CFG["token"], "— enregistré dans", f)


# ------------------------------------------------------------------------------------------------
# deemix : ARL, configuration, compte
# ------------------------------------------------------------------------------------------------
def arl_file():
    return CFG["config"] / ".arl"


def read_arl():
    try:
        return arl_file().read_text(encoding="utf-8").strip().splitlines()[0].strip()
    except Exception:
        return ""


def deemix_env():
    e = dict(os.environ)
    cfg = CFG["config"]
    if cfg.name == "deemix":
        e["XDG_CONFIG_HOME"] = str(cfg.parent)
    e["DEEMIX_DATA_DIR"] = str(cfg)
    e["PYTHONUNBUFFERED"] = "1"
    return e


def patch_deemix_config():
    """Active le repli de qualité dans deemix (sinon : échec si le compte ne peut pas lire la qualité demandée)."""
    if not CFG["patch"]:
        return
    try:
        CFG["config"].mkdir(parents=True, exist_ok=True)
        f = CFG["config"] / "config.json"
        data = {}
        if f.exists():
            data = json.loads(f.read_text(encoding="utf-8") or "{}")
        changed = False
        for k, v in (("fallbackBitrate", True), ("fallbackSearch", True)):
            if data.get(k) is not v:
                data[k] = v
                changed = True
        if changed:
            f.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            log("config deemix : repli de qualité activé (", f, ")")
    except Exception as e:
        log("config deemix non modifiée :", e)


def deezer_account(arl):
    """Vérifie un ARL auprès de Deezer. Retourne dict (compte), None (ARL invalide) ; lève OSError si réseau KO."""
    url = "https://www.deezer.com/ajax/gw-light.php?method=deezer.getUserData&input=3&api_version=1.0&api_token="
    req = urllib.request.Request(url, data=b"{}", method="POST", headers={
        "Cookie": "arl=" + arl, "Content-Type": "application/json", "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        d = json.loads(r.read().decode("utf-8", "replace"))
    res = d.get("results") or {}
    u = res.get("USER") or {}
    uid = int(u.get("USER_ID") or 0)
    if not uid:
        return None
    o = u.get("OPTIONS") or {}
    return {
        "id": uid, "name": u.get("BLOG_NAME") or "",
        "lossless": bool(o.get("web_lossless") or o.get("mobile_lossless")),
        "hq": bool(o.get("web_hq") or o.get("mobile_hq")),
        "country": res.get("COUNTRY") or "", "offer": (res.get("OFFER_NAME") or ""),
    }


def account(refresh=False):
    if not refresh and ACCOUNT["info"] and time.time() - ACCOUNT["at"] < 6 * 3600:
        return ACCOUNT["info"]
    arl = read_arl()
    if not arl:
        ACCOUNT.update(info=None, at=0)
        return None
    try:
        info = deezer_account(arl)
        ACCOUNT.update(info=info or {"invalid": True}, at=time.time())
    except Exception as e:
        log("compte Deezer non vérifié :", hide_secrets(e))
        return ACCOUNT["info"]
    return ACCOUNT["info"]


def bitrate_chain(requested):
    req = (requested or CFG["bitrate"] or "auto").lower()
    if req == "auto":
        acc = account() or {}
        req = "flac" if acc.get("lossless") else "320" if acc.get("hq") else "128"
    chain = {"flac": ["flac", "320", "128"], "320": ["320", "128"], "128": ["128"]}
    return chain.get(req, ["320", "128"])


# ------------------------------------------------------------------------------------------------
# Navidrome (optionnel) : relance du scan
# ------------------------------------------------------------------------------------------------
def nd_call(endpoint, **params):
    salt = secrets.token_hex(6)
    q = {"u": CFG["nd_user"], "t": hashlib.md5((CFG["nd_pass"] + salt).encode()).hexdigest(), "s": salt,
         "v": "1.16.1", "c": "opus-deemix", "f": "json", **params}
    url = f"{CFG['nd_url']}/rest/{endpoint}?{urllib.parse.urlencode(q)}"
    with urllib.request.urlopen(url, timeout=20) as r:
        d = json.loads(r.read().decode("utf-8", "replace")).get("subsonic-response", {})
    if d.get("status") != "ok":
        raise RuntimeError((d.get("error") or {}).get("message", "erreur Navidrome"))
    return d


def nd_scan(wait=600):
    if not (CFG["nd_user"] and CFG["nd_pass"]):
        return False
    try:
        nd_call("startScan")
        t0 = time.time()
        time.sleep(2)
        while time.time() - t0 < wait:
            if not nd_call("getScanStatus").get("scanStatus", {}).get("scanning"):
                return True
            time.sleep(3)
    except Exception as e:
        log("scan Navidrome impossible :", e)
    return False


# ------------------------------------------------------------------------------------------------
# Tâches
# ------------------------------------------------------------------------------------------------
URL_OK = re.compile(r"^https?://(www\.)?(deezer\.com|deezer\.page\.link|link\.deezer\.com|dzr\.page\.link)/", re.I)


def public(j):
    keep = ("id", "title", "cover", "kind", "urls", "status", "message", "progress", "bitrate", "files", "failed",
            "createdAt", "startedAt", "finishedAt", "scanned", "tracks", "log", "total")
    return {k: j.get(k) for k in keep}


def find_job(jid):
    with LOCK:
        return next((j for j in JOBS if j["id"] == jid), None)


def new_job(body):
    urls = [str(u).strip() for u in (body.get("urls") or []) if str(u).strip()]
    if not urls:
        raise ValueError("aucun lien Deezer")
    bad = [u for u in urls if not URL_OK.match(u)]
    if bad:
        raise ValueError("lien non Deezer refusé : " + bad[0][:80])
    if len(urls) > 500:
        raise ValueError("500 liens maximum par tâche")
    tracks = [
        {k: (str(t.get(k) or "")[:200] if k != "duration" else int(t.get(k) or 0)) for k in ("id", "title", "artist", "album", "duration", "isrc")}
        for t in (body.get("tracks") or [])[:2000] if isinstance(t, dict)
    ]
    job = {
        "id": uuid.uuid4().hex[:12], "title": str(body.get("title") or "Téléchargement")[:200],
        "cover": str(body.get("cover") or "")[:500], "kind": str(body.get("kind") or "tracks")[:20],
        "urls": urls, "tracks": tracks, "bitrate": str(body.get("bitrate") or "auto")[:8],
        "status": "queued", "message": "", "progress": 0, "files": [], "failed": 0, "total": len(tracks) or len(urls),
        "createdAt": now_ms(), "startedAt": None, "finishedAt": None, "scanned": False, "log": [],
    }
    with LOCK:
        JOBS.append(job)
        save_jobs()
    WAKE.set()
    return job


def snapshot():
    out = {}
    root = CFG["music"]
    if not root.exists():
        return out
    for dirpath, _, files in os.walk(root):
        for f in files:
            p = Path(dirpath) / f
            if p.suffix.lower() in AUDIO_EXT:
                try:
                    out[str(p)] = p.stat().st_mtime
                except OSError:
                    pass
    return out


def changed(before):
    """Fichiers audio apparus (ou réécrits) depuis l'instantané « before »."""
    return [p for p, m in snapshot().items() if p not in before or m > before[p]]


def fix_perms(paths):
    owner = CFG["owner"]
    for p in paths:
        try:
            os.chmod(p, 0o644)
            d = Path(p).parent
            while CFG["music"] in d.parents or d == CFG["music"]:
                try:
                    os.chmod(d, 0o755)
                except OSError:
                    pass
                if owner:
                    u, _, g = owner.partition(":")
                    shutil.chown(d, u or None, g or None)
                if d == CFG["music"]:
                    break
                d = d.parent
            if owner:
                u, _, g = owner.partition(":")
                shutil.chown(p, u or None, g or None)
        except Exception as e:
            log("permissions :", p, e)


LINE = re.compile(r"^\[([a-z]+)_([^_\]]+)_(\d+)\]\s*(.*)$")


def run_deemix(job, urls, bitrate):
    """Lance deemix ; retourne (code, sortie). Met à jour la progression au fil de l'eau."""
    cmd = [CFG["deemix"], "-p", str(CFG["music"]), "-b", bitrate, *urls]
    log("deemix", job["id"], bitrate, len(urls), "lien(s)")
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                            env=deemix_env(), cwd=str(CFG["state"]), text=True, bufsize=1, start_new_session=True)
    CURRENT.update(proc=proc, job=job)
    objs = {}
    out = []
    deadline = time.time() + CFG["timeout"]
    try:
        for raw in proc.stdout:
            line = hide_secrets(raw.rstrip())
            if not line:
                continue
            out.append(line)
            m = LINE.match(line)
            if m:
                key = f"{m.group(1)}_{m.group(2)}"
                msg = m.group(4)
                pm = re.search(r"Download at (\d+)%", msg)
                if pm:
                    objs[key] = int(pm.group(1))
                elif "Finished downloading" in msg:
                    objs[key] = 100
                else:
                    objs.setdefault(key, 0)
            n = max(len(objs), len(urls)) or 1
            with LOCK:
                job["progress"] = int(sum(objs.values()) / n)
                job["log"] = (job["log"] + [line])[-40:]
            if "Paste here your arl" in line:
                proc.kill()
                break
            if time.time() > deadline:
                proc.kill()
                out.append("délai dépassé")
                break
    finally:
        try:
            proc.wait(timeout=30)
        except subprocess.TimeoutExpired:
            proc.kill()
        CURRENT.update(proc=None, job=None)
    return proc.returncode, "\n".join(out)


def process(job):
    with LOCK:
        job.update(status="running", startedAt=now_ms(), message="", progress=0, files=[], failed=0, log=[])
        save_jobs()
    if not Path(CFG["deemix"]).exists():
        raise RuntimeError(f"deemix introuvable ({CFG['deemix']})")
    if not read_arl():
        raise RuntimeError("aucun ARL sur le serveur : envoie-le depuis Opus (Réglages › Deezer › deemix)")
    CFG["music"].mkdir(parents=True, exist_ok=True)
    before = snapshot()
    chain = bitrate_chain(job.get("bitrate"))
    used, output = chain[0], ""
    for i, br in enumerate(chain):
        used = br
        if job.get("status") == "cancelled":
            return
        code, output = run_deemix(job, job["urls"], br)
        if job.get("status") == "cancelled":
            return
        if "Paste here your arl" in output:
            raise RuntimeError("ARL refusé par Deezer (expiré ?) : renvoie un ARL valide depuis Opus")
        new = changed(before)
        wrong = re.search(r"desired bitrate|not found at desired bitrate|can't stream", output, re.I)
        expected = len(job["tracks"]) or len(job["urls"])
        if new and (len(new) >= expected or not wrong):
            break
        if not wrong or i == len(chain) - 1:
            break
        log("repli de qualité :", br, "→", chain[i + 1])
        with LOCK:
            job["message"] = f"qualité {br} indisponible, essai en {chain[i + 1]}…"
    new = sorted(changed(before))
    fix_perms(new)
    errors = [l for l in output.splitlines() if re.search(r"::\s*(?!Getting|Tags got|Download|Finished|Applying|Downloading)", l)
              and re.search(r"(error|not available|not found|can't|cannot|failed|impossible|unavailable)", l, re.I)]
    rel = [str(Path(p).relative_to(CFG["music"])) for p in new]
    with LOCK:
        job["files"] = rel
        job["bitrate"] = used
        expected = len(job["tracks"]) or 0
        job["failed"] = max(0, expected - len(rel)) if expected else len(errors)
        if not rel:
            if not errors and "All done" in output:
                # deemix n'a rien réécrit : les fichiers étaient déjà dans le dossier
                job["failed"] = 0
                job["files"] = []
            else:
                last = errors[-1].split("::")[-1].strip() if errors else (output.strip().splitlines() or ["aucun fichier"])[-1]
                raise RuntimeError("aucun fichier téléchargé — " + last[:200])
        job["status"] = "scanning" if CFG["nd_user"] else "running"
        job["progress"] = 100
        save_jobs()
    scanned = nd_scan()
    with LOCK:
        job["scanned"] = scanned
        job["status"] = "partial" if job["failed"] else "done"
        job["message"] = (f"{len(rel)} fichier(s) en {used}" if rel else "déjà présent sur le serveur") + (f", {job['failed']} en échec" if job["failed"] else "")
        job["finishedAt"] = now_ms()
        save_jobs()
    log("tâche", job["id"], job["status"], job["message"])


def worker():
    while True:
        job = None
        with LOCK:
            job = next((j for j in JOBS if j["status"] == "queued"), None)
        if not job:
            WAKE.wait(30)
            WAKE.clear()
            continue
        try:
            process(job)
        except Exception as e:
            with LOCK:
                if job.get("status") != "cancelled":
                    job.update(status="error", message=hide_secrets(e)[:300], finishedAt=now_ms())
                save_jobs()
            log("tâche", job["id"], "échec :", hide_secrets(e))


def cancel(job):
    with LOCK:
        if job["status"] in ("queued", "running", "scanning"):
            job.update(status="cancelled", message="annulé", finishedAt=now_ms())
            p = CURRENT.get("proc")
            if CURRENT.get("job") is job and p and p.poll() is None:
                try:
                    os.killpg(p.pid, signal.SIGTERM)
                except Exception:
                    p.kill()
            save_jobs()
            return True
        JOBS.remove(job)
        save_jobs()
        return False


# ------------------------------------------------------------------------------------------------
# HTTP
# ------------------------------------------------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    server_version = "opus-deemix/" + VERSION

    def log_message(self, fmt, *args):
        pass  # journal : uniquement nos messages

    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _auth(self):
        h = self.headers.get("Authorization", "")
        tok = h[7:].strip() if h.lower().startswith("bearer ") else self.headers.get("X-Opus-Token", "")
        if tok and hmac.compare_digest(tok.encode(), CFG["token"].encode()):
            return True
        self._send(401, {"error": "jeton invalide"})
        return False

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 2_000_000:
            raise ValueError("requête trop grande")
        raw = self.rfile.read(n) if n else b"{}"
        try:
            return json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            raise ValueError("JSON invalide")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")
        if path in ("", "/"):
            return self._send(200, {"service": "opus-deemix", "version": VERSION})
        if not self._auth():
            return
        if path == "/api/health":
            acc = account()
            music = CFG["music"]
            writable = os.access(music if music.exists() else music.parent, os.W_OK)
            with LOCK:
                q = sum(1 for j in JOBS if j["status"] in ("queued", "running", "scanning"))
            return self._send(200, {
                "ok": True, "version": VERSION, "deemix": Path(CFG["deemix"]).exists(), "arl": bool(read_arl()),
                "account": acc, "music": str(music), "writable": writable, "navidrome": bool(CFG["nd_user"] and CFG["nd_pass"]),
                "bitrate": CFG["bitrate"], "queue": q,
            })
        if path == "/api/jobs":
            with LOCK:
                return self._send(200, {"jobs": [public(j) for j in reversed(JOBS[-80:])]})
        m = re.match(r"^/api/jobs/([a-f0-9]+)$", path)
        if m:
            j = find_job(m.group(1))
            return self._send(200, {"job": public(j)}) if j else self._send(404, {"error": "tâche introuvable"})
        self._send(404, {"error": "inconnu"})

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")
        if not self._auth():
            return
        try:
            body = self._body()
            if path == "/api/arl":
                arl = str(body.get("arl") or "").strip()
                if not re.fullmatch(r"[0-9a-fA-F]{100,300}", arl):
                    return self._send(400, {"error": "ARL au mauvais format (longue suite de chiffres et lettres a-f)"})
                verified, info = True, None
                try:
                    info = deezer_account(arl)
                except Exception as e:
                    verified = False
                    log("ARL non vérifié (Deezer injoignable) :", hide_secrets(e))
                if verified and not info:
                    return self._send(400, {"error": "ARL refusé par Deezer (expiré ou incorrect)"})
                CFG["config"].mkdir(parents=True, exist_ok=True)
                f = arl_file()
                f.write_text(arl + "\n", encoding="utf-8")
                os.chmod(f, 0o600)
                ACCOUNT.update(info=info, at=time.time() if info else 0)
                log("ARL mis à jour", "(vérifié)" if verified else "(non vérifié)")
                return self._send(200, {"ok": True, "verified": verified, "account": info})
            if path == "/api/jobs":
                job = new_job(body)
                return self._send(201, {"job": public(job)})
            if path == "/api/jobs/clear":
                with LOCK:
                    JOBS[:] = [j for j in JOBS if j["status"] in ("queued", "running", "scanning")]
                    save_jobs()
                return self._send(200, {"ok": True})
            m = re.match(r"^/api/jobs/([a-f0-9]+)/retry$", path)
            if m:
                j = find_job(m.group(1))
                if not j:
                    return self._send(404, {"error": "tâche introuvable"})
                job = new_job({"urls": j["urls"], "title": j["title"], "cover": j["cover"], "kind": j["kind"], "tracks": j["tracks"], "bitrate": j["bitrate"]})
                return self._send(201, {"job": public(job)})
            if path == "/api/scan":
                if not (CFG["nd_user"] and CFG["nd_pass"]):
                    return self._send(400, {"error": "ND_USER / ND_PASS non configurés sur le serveur"})
                threading.Thread(target=nd_scan, daemon=True).start()
                return self._send(200, {"ok": True})
            self._send(404, {"error": "inconnu"})
        except ValueError as e:
            self._send(400, {"error": str(e)})
        except Exception as e:
            log("erreur :", hide_secrets(e))
            self._send(500, {"error": hide_secrets(e)[:200]})

    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")
        if not self._auth():
            return
        if path == "/api/arl":
            try:
                arl_file().unlink()
            except FileNotFoundError:
                pass
            ACCOUNT.update(info=None, at=0)
            return self._send(200, {"ok": True})
        m = re.match(r"^/api/jobs/([a-f0-9]+)$", path)
        if m:
            j = find_job(m.group(1))
            if not j:
                return self._send(404, {"error": "tâche introuvable"})
            cancelled = cancel(j)
            return self._send(200, {"ok": True, "cancelled": cancelled})
        self._send(404, {"error": "inconnu"})


def main():
    CFG["state"].mkdir(parents=True, exist_ok=True)
    ensure_token()
    load_jobs()
    patch_deemix_config()
    if not Path(CFG["deemix"]).exists():
        log("ATTENTION : deemix introuvable :", CFG["deemix"], "(variable DEEMIX_BIN)")
    if not (CFG["nd_user"] and CFG["nd_pass"]):
        log("Navidrome : ND_USER / ND_PASS absents → le scan sera lancé par Opus")
    threading.Thread(target=worker, daemon=True).start()
    srv = ThreadingHTTPServer((CFG["bind"], CFG["port"]), Handler)
    log(f"opus-deemix {VERSION} sur http://{CFG['bind']}:{CFG['port']} → {CFG['music']}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
