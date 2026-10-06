#!/usr/bin/env python3
"""Reenvia vendas antigas de um relatório da Perfect Pay ou da Hotmart pro webhook do app.

PRA QUE SERVE: quando um webhook entra no ar DEPOIS de já ter havido vendas, essas
compradoras nunca ganharam conta. Este script remonta o payload da venda a partir do
relatório e reenvia pro /api/perfectpay (ou /api/hotmart) — o MESMO caminho de código
que roda em produção. Nada de lógica duplicada: quem cria conta, gera código, manda
WhatsApp (Voxuy) e e-mail (Resend) continua sendo o webhook.

O webhook é idempotente: se a conta já existe, ele só concede o acesso e NÃO
reenvia mensagem. Por isso a ordem importa quando há mais de um produto:
  1º o produto principal  → cria a conta e manda o acesso
  2º os upsells           → só concedem, em silêncio

SEGURANÇA:
  - só reenvia venda com status 'Aprovado' (ignora rejeitada/cancelada/devolvida/chargeback)
  - --dry-run é o padrão de fato: sem --go nada é enviado
  - --limit permite lotes pequenos (comece com 1)
  - --exclude tira da fila os casos que precisam de decisão humana
  - dedupe por e-mail: uma pessoa = um reenvio, mesmo com várias compras

Uso:
    # simulação (não manda nada)
    python3 scripts/replay-sales.py --xlsx VENDAS.xlsx --product-code PPPBF0A2 \
        --product-name "RiseMe™ - 28 Günlük ..." --only-missing

    # valendo, 5 primeiras
    python3 scripts/replay-sales.py ... --only-missing --limit 5 --go

    # Hotmart: relatório .csv de Vendas; o produto é filtrado pelo CÓDIGO (sem --product-name).
    # Só produto avulso (order bump/upsell/desafio) — assinatura não é reenviada por aqui.
    python3 scripts/replay-sales.py --platform hotmart --file sales_history.csv \
        --product-code 4784921 --only-existing

Requer PERFECTPAY_WEBHOOK_TOKEN (Hotmart: HOTMART_WEBHOOK_TOKEN) no ambiente (ou --token).
"""

from __future__ import annotations  # Python 3.9 do Mac: permite `str | None` nas anotações

import argparse
import csv
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import zipfile
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ROOT = Path(__file__).resolve().parent.parent
STATUS_APROVADO = "Aprovado"
SALE_STATUS_APPROVED = 2  # sale_status_enum da Perfect Pay

# 'País' do relatório (PT) → ISO-2, que é o que o webhook espera pra achar o DDI
PAIS_TO_ISO = {"turquia": "TR", "brasil": "BR", "brazil": "BR", "espanha": "ES",
               "méxico": "MX", "mexico": "MX", "argentina": "AR", "colômbia": "CO",
               "colombia": "CO", "chile": "CL", "peru": "PE", "estados unidos": "US",
               "polônia": "PL", "polonia": "PL", "poland": "PL", "polska": "PL",
               "equador": "EC", "paraguai": "PY", "uruguai": "UY", "bolívia": "BO",
               "venezuela": "VE", "guatemala": "GT", "el salvador": "SV", "honduras": "HN",
               "nicarágua": "NI", "costa rica": "CR", "panamá": "PA",
               "república dominicana": "DO", "porto rico": "PR"}

# Relatório de Vendas da Hotmart (.csv com ';') → mesmos nomes de coluna do relatório da
# Perfect Pay, pra filtro, dedupe e fila serem um só.
HOTMART_COLUNAS = {
    "Código da transação": "CódigoTransação", "Status da transação": "Status",
    "Data da transação": "DataVenda", "Código do produto": "CódigoProduto",
    "Produto": "Produto", "Comprador(a)": "NomeCliente",
    "Email do(a) Comprador(a)": "EmailCliente", "País": "País", "Telefone": "TelefoneCliente",
}
HOTMART_STATUS_PAGOS = {"Aprovado", "Completo"}


def read_hotmart_csv(path: Path) -> list[dict]:
    linhas = csv.DictReader(io.StringIO(path.read_bytes().decode("utf-8-sig")), delimiter=";")
    rows = []
    for r in linhas:
        d = {nosso: (r.get(deles) or "") for deles, nosso in HOTMART_COLUNAS.items()}
        if d["Status"] in HOTMART_STATUS_PAGOS:
            d["Status"] = STATUS_APROVADO
        rows.append(d)
    return rows


def read_xlsx(path: Path) -> list[dict]:
    z = zipfile.ZipFile(path)
    shared = [
        "".join(t.text or "" for t in si.iter(f"{NS}t"))
        for si in ET.fromstring(z.read("xl/sharedStrings.xml"))
    ]

    def cell(c):
        v = c.find(f"{NS}v")
        if v is None:
            is_ = c.find(f"{NS}is")
            return "".join(x.text or "" for x in is_.iter(f"{NS}t")) if is_ is not None else ""
        return shared[int(v.text)] if c.get("t") == "s" else (v.text or "")

    rows = []
    for row in ET.fromstring(z.read("xl/worksheets/sheet1.xml")).iter(f"{NS}row"):
        d = {}
        for c in row.iter(f"{NS}c"):
            d[re.match(r"([A-Z]+)", c.get("r") or "A").group(1)] = cell(c)
        rows.append(d)
    hdr = rows[0]
    return [{hdr.get(k, k): v for k, v in r.items()} for r in rows[1:]]


def load_env(name: str) -> str | None:
    if os.environ.get(name):
        return os.environ[name]
    env_path = ROOT / ".env.local"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def existing_emails() -> set[str]:
    """E-mails que já têm conta no auth (pra --only-missing)."""
    url, key = load_env("NEXT_PUBLIC_SUPABASE_URL"), load_env("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("[erro] --only-missing precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY")
    out, page = set(), 1
    while True:
        req = urllib.request.Request(
            f"{url}/auth/v1/admin/users?page={page}&per_page=1000",
            headers={"apikey": key, "Authorization": f"Bearer {key}"})
        users = json.load(urllib.request.urlopen(req)).get("users", [])
        if not users:
            return out
        out |= {u["email"].lower() for u in users if u.get("email")}
        page += 1


def parse_data(sale: dict) -> datetime:
    """DataVenda vem 'DD/MM/AAAA HH:MM:SS'. Comparar como texto ordena errado
    (30/06 > 02/07, porque '3' > '0') — então converte de verdade."""
    raw = (sale.get("DataVenda") or "").strip()
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return datetime.min  # sem data → vai pro fim da fila


def build_payload(sale: dict, token: str, product_code: str) -> dict:
    """Espelha o formato que a Perfect Pay manda de verdade (ver PerfectPayPayload)."""
    pais = (sale.get("País") or "").strip().lower()
    return {
        "token": token,
        "code": sale.get("CódigoTransação") or "REPLAY",
        "sale_status_enum": SALE_STATUS_APPROVED,
        "customer": {
            "email": sale["EmailCliente"].strip().lower(),
            "full_name": (sale.get("NomeCliente") or "").strip() or None,
            # telefone do relatório já vem internacional (+90 ...) → toE164 preserva
            "phone_formated": (sale.get("TelefoneCliente") or "").strip() or None,
            "country": PAIS_TO_ISO.get(pais),
        },
        "product": {"code": product_code, "name": sale.get("Produto")},
        "plan": {"name": sale.get("Plano")},
    }


def build_payload_hotmart(sale: dict, product_code: str) -> dict:
    """Espelha o PURCHASE_APPROVED da Hotmart (ver HotmartPayload). O token vai no cabeçalho.
    Sem purchase.offer de propósito: o webhook trata como compra avulsa (vitalícia)."""
    pais = (sale.get("País") or "").strip().lower()
    return {
        "event": "PURCHASE_APPROVED",
        "data": {
            "product": {"id": int(product_code), "name": sale.get("Produto")},
            "buyer": {
                "email": sale["EmailCliente"].strip().lower(),
                "name": (sale.get("NomeCliente") or "").strip(),
                # telefone do relatório vem com DDI mas sem '+' → o país deixa o toE164 reconhecer
                "checkout_phone": (sale.get("TelefoneCliente") or "").strip() or None,
                "address": {"country_iso": PAIS_TO_ISO.get(pais)},
            },
            "purchase": {"transaction": sale.get("CódigoTransação") or "REPLAY", "status": "APPROVED"},
        },
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--platform", choices=["perfectpay", "hotmart"], default="perfectpay")
    ap.add_argument("--xlsx", "--file", dest="xlsx", required=True, type=Path,
                    help="relatório de vendas: .xlsx da Perfect Pay ou .csv da Hotmart")
    ap.add_argument("--product-name", default=None,
                    help="valor exato da coluna Produto (Perfect Pay; na Hotmart o filtro é pelo código)")
    ap.add_argument("--product-code", required=True, help="código do produto na plataforma")
    ap.add_argument("--url", default=None, help="padrão: https://riseme.app/api/<plataforma>")
    ap.add_argument("--token", default=None)
    ap.add_argument("--only-missing", action="store_true", help="pula quem já tem conta")
    ap.add_argument("--only-existing", action="store_true",
                    help="pula quem NÃO tem conta — usar pra conceder upsell em silêncio "
                         "(sem conta, o webhook criaria a conta e mandaria a mensagem pelo "
                         "produto errado; essa gente tem que passar antes pelo produto principal)")
    ap.add_argument("--limit", type=int, default=0, help="0 = todas")
    ap.add_argument("--exclude", default="", help="e-mails a pular, separados por vírgula")
    ap.add_argument("--delay", type=float, default=1.5, help="segundos entre envios")
    ap.add_argument("--go", action="store_true", help="ENVIA DE VERDADE (sem isto, só simula)")
    args = ap.parse_args()

    hotmart = args.platform == "hotmart"
    if not hotmart and not args.product_name:
        sys.exit("[erro] --product-name é obrigatório na Perfect Pay")
    url = args.url or f"https://riseme.app/api/{args.platform}"
    token_env = "HOTMART_WEBHOOK_TOKEN" if hotmart else "PERFECTPAY_WEBHOOK_TOKEN"
    token = args.token or load_env(token_env)
    if args.go and not token:
        sys.exit(f"[erro] --go exige {token_env} (env ou --token)")

    rows = read_hotmart_csv(args.xlsx) if hotmart else read_xlsx(args.xlsx)
    aprovadas = [r for r in rows
                 if (r.get("CódigoProduto") == args.product_code if hotmart
                     else r.get("Produto") == args.product_name)
                 and r.get("Status") == STATUS_APROVADO
                 and (r.get("EmailCliente") or "").strip()]

    # dedupe: uma pessoa = um reenvio (fica a compra aprovada mais recente)
    por_email: dict[str, dict] = {}
    for r in aprovadas:
        e = r["EmailCliente"].strip().lower()
        if e not in por_email or parse_data(r) > parse_data(por_email[e]):
            por_email[e] = r

    excluidos = {e.strip().lower() for e in args.exclude.split(",") if e.strip()}
    pulados_excl = sorted(set(por_email) & excluidos)
    for e in pulados_excl:
        por_email.pop(e)

    if args.only_missing and args.only_existing:
        sys.exit("[erro] --only-missing e --only-existing são opostos; escolha um")

    pulados_conta = []
    if args.only_missing or args.only_existing:
        tem = existing_emails()
        # only-missing pula quem TEM conta; only-existing pula quem NÃO tem
        pulados_conta = sorted(e for e in por_email if (e in tem) == args.only_missing)
        for e in pulados_conta:
            por_email.pop(e)

    fila = sorted(por_email.values(), key=parse_data, reverse=True)  # mais recente primeiro
    if args.limit:
        fila = fila[:args.limit]

    print(f"planilha:        {args.xlsx.name}")
    nome_produto = args.product_name or (aprovadas[0].get("Produto") if aprovadas else "?")
    print(f"produto:         {nome_produto}  ({args.product_code})")
    print(f"linhas aprovadas: {len(aprovadas)}  →  pessoas únicas: {len(aprovadas) and len(set(r['EmailCliente'].strip().lower() for r in aprovadas))}")
    if pulados_excl:
        print(f"excluídas à mão:  {len(pulados_excl)}  ({', '.join(pulados_excl)})")
    if args.only_missing:
        print(f"já têm conta:     {len(pulados_conta)}  (puladas)")
    if args.only_existing:
        print(f"sem conta:        {len(pulados_conta)}  (puladas — precisam do produto principal antes)")
    print(f"\nNA FILA AGORA:    {len(fila)}" + (f"  (limitado a {args.limit})" if args.limit else ""))
    print("=" * 78)

    if not args.go:
        print(">>> SIMULAÇÃO — nada será enviado. Use --go para valer.\n")
    ok = err = 0
    for i, sale in enumerate(fila, 1):
        pais = PAIS_TO_ISO.get((sale.get("País") or "").strip().lower())
        linha = (f"{i:3}. {sale['EmailCliente'].strip().lower():36} "
                 f"{(sale.get('TelefoneCliente') or '').strip() or 'SEM TELEFONE':20} "
                 f"{pais or '??'}  {sale.get('DataVenda','')[:10]}")
        if not args.go:
            print(linha)
            continue
        headers = {"Content-Type": "application/json"}
        if hotmart:
            p = build_payload_hotmart(sale, args.product_code)
            headers["x-hotmart-hottok"] = token
        else:
            p = build_payload(sale, token, args.product_code)
        try:
            req = urllib.request.Request(url, method="POST", data=json.dumps(p).encode(),
                                         headers=headers)
            resp = json.load(urllib.request.urlopen(req))
            marca = "✅" if resp.get("ok") and not resp.get("skipped") else f"⚠️  {resp.get('skipped')}"
            print(f"{linha}  {marca}")
            ok += 1
        except urllib.error.HTTPError as e:
            print(f"{linha}  ❌ HTTP {e.code}: {e.read().decode()[:90]}")
            err += 1
        time.sleep(args.delay)

    if args.go:
        print("=" * 78)
        print(f"enviadas: {ok}  |  erros: {err}")
        print("\nconfira em ~10min quantas entraram — e use /admin pra reenviar link a quem faltar.")


if __name__ == "__main__":
    main()
