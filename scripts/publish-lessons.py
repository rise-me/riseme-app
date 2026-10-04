#!/usr/bin/env python3
"""Publica as aulas de um desafio no Cloudflare Stream e registra no app.

Lê uma pasta de vídeos, descobre o dia de cada arquivo pelo primeiro número no
nome ("Dzień 5 - …mp4", "Día 05.mp4", "dia-5.mp4" → dia 5), sobe pro Stream via
TUS (aceita arquivos de vários GB, retoma chunk que falhar), espera o Stream
processar e grava uid + duração em lib/stream-lessons.json — que o app lê em
lib/mock-challenge-days.ts. Aula no Stream tem prioridade sobre o YouTube.

Idempotente: rodar de novo pula os dias já enviados (pelo JSON e pelo nome no
Stream) e só completa a duração dos que ainda estavam processando.

Uso:
    python3 scripts/publish-lessons.py --dir ~/Downloads/aulas-pl --challenge 1 --locale pl
    python3 scripts/publish-lessons.py --dir ~/Downloads --glob 'Dzień*' --challenge 1 --locale pl
    python3 scripts/publish-lessons.py --dir PASTA --challenge 1 --locale pl --dry-run
    python3 scripts/publish-lessons.py --dir PASTA --challenge 1 --locale pl --only 1

Requer CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_STREAM_TOKEN (permissão Stream:Edit)
no .env.local da raiz do projeto. Sem dependências além da stdlib.
"""

import argparse
import base64
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "lib" / "stream-lessons.json"
VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}
# Cloudflare exige chunk >= 5 MiB e múltiplo de 256 KiB; 50 MiB é o recomendado
CHUNK = 50 * 1024 * 1024
API = "https://api.cloudflare.com/client/v4/accounts/{account}/stream"
# urllib sem User-Agent leva 403 do WAF da própria Cloudflare
UA = "riseme-publish-lessons/1.0"
POLL_EVERY = 15
POLL_TIMEOUT = 2 * 60 * 60


def load_env() -> tuple[str, str]:
    env_path = ROOT / ".env.local"
    if not env_path.exists():
        sys.exit(f"[erro] {env_path} não encontrado")
    env = {}
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k] = v.strip().strip('"').strip("'")
    account = env.get("CLOUDFLARE_ACCOUNT_ID", "")
    token = env.get("CLOUDFLARE_STREAM_TOKEN", "")
    # placeholders curtos ("xxx") passaram despercebidos uma vez — barra aqui
    if len(account) < 20 or len(token) < 20:
        sys.exit("[erro] CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_TOKEN ausentes ou placeholder no .env.local")
    return account, token


def request(method: str, url: str, token: str, data: bytes | None = None, headers: dict | None = None):
    h = {"Authorization": f"Bearer {token}", "User-Agent": UA, **(headers or {})}
    req = urllib.request.Request(url, method=method, data=data, headers=h)
    return urllib.request.urlopen(req, timeout=300)


def api_json(method: str, url: str, token: str) -> dict:
    try:
        with request(method, url, token) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"[erro] {method} {url} → {e.code} {e.read().decode(errors='replace')[:300]}")


def load_data() -> dict:
    if DATA_PATH.exists():
        return json.loads(DATA_PATH.read_text())
    return {"customerHost": None, "lessons": {}}


def save_data(data: dict) -> None:
    DATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def find_lessons(folder: Path, pattern: str) -> dict[int, Path]:
    by_day: dict[int, Path] = {}
    for f in sorted(folder.glob(pattern)):
        if f.suffix.lower() not in VIDEO_EXTS or f.name.startswith("."):
            continue
        m = re.search(r"\d+", f.stem)
        if not m:
            print(f"  [aviso] sem número de dia, ignorado: {f.name}")
            continue
        day = int(m.group())
        if day in by_day:
            sys.exit(f"[erro] dia {day} duplicado: {by_day[day].name} e {f.name}")
        by_day[day] = f
    return dict(sorted(by_day.items()))


def find_existing_uid(base: str, token: str, name: str) -> str | None:
    # cobre o caso de o upload ter terminado mas o JSON não ter sido gravado
    q = urllib.parse.quote(name)
    res = api_json("GET", f"{base}?search={q}", token).get("result") or []
    for v in res:
        if (v.get("meta") or {}).get("name") == name:
            return v["uid"]
    return None


def tus_upload(base: str, token: str, path: Path, name: str) -> str:
    size = path.stat().st_size
    meta = f"name {base64.b64encode(name.encode()).decode()}"
    try:
        with request("POST", base, token, headers={
            "Tus-Resumable": "1.0.0",
            "Upload-Length": str(size),
            "Upload-Metadata": meta,
        }) as r:
            location = r.headers["Location"]
            uid = r.headers.get("stream-media-id")
    except urllib.error.HTTPError as e:
        sys.exit(f"[erro] criar upload de {path.name} → {e.code} {e.read().decode(errors='replace')[:300]}")

    offset = 0
    started = time.time()
    with path.open("rb") as fh:
        while offset < size:
            fh.seek(offset)
            chunk = fh.read(CHUNK)
            for attempt in range(1, 6):
                try:
                    with request("PATCH", location, token, data=chunk, headers={
                        "Tus-Resumable": "1.0.0",
                        "Upload-Offset": str(offset),
                        "Content-Type": "application/offset+octet-stream",
                    }) as r:
                        offset = int(r.headers["Upload-Offset"])
                    break
                except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
                    if attempt == 5:
                        sys.exit(f"[erro] {path.name}: chunk em {offset} falhou 5x ({e})")
                    time.sleep(5 * attempt)
                    # o servidor diz até onde recebeu; retoma dali
                    with request("HEAD", location, token, headers={"Tus-Resumable": "1.0.0"}) as r:
                        offset = int(r.headers["Upload-Offset"])
                    fh.seek(offset)
                    chunk = fh.read(CHUNK)
            mb_s = offset / 1e6 / max(1, time.time() - started)
            print(f"\r    {offset / size:6.1%}  {offset / 1e9:5.2f}/{size / 1e9:.2f} GB  {mb_s:5.1f} MB/s", end="", flush=True)
    print()
    if not uid:
        sys.exit(f"[erro] {path.name}: Stream não devolveu o id do vídeo")
    return uid


def wait_ready(base: str, token: str, data: dict, entries: dict[str, dict]) -> None:
    pending = {day: e for day, e in entries.items() if e.get("seconds") is None}
    if not pending:
        return
    print(f"\naguardando o Stream processar {len(pending)} aula(s)…")
    deadline = time.time() + POLL_TIMEOUT
    while pending and time.time() < deadline:
        for day, e in list(pending.items()):
            v = api_json("GET", f"{base}/{e['uid']}", token)["result"]
            state = (v.get("status") or {}).get("state")
            if state == "error":
                print(f"  [erro] dia {day}: Stream falhou ao processar ({v.get('status')})")
                pending.pop(day)
            elif v.get("readyToStream") and (v.get("duration") or 0) > 0:
                e["seconds"] = round(v["duration"])
                # host do player (customer-XXXX.cloudflarestream.com) vem no link de preview
                host = urllib.parse.urlparse(v.get("preview") or "").netloc
                if host:
                    data["customerHost"] = host
                save_data(data)
                print(f"  dia {day:>2}: pronto ({e['seconds'] // 60}:{e['seconds'] % 60:02d})")
                pending.pop(day)
        if pending:
            time.sleep(POLL_EVERY)
    if pending:
        print(f"\n[aviso] {len(pending)} aula(s) ainda processando — rode o mesmo comando depois pra completar")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, type=Path, help="pasta com os vídeos do desafio")
    ap.add_argument("--glob", default="*", help="filtra os arquivos da pasta (ex.: 'Dzień*')")
    ap.add_argument("--challenge", required=True, help="id do desafio (lib/mock-challenges.ts)")
    ap.add_argument("--locale", required=True, help="idioma do áudio: es | tr | pl | …")
    ap.add_argument("--only", type=int, action="append", help="sobe só este dia (repetível)")
    ap.add_argument("--dry-run", action="store_true", help="mostra o mapeamento, não sobe nada")
    args = ap.parse_args()

    folder = args.dir.expanduser()
    if not folder.is_dir():
        sys.exit(f"[erro] pasta não encontrada: {folder}")
    lessons = find_lessons(folder, args.glob)
    if args.only:
        lessons = {d: p for d, p in lessons.items() if d in args.only}
    if not lessons:
        sys.exit("[erro] nenhum vídeo encontrado")

    days = list(lessons)
    gaps = sorted(set(range(1, max(days) + 1)) - set(days))
    print(f"{len(lessons)} aula(s) → desafio {args.challenge} / {args.locale}")
    for day, p in lessons.items():
        print(f"  dia {day:>2}  {p.stat().st_size / 1e9:5.2f} GB  {p.name}")
    if gaps and not args.only:
        print(f"  [aviso] dias faltando na pasta: {gaps}")

    if args.dry_run:
        print("\n[dry-run] nada foi enviado")
        return

    account, token = load_env()
    base = API.format(account=account)
    data = load_data()
    entries = data["lessons"].setdefault(args.locale, {}).setdefault(args.challenge, {})

    for day, path in lessons.items():
        key = str(day)
        if key in entries:
            print(f"\ndia {day:>2}: já publicado ({entries[key]['uid']}), pulando")
            continue
        name = f"riseme/{args.challenge}/{args.locale}/dia-{day:02d}"
        uid = find_existing_uid(base, token, name)
        if uid:
            print(f"\ndia {day:>2}: já estava no Stream ({uid}), registrando")
        else:
            print(f"\ndia {day:>2}: enviando {path.name}")
            uid = tus_upload(base, token, path, name)
        entries[key] = {"uid": uid, "seconds": None}
        save_data(data)

    wait_ready(base, token, data, entries)
    done = sum(1 for e in entries.values() if e.get("seconds"))
    print(f"\n✅ {done} aula(s) prontas em {DATA_PATH.relative_to(ROOT)} — commitar esse arquivo")


if __name__ == "__main__":
    main()
