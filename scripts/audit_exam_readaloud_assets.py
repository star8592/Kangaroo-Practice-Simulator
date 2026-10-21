#!/usr/bin/env python3
"""Coverage audit: no 'all G1/G2 audio online' claim without real MP3 files."""
import argparse
import json
import subprocess
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "reports/exam-read-aloud-worklist.json"

def duration(path):
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            capture_output=True, check=True, text=True, timeout=15)
        return float(result.stdout.strip())
    except (ValueError, subprocess.SubprocessError):
        return 0

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true", help="Fail until every eligible audio asset exists and is playable")
    parser.add_argument("--all-exams", action="store_true", help="Also fail when a G1/G2 exam is still not training-ready")
    parser.add_argument("--worklist", type=Path, default=WORK, help="Audio manifest to validate")
    args = parser.parse_args()
    inventory = json.loads(args.worklist.read_text())
    tasks = inventory["tasks"]
    good = []
    missing = []
    invalid = []
    for task in tasks:
        path = Path(task["file"])
        public_root = (ROOT / "public/exam-read-aloud/v1").resolve()
        # Content-addressed assets live inside this worktree, not an external symlink.
        if path.parent.resolve() != public_root:
            invalid.append(task["url"])
        elif not path.exists() or path.stat().st_size < 1000:
            missing.append(task["url"])
        elif duration(path) <= .5:
            invalid.append(task["url"])
        else:
            good.append(task["url"])
    stats = {
        "eligibleExams": len(inventory["covered"]),
        "inactiveExams": inventory.get("inactive", []),
        "questions": sum(c["questionCount"] for c in inventory["covered"]),
        "expectedAudioTracks": len(tasks),
        "audioReady": len(good),
        "audioMissing": len(missing),
        "audioInvalid": len(invalid),
        "missingEnglish": inventory["missingEnglish"],
        "audioReadyPct": round(len(good) / max(len(tasks), 1) * 100, 1),
        "languageTracks": dict(Counter(task["language"] for task in tasks)),
        "sampleMissing": missing[:10],
        "sampleInvalid": invalid[:10],
    }
    print("EXAM_READ_ALOUD_AUDIT=" + json.dumps(stats, ensure_ascii=False))
    if args.strict and (missing or invalid or not tasks):
        raise SystemExit(1)
    if args.all_exams and inventory.get("inactive"):
        raise SystemExit(2)

if __name__ == "__main__":
    main()
