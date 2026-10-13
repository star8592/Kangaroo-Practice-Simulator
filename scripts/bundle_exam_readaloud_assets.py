#!/usr/bin/env python3
"""Create an audited immutable release tarball of all G1/G2 audio assets.

Only files listed by the coverage worklist are included. The script rejects
missing/invalid files rather than silently shipping a partial voice library.
"""
import argparse
import hashlib
import io
import json
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "reports/exam-read-aloud-worklist.json"
PUBLIC = ROOT / "public/exam-read-aloud/v1"

def sha256(data: bytes):
    return hashlib.sha256(data).hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    inventory = json.loads(MANIFEST.read_text())
    tasks = inventory.get("tasks", [])
    if not tasks or len(inventory.get("covered", [])) == 0:
        raise SystemExit("empty audio worklist")
    required = []
    for entry in tasks:
        target = Path(entry["file"])
        filename = Path(entry["url"]).name
        if not filename.endswith(".mp3") or "/" in filename or "\\" in filename:
            raise SystemExit("unsafe filename")
        # Worktree may move, so use only its own public/ path, never entry.file from another machine.
        path = PUBLIC / filename
        if not path.is_file() or path.is_symlink() or path.stat().st_size < 1000:
            raise SystemExit("missing/invalid audio: " + filename)
        required.append((filename, path, entry))
    output = Path(args.output).resolve()
    if output.exists():
        raise SystemExit("refusing to overwrite existing bundle")
    output.parent.mkdir(parents=True, exist_ok=True)
    index = {"schema": 1, "trackCount": len(required),
             "examCount": len(inventory["covered"]),
             "questions": sum(e["questionCount"] for e in inventory["covered"]),
             "tracks": []}
    with tarfile.open(output, "w:gz") as archive:
        for filename, path, entry in required:
            raw = path.read_bytes()
            index["tracks"].append({"name": filename, "language": entry["language"],
                                    "sha256": sha256(raw), "size": len(raw)})
            item = tarfile.TarInfo("v1/" + filename)
            item.size = len(raw)
            item.mode = 0o644
            archive.addfile(item, io.BytesIO(raw))
        contents = (json.dumps(index, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
        member = tarfile.TarInfo("manifest.json")
        member.size = len(contents)
        member.mode = 0o644
        archive.addfile(member, io.BytesIO(contents))
    print("EXAM_AUDIO_BUNDLE=PASS",
          json.dumps({"tracks": len(required), "bytes": output.stat().st_size,
                      "sha256": sha256(output.read_bytes()), "path": str(output)}))

if __name__ == "__main__":
    main()
