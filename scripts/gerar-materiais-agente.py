#!/usr/bin/env python3
"""Gera a base de materiais que o agente de WhatsApp lê antes de responder.

PRA QUE SERVE: o agente só sabe o que está no prompt. As dúvidas das alunas são, quase
todas, sobre o conteúdo dos bônus e do Protocolo Metabólico ("qual chá eu tomo?", "no
plano de 3 dias não tem lanche?"). Este script junta o TEXTO de cada material, por idioma,
em lib/whatsapp-agent/materiais.json — o agente responde a partir dele.

FONTE de cada material/idioma (a primeira que existir):
  1. materiais/<id>/<idioma>.html  (versão revisada, versionada no repo)
  2. o PDF publicado no bucket 'bonuses' (<id>/<idioma>/original.pdf) — texto extraído

RODAR DE NOVO sempre que um material for publicado/corrigido (publish-material.py ou HTML).
Lista de materiais e idiomas vem de lib/mock-bonuses.ts (fonte única).

Uso:  pip3 install pypdf   (uma vez)
      python3 scripts/gerar-materiais-agente.py
Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (.env.local) para os PDFs.
"""

from __future__ import annotations

import html
import io
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "lib" / "whatsapp-agent" / "materiais.json"


def load_env(name: str) -> str | None:
    if os.environ.get(name):
        return os.environ[name]
    p = ROOT / ".env.local"
    if p.exists():
        for line in p.read_text().splitlines():
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def bonuses_do_app() -> list[dict]:
    """Lê ids, idiomas e tipo de acesso de lib/mock-bonuses.ts."""
    src = (ROOT / "lib" / "mock-bonuses.ts").read_text()
    out = []
    for m in re.finditer(r"\{\s*id:\s*'([^']+)'.*?pages:\s*\{([^}]*)\}.*?\}", src):
        if "access: 'purchase'" in m.group(0):
            acesso = "compra"
        else:
            acesso = "brinde"
        idiomas = re.findall(r"'?([a-zA-Z-]+)'?\s*:\s*\d+", m.group(2))
        out.append({"id": m.group(1), "idiomas": idiomas, "acesso": acesso})
    return out


def texto_html(path: Path) -> str:
    t = re.sub(r"<(style|script)[^>]*>.*?</\1>", " ", path.read_text(), flags=re.S | re.I)
    t = re.sub(r"<br\s*/?>|</(p|div|li|h\d|tr|section)>", "\n", t, flags=re.I)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    return limpar(t)


def texto_pdf(id_: str, idioma: str) -> str | None:
    try:
        import pypdf
    except ImportError:
        sys.exit("[erro] falta o pypdf: pip3 install pypdf")
    url, key = load_env("NEXT_PUBLIC_SUPABASE_URL"), load_env("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("[erro] precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY")
    req = urllib.request.Request(
        f"{url}/storage/v1/object/bonuses/{id_}/{idioma}/original.pdf",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    try:
        data = urllib.request.urlopen(req, timeout=60).read()
    except Exception as e:  # noqa: BLE001 — material sem PDF nesse idioma
        print(f"  ! {id_}/{idioma}: PDF indisponível ({e})")
        return None
    r = pypdf.PdfReader(io.BytesIO(data))
    return limpar("\n".join((p.extract_text() or "") for p in r.pages))


def limpar(t: str) -> str:
    t = re.sub(r"[ \t ]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n", t)
    return t.strip()


def main() -> None:
    base: dict[str, dict] = {}
    for b in bonuses_do_app():
        textos = {}
        for idioma in b["idiomas"]:
            h = ROOT / "materiais" / b["id"] / f"{idioma}.html"
            t = texto_html(h) if h.exists() else texto_pdf(b["id"], idioma)
            if t:
                textos[idioma] = t
                print(f"  {b['id']}/{idioma}: {len(t) // 4} tokens ({'html' if h.exists() else 'pdf'})")
        base[b["id"]] = {"acesso": b["acesso"], "textos": textos}
    OUT.write_text(json.dumps(base, ensure_ascii=False, indent=1) + "\n")
    print(f"\n✓ {OUT.relative_to(ROOT)} — {len(base)} materiais")


if __name__ == "__main__":
    main()
