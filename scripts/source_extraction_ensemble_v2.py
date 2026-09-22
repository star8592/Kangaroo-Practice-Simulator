#!/usr/bin/env python3
"""Source Extraction Ensemble v2.

Purpose:
- Preserve digital-native evidence before OCR.
- Run multiple independent extraction views for the same question.
- Record hashes, structured math-sensitive fields, and disagreements.
- Never promote a record to SOURCE_VERIFIED by itself; this produces evidence for Stage 1.

Current engines:
1. Poppler layout text
2. Poppler raw text
3. Poppler bbox word stream filtered to the question crop
4. Optional MinerU 4.x on the frozen question crop

Optional engines can be added without changing the evidence contract.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import os
import re
import shutil
import subprocess
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path


UNIT_RE = re.compile(
    r"(?<!\w)(?:mm|cm|dm|m|km|mg|g|kg|ml|mL|l|L|s|sec|seconds?|min|minutes?|h|hours?|"
    r"€|euro|euros|cêntimos?|centimos?|%|°)(?!\w)",
    re.I,
)
NUMBER_RE = re.compile(r"(?<!\w)[+-]?\d+(?:[.,]\d+)?(?:\s*%)?")
OP_RE = re.compile(r"[+×÷*/=<>≤≥≈≠√∠%^]|(?<![A-Za-zÀ-ÖØ-öø-ÿ])-(?![A-Za-zÀ-ÖØ-öø-ÿ])")
FRACTION_RE = re.compile(r"(?<!\w)(?:\([^()]+\)|[A-Za-z0-9]+)\s*/\s*(?:\([^()]+\)|[A-Za-z0-9]+)")
POWER_RE = re.compile(r"(?:[A-Za-z0-9)]+)\s*(?:\^|[²³⁴⁵⁶⁷⁸⁹])\s*\d*")
CHOICE_RE = re.compile(r"(?<!\w)\(?([ABCDE])\)\s*")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def norm_text(s: str) -> str:
    s = unicodedata.normalize("NFKC", s or "")
    for ch in ("−", "–", "—", "‐", "‑", "‒"):
        s = s.replace(ch, "-")
    s = s.replace("\x0c", " ")
    return re.sub(r"\s+", " ", s).strip()


def token_stream(s: str) -> list[str]:
    return re.findall(
        r"[A-Za-zÀ-ÖØ-öø-ÿ]+|\d+(?:[.,]\d+)?|[^\w\s]",
        norm_text(s),
        flags=re.UNICODE,
    )


def normalize_math_markup(s: str) -> str:
    t = norm_text(s)
    t = t.replace("$", "")
    t = re.sub(r"\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}", r"(\1)/(\2)", t)
    t = re.sub(r"\^\s*\{([^{}]+)\}", r"^\1", t)
    t = t.replace(r"\times", "×").replace(r"\div", "÷").replace(r"\cdot", "·")
    return norm_text(t)




def isolate_question_text(s: str, question_no: int) -> str:
    """Trim deterministic page/crop contamination before engine comparison.

    Raw engine output is preserved separately.  This view only removes content
    before this question marker, the following question, and known page
    footer/section text.
    """
    t = norm_text(s)
    start_re = re.compile(r"(?<!\d)0*" + re.escape(str(question_no)) + r"\s*[.\)\-:]\s*")
    m = start_re.search(t)
    if m:
        t = t[m.start():]
    next_re = re.compile(
        r"(?<!\d)0*" + re.escape(str(question_no + 1)) +
        r"\s*[.\)]\s+(?=[A-ZÀ-ÖØ-Þ])"
    )
    m = next_re.search(t, 1)
    if m:
        t = t[:m.start()]
    footer_patterns = [
        r"\s+SPM[- ]?Centro\b.*$",
        r"\s+Departamento de Matem[aá]tica\b.*$",
        r"\s+Todos os direitos\b.*$",
        r"\s+Canguru Matem[aá]tico\b.*$",
        r"\s+(?:Problemas?|Quest[oõ]es?)\s+de\s+[345]\s+pontos(?:\s+\d+)?\s*$",
    ]
    for pat in footer_patterns:
        t = re.sub(pat, "", t, flags=re.I)
    return norm_text(t)

def structured_fields(s: str) -> dict:
    t = normalize_math_markup(s)
    marks = list(CHOICE_RE.finditer(t))
    choices = {}
    if [m.group(1) for m in marks] == list("ABCDE"):
        for i, m in enumerate(marks):
            end = marks[i + 1].start() if i + 1 < len(marks) else len(t)
            choices[m.group(1)] = t[m.end():end].strip()
    return {
        "numbers": NUMBER_RE.findall(t),
        "operators": OP_RE.findall(t),
        "fractions": [norm_text(x) for x in FRACTION_RE.findall(t)],
        "powers": [norm_text(x) for x in POWER_RE.findall(t)],
        "units": UNIT_RE.findall(t),
        "choices": choices,
    }


def run(cmd: list[str], *, timeout: int = 180) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, timeout=timeout)


def crop_text(pdf: Path, page: int, crop: list[float], mode: str) -> str:
    x0, y0, x1, y1 = [float(v) for v in crop]
    mode_arg = "-layout" if mode == "layout" else "-raw"
    cmd = [
        "pdftotext", mode_arg,
        "-f", str(page), "-l", str(page), "-r", "72",
        "-x", str(max(0, math.floor(x0))),
        "-y", str(max(0, math.floor(y0))),
        "-W", str(max(1, math.ceil(x1) - math.floor(x0))),
        "-H", str(max(1, math.ceil(y1) - math.floor(y0))),
        str(pdf), "-",
    ]
    return norm_text(run(cmd).stdout.decode(errors="ignore"))


def bbox_words(pdf: Path, page: int, crop: list[float]) -> tuple[str, list[dict]]:
    proc = run(["pdftotext", "-bbox-layout", "-f", str(page), "-l", str(page), str(pdf), "-"])
    xml = proc.stdout.decode(errors="ignore")
    root = ET.fromstring(xml)
    x0, y0, x1, y1 = [float(v) for v in crop]
    words = []
    for el in root.iter():
        if not el.tag.endswith("word"):
            continue
        try:
            wx0 = float(el.attrib["xMin"])
            wy0 = float(el.attrib["yMin"])
            wx1 = float(el.attrib["xMax"])
            wy1 = float(el.attrib["yMax"])
        except Exception:
            continue
        cx = (wx0 + wx1) / 2
        cy = (wy0 + wy1) / 2
        if x0 <= cx <= x1 and y0 <= cy <= y1:
            txt = html.unescape("".join(el.itertext())).strip()
            if txt:
                words.append({"text": txt, "bbox": [wx0, wy0, wx1, wy1]})
    # bbox traversal is in document order; preserve that evidence separately.
    return norm_text(" ".join(w["text"] for w in words)), words


def bbox_geometry_text(words: list[dict], crop: list[float]) -> str:
    """Rebuild reading order and explicit superscripts from native PDF word geometry."""
    usable=[]
    for w in words:
        x0,y0,x1,y1=[float(v) for v in w["bbox"]]
        width=max(0.1,x1-x0);height=max(0.1,y1-y0)
        # Portugal papers carry vertical copyright text on the extreme left edge.
        # Do not use aspect ratio alone: ordinary variables such as b are also tall/narrow.
        edge=float(crop[0]) + min(20.0, 0.04 * max(1.0, float(crop[2])-float(crop[0])))
        if x0 < edge:
            continue
        usable.append({**w,"x0":x0,"y0":y0,"x1":x1,"y1":y1,"h":height,"cy":(y0+y1)/2})
    if not usable:
        return ""
    heights=sorted(x["h"] for x in usable)
    median_h=heights[len(heights)//2]
    base=[x for x in usable if x["h"] >= 0.82*median_h]
    lines=[]
    for item in sorted(base,key=lambda z:(z["cy"],z["x0"])):
        target=None
        for line in lines:
            if abs(item["cy"]-line["cy"]) <= 0.55*median_h:
                target=line;break
        if target is None:
            lines.append({"cy":item["cy"],"items":[]})
            target=lines[-1]
        target["items"].append(item)
        target["cy"]=sum(x["cy"] for x in target["items"])/len(target["items"])
    # Attach smaller glyphs (typically superscripts) to the nearest base line.
    small=[x for x in usable if x not in base]
    for item in small:
        line=min(lines,key=lambda z:abs(item["cy"]-z["cy"]))
        line["items"].append(item)
    out_lines=[]
    for line in sorted(lines,key=lambda z:z["cy"]):
        items=sorted(line["items"],key=lambda z:z["x0"])
        base_items=[x for x in items if x["h"] >= 0.82*median_h]
        baseline=sorted(x["y1"] for x in base_items)[len(base_items)//2] if base_items else max(x["y1"] for x in items)
        pieces=[]; prev=None
        for item in items:
            raised=(item["h"] < 0.82*median_h and item["y1"] < baseline-0.18*median_h)
            close=prev is not None and item["x0"]-prev["x1"] <= 0.75*median_h
            if raised and close and pieces:
                pieces[-1]=pieces[-1]+"^"+item["text"]
            else:
                pieces.append(item["text"])
            prev=item
        out_lines.append(" ".join(pieces))
    return norm_text(" ".join(out_lines))


def render_question_crop(pdf: Path, page: int, crop: list[float], out: Path, dpi: int) -> dict:
    out.parent.mkdir(parents=True, exist_ok=True)
    page_png = out.with_name("page.png")
    prefix = page_png.with_suffix("")
    run([
        "pdftocairo", "-png", "-singlefile", "-r", str(dpi),
        "-f", str(page), "-l", str(page), str(pdf), str(prefix)
    ], timeout=300)
    scale = dpi / 72.0
    x0, y0, x1, y1 = [float(v) for v in crop]
    w = max(1, round((x1 - x0) * scale))
    h = max(1, round((y1 - y0) * scale))
    x = max(0, round(x0 * scale))
    y = max(0, round(y0 * scale))
    if shutil.which("convert"):
        subprocess.run(
            ["convert", str(page_png), "-crop", f"{w}x{h}+{x}+{y}", "+repage", str(out)],
            check=True,
        )
    elif shutil.which("magick"):
        subprocess.run(
            ["magick", str(page_png), "-crop", f"{w}x{h}+{x}+{y}", "+repage", str(out)],
            check=True,
        )
    else:
        raise RuntimeError("ImageMagick convert/magick is required for crop materialization")
    return {
        "pagePath": str(page_png),
        "pageSha256": sha256_file(page_png),
        "questionCropPath": str(out),
        "questionCropSha256": sha256_file(out),
        "dpi": dpi,
    }


def pdf_image_inventory(pdf: Path, page: int) -> str:
    try:
        return run(["pdfimages", "-f", str(page), "-l", str(page), "-list", str(pdf)], timeout=60).stdout.decode(errors="ignore")
    except Exception as e:
        return f"ERROR: {e}"


def run_mineru(crop: Path, out_dir: Path, mineru_cmd: str, tier: str) -> dict:
    exe = Path(mineru_cmd)
    resolved = str(exe) if exe.exists() else shutil.which(mineru_cmd)
    if not resolved:
        return {"status": "UNAVAILABLE", "command": mineru_cmd}
    out_dir.mkdir(parents=True, exist_ok=True)
    # MinerU 4.x mineru-kit writes output files into a directory. OCR mode is
    # forced because this engine is intentionally independent of PDF text.
    cmd = [resolved, "parse", str(crop), "-o", str(out_dir), "-f", "markdown",
           "--tier", tier, "--ocr-mode", "ocr"]
    try:
        p = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=1200)
        mds = sorted(out_dir.glob("*.md"))
        text = mds[0].read_text(errors="ignore") if mds else p.stdout
        return {
            "status": "OK",
            "text": norm_text(text),
            "path": str(mds[0]) if mds else None,
            "command": cmd,
            "stderrTail": p.stderr[-1000:],
        }
    except Exception as e:
        return {"status": "FAILED", "error": str(e)[:1000], "command": cmd}


def start_paddleocr_worker(root: Path, python_cmd: str, lang: str, device: str):
    py = Path(python_cmd)
    resolved = str(py) if py.exists() else shutil.which(python_cmd)
    if not resolved:
        raise FileNotFoundError(f"PaddleOCR Python not found: {python_cmd}")
    runner = root / "scripts/run_paddleocr_engine.py"
    cmd = [resolved, str(runner), "--lang", lang, "--device", device, "--server"]
    proc = subprocess.Popen(
        cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, bufsize=1,
    )
    return proc, cmd


def run_paddleocr_worker(worker, crop: Path, command: list[str]) -> dict:
    if worker.poll() is not None:
        return {"status": "FAILED", "error": f"PaddleOCR worker exited {worker.returncode}", "command": command}
    try:
        worker.stdin.write(str(crop) + "\n")
        worker.stdin.flush()
        while True:
            line = worker.stdout.readline()
            if not line:
                raise RuntimeError("PaddleOCR worker closed stdout")
            if not line.startswith("@@PADDLE@@"):
                continue
            payload = json.loads(line[len("@@PADDLE@@"):])
            payload["command"] = command
            if payload.get("text"):
                payload["text"] = norm_text(payload["text"])
            return payload
    except Exception as e:
        return {"status": "FAILED", "error": str(e)[:1000], "command": command}


def compare_engines(engine_texts: dict[str, str]) -> dict:
    names = [k for k, v in engine_texts.items() if norm_text(v)]
    pairs = []
    exact_pairs = 0
    token_pairs = 0
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            na, nb = norm_text(engine_texts[a]), norm_text(engine_texts[b])
            exact = na == nb
            tok = token_stream(na) == token_stream(nb)
            if exact:
                exact_pairs += 1
            if tok:
                token_pairs += 1
            fa, fb = structured_fields(na), structured_fields(nb)
            numbers_equal = Counter(fa["numbers"]) == Counter(fb["numbers"])
            operators_equal = fa["operators"] == fb["operators"]
            fractions_equal = fa["fractions"] == fb["fractions"]
            powers_equal = fa["powers"] == fb["powers"]
            units_equal = Counter(x.lower() for x in fa["units"]) == Counter(x.lower() for x in fb["units"])
            ca = {k: re.sub(r"\s+", "", normalize_math_markup(v)) for k,v in fa["choices"].items()}
            cb = {k: re.sub(r"\s+", "", normalize_math_markup(v)) for k,v in fb["choices"].items()}
            choices_equal = ca == cb and bool(ca)
            field_consensus = all((numbers_equal, operators_equal, fractions_equal, powers_equal, units_equal, choices_equal))
            pairs.append({
                "a": a, "b": b, "exactText": exact, "exactTokens": tok,
                "numbersEqual": numbers_equal, "operatorsEqual": operators_equal,
                "fractionsEqual": fractions_equal, "powersEqual": powers_equal,
                "unitsEqual": units_equal, "choicesEqual": choices_equal,
                "criticalFieldsEqual": field_consensus,
            })
    status = "INSUFFICIENT_ENGINES"
    ocr_names = {"mineru", "paddleocr"}
    independent_text_consensus = any(
        p["exactTokens"] and ((p["a"] in ocr_names) != (p["b"] in ocr_names))
        for p in pairs
    )
    independent_field_consensus = any(
        p["criticalFieldsEqual"] and ((p["a"] in ocr_names) != (p["b"] in ocr_names))
        for p in pairs
    )
    ocr_only_text_consensus = any(
        p["exactTokens"] and p["a"] in ocr_names and p["b"] in ocr_names
        for p in pairs
    )
    native_only_text_consensus = any(
        p["exactTokens"] and p["a"] not in ocr_names and p["b"] not in ocr_names
        for p in pairs
    )
    if independent_text_consensus:
        status = "OCR_NATIVE_TEXT_CONSENSUS"
    elif independent_field_consensus:
        status = "FIELD_CONSENSUS_NATIVE_OCR"
    elif ocr_only_text_consensus:
        status = "OCR_ONLY_TEXT_CONSENSUS"
    elif native_only_text_consensus:
        status = "NATIVE_ONLY_TEXT_CONSENSUS"
    elif len(names) >= 2:
        status = "ENGINE_CONFLICT"
    return {
        "status": status,
        "engines": names,
        "pairComparisons": pairs,
        "exactTextPairs": exact_pairs,
        "exactTokenPairs": token_pairs,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--exam-id")
    ap.add_argument("--exam-prefix")
    ap.add_argument("--source-origin")
    ap.add_argument("--question-no", type=int)
    ap.add_argument("--limit", type=int, default=1)
    ap.add_argument("--only-unverified", action="store_true")
    ap.add_argument("--force", action="store_true", help="reprocess records already present in the ensemble index")
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--mineru", action="store_true")
    ap.add_argument("--mineru-cmd", default=os.environ.get("MINERU_CMD", "mineru-kit"))
    ap.add_argument("--mineru-tier", default="standard")
    ap.add_argument("--paddleocr", action="store_true")
    ap.add_argument("--paddle-python", default=os.environ.get("PADDLEOCR_PYTHON", "/mnt/disk1/Tools/ocr/paddleocr-vl/.venv/bin/python"))
    ap.add_argument("--paddle-lang", default="pt")
    ap.add_argument("--paddle-device", default="cpu")
    args = ap.parse_args()
    root = args.root.resolve()

    jobs = json.loads((root / "private/translation/queue.enriched.json").read_text())["jobs"]
    audit_path = root / "private/source-digitization/audit.json"
    audit = json.loads(audit_path.read_text())["questions"] if audit_path.exists() else []
    status = {(q["examId"], q["questionNo"]): q["status"] for q in audit}
    index = root / "private/source-extraction-v2/index.json"
    existing = json.loads(index.read_text()) if index.exists() else {"questions": []}
    already_processed = {(q["examId"], q["questionNo"]) for q in existing.get("questions", [])}

    targets = []
    for j in jobs:
        key = (j["examId"], j["questionNo"])
        if args.exam_id and j["examId"] != args.exam_id:
            continue
        if args.exam_prefix and not j["examId"].startswith(args.exam_prefix):
            continue
        if args.source_origin and j.get("sourceTextOrigin") != args.source_origin:
            continue
        if args.question_no is not None and j["questionNo"] != args.question_no:
            continue
        if args.only_unverified and status.get(key) == "SOURCE_VERIFIED":
            continue
        if args.only_unverified and not args.force and key in already_processed:
            continue
        ep = root / "private/exams" / f"{j['examId']}.json"
        if not ep.exists():
            continue
        targets.append((j, ep))
        if len(targets) >= args.limit:
            break

    paddle_worker = None
    paddle_command = None
    paddle_start_error = None
    if args.paddleocr:
        try:
            paddle_worker, paddle_command = start_paddleocr_worker(
                root, args.paddle_python, args.paddle_lang, args.paddle_device
            )
        except Exception as e:
            paddle_start_error = f"{type(e).__name__}: {e}"

    results = []
    for j, ep in targets:
        exam = json.loads(ep.read_text())
        q = next((x for x in exam["questions"] if x["questionNo"] == j["questionNo"]), None)
        if not q:
            continue
        meta = q.get("sourceMeta") or {}
        src = Path(q.get("sourceFile") or j.get("sourceFile") or "")
        page = meta.get("page")
        crop = meta.get("crop")
        rec = {
            "examId": j["examId"],
            "questionNo": j["questionNo"],
            "sourceFile": str(src),
            "sourceExists": src.exists(),
            "sourceSha256": sha256_file(src) if src.exists() else None,
            "page": page,
            "crop": crop,
            "engines": {},
            "stage1StatusBefore": status.get((j["examId"], j["questionNo"])),
        }
        out_dir = root / "private/source-extraction-v2" / j["examId"] / f"q{j['questionNo']:02d}"
        out_dir.mkdir(parents=True, exist_ok=True)

        if src.exists() and src.suffix.lower() == ".pdf" and isinstance(page, int) and isinstance(crop, list) and len(crop) == 4:
            try:
                layout = crop_text(src, page, crop, "layout")
                raw = crop_text(src, page, crop, "raw")
                bbox, words = bbox_words(src, page, crop)
                rec["engines"]["poppler_layout"] = {"status": "OK", "text": layout, "fields": structured_fields(layout)}
                rec["engines"]["poppler_raw"] = {"status": "OK", "text": raw, "fields": structured_fields(raw)}
                rec["engines"]["poppler_bbox"] = {"status": "OK", "text": bbox, "fields": structured_fields(bbox), "wordCount": len(words)}
                geometry = bbox_geometry_text(words, crop)
                rec["engines"]["poppler_bbox_geometry"] = {"status": "OK", "text": geometry, "fields": structured_fields(geometry), "wordCount": len(words)}
                (out_dir / "bbox-words.json").write_text(json.dumps(words, ensure_ascii=False, indent=2))
                evidence = render_question_crop(src, page, crop, out_dir / "question.png", args.dpi)
                # Store repo-relative paths when possible.
                for k in ("pagePath", "questionCropPath"):
                    p = Path(evidence[k])
                    try:
                        evidence[k] = str(p.relative_to(root))
                    except ValueError:
                        pass
                rec["evidence"] = evidence
                (out_dir / "pdfimages-list.txt").write_text(pdf_image_inventory(src, page))
                if args.mineru:
                    m = run_mineru(root / evidence["questionCropPath"], out_dir / "mineru", args.mineru_cmd, args.mineru_tier)
                    if m.get("text"):
                        m["fields"] = structured_fields(m["text"])
                    rec["engines"]["mineru"] = m
                if args.paddleocr:
                    if paddle_worker is not None:
                        po = run_paddleocr_worker(
                            paddle_worker, root / evidence["questionCropPath"], paddle_command
                        )
                    else:
                        po = {"status": "UNAVAILABLE", "error": paddle_start_error}
                    if po.get("text"):
                        po["fields"] = structured_fields(po["text"])
                    rec["engines"]["paddleocr"] = po
            except Exception as e:
                rec["nativeError"] = f"{type(e).__name__}: {e}"
        else:
            rec["nativeError"] = "PDF page/crop metadata unavailable"

        texts = {}
        for name, e in rec["engines"].items():
            if e.get("status") != "OK":
                continue
            comparison = isolate_question_text(e.get("text", ""), j["questionNo"])
            e["comparisonText"] = comparison
            e["comparisonFields"] = structured_fields(comparison)
            texts[name] = comparison
        rec["consensus"] = compare_engines(texts)
        rec["promotion"] = "EVIDENCE_ONLY_NOT_SOURCE_VERIFIED"
        manifest = out_dir / "manifest.json"
        manifest.write_text(json.dumps(rec, ensure_ascii=False, indent=2))
        results.append(rec)

    if paddle_worker is not None:
        try:
            paddle_worker.stdin.close()
            paddle_worker.terminate()
            paddle_worker.wait(timeout=10)
        except Exception:
            paddle_worker.kill()

    bykey = {(q["examId"], q["questionNo"]): q for q in existing.get("questions", [])}
    for r in results:
        bykey[(r["examId"], r["questionNo"])] = {
            "examId": r["examId"],
            "questionNo": r["questionNo"],
            "consensus": r.get("consensus", {}).get("status"),
            "stage1StatusBefore": r.get("stage1StatusBefore"),
            "engines": list(r.get("engines", {})),
        }
    existing["questions"] = [bykey[k] for k in sorted(bykey)]
    index.parent.mkdir(parents=True, exist_ok=True)
    index.write_text(json.dumps(existing, ensure_ascii=False, indent=2))
    print(json.dumps({
        "processed": len(results),
        "consensus": dict(Counter(r["consensus"]["status"] for r in results)),
        "output": str(index),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
