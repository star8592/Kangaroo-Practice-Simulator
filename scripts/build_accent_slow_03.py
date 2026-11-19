#!/usr/bin/env python3
"""Prepare pitch-preserved 0.3x lesson audio offline. Never runs on the web server.

Run on an approved development machine with FFmpeg rubberband:
    python3 scripts/build_accent_slow_03.py

Only fetches SOC THINK's existing approved follow-along reference audio.
The resulting public assets must pass review and normal Git release gates.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import subprocess
from urllib.request import Request, urlopen

SITE = "https://socthink.cn"
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public/english/pronunciation/next-lab/audio/slow-03"
PATTERN = re.compile(r"^/app/audio/follow-along/([a-z0-9-]+)\.mp3$")
MAX_SOURCE_BYTES = 5 * 1024 * 1024
MAX_ITEMS = 250


def fetch_bytes(url: str) -> bytes:
    with urlopen(Request(url, headers={"User-Agent": "SOC-THINK-R7A-audio-builder/1.0"}), timeout=20) as res:
        data = res.read(MAX_SOURCE_BYTES + 1)
    if not data or len(data) > MAX_SOURCE_BYTES:
        raise ValueError(f"unexpected source size: {url}")
    return data


def duration_seconds(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nokey=1:noprint_wrappers=1", str(path)],
        check=True, capture_output=True, text=True, timeout=20,
    )
    return round(float(result.stdout.strip()), 3)


def prepare(item: dict) -> dict:
    ident = item.get("id", "")
    source = item.get("audio_url", "")
    match = PATTERN.fullmatch(source)
    if not match or ident != match.group(1):
        raise ValueError(f"unexpected lesson reference: {ident!r}, {source!r}")
    original = fetch_bytes(SITE + "/english/pronunciation" + source)
    if not (original.startswith(b"ID3") or original[:2] in (b"\xff\xfb", b"\xff\xf3")):
        raise ValueError("non-MP3 source: " + ident)
    import tempfile
    with tempfile.TemporaryDirectory(prefix="accent-slow-") as directory:
        inp = Path(directory) / "source.mp3"
        inp.write_bytes(original)
        out = DEST / (ident + ".mp3")
        subprocess.run(
            ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
             "-i", str(inp), "-vn",
             "-af", "rubberband=tempo=0.3:transients=smooth:detector=soft",
             "-codec:a", "libmp3lame", "-q:a", "3", str(out)],
            check=True, capture_output=True, timeout=180,
        )
        original_duration, slow_duration = duration_seconds(inp), duration_seconds(out)
    if not (3.18 <= slow_duration / original_duration <= 3.45):
        raise ValueError("duration ratio outside tolerance: " + ident)
    return {
        "id": ident,
        "source": source,
        "source_sha256": hashlib.sha256(original).hexdigest(),
        "source_seconds": original_duration,
        "slow_seconds": slow_duration,
        "slow_bytes": out.stat().st_size,
        "ratio": round(slow_duration / original_duration, 3),
    }


def main() -> None:
    catalogue = json.loads(fetch_bytes(SITE + "/english/pronunciation/api/follow-along/items"))
    items = catalogue.get("items", [])
    if not isinstance(items, list) or not 1 <= len(items) <= MAX_ITEMS:
        raise ValueError("invalid catalogue size")
    DEST.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        assets = list(pool.map(prepare, items))
    manifest = {
        "generated_by": "ffmpeg rubberband tempo=0.3 transients=smooth detector=soft; libmp3lame -q:a 3",
        "source": "SOC THINK approved follow-along reference audio; regenerate on source changes",
        "assets": assets,
    }
    (DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(assets)} 0.3x lesson audio tracks; review/commit through GitHub PR.")


if __name__ == "__main__":
    main()
