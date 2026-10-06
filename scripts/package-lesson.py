#!/usr/bin/env python3
"""Empacota UMA aula em HLS: um vídeo (escada de qualidades) + um áudio por idioma.

Modelo "vídeo único + áudio por idioma" (docs/roadmap.md, docs/pesquisa-video-multiaudio.md):
o vídeo é codificado uma vez só; cada idioma ganha só o seu áudio e uma playlist própria
(master_<idioma>.m3u8) apontando para os mesmos pedaços de vídeo. O app abre a playlist do
idioma da aluna — o celular nunca precisa escolher o áudio.

Saída em --out:
    v1080/ v720/ v540/ v360/     pedaços de vídeo (fMP4, 6 s, quadro-chave a cada 2 s)
    a_<idioma>/                  pedaços de áudio (AAC estéreo 96k, mesma duração do vídeo)
    master_<idioma>.m3u8         uma por idioma
    aula.json                    duração, idiomas, tamanhos

Uso:
    python3 scripts/package-lesson.py --video aula.mp4 --audio en=aula.mp4 --audio pl=dzien1.mp4 --out PASTA
    python3 scripts/package-lesson.py --out PASTA --audio tr=gun1.mp4 --add   # idioma novo, sem recodificar o vídeo

--audio aceita qualquer arquivo com áudio (o vídeo dublado da fábrica serve). O áudio é
cortado ou completado com silêncio até a duração exata do vídeo.
Requer ffmpeg/ffprobe no PATH. Sem dependências além da stdlib.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

# Escada da pesquisa (H.264 High; alvo médio via CRF com teto). Validar visualmente.
LADDER = [
    # nome, altura, crf, teto kbps, level, CODECS
    ("v1080", 1080, 22, 5000, "4.0", "avc1.640028"),
    ("v720", 720, 22, 3000, "3.1", "avc1.64001f"),
    ("v540", 540, 23, 1600, "3.1", "avc1.64001f"),
    ("v360", 360, 24, 800, "3.0", "avc1.64001e"),
]
SEG = 6  # segundos por pedaço
KEY = 2  # segundos entre quadros-chave
AUDIO_KBPS = 96
AUDIO_CODEC = "mp4a.40.2"
LANG_RE = re.compile(r"^[a-z]{2}(-[A-Z]{2})?$")


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"[erro] {' '.join(cmd[:6])}…\n{r.stderr[-1500:]}")


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate",
         "-of", "json", str(path)], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def hls_args(folder: Path) -> list[str]:
    folder.mkdir(parents=True, exist_ok=True)
    return ["-f", "hls", "-hls_time", str(SEG), "-hls_playlist_type", "vod",
            "-hls_segment_type", "fmp4", "-hls_fmp4_init_filename", "init.mp4",
            "-hls_segment_filename", str(folder / "seg_%04d.m4s"), str(folder / "index.m3u8")]


def encode_video(src: Path, out: Path, fps: float) -> None:
    gop = round(fps * KEY)
    splits = "".join(f"[s{i}]" for i in range(len(LADDER)))
    chains = [f"[0:v]split={len(LADDER)}{splits}"]
    for i, (_, h, *_rest) in enumerate(LADDER):
        chains.append(f"[s{i}]scale=-2:{h}:flags=lanczos,format=yuv420p[o{i}]")
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-filter_complex", ";".join(chains)]
    for i, (name, _h, crf, cap, level, _codecs) in enumerate(LADDER):
        cmd += ["-map", f"[o{i}]", "-an", "-c:v", "libx264", "-preset", "medium", "-profile:v", "high",
                "-level", level, "-crf", str(crf), "-maxrate", f"{cap}k", "-bufsize", f"{cap * 3 // 2}k",
                "-g", str(gop), "-keyint_min", str(gop), "-sc_threshold", "0",
                *hls_args(out / name)]
    print(f"codificando vídeo ({len(LADDER)} qualidades)…", flush=True)
    run(cmd)


def encode_audio(src: Path, out: Path, lang: str, duration: float) -> None:
    print(f"áudio {lang}…", flush=True)
    run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-map", "0:a:0", "-vn",
         "-af", "apad", "-t", f"{duration:.3f}", "-ac", "2", "-ar", "48000",
         "-c:a", "aac", "-b:a", f"{AUDIO_KBPS}k", *hls_args(out / f"a_{lang}")])


def playlist_stats(index: Path) -> tuple[int, int]:
    """(pico, média) em bits/s a partir dos pedaços da playlist."""
    lines = index.read_text().splitlines()
    init = index.parent / "init.mp4"
    peak, total_bits, total_dur, dur = 0, 0, 0.0, None
    for line in lines:
        if line.startswith("#EXTINF:"):
            dur = float(line[8:].split(",")[0])
        elif line and not line.startswith("#") and dur:
            bits = (index.parent / line).stat().st_size * 8
            peak = max(peak, int(bits / dur))
            total_bits += bits
            total_dur += dur
            dur = None
    total_bits += init.stat().st_size * 8 if init.exists() else 0
    return peak, int(total_bits / total_dur) if total_dur else 0


def write_masters(out: Path, langs: list[str]) -> None:
    a_peak = max(playlist_stats(out / f"a_{l}" / "index.m3u8")[0] for l in langs)
    a_avg = max(playlist_stats(out / f"a_{l}" / "index.m3u8")[1] for l in langs)
    for lang in langs:
        lines = ["#EXTM3U", "#EXT-X-VERSION:7", "#EXT-X-INDEPENDENT-SEGMENTS",
                 f'#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",LANGUAGE="{lang}",NAME="{lang}",'
                 f'DEFAULT=YES,AUTOSELECT=YES,CHANNELS="2",URI="a_{lang}/index.m3u8"']
        for name, h, _crf, _cap, _level, codecs in LADDER:
            v_peak, v_avg = playlist_stats(out / name / "index.m3u8")
            w = round(h * 16 / 9 / 2) * 2
            lines.append(f"#EXT-X-STREAM-INF:BANDWIDTH={v_peak + a_peak},AVERAGE-BANDWIDTH={v_avg + a_avg},"
                         f'CODECS="{codecs},{AUDIO_CODEC}",RESOLUTION={w}x{h},AUDIO="aud"')
            lines.append(f"{name}/index.m3u8")
        (out / f"master_{lang}.m3u8").write_text("\n".join(lines) + "\n")


def size_mb(folder: Path) -> float:
    return sum(f.stat().st_size for f in folder.rglob("*") if f.is_file()) / 1e6


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", type=Path, help="vídeo-mestre (o mesmo em todos os idiomas)")
    ap.add_argument("--audio", action="append", default=[], metavar="IDIOMA=ARQUIVO", required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--add", action="store_true", help="só acrescenta idiomas a uma aula já empacotada")
    args = ap.parse_args()

    out = args.out.expanduser()
    meta_path = out / "aula.json"
    audios = {}
    for item in args.audio:
        lang, _, path = item.partition("=")
        if not LANG_RE.match(lang) or not Path(path).expanduser().exists():
            sys.exit(f"[erro] --audio inválido: {item} (formato idioma=arquivo, ex.: pl=dzien1.mp4)")
        audios[lang] = Path(path).expanduser()

    if args.add:
        if not meta_path.exists():
            sys.exit(f"[erro] {out} não tem aula empacotada (aula.json)")
        meta = json.loads(meta_path.read_text())
    else:
        if not args.video or not args.video.expanduser().exists():
            sys.exit("[erro] --video obrigatório (ou use --add para só acrescentar idiomas)")
        info = probe(args.video.expanduser())
        v = next(s for s in info["streams"] if s["codec_type"] == "video")
        num, den = map(int, v["r_frame_rate"].split("/"))
        meta = {"duration": float(info["format"]["duration"]), "fps": num / den, "languages": []}
        encode_video(args.video.expanduser(), out, meta["fps"])

    for lang, src in audios.items():
        a_dur = float(probe(src)["format"]["duration"])
        if abs(a_dur - meta["duration"]) > 2:
            print(f"  [aviso] áudio {lang} tem {a_dur:.1f}s e o vídeo {meta['duration']:.1f}s — confira a sincronia")
        encode_audio(src, out, lang, meta["duration"])
        if lang not in meta["languages"]:
            meta["languages"].append(lang)

    write_masters(out, meta["languages"])
    meta["sizes_mb"] = {p.name: round(size_mb(p), 1) for p in sorted(out.iterdir()) if p.is_dir()}
    meta_path.write_text(json.dumps(meta, indent=2) + "\n")

    vid_mb = sum(mb for k, mb in meta["sizes_mb"].items() if k.startswith("v"))
    minutes = meta["duration"] / 60
    print(f"\n✅ {out}  ({minutes:.1f} min, idiomas: {', '.join(meta['languages'])})")
    print(f"   vídeo: {vid_mb:.0f} MB ({vid_mb / minutes:.1f} MB/min) · áudio por idioma: "
          f"{meta['sizes_mb'].get('a_' + meta['languages'][0], 0):.1f} MB")


if __name__ == "__main__":
    main()
