#!/usr/bin/env python3
"""Run Stage-1 Source Extraction Ensemble v2 in resumable batches.

Fast tier: native PDF extraction + warm PaddleOCR.
VLM tier: only unresolved prior states, skipping records already successfully
processed by MinerU. Verification and audit are refreshed after every batch.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path


def run(cmd, cwd):
    p = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if p.stdout:
        print(p.stdout, end="")
    if p.stderr:
        print(p.stderr, end="", file=sys.stderr)
    if p.returncode:
        raise SystemExit(p.returncode)
    payload = None
    for line in reversed(p.stdout.splitlines()):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                payload = json.loads(line)
                break
            except json.JSONDecodeError:
                pass
    return payload or {}


def refresh(root):
    run(["python3", "scripts/verify_source_ensemble_v2.py"], root)
    run(["python3", "scripts/audit_source_digitization.py"], root)
    run(["python3", "scripts/build_source_ensemble_review_queue.py"], root)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--exam-prefix", default="pt-")
    ap.add_argument("--source-origin", default="existing_ocr")
    ap.add_argument("--paddle-device", default="gpu:0")
    ap.add_argument("--fast-limit", type=int, default=500)
    ap.add_argument("--fast-batches", type=int, default=1)
    ap.add_argument("--vlm-limit", type=int, default=100)
    ap.add_argument("--vlm-batches", type=int, default=1)
    ap.add_argument("--mineru-tier", default="standard")
    args = ap.parse_args()
    root = args.root.resolve()

    base = [
        "python3", "scripts/source_extraction_ensemble_v2.py",
        "--only-unverified",
        "--source-origin", args.source_origin,
        "--exam-prefix", args.exam_prefix,
    ]

    for i in range(args.fast_batches):
        print(f"=== fast OCR batch {i+1}/{args.fast_batches} ===")
        result = run(base + [
            "--limit", str(args.fast_limit),
            "--paddleocr", "--paddle-device", args.paddle_device,
        ], root)
        refresh(root)
        if int(result.get("processed", 0)) == 0:
            break

    prior = "ENGINE_CONFLICT,FIELD_CONSENSUS_NATIVE_OCR,NATIVE_ONLY_TEXT_CONSENSUS,OCR_ONLY_TEXT_CONSENSUS"
    for i in range(args.vlm_batches):
        print(f"=== VLM escalation batch {i+1}/{args.vlm_batches} ===")
        result = run(base + [
            "--prior-consensus", prior,
            "--skip-engine-ok", "mineru",
            "--limit", str(args.vlm_limit),
            "--mineru", "--mineru-tier", args.mineru_tier,
            "--paddleocr", "--paddle-device", args.paddle_device,
        ], root)
        refresh(root)
        if int(result.get("processed", 0)) == 0:
            break

    audit = json.loads((root / "private/source-digitization/audit.json").read_text())
    review = json.loads((root / "private/source-digitization/source-ensemble-review-queue.json").read_text())
    print(json.dumps({
        "stage1": audit["summary"]["statuses"],
        "review": review.get("summary", {}),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
