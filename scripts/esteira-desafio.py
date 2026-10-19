#!/usr/bin/env python3
"""Esteira Drive → app: leva um módulo do Drive até virar desafio no app (es + en, vídeo único no R2).

Etapas (cada uma idempotente; o estado fica em <fábrica>/trabalho/<slug>/esteira.json):

  baixar    --modulo 69 --slug menopausa   baixa o módulo do Drive, confere, alinha o áudio e
                                           transcreve fala por fala (Whisper, 12_transcrever_falas)
  [tradução es + títulos — feita pelo Claude: fábrica pipeline/TRADUCAO-AULAS.md, ver CLAUDE.md da fábrica]
  produzir  --slug menopausa [--aulas 1] [--descanso 0]   inglês (original + descansos + música) e espanhol dublado,
                                           com os descansos nos MESMOS pontos; confere os dois
  publicar  --slug menopausa --desafio 8   empacota (vídeo único + áudio es/en) e sobe no R2,
                                           gravando lib/hls-lessons.json
  ficha     --slug menopausa --desafio 8 --emoji 🌸 --titulo-es … --titulo-en … --categoria-es … --categoria-en …
                                           cria lib/desafios/NN-slug.json com os títulos das aulas
                                           (trabalho/<slug>/nomes.{es,en}.tsv)
  arquivar  --slug menopausa [--apagar]    sobe os finais no Drive (pastas ES/ e EN/ do módulo),
                                           confere e, com --apagar, libera o disco
  status    --slug menopausa

Pontos de parada do Bruno (P5, degrau 2): aula piloto (produzir --aulas 1) antes do lote, e o
ok do deploy depois da ficha. Custo: só a dublagem es (ElevenLabs); o inglês é o áudio original.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FABRICA = Path(os.environ.get("FABRICA_DUBLAGEM", Path.home() / "Ferramentas" / "fabrica-dublagem"))
PY_FABRICA = FABRICA / "pipeline" / ".venv" / "bin" / "python"
REMOTE = "gdrive-full"
PASTA_MAE = "1udip5N5aRAaq-9UE-TBzgTm22bjN0j2W"  # "Todos os módulos" (conta admriseme)
IDIOMAS = ["es", "en"]  # decisão do Bruno, 15/10/2026: desafio novo sai em es + en
# Registro das aulas no R2: um só, o da main (combinado com o chat do R2, 15/10). O publish-hls.py
# lê a mesma variável; sem ela, os dois usam o arquivo deste checkout.
HLS_LESSONS = Path(os.environ.get("HLS_LESSONS_PATH", ROOT / "lib" / "hls-lessons.json"))
DESAFIOS = ROOT / "lib" / "desafios"


def sh(cmd, **kw):
    print("  $", " ".join(str(c) for c in cmd[:6]), "…" if len(cmd) > 6 else "", flush=True)
    r = subprocess.run([str(c) for c in cmd], **kw)
    if r.returncode != 0:
        sys.exit(f"[erro] comando falhou ({r.returncode})")
    return r


def num(nome):
    m = re.search(r"aula\s*(\d+)", nome, re.IGNORECASE)
    return int(m.group(1)) if m else None


def estado_path(slug):
    return FABRICA / "trabalho" / slug / "esteira.json"


def ler_estado(slug):
    p = estado_path(slug)
    if not p.exists():
        sys.exit(f"[erro] {slug}: rode 'baixar' primeiro")
    return json.loads(p.read_text())


def gravar_estado(slug, est):
    estado_path(slug).write_text(json.dumps(est, ensure_ascii=False, indent=1) + "\n")


def remote(pasta_id, sub=""):
    return f"{REMOTE},root_folder_id={pasta_id}:{sub}"


# ------------------------------------------------------------------ baixar

def baixar(a):
    pastas = json.loads(subprocess.run(["rclone", "lsjson", "--dirs-only", remote(PASTA_MAE)],
                                       capture_output=True, text=True, check=True).stdout)
    achadas = [p for p in pastas if re.match(rf"^\s*0*{a.modulo}\s*-", p["Name"])]
    if len(achadas) != 1:
        sys.exit(f"[erro] módulo {a.modulo}: {len(achadas)} pastas no Drive ({[p['Name'] for p in achadas]})")
    pasta = achadas[0]
    ent = FABRICA / "entrada" / a.slug
    tra = FABRICA / "trabalho" / a.slug
    tra.mkdir(parents=True, exist_ok=True)
    print(f"módulo: {pasta['Name']} ({pasta['ID']}) → {ent}")

    # Só os vídeos da raiz do módulo: subpastas (ES/, EN/…) são entregas, não originais
    filtro = ["--max-depth", "1", "--include", "*.mp4"]
    sh(["rclone", "copy", remote(pasta["ID"]), ent, *filtro, "-P"])
    sh(["rclone", "check", ent, remote(pasta["ID"]), "--one-way", *filtro])

    videos = sorted((v.name for v in ent.glob("*.mp4")), key=lambda n: num(n) or 999)
    sem_num = [v for v in videos if num(v) is None]
    if sem_num:
        sys.exit(f"[erro] arquivos sem 'Aula N' no nome (o pipeline casa por número): {sem_num}")
    nums = [num(v) for v in videos]
    if len(set(nums)) != len(nums):
        sys.exit(f"[erro] número de aula repetido: {nums}")
    # Dia do app = posição na ordem das aulas (módulo com buraco na numeração não deixa dia vazio)
    est = {"modulo": pasta["Name"], "drive_id": pasta["ID"], "slug": a.slug,
           "aulas": [{"dia": i + 1, "aula": n, "arquivo": v} for i, (n, v) in enumerate(zip(nums, videos))]}
    if estado_path(a.slug).exists():
        est = {**ler_estado(a.slug), **{k: est[k] for k in ("modulo", "drive_id", "aulas")}}
    gravar_estado(a.slug, est)
    normalizar(ent, videos)
    print(f"{len(videos)} aulas → dias 1–{len(videos)}. Transcrevendo fala por fala (Whisper; demora)…")
    # Fala por fala (12): a transcrição da aula inteira (preparar_lote) alucinou e perdeu
    # exercícios na menopausa mesmo com o áudio alinhado (19/10/2026)
    real = tra / "transcricao-real"
    real.mkdir(exist_ok=True)
    for n, v in zip(nums, videos):
        saida = real / f"aula-{n:02d}.falas.json"
        if saida.exists():
            continue
        tmp = saida.with_suffix(".tmp.json")
        sh([PY_FABRICA, FABRICA / "pipeline" / "12_transcrever_falas.py", ent / v, tmp])
        tmp.replace(saida)
    print("\n✅ baixado e transcrito. Próximo: tradução es (Claude) + nomes.{es,en}.tsv, depois 'produzir --aulas 1'.")


def normalizar(ent, videos):
    """Conserta o áudio com marcas de tempo sobrepostas (achado na Menopausa, 19/10/2026).

    Nesses arquivos, decodificar o áudio rende até 25 s A MAIS que o vídeo: a transcrição sai fora
    do tempo e as etapas que recodificam o áudio (descansos, música) o atrasam em relação à imagem.
    Recodifica só o áudio, alinhado pelas marcas de tempo (vídeo copiado), no próprio arquivo, uma vez.
    """
    for nome in videos:
        arq = ent / nome
        bruto = subprocess.run(["ffmpeg", "-v", "error", "-i", arq, "-vn", "-f", "s16le", "-ac", "1",
                                "-ar", "8000", "-"], capture_output=True).stdout
        dur_bruto = len(bruto) / 2 / 8000
        dur = duracao(arq)
        if dur_bruto - dur < 0.5:
            continue
        tmp = arq.with_suffix(".norm.mp4")
        sh(["ffmpeg", "-v", "error", "-i", arq, "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy",
            "-af", "aresample=async=1:first_pts=0", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", "-y", tmp])
        tmp.replace(arq)
        print(f"  áudio alinhado: {nome} (sobrava {dur_bruto - dur:.1f} s)")


# ------------------------------------------------------------------ produzir

def duracao(arq):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", arq], capture_output=True, text=True).stdout
    return float(out.strip() or 0)


def volume_medio(arq):
    r = subprocess.run(["ffmpeg", "-i", arq, "-vn", "-af", "volumedetect", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"mean_volume: ([-\d.]+) dB", r.stderr)
    return float(m.group(1)) if m else -99.0


def finais(est, idioma):
    return {x["dia"]: FABRICA / "saida" / est["slug"] / idioma / x["arquivo"] for x in est["aulas"]}


def so_aulas(aulas):
    if not aulas:
        return None
    so = set()
    for parte in aulas.split(","):
        ini, _, fim = parte.partition("-")
        so.update(range(int(ini), int(fim or ini) + 1))
    return so


def pontos_por_transicao(est, so):
    """Módulo com telas "Next Up" (sem o som de GO do 09): o cartão entra logo antes de cada tela.
    O 11 grava aula-NN.pontos.json e o 05 usa esses pontos em todos os idiomas (vídeo único)."""
    tra = FABRICA / "trabalho" / est["slug"]
    for x in est["aulas"]:
        n = x["aula"]
        if so and n not in so:
            continue
        saida, tr = tra / f"aula-{n:02d}.pontos.json", tra / f"aula-{n:02d}.es.tr.json"
        if saida.exists() or not tr.exists():
            continue
        tmp = saida.with_suffix(".tmp.json")
        sh([PY_FABRICA, FABRICA / "pipeline" / "11_pontos_transicao.py",
            FABRICA / "entrada" / est["slug"] / x["arquivo"], tr, tmp])
        if len(json.loads(tmp.read_text())["telas"]) >= 3:
            tmp.replace(saida)
        else:
            tmp.unlink()  # sem telas de transição: o 09 detecta pelo som de GO, como antes


def produzir(a):
    est = ler_estado(a.slug)
    extra = (["--aulas", a.aulas] if a.aulas else []) + ["--descanso", str(a.descanso)]
    lote = FABRICA / "pipeline" / "05_produzir_lote.py"
    if a.descanso > 0:
        pontos_por_transicao(est, so_aulas(a.aulas))
    # Inglês primeiro: ele define os pontos de descanso que o espanhol reaproveita
    for idioma in ["en"] + [i for i in IDIOMAS if i != "en"]:
        sh([PY_FABRICA, lote, "--desafio", a.slug, "--idioma", idioma, *extra])

    print("\nconferência (vídeo único: mesma duração; áudio presente):")
    so = so_aulas(a.aulas)
    problemas = 0
    fin = {i: finais(est, i) for i in IDIOMAS}
    for x in est["aulas"]:
        if so and x["aula"] not in so:
            continue
        linha = [f"dia {x['dia']:2d} (aula {x['aula']})"]
        durs = {}
        for i in IDIOMAS:
            f = fin[i][x["dia"]]
            if not f.exists():
                linha.append(f"{i}: FALTA"); problemas += 1; continue
            durs[i] = duracao(f)
            vol = volume_medio(f)
            linha.append(f"{i}: {durs[i]:.1f}s {vol:.0f}dB")
            if vol < -45:
                linha.append("⚠ áudio mudo?"); problemas += 1
        if len(durs) == len(IDIOMAS) and max(durs.values()) - min(durs.values()) > 0.5:
            linha.append("⚠ durações diferentes"); problemas += 1
        print("  " + " · ".join(linha))
    print("✅ conferido" if not problemas else f"⚠ {problemas} problema(s) — ver acima")


# ------------------------------------------------------------------ publicar

def publicar(a):
    est = ler_estado(a.slug)
    est["desafio"] = a.desafio
    gravar_estado(a.slug, est)
    fin = {i: finais(est, i) for i in IDIOMAS}
    ja = json.loads(HLS_LESSONS.read_text())["lessons"].get(a.desafio, {})
    for x in est["aulas"]:
        dia = x["dia"]
        if set(IDIOMAS) <= set(ja.get(str(dia), {}).get("languages", [])):
            print(f"dia {dia:2d}: já publicado"); continue
        faltam = [i for i in IDIOMAS if not fin[i][dia].exists()]
        if faltam:
            print(f"dia {dia:2d}: ⚠ sem final em {faltam}, pulando"); continue
        with tempfile.TemporaryDirectory(dir=FABRICA / "trabalho" / a.slug) as td:
            pkg = Path(td) / f"d{dia:02d}"
            audios = [arg for i in IDIOMAS for arg in ("--audio", f"{i}={fin[i][dia]}")]
            sh([sys.executable, ROOT / "scripts" / "package-lesson.py",
                "--video", fin["en"][dia], *audios, "--out", pkg])
            sh([sys.executable, ROOT / "scripts" / "publish-hls.py", "--dir", pkg,
                "--challenge", a.desafio, "--day", str(dia), "--languages", ",".join(IDIOMAS)])
    print(f"\n✅ publicado. Commitar lib/hls-lessons.json (desafio {a.desafio}).")


# ------------------------------------------------------------------ ficha

def titulos(slug, idioma, n_aulas):
    tsv = FABRICA / "trabalho" / slug / f"nomes.{idioma}.tsv"
    if not tsv.exists():
        sys.exit(f"[erro] falta {tsv} (aula<TAB>título, um por linha)")
    por_aula = {}
    for ln in tsv.read_text(encoding="utf-8").splitlines():
        if not ln.strip() or ln.startswith("#"):
            continue
        n, _, nome = ln.partition("\t")
        # aceita "Título" ou "[Clase 1][Nivel] - Título.mp4"
        nome = re.sub(r"\.mp4$", "", re.sub(r"^(\[[^\]]*\]\s*)+[-–]?\s*", "", nome.strip()))
        por_aula[int(n)] = nome
    return por_aula


def ficha(a):
    est = ler_estado(a.slug)
    aulas = [x["aula"] for x in est["aulas"]]
    dias = {}
    for i in IDIOMAS:
        t = titulos(a.slug, i, len(aulas))
        faltam = [n for n in aulas if n not in t]
        if faltam:
            sys.exit(f"[erro] nomes.{i}.tsv sem as aulas {faltam}")
        dias[i] = [t[n] for n in aulas]
    nome_arq = f"{int(a.desafio):02d}-{a.slug}.json"
    dados = {
        "id": a.desafio, "modulo": est["modulo"].strip(), "emoji": a.emoji, "gratis": False,
        "idiomas": IDIOMAS,
        "titulo": {"es": a.titulo_es, "en": a.titulo_en},
        "categoria": {"es": a.categoria_es, "en": a.categoria_en},
        "dias": dias,
    }
    (DESAFIOS / nome_arq).write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n")

    # registra no index.ts (import + entrada em FICHAS)
    idx = DESAFIOS / "index.ts"
    src = idx.read_text()
    var = "d" + a.desafio
    if f"./{nome_arq[:-5]}.json'" not in src:
        imports = list(re.finditer(r"^import \w+ from '\./[^']+\.json'\n", src, re.M))
        fim = imports[-1].end()
        src = src[:fim] + f"import {var} from './{nome_arq[:-5]}.json'\n" + src[fim:]
        src = re.sub(r"(export const FICHAS: FichaDesafio\[\] = \[)([^\]]*)\]",
                     lambda m: f"{m.group(1)}{m.group(2)}, {var}]", src, count=1)
        idx.write_text(src)
    est["desafio"] = a.desafio
    gravar_estado(a.slug, est)
    print(f"✅ lib/desafios/{nome_arq} ({len(aulas)} aulas). Conferir com tsc e commitar com o hls-lessons.json.")


# ------------------------------------------------------------------ arquivar

def arquivar(a):
    est = ler_estado(a.slug)
    for i in IDIOMAS:
        local = FABRICA / "saida" / a.slug / i
        destino = remote(est["drive_id"], i.upper())
        sh(["rclone", "copy", local, destino, "--include", "*.mp4", "-P"])
        sh(["rclone", "check", local, destino, "--one-way", "--include", "*.mp4"])
    print("✅ finais no Drive e conferidos.")
    if a.apagar:
        for pasta in [FABRICA / "saida" / a.slug, FABRICA / "entrada" / a.slug]:
            sh(["rm", "-rf", pasta])
        print("disco liberado (trabalho/ fica: transcrição e tradução servem a qualquer idioma).")


def status(a):
    est = ler_estado(a.slug)
    fin = {i: finais(est, i) for i in IDIOMAS}
    hls = json.loads(HLS_LESSONS.read_text())["lessons"].get(est.get("desafio", ""), {})
    tra = FABRICA / "trabalho" / a.slug
    print(f"{est['modulo']} · desafio {est.get('desafio', '—')} · {len(est['aulas'])} aulas")
    for x in est["aulas"]:
        n = x["aula"]
        tr = (tra / f"aula-{n:02d}.es.tr.json").exists()
        print(f"  dia {x['dia']:2d} (aula {n:2d})  transcrito {'✓' if (tra / 'transcricao-real' / f'aula-{n:02d}.falas.json').exists() else '·'}"
              f"  es traduzido {'✓' if tr else '·'}"
              f"  finais {''.join(i if fin[i][x['dia']].exists() else '·' for i in IDIOMAS)}"
              f"  R2 {','.join(hls.get(str(x['dia']), {}).get('languages', [])) or '·'}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="etapa", required=True)
    p = sub.add_parser("baixar"); p.add_argument("--modulo", type=int, required=True); p.add_argument("--slug", required=True)
    p = sub.add_parser("produzir"); p.add_argument("--slug", required=True); p.add_argument("--aulas")
    # 10 s = cartão de descanso padrão; 0 = módulo que já tem descanso nativo (telas "Next Up")
    p.add_argument("--descanso", type=float, default=10)
    p = sub.add_parser("publicar"); p.add_argument("--slug", required=True); p.add_argument("--desafio", required=True)
    p = sub.add_parser("ficha")
    for arg in ["--slug", "--desafio", "--emoji", "--titulo-es", "--titulo-en", "--categoria-es", "--categoria-en"]:
        p.add_argument(arg, required=True)
    p = sub.add_parser("arquivar"); p.add_argument("--slug", required=True); p.add_argument("--apagar", action="store_true")
    p = sub.add_parser("status"); p.add_argument("--slug", required=True)
    a = ap.parse_args()
    {"baixar": baixar, "produzir": produzir, "publicar": publicar, "ficha": ficha,
     "arquivar": arquivar, "status": status}[a.etapa](a)


if __name__ == "__main__":
    main()
