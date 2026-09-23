#!/usr/bin/env python3
import hashlib, json, subprocess, wave
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"public"/"generated-solutions"
OUT=ROOT/"public"/"grade1-narration"/"v1"

def sha256(path: Path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def wav_ms(path: Path):
    with wave.open(str(path),"rb") as w:
        return round(w.getnframes()/w.getframerate()*1000)

sources=sorted(SRC.glob("au-amc-pre-a-s*-q*/scene-*.wav"))
if len(sources)!=150:
    raise SystemExit(f"expected 150 grade-one WAV files, got {len(sources)}")

entries=[]
for src in sources:
    qid=src.parent.name
    dst=OUT/qid/(src.stem+".mp3")
    dst.parent.mkdir(parents=True,exist_ok=True)
    subprocess.run([
        "ffmpeg","-hide_banner","-loglevel","error","-y",
        "-i",str(src),"-map_metadata","-1",
        "-ac","1","-ar","22050","-c:a","libmp3lame","-b:a","64k",
        str(dst),
    ],check=True)
    entries.append({
        "questionId":qid,
        "scene":src.stem,
        "url":f"/grade1-narration/v1/{qid}/{dst.name}",
        "durationMs":wav_ms(src),
        "sourceWavSha256":sha256(src),
        "mp3Sha256":sha256(dst),
        "bytes":dst.stat().st_size,
    })

manifest={
    "version":1,
    "codec":"mp3",
    "sampleRate":22050,
    "channels":1,
    "bitrateKbps":64,
    "questionCount":len({e["questionId"] for e in entries}),
    "sceneCount":len(entries),
    "entries":entries,
}
OUT.mkdir(parents=True,exist_ok=True)
(OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
print(f"GRADE1_NARRATION_BUILD=PASS questions={manifest['questionCount']} scenes={manifest['sceneCount']} bytes={sum(e['bytes'] for e in entries)}")
