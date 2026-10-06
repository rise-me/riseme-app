#!/usr/bin/env python3
"""Publica no R2 uma aula empacotada por scripts/package-lesson.py e registra no app.

Sobe a pasta da aula para o bucket (via rclone/S3) e grava em lib/hls-lessons.json
{path, seconds, languages} por desafio → dia. O app passa a tocar essa aula (vídeo único +
áudio do idioma da aluna) no lugar do Stream/YouTube nos idiomas que ela tiver.

Uso:
    python3 scripts/publish-hls.py --setup                      # 1ª vez: bucket + porteiro + segredo
    python3 scripts/publish-hls.py --dir PASTA --challenge 1 --day 1 [--dry-run]
    python3 scripts/publish-hls.py --dir PASTA --challenge 1 --day 1 --new-version   # vídeo recodificado

Caminho no bucket: c<desafio>/d<dia>-<versão>/… — reaproveitado ao só acrescentar idioma
(package-lesson.py --add); --new-version gera outro (o cache dos pedaços é de 1 ano).

Requer no .env.local: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_TOKEN (permissões no docs/roadmap.md).
--setup cria HLS_TOKEN_SECRET no .env.local se faltar; ele também vai no Vercel (o script avisa).
Requer rclone e npx (wrangler fica em workers/aulas).
"""

import argparse
import hashlib
import json
import os
import secrets
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "lib" / "hls-lessons.json"
WORKER_DIR = ROOT / "workers" / "aulas"
BUCKET = "riseme-aulas"
BASE_URL = "https://aulas.riseme.app"
UA = "riseme-publish-hls/1.0"


def load_env() -> dict:
    env_path = ROOT / ".env.local"
    if not env_path.exists():
        sys.exit(f"[erro] {env_path} não encontrado")
    env = {}
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k] = v.strip().strip('"').strip("'")
    for k in ("CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_R2_TOKEN"):
        if len(env.get(k, "")) < 20:
            sys.exit(f"[erro] {k} ausente ou placeholder no .env.local (passo a passo em docs/roadmap.md)")
    return env


def token_id(token: str) -> str:
    req = urllib.request.Request("https://api.cloudflare.com/client/v4/user/tokens/verify",
                                 headers={"Authorization": f"Bearer {token}", "User-Agent": UA})
    try:
        data = json.load(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e:
        sys.exit(f"[erro] token recusado pela Cloudflare: {e.code}")
    if data["result"]["status"] != "active":
        sys.exit("[erro] token não está ativo")
    return data["result"]["id"]


def rclone_env(env: dict) -> dict:
    # Credencial S3 do R2 derivada do próprio token: id do token + SHA-256 do valor
    tok = env["CLOUDFLARE_R2_TOKEN"]
    return {**os.environ,
            "RCLONE_CONFIG_R2_TYPE": "s3", "RCLONE_CONFIG_R2_PROVIDER": "Cloudflare",
            "RCLONE_CONFIG_R2_ACCESS_KEY_ID": token_id(tok),
            "RCLONE_CONFIG_R2_SECRET_ACCESS_KEY": hashlib.sha256(tok.encode()).hexdigest(),
            "RCLONE_CONFIG_R2_ENDPOINT": f"https://{env['CLOUDFLARE_ACCOUNT_ID']}.r2.cloudflarestorage.com",
            "RCLONE_CONFIG_R2_NO_CHECK_BUCKET": "true"}


def wrangler(env: dict, *args: str, stdin: str | None = None) -> None:
    e = {**os.environ, "CLOUDFLARE_API_TOKEN": env["CLOUDFLARE_R2_TOKEN"],
         "CLOUDFLARE_ACCOUNT_ID": env["CLOUDFLARE_ACCOUNT_ID"]}
    r = subprocess.run(["npx", "wrangler", *args], cwd=WORKER_DIR, env=e, input=stdin, text=True,
                       capture_output=True)
    out = (r.stdout + r.stderr).strip()
    if r.returncode != 0 and "already exists" not in out:
        sys.exit(f"[erro] wrangler {' '.join(args)}:\n{out[-1500:]}")
    print(f"  wrangler {args[0]} {args[1] if len(args) > 1 else ''}: ok")


def setup(env: dict) -> None:
    if not (WORKER_DIR / "node_modules").exists():
        subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=WORKER_DIR, check=True)
    secret = env.get("HLS_TOKEN_SECRET")
    if not secret:
        secret = secrets.token_urlsafe(32)
        with (ROOT / ".env.local").open("a") as f:
            f.write(f"\nHLS_TOKEN_SECRET={secret}\n")
        print("  HLS_TOKEN_SECRET criado no .env.local")
    wrangler(env, "r2", "bucket", "create", BUCKET)
    wrangler(env, "deploy")
    wrangler(env, "secret", "put", "TOKEN_SECRET", stdin=secret)
    print(f"\n✅ porteiro no ar em {BASE_URL}")
    print("   Falta: HLS_TOKEN_SECRET (o mesmo do .env.local) no Vercel, ambiente Production, e redeploy.")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--setup", action="store_true", help="cria bucket, publica o porteiro e o segredo")
    ap.add_argument("--dir", type=Path, help="pasta gerada por package-lesson.py")
    ap.add_argument("--challenge", help="id do desafio (lib/mock-challenges.ts)")
    ap.add_argument("--day", type=int, help="dia/aula do desafio")
    ap.add_argument("--new-version", action="store_true", help="vídeo foi recodificado: novo caminho")
    ap.add_argument("--languages", help="idiomas liberados no app (ex.: pl,en); padrão: todos os empacotados")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.setup:
        setup(load_env())
        return
    if not (args.dir and args.challenge and args.day):
        ap.error("--dir, --challenge e --day são obrigatórios (ou --setup)")

    folder = args.dir.expanduser()
    meta_path = folder / "aula.json"
    if not meta_path.exists():
        sys.exit(f"[erro] {folder} não tem aula.json — empacote antes com scripts/package-lesson.py")
    meta = json.loads(meta_path.read_text())
    for lang in meta["languages"]:
        if not (folder / f"master_{lang}.m3u8").exists():
            sys.exit(f"[erro] falta master_{lang}.m3u8 em {folder}")

    data = json.loads(DATA_PATH.read_text())
    days = data["lessons"].setdefault(str(args.challenge), {})
    current = days.get(str(args.day))
    if current and not args.new_version:
        path = current["path"]
    else:
        path = f"c{args.challenge}/d{args.day:02d}-{time.strftime('%Y%m%d%H%M')}"

    size_gb = sum(f.stat().st_size for f in folder.rglob("*") if f.is_file()) / 1e9
    print(f"aula {folder.name}: {meta['duration'] / 60:.1f} min, idiomas {meta['languages']}, {size_gb:.2f} GB")
    print(f"destino: r2:{BUCKET}/{path}/  →  desafio {args.challenge}, dia {args.day}")
    if args.dry_run:
        print("\n[dry-run] nada foi enviado")
        return

    env = load_env()
    r = subprocess.run(["rclone", "copy", str(folder), f"r2:{BUCKET}/{path}", "--transfers", "16",
                        "--checksum", "--stats-one-line", "--stats", "10s"], env=rclone_env(env))
    if r.returncode != 0:
        sys.exit("[erro] upload falhou — rode de novo (o rclone só envia o que faltou)")

    langs = [l.strip() for l in args.languages.split(",")] if args.languages else meta["languages"]
    missing = [l for l in langs if l not in meta["languages"]]
    if missing:
        sys.exit(f"[erro] idiomas não empacotados nessa aula: {missing}")
    days[str(args.day)] = {"path": path, "seconds": round(meta["duration"]), "languages": langs}
    data["baseUrl"] = data.get("baseUrl") or BASE_URL
    DATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"\n✅ publicado em {BASE_URL}/<passe>/{path}/ — commitar {DATA_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
