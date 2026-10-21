#!/usr/bin/env python3
"""Generate seekable question+options audio; IndexTTS2.5 is the default, no network required."""
import argparse
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
H3 = Path("/mnt/disk1/H3_Studio")
INDEX = H3 / "IndexTTS2"
WORK = ROOT / "reports/exam-read-aloud-worklist.json"
PROXY = os.getenv("MATH_TTS_PROXY", "http://127.0.0.1:20171")
VOICES = {"zh": "zh-CN-XiaoxiaoNeural", "en": "en-US-JennyNeural"}
EMOTION = [0.12, 0, 0, 0, 0, 0, 0.02, 0.86]

def duration(path: Path):
    try:
        value = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            text=True, timeout=12).strip()
        return round(float(value), 2)
    except Exception:
        return 0

def valid(path: Path):
    return path.is_file() and path.stat().st_size > 1000 and duration(path) > .5

def paths(item):
    dest = Path(item["file"]).resolve()
    root = (ROOT / "public/exam-read-aloud/v1").resolve()
    if dest.parent != root or dest.suffix != ".mp3":
        raise ValueError("output path outside audio asset directory")
    dest.parent.mkdir(parents=True, exist_ok=True)
    return dest, dest.with_name(dest.stem + ".partial.mp3"), dest.with_suffix(".partial.wav")

def index_model():
    sys.path.insert(0, str(INDEX))
    os.environ.setdefault("HF_HOME", str(H3 / "runtime/h3studio/hf-cache"))
    os.environ.setdefault("XDG_CACHE_HOME", str(H3 / "runtime/h3studio/xdg-cache"))
    from indextts.infer_v2_5 import IndexTTS2
    print("INDEXTTS_LOADING", flush=True)
    model = IndexTTS2(cfg_path=str(INDEX / "checkpoints_25/config.yaml"),
                     model_dir=str(INDEX / "checkpoints_25"), use_bf16=True)
    print("INDEXTTS_READY", flush=True)
    return model

def render_local(item, model, voice):
    dest, partial, wav = paths(item)
    if valid(dest):
        return {"status": "cached", "url": item["url"], "duration": duration(dest)}
    try:
        partial.unlink(missing_ok=True)
        wav.unlink(missing_ok=True)
        model.infer(
            spk_audio_prompt=str(voice),
            text=item["text"],
            lang="ZH" if item["language"] == "zh" else "EN",
            output_path=str(wav),
            duration_factor=1.08,
            emo_vector=EMOTION,
            use_random=False,
            interval_silence=230,
            verbose=False,
        )
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                        "-ar", "22050", "-ac", "1", "-b:a", "64k", str(partial)],
                       check=True, timeout=90)
        if not valid(partial):
            raise RuntimeError("generated MP3 failed ffprobe")
        partial.replace(dest)
        return {"status": "rendered", "url": item["url"], "duration": duration(dest)}
    except Exception as exc:
        return {"status": "failed", "url": item["url"], "error": str(exc)}
    finally:
        partial.unlink(missing_ok=True)
        wav.unlink(missing_ok=True)

async def render_edge(item, sem, proxy):
    import edge_tts
    dest, partial, wav = paths(item)
    if valid(dest):
        return {"status": "cached", "url": item["url"], "duration": duration(dest)}
    async with sem:
        last_error = None
        for attempt in range(2):
            try:
                partial.unlink(missing_ok=True)
                speech = edge_tts.Communicate(item["text"], VOICES[item["language"]],
                    rate="-8%", proxy=proxy, connect_timeout=15, receive_timeout=75)
                await speech.save(str(partial))
                if not valid(partial):
                    raise RuntimeError("generated MP3 failed ffprobe")
                partial.replace(dest)
                return {"status": "rendered", "url": item["url"], "duration": duration(dest)}
            except Exception as exc:
                last_error = str(exc)
                partial.unlink(missing_ok=True)
                await asyncio.sleep(attempt + 1)
        return {"status": "failed", "url": item["url"], "error": last_error}

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="First N tasks only (0=all)")
    ap.add_argument("--concurrency", type=int, default=5, help="Edge backend only")
    ap.add_argument("--backend", choices=("index", "edge"), default="index")
    ap.add_argument("--voice", default=str(INDEX / "examples/voice_09.wav"))
    ap.add_argument("--proxy", default=PROXY)
    ap.add_argument("--worklist", type=Path, default=WORK, help="Manifest of audio tasks to render")
    ap.add_argument("--report", type=Path, default=ROOT / "reports/exam-read-aloud-render-report.json")
    args = ap.parse_args()
    data = json.loads(args.worklist.read_text())
    tasks = data["tasks"][:args.limit or None]
    results = []
    print("EXAM_TTS_START backend=" + args.backend +
          f" tasks={len(tasks)} all={len(data['tasks'])} exams={len(data['covered'])}", flush=True)
    if args.backend == "index":
        remaining = [item for item in tasks if not valid(Path(item["file"]))]
        model = index_model() if remaining else None
        for i, item in enumerate(tasks, 1):
            result = render_local(item, model, Path(args.voice)) if model else {
                "status": "cached", "url": item["url"], "duration": duration(Path(item["file"]))}
            results.append(result)
            if i <= 5 or i % 20 == 0 or i == len(tasks):
                print(f"EXAM_TTS_PROGRESS {i}/{len(tasks)} {result['status']} {result['url']}", flush=True)
    else:
        sem = asyncio.Semaphore(max(1, min(args.concurrency, 10)))
        futures = [render_edge(item, sem, args.proxy or None) for item in tasks]
        for i, future in enumerate(asyncio.as_completed(futures), 1):
            result = await future
            results.append(result)
            if i <= 5 or i % 20 == 0 or i == len(tasks):
                print(f"EXAM_TTS_PROGRESS {i}/{len(tasks)} {result['status']} {result['url']}", flush=True)
    statuses = {status: sum(x["status"] == status for x in results)
                for status in ("rendered", "cached", "failed")}
    report = {"backend": args.backend, "eligibleExams": len(data["covered"]),
              "requested": len(tasks), "totalTracks": len(data["tasks"]), "statuses": statuses,
              "failures": [x for x in results if x["status"] == "failed"]}
    output = args.report
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print("EXAM_TTS_REPORT=" + json.dumps(report, ensure_ascii=False), flush=True)
    if statuses["failed"]:
        raise SystemExit(1)

if __name__ == "__main__":
    asyncio.run(main())
