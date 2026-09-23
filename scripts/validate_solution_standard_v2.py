#!/usr/bin/env python3
"""Validate the project-wide Solution Experience Standard V2.

V2 is the only allowed standard for newly materialized/published verified
solutions. Legacy verified solutions remain readable, but are reported for
migration until they are rematerialized through the current factory.
"""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOL = ROOT / "private/solutions"
PUB = ROOT / "public"
STANDARD_VERSION = 2
VOICE_PROFILE = "warm-teacher-v1"
PLAYBACK_PROFILE = "continuous-auto-v1"


def narration_hash(data):
    core = []
    for scene in data.get("scenes") or []:
        core.append({
            "id": scene.get("id"),
            "narration": scene.get("narration"),
            "voiceDirection": ((scene.get("renderSpec") or {}).get("voiceDirection") or ""),
        })
    raw = json.dumps(core, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(raw).hexdigest()


def scene_directable(scene):
    spec = scene.get("renderSpec") or {}
    script = spec.get("script") or []
    visual = scene.get("visual") or {}
    return bool(script) or visual.get("type") in {"source-image", "number-line", "fraction-bar", "solid3d"}


def audio_ok(scene):
    url = scene.get("audioUrl")
    if not url or not url.startswith("/generated-solutions/"):
        return False
    p = PUB / url.lstrip("/")
    return p.exists() and p.stat().st_size > 1000


def evaluate(path):
    try:
        data = json.loads(path.read_text())
    except Exception as exc:
        return {"questionId": path.stem, "state": "INVALID_JSON", "issues": [str(exc)]}

    qid = data.get("questionId") or path.stem
    if data.get("quality") != "verified":
        return {"questionId": qid, "state": "NOT_VERIFIED", "issues": []}

    issues = []
    verification = data.get("verification") or {}
    if verification.get("officialAnswerMatched") is not True:
        issues.append("official_answer_not_matched")
    if verification.get("solverAgreement") is not True:
        issues.append("solver_agreement_missing")
    confidence = verification.get("confidence")
    if not isinstance(confidence, (int, float)) or confidence < 0.65:
        issues.append("confidence_below_gate")

    scenes = data.get("scenes") or []
    if not 2 <= len(scenes) <= 12:
        issues.append("scene_count_out_of_range")
    if scenes and not all(str(s.get("narration") or "").strip() for s in scenes):
        issues.append("empty_narration")
    if scenes and not all(scene_directable(s) for s in scenes):
        issues.append("scene_not_directable")

    mat = data.get("materialization") or {}
    if mat.get("audioReady") is not True:
        issues.append("audio_not_ready")
    elif scenes and not all(audio_ok(s) for s in scenes):
        issues.append("audio_file_missing")
    if mat.get("audioReady") is True and mat.get("audioNarrationHash") != narration_hash(data):
        issues.append("stale_audio")

    tagged = int(data.get("solutionStandardVersion") or 0) >= STANDARD_VERSION
    if tagged:
        if mat.get("voiceProfile") != VOICE_PROFILE:
            issues.append("wrong_voice_profile")
        if mat.get("playbackProfile") != PLAYBACK_PROFILE:
            issues.append("wrong_playback_profile")
        if mat.get("visualReasoningRequired") is not True:
            issues.append("visual_reasoning_not_required")

    if tagged and not issues:
        state = "V2_READY"
    elif tagged:
        state = "V2_INVALID"
    elif not issues:
        state = "LEGACY_EQUIVALENT"
    elif any(x in issues for x in ("scene_not_directable", "empty_narration", "scene_count_out_of_range",
                                    "official_answer_not_matched", "solver_agreement_missing", "confidence_below_gate")):
        state = "NEEDS_DIRECTOR_UPGRADE"
    else:
        state = "NEEDS_MATERIALIZATION"

    return {
        "questionId": qid,
        "state": state,
        "issues": issues,
        "solutionStandardVersion": data.get("solutionStandardVersion"),
        "scenes": len(scenes),
    }


ap = argparse.ArgumentParser()
ap.add_argument("question_ids", nargs="*")
ap.add_argument("--enforce-tagged", action="store_true",
                help="fail if any solution already tagged V2 violates the V2 contract")
ap.add_argument("--enforce", action="store_true",
                help="fail unless every selected verified solution is V2_READY")
ap.add_argument("--write", action="store_true", help="write migration report under private/solutions/_meta")
ap.add_argument("--show", type=int, default=12)
args = ap.parse_args()

wanted = set(args.question_ids)
rows = []
for p in sorted(SOL.glob("*.json")):
    if p.name == "queue.json":
        continue
    if wanted and p.stem not in wanted:
        continue
    row = evaluate(p)
    if row["state"] != "NOT_VERIFIED":
        rows.append(row)

counts = Counter(r["state"] for r in rows)
print("SOLUTION_STANDARD_V2", json.dumps(dict(sorted(counts.items())), ensure_ascii=False, sort_keys=True))
for row in rows[:max(0, args.show)]:
    print(row["state"], row["questionId"], ",".join(row["issues"]) or "ok")

if args.write:
    out = SOL / "_meta"
    out.mkdir(parents=True, exist_ok=True)
    payload = {
        "standardVersion": STANDARD_VERSION,
        "voiceProfile": VOICE_PROFILE,
        "playbackProfile": PLAYBACK_PROFILE,
        "counts": dict(sorted(counts.items())),
        "rows": rows,
    }
    target = out / "solution-standard-v2-migration.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print("WROTE", target)

bad_tagged = [r for r in rows if r["state"] == "V2_INVALID"]
if args.enforce_tagged and bad_tagged:
    raise SystemExit(f"V2_TAGGED_INVALID={len(bad_tagged)}")

if args.enforce:
    bad = [r for r in rows if r["state"] != "V2_READY"]
    if bad:
        raise SystemExit(f"V2_ENFORCE_FAIL={len(bad)}")

print("SOLUTION_STANDARD_V2=PASS")
