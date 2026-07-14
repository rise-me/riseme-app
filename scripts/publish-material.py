#!/usr/bin/env python3
"""Publica um PDF (bônus ou produto de upsell) no bucket privado 'bonuses'.

Converte cada página em .webp na largura padrão do leitor (1080px, o mesmo dos
bônus turcos publicados em 2026-07-04) e sobe as páginas + o PDF original para
  bonuses/{id}/{locale}/page-NN.webp
  bonuses/{id}/{locale}/original.pdf
No fim imprime a contagem de páginas pra registrar em lib/mock-bonuses.ts.

Uso:
    python3 scripts/publish-material.py --pdf ARQUIVO.pdf --id protocolo-metabolico --locale tr
    python3 scripts/publish-material.py --pdf X.pdf --id y --locale tr --dry-run

Requer PyMuPDF + Pillow, e NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
no .env.local da raiz do projeto.
"""

import argparse
import io
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BUCKET = "bonuses"
PAGE_WIDTH = 1080  # largura que o leitor renderiza full-width
WEBP_QUALITY = 80


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
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("[erro] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local")
    return url, key


def render_pages(pdf_path: Path) -> list[bytes]:
    doc = fitz.open(pdf_path)
    pages = []
    for i, page in enumerate(doc):
        zoom = PAGE_WIDTH / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=WEBP_QUALITY, method=6)
        pages.append(buf.getvalue())
        print(f"  página {i + 1:>2}/{doc.page_count}  {pix.width}x{pix.height}  {len(buf.getvalue()) / 1024:6.1f} KB")
    return pages


def upload(url: str, key: str, path: str, data: bytes, content_type: str) -> None:
    # upsert=true: republicar um material sobrescreve em vez de estourar 409
    req = urllib.request.Request(
        f"{url}/storage/v1/object/{BUCKET}/{path}",
        method="POST",
        data=data,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        },
    )
    try:
        urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        sys.exit(f"[erro] upload de {path} falhou: {e.code} {e.read().decode()[:200]}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True, type=Path)
    ap.add_argument("--id", required=True, help="id do material (pasta no bucket)")
    ap.add_argument("--locale", required=True, help="es | tr | pt-BR | en")
    ap.add_argument("--dry-run", action="store_true", help="converte e mede, não sobe nada")
    args = ap.parse_args()

    if not args.pdf.exists():
        sys.exit(f"[erro] PDF não encontrado: {args.pdf}")

    print(f"convertendo {args.pdf.name} → {args.id}/{args.locale}")
    pages = render_pages(args.pdf)
    total_kb = sum(len(p) for p in pages) / 1024
    print(f"\n{len(pages)} páginas, {total_kb:.0f} KB no total")

    if args.dry_run:
        print("\n[dry-run] nada foi enviado")
    else:
        url, key = load_env()
        print(f"\nsubindo pro bucket '{BUCKET}'…")
        for i, data in enumerate(pages, start=1):
            upload(url, key, f"{args.id}/{args.locale}/page-{i:02d}.webp", data, "image/webp")
        upload(url, key, f"{args.id}/{args.locale}/original.pdf", args.pdf.read_bytes(), "application/pdf")
        print(f"✅ {len(pages)} páginas + original.pdf enviados")

    print(f"\nregistrar em lib/mock-bonuses.ts:  pages: {{ {args.locale}: {len(pages)} }}")


if __name__ == "__main__":
    main()
