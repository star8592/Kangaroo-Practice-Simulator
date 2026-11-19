#!/usr/bin/env python3
"""Create provenance-checked 0.3x beginner reference audio from approved AccentLab clips.

Source and source SHA come directly from BeginnerShortData.ts. Requires a local
copy of the original, SHA-verified AccentLab foundation-v36 Kokoro MP3 corpus,
FFmpeg built with librubberband, and ffprobe. No online downloads, uploads,
child speech, or new speech generation.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_TS = ROOT / "src/features/english/pronunciation/BeginnerShortData.ts"
OUTPUT = ROOT / "public/english/pronunciation/next-lab/audio/beginner-slow-03"
ENTRY = re.compile(
    r'\{id:"(?P<id>[a-z0-9-]+)",text:.*?\n\s*'
    r'audioUrl:"/english/pronunciation/app/audio/foundation-v36/(?P<file>[^"/]+\.mp3)",'
    r'audioSha256:"(?P<sha>[a-f0-9]{64})"', re.S
)

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True, capture_output=True, text=True
    ).stdout.strip()
    return float(out)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True,
                        help="Directory of AccentLab foundation-v36 MP3s")
    args = parser.parse_args()
    entries = list(ENTRY.finditer(SOURCE_TS.read_text(encoding="utf-8")))
    assert len(entries) == 10, "Expected exactly ten independently mapped beginner tracks"
    assert len({e['id'] for e in entries}) == len(entries)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    records = []
    for n, entry in enumerate(entries, start=1):
        source = args.source_dir / entry['file']
        if not source.is_file() or sha(source) != entry['sha']:
            raise RuntimeError("Cannot verify original reference audio for " + entry['id'])
        target = OUTPUT / (entry['id'] + ".mp3")
        subprocess.run([
            "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(source), "-af", "rubberband=tempo=0.3",
            "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame",
            "-b:a", "96k", str(target)
        ], check=True)
        original = duration(source)
        stretched = duration(target)
        if not (2.8 <= stretched / original <= 3.8):
            raise RuntimeError(f"Incorrect slow duration for {entry['id']}")
        if not (4000 < target.stat().st_size < 1024 * 1024):
            raise RuntimeError(f"Invalid slow audio size for {entry['id']}")
        result = {
            "id": entry['id'], "source_file": entry['file'],
            "source_sha256": entry['sha'], "output_file": target.name,
            "output_sha256": sha(target), "original_seconds": round(original, 3),
            "slow_seconds": round(stretched, 3), "output_bytes": target.stat().st_size,
        }
        records.append(result)
        print("BEGINNER_SLOW", n, "/", len(entries), entry['id'],
              result["slow_seconds"], "seconds", flush=True)
    manifest = {
        "version": 1, "source": "AccentLab foundation-v36, Kokoro af_heart synthetic",
        "source_manifest": "src/features/english/pronunciation/BeginnerShortData.ts",
        "filter": "ffmpeg rubberband=tempo=0.3", "preserves_pitch": True,
        "is_human_recording": False,
        "human_listening_review": "pending", "items": records,
    }
    (OUTPUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("BEGINNER_SLOW_COMPLETE", len(records), "total_bytes",
          sum(r["output_bytes"] for r in records), flush=True)

if __name__ == "__main__":
    main()
