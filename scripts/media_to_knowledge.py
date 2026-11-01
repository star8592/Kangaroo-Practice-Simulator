#!/usr/bin/env python3
"""Local media -> evidence-backed knowledge. No browser or download actions.

Input is a local user-provided/authorized image, directory or video.
Outputs are PRIVATE evidence, OCR transcriptions, and review-required indexes.
No original ownership, redistribution, or official-exam status is inferred.
"""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from PIL import Image, ImageChops, ImageOps, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 45_000_000
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".webm", ".avi", ".m4v"}
MAX_IMAGES = 120
MAX_VIDEO_SECONDS = 60 * 60
MAX_FILE_BYTES = 4 * 1024**3
DEFAULT_MODEL = "qwen3-vl:8b"
OLLAMA_LOCAL_ENDPOINT = "http://127.0.0.1:11534/api/chat"

TRANSCRIPTION_PROMPT = """
请忠实转录这张图片中【实际看得见】的考试/资料文字。请遵循：
1. 保留原文的行序、题号、选项、数学符号、公式和单位；换行组织结构。
2. 数学表达式尽量用 LaTeX（例如 \\\\(\\\\frac{1}{2}\\\\)），不要把负号、根号、指数、分数误认。
3. 无法辨认的部分一律标注[无法辨认]，被遮挡或没有出现的题目不补写。
4. 只做文字转录，不解答、不推算答案、不改写、不编造页号或来源。
5. 不附带模型自信度数字，最终输出纯文本。
""".strip()


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256_file(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as f:
        for part in iter(lambda: f.read(1024 * 1024), b""):
            sha.update(part)
    return sha.hexdigest()


def atom_json(path: Path, obj: dict):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.chmod(0o600)
    os.replace(tmp, path)


def check_local_input(path: Path) -> Path:
    p = path.expanduser().resolve(strict=True)
    if not p.is_file() and not p.is_dir():
        raise ValueError("Input must be a local regular file or image directory")
    if p.is_file() and p.stat().st_size > MAX_FILE_BYTES:
        raise ValueError("Input is larger than bounded local processing limit")
    return p


def source_url(u: str | None) -> str | None:
    if not u:
        return None
    u = u.strip()
    parts = urlsplit(u)
    if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
        raise ValueError("Only public HTTPS source references are accepted")
    # Preserve query keys needed for public identity but do not archive auth/session secrets.
    from urllib.parse import parse_qsl, urlencode, urlunsplit
    sensitive = re.compile(r"token|secret|session|password|authorization|auth_code|access_key|signature|credential", re.I)
    q = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not sensitive.search(k)]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(q), ""))


def unique_images(inp: Path) -> list[Path]:
    if inp.is_file():
        if inp.suffix.lower() not in IMAGE_EXTS:
            raise ValueError("Expected a supported image")
        return [inp]
    files = sorted([p for p in inp.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS])
    if not files or len(files) > MAX_IMAGES:
        raise ValueError(f"Image directory must contain 1..{MAX_IMAGES} supported image files")
    return files


def image_dhash(im: Image.Image) -> int:
    small = ImageOps.grayscale(im).resize((9, 8))
    px = list(small.getdata())
    bits = [px[y * 9 + x] > px[y * 9 + x + 1] for y in range(8) for x in range(8)]
    v = 0
    for b in bits:
        v = (v << 1) | int(b)
    return v


def thumbnail_bytes(im: Image.Image) -> bytes:
    gray = ImageOps.grayscale(im).resize((256, 256))
    return gray.tobytes()


def similar_visual(a: Image.Image, b: Image.Image) -> bool:
    # Never discard a subtly changed math symbol, answer option, or page number.
    # Only exactly identical decoded RGB frames are safe for automatic dedup.
    if a.size != b.size:
        return False
    return ImageChops.difference(a.convert("RGB"), b.convert("RGB")).getbbox() is None


def ffprobe_duration(path: Path) -> float:
    res = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
         "format=duration", "-of", "json", str(path)],
         capture_output=True, text=True, timeout=20, check=True)
    obj = json.loads(res.stdout)
    secs = float(obj["format"]["duration"])
    if not math.isfinite(secs) or not 0 < secs <= MAX_VIDEO_SECONDS:
        raise ValueError(f"Invalid or unsupported video duration: {secs}")
    return secs


def ffmpeg_extract(path: Path, at_seconds: float, dest: Path):
    # Local-only file path, no shell or remote URL; one frame at exact sought time.
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin",
      "-ss", f"{at_seconds:.3f}", "-i", str(path),
      "-map", "0:v:0", "-frames:v", "1", "-y", str(dest)],
      check=True, timeout=35, capture_output=True)
    if not dest.is_file():
        raise ValueError("ffmpeg could not extract a frame")


def choose_video_times(duration: float, every: float, maximum: int) -> list[float]:
    if every < 1.0 or every > 600:
        raise ValueError("frame interval must be 1..600 seconds")
    if maximum < 1 or maximum > MAX_IMAGES:
        raise ValueError("maximum frame sample count must be 1..120")
    total = min(maximum, int(math.ceil(duration / every)))
    if not 1 <= total <= MAX_IMAGES:
        raise ValueError("Invalid bounded frame count")
    return [round(min(i * every, max(0.0, duration - 0.15)), 3) for i in range(total)]


def ollama_ocr(image_path: Path, endpoint: str, model: str, timeout: int) -> str:
    parts = urlsplit(endpoint)
    if parts.scheme != "http" or parts.hostname not in ("127.0.0.1", "localhost"):
        raise ValueError("OCR endpoint must be locally hosted on 127.0.0.1")
    im = Image.open(image_path)
    im.load()
    if im.width < 10 or im.height < 10:
        raise ValueError("Image too small for OCR")
    if im.width > 2200 or im.height > 2200:
        im.thumbnail((2200, 2200))
    buf = io.BytesIO()
    im.convert("RGB").save(buf, "JPEG", quality=91)
    body = {
        "model": model,
        "stream": False,
        "think": False,
        "keep_alive": "0",
        "messages": [{
            "role": "user",
            "content": TRANSCRIPTION_PROMPT,
            "images": [base64.b64encode(buf.getvalue()).decode("ascii")],
        }],
        "options": {"temperature": 0, "num_predict": 1350},
    }
    req = Request(endpoint, data=json.dumps(body).encode("utf-8"),
                  headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(req, timeout=timeout) as res:
        obj = json.load(res)
    text = str(obj.get("message", {}).get("content", "")).strip()
    if not text:
        raise ValueError("OCR model returned empty transcription")
    return text


def rapidocr_ocr(image_path: Path, python_path: Path, timeout: int) -> tuple[str, dict]:
    """Run CPU RapidOCR in its isolated venv; no global Python dependency."""
    python_path=python_path.expanduser().absolute()  # preserve venv python symlink
    if not python_path.is_file():
        raise ValueError("RapidOCR Python executable not found")
    runner=Path(__file__).with_name("rapidocr_infer.py")
    proc=subprocess.run([str(python_path),str(runner),str(image_path)],
         text=True,capture_output=True,timeout=timeout,check=True)
    lines=[line[len("OCR_RESULT_JSON="):] for line in proc.stdout.splitlines()
           if line.startswith("OCR_RESULT_JSON=")]
    if len(lines)!=1:
        raise ValueError("RapidOCR adapter returned invalid response")
    obj=json.loads(lines[0])
    if obj.get("engine")!="rapidocr" or not isinstance(obj.get("lines"),list):
        raise ValueError("Malformed RapidOCR response")
    text="\n".join(str(line) for line in obj["lines"]).strip()
    if not text:
        raise ValueError("RapidOCR detected no text")
    scores=obj.get("scores") or []
    if len(scores)!=len(obj["lines"]):
        raise ValueError("RapidOCR score count disagrees with line count")
    diagnostics={
      "lineCount":len(obj["lines"]),
      "minConfidence":min(scores) if scores else None,
      "meanConfidence":sum(scores)/len(scores) if scores else None,
      "enginePackageVersion":obj["packageVersion"],
      "lineScores":scores,
      "lineBoxes":obj.get("boxes",[])
    }
    return text, diagnostics


def extract_question_candidates(meta: dict, asset: Path) -> list[dict]:
    """Conservative line segmentation only. This does NOT invent a missing question."""
    candidates = []
    start = re.compile(r"^\s*(?:第\s*)?(\d{1,3})\s*(?:题)?\s*[.．、:：)）]\s*(.*)$")
    for item in meta["items"]:
        if item.get("ocrStatus") != "transcribed_needs_review":
            continue
        lines = (asset / item["ocrTextFile"]).read_text(encoding="utf-8").splitlines()
        active = None
        for line in lines:
            match = start.match(line)
            if match:
                if active:
                    active["rawText"] = "\n".join(active["rawText"]).strip()
                    if active["rawText"]:
                        active["unreadable"] = "[无法辨认]" in active["rawText"]
                        candidates.append(active)
                active = {
                    "id": hashlib.sha256((meta["inputSha256"] + item["id"] + str(len(candidates)) + line).encode()).hexdigest()[:20],
                    "questionNumber": match.group(1),
                    "rawText": [line],
                    "sourceItemId": item["id"],
                    "sourceEvidenceSha256": item["sha256"],
                    "videoTimeSeconds": item["timeSeconds"],
                    "verificationStatus": "needs_manual_review",
                    "officialExamStatus": "not_verified",
                    "commercialRedistributionAllowed": False,
                }
            elif active and line.strip():
                active["rawText"].append(line)
        if active:
            active["rawText"] = "\n".join(active["rawText"]).strip()
            if active["rawText"]:
                active["unreadable"] = "[无法辨认]" in active["rawText"]
                candidates.append(active)
    return candidates


def run(args) -> dict:
    input_path = check_local_input(args.input)
    if args.mode == "video" and (not input_path.is_file() or input_path.suffix.lower() not in VIDEO_EXTS):
        raise ValueError("Expected a local video file")
    if args.mode == "image" and input_path.is_file() and input_path.suffix.lower() not in IMAGE_EXTS:
        raise ValueError("Expected image file or image directory")
    src_url = source_url(args.source_url)
    if not args.output_root.is_absolute():
        raise ValueError("output-root must be absolute")
    dest_root = args.output_root.expanduser().resolve()
    repo = Path(__file__).resolve().parents[1]
    if dest_root == repo or (dest_root.is_relative_to(repo) and not dest_root.is_relative_to(repo / "private")):
        raise ValueError("Derivative bytes must not be written into tracked/public repo paths")
    dest_root.mkdir(parents=True, exist_ok=True)
    dest_root.chmod(0o700)
    # Distinguish exact original bytes and normalized derivatives; no publishing.
    original_hash = sha256_file(input_path) if input_path.is_file() else hashlib.sha256(
        ("\n".join(f"{p.name}:{sha256_file(p)}" for p in unique_images(input_path))).encode()
    ).hexdigest()
    engine_tag = ("rapidocr" if args.ocr and args.ocr_backend == "rapidocr"
                  else "ollama-"+hashlib.sha256(args.model.encode("utf-8")).hexdigest()[:12]
                  if args.ocr and args.ocr_backend == "ollama" else "source-only")
    asset = dest_root / engine_tag / original_hash[:2] / original_hash
    asset.mkdir(parents=True, exist_ok=True)
    asset.chmod(0o700)
    frames_dir = asset / "evidence"
    frames_dir.mkdir(exist_ok=True)
    frames_dir.chmod(0o700)
    originals = asset / "original"
    originals.mkdir(exist_ok=True)
    originals.chmod(0o700)
    source_files = unique_images(input_path) if args.mode == "image" else [input_path]
    copies=[]
    for pos, p in enumerate(source_files):
        new = originals / (f"{pos+1:03d}_" + p.name)
        if not new.exists():
            shutil.copyfile(p, new)
            new.chmod(0o600)
        if sha256_file(new) != sha256_file(p):
            raise AssertionError("Original byte copy differs")
        copies.append({"name":new.name, "sha256":sha256_file(p), "bytes":p.stat().st_size})

    entries=[]
    prev_im = None
    prev_id = None
    if args.mode == "video":
        duration=ffprobe_duration(input_path)
        times=choose_video_times(duration, args.every_seconds, args.max_frames)
        for i, t in enumerate(times,1):
            file = frames_dir/f"frame_{i:04d}_{int(t*1000):09d}ms.png"
            if not file.exists():
                ffmpeg_extract(input_path, t, file)
                file.chmod(0o600)
            with Image.open(file) as im:
                im.load()
                image=im.convert("RGB")
            is_dup=prev_im is not None and similar_visual(image, prev_im)
            ent={"id":f"frame-{i:04d}", "timeSeconds":t,
                 "file":file.name, "sha256":sha256_file(file),
                 "bytes":file.stat().st_size,
                 "duplicateOf":prev_id if is_dup else None,
                 "ocrStatus":"skipped_duplicate" if is_dup else "pending"}
            entries.append(ent)
            prev_im=image
            prev_id = (prev_id if is_dup else ent["id"])
    else:
        for i,p in enumerate(source_files,1):
            with Image.open(p) as im:
                im.load()
                image=im.convert("RGB")
                output = frames_dir / f"image_{i:04d}.png"
                if not output.exists():
                    image.save(output, "PNG")
                    output.chmod(0o600)
            is_dup=prev_im is not None and similar_visual(image, prev_im)
            ent={"id":f"image-{i:04d}", "timeSeconds":None,
                 "file":output.name,"sha256":sha256_file(output),
                 "bytes":output.stat().st_size,
                 "duplicateOf":prev_id if is_dup else None,
                 "ocrStatus":"skipped_duplicate" if is_dup else "pending"}
            entries.append(ent)
            prev_im=image
            prev_id=(prev_id if is_dup else ent["id"])
    old = None
    prior_manifest = asset / "manifest.json"
    if prior_manifest.is_file():
        try:
            loaded = json.loads(prior_manifest.read_text(encoding="utf-8"))
            if loaded.get("inputSha256") == original_hash:
                old = {i["id"]: i for i in loaded.get("items", [])}
        except (OSError, ValueError, KeyError):
            old = None
    if old:
        for item in entries:
            before = old.get(item["id"])
            if not before or before.get("sha256") != item["sha256"]:
                continue
            name = before.get("ocrTextFile")
            if before.get("ocrStatus") == "transcribed_needs_review" and name:
                prior_text = asset / name
                if prior_text.is_file() and sha256_file(prior_text) == before.get("transcriptSha256"):
                    item.update(ocrStatus="transcribed_needs_review",
                      ocrTextFile=name, transcriptSha256=before["transcriptSha256"])

    meta={
        "schemaVersion":1, "generatedAt":timestamp(),
        "inputKind":args.mode, "inputSha256":original_hash,
        "sourceUrl":src_url,"sourcePlatform":args.platform,
        "sourceOwnerOrExam":args.source_label or None,
        "rightsStatus":args.rights_status,
        "rightsReviewedForCommercialReuse":False,
        "commercialRedistributionAllowed":False,
        "originalFiles":copies,"frameSampleIntervalSeconds":args.every_seconds if args.mode=="video" else None,
        "frameCount":len(entries),"ocrBackend":args.ocr_backend if args.ocr else None,
        "items":entries,"contentReviewStatus":"pending_human_review",
        "notice":"Private digitalization derivative. OCR text is not evidence of ownership or official original status."
    }
    atom_json(asset/"manifest.json",meta)
    transcripts=[]
    ocr_count=0
    for item in entries:
        if item["duplicateOf"]:
            continue
        if item.get("ocrStatus") == "transcribed_needs_review":
            textfile = asset / item["ocrTextFile"]
            transcripts.append((item, textfile.read_text(encoding="utf-8").strip()))
            continue
        if not args.ocr or ocr_count >= args.max_ocr:
            continue
        file=frames_dir/item["file"]
        try:
            if args.ocr_backend == "rapidocr":
                result, diagnostics = rapidocr_ocr(file, args.rapidocr_python, args.timeout)
                item["ocrDiagnostics"] = diagnostics
                item["needsLowConfidenceReview"] = (
                    diagnostics["minConfidence"] is not None
                    and diagnostics["minConfidence"] < args.confidence_threshold
                )
            elif args.ocr_backend == "ollama":
                result=ollama_ocr(file,args.endpoint,args.model,args.timeout)
                item["needsCompletenessReview"] = True
            else:
                raise ValueError("Unsupported OCR backend")
            textfile=asset/(item["id"]+".txt")
            textfile.write_text(result+"\n",encoding="utf-8")
            textfile.chmod(0o600)
            item.update({"ocrStatus":"transcribed_needs_review", "ocrTextFile":textfile.name,
                         "transcriptSha256":sha256_file(textfile)})
            transcripts.append((item,result))
        except Exception as exc:
            item.update(ocrStatus="ocr_failed",ocrError=f"{type(exc).__name__}: {str(exc)[:250]}")
        ocr_count+=1
        atom_json(asset/"manifest.json",meta)
    if transcripts:
        lines=[
         "# OCR transcription — requires comparison with original frames",
         "",
         f"Original SHA256: {original_hash}",
         "This is a private derivative, not a verified original exam or a grant of resale rights.",
         "",
        ]
        for item, result in transcripts:
            label=f"{item['id']} @ {item['timeSeconds']:.3f}s" if item["timeSeconds"] is not None else item["id"]
            lines += [f"## {label}", "",result,""]
        out=asset/"review-draft.md"
        out.write_text("\n".join(lines),encoding="utf-8")
        out.chmod(0o600)
    candidates = extract_question_candidates(meta, asset)
    # Identical OCR text in different nearby video frames is a possible
    # repeated question, not automatically a second new problem. Keep both
    # source-frame pointers for visual review instead of dropping either.
    seen_text={}
    for candidate in candidates:
        normalized=re.sub(r"\\s+","",candidate["rawText"])
        key=hashlib.sha256((candidate["questionNumber"]+"|"+normalized).encode("utf-8")).hexdigest()
        candidate["ocrTextHash"]=key
        candidate["possibleDuplicateOf"]=seen_text.get(key)
        if key not in seen_text:
            seen_text[key]=candidate["id"]
    out_questions = {
       "schemaVersion":1,
       "generatedAt":timestamp(),
       "sourceSha256":original_hash,
       "purpose":"Unverified OCR question boundaries; review against exact source frame",
       "questions":candidates,
       "reviewRequired":True,
       "commercialRedistributionAllowed":False,
    }
    atom_json(asset/"question-candidates.json", out_questions)
    meta["candidateQuestionCount"] = len(candidates)
    atom_json(asset/"manifest.json",meta)
    print(json.dumps({
       "candidateQuestions":len(candidates),
       "possibleDuplicateQuestions":sum(x["possibleDuplicateOf"] is not None for x in candidates),
       "status":"private_derivatives_created","assetPath":str(asset),
       "originalSha256":original_hash,"sampleCount":len(entries),
       "distinctScreens":sum(1 for e in entries if not e["duplicateOf"]),
       "ocrSucceeded":sum(e["ocrStatus"]=="transcribed_needs_review" for e in entries),
       "ocrFailed":sum(e["ocrStatus"]=="ocr_failed" for e in entries),
       "ocrPending":sum(e["ocrStatus"]=="pending" for e in entries),
       "rightsStatus":meta["rightsStatus"],"commercialRedistributionAllowed":False,
       "humanReviewRequired":True
    },ensure_ascii=False))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode",choices=["image","video"],help="Type of local input")
    parser.add_argument("input",type=Path,help="Local image/image folder or local video")
    parser.add_argument("--output-root",type=Path,default=Path(os.environ.get("SOCTHINK_DERIVED_ARCHIVE_DIR",
        "/mnt/disk1/Code/Kangaroo-Practice-Simulator/private/derived-knowledge")))
    parser.add_argument("--platform",default="user_supplied")
    parser.add_argument("--source-url",default=None)
    parser.add_argument("--source-label",default=None)
    parser.add_argument("--rights-status",choices=["user_owned","licensed","public_domain","unknown"],default="unknown")
    parser.add_argument("--every-seconds",type=float,default=5.0)
    parser.add_argument("--max-frames",type=int,default=36)
    parser.add_argument("--ocr",action="store_true")
    parser.add_argument("--ocr-backend",choices=["rapidocr","ollama"],default="rapidocr")
    parser.add_argument("--rapidocr-python",type=Path,default=Path(os.environ.get(
       "SOCTHINK_RAPIDOCR_PYTHON",
       "/mnt/disk1/Code/Kangaroo-Practice-Simulator/private/ocr-eval-runtime-20261031/bin/python")))
    parser.add_argument("--confidence-threshold",type=float,default=0.86)
    parser.add_argument("--endpoint",default=OLLAMA_LOCAL_ENDPOINT)
    parser.add_argument("--model",default=DEFAULT_MODEL)
    parser.add_argument("--timeout",type=int,default=160)
    parser.add_argument("--max-ocr",type=int,default=15)
    args=parser.parse_args()
    if args.max_frames<1 or args.max_frames>MAX_IMAGES or args.max_ocr<1 or args.max_ocr>MAX_IMAGES:
        parser.error("max-frames/max-ocr must be 1..120")
    if not 0 < args.confidence_threshold < 1:
        parser.error("confidence-threshold must be between 0 and 1")
    if args.timeout<10 or args.timeout>600:
        parser.error("OCR timeout must be 10..600 seconds")
    run(args)


if __name__=="__main__":
    main()
