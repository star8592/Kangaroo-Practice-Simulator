#!/usr/bin/env python3
"""Promote only low-risk Source Extraction Ensemble v2 records.

This verifier is intentionally conservative.  It requires exact token agreement
between an OCR engine and an independent native-PDF engine, intact A-E choices,
frozen source/page/crop hashes, and rejects visual/formula-sensitive questions.
"""
import argparse
import glob
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

OCR_ENGINES = {"mineru", "paddleocr"}
VISUAL_RISK = re.compile(
    r"\b(figura|figuras|imagem|imagens|desenho|desenhos|diagrama|gr[aá]fico|"
    r"tabela|tabuleiro|mapa|alvo|mosaico|mosaicos|cubo|cubos|quadrado|"
    r"tri[aâ]ngulo|circunfer[eê]ncia|rel[oó]gio|grelha|sombread[oa])\b",
    re.I,
)
MATH_RISK = re.compile(
    r"[=×÷√∑∏∠\^²³⁴⁵⁶⁷⁸⁹]|\\frac|\\sqrt|"
    r"\([A-Za-z]\s*[+\-*/]\s*[A-Za-z]\)\s*\d|"
    r"\b[A-Za-z]\d{1,4}\b|"
    r"\b(equa[cç][aã]o|fun[cç][aã]o|pot[eê]ncia|expoente|raiz|"
    r"[aâ]ngulo|[aá]rea|per[ií]metro|coordenadas?|polin[oó]mio)\b",
    re.I,
)
CHOICE_RE = re.compile(r"(?<!\w)\(?([ABCDE])\)\s*")
QUESTION_RE_TPL = r"(?<!\d)0*%d\s*[.\)\-:]\s*"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_question(text: str, qno: int):
    qm = re.search(QUESTION_RE_TPL % qno, text)
    body = text[qm.end():] if qm else text
    marks = list(CHOICE_RE.finditer(body))
    if [m.group(1) for m in marks] != list("ABCDE"):
        return None
    stem = body[:marks[0].start()].strip()
    choices = []
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(body)
        label = body[m.end():end].strip()
        choices.append({"key": "ABCDE"[i], "label": label})
    if not stem or any(not c["label"] for c in choices):
        return None
    return stem, choices

def evidence_ok(root: Path, d: dict):
    src = Path(d.get("sourceFile", ""))
    ev = d.get("evidence") or {}
    checks = [
        (src, d.get("sourceSha256")),
        (root / ev.get("pagePath", ""), ev.get("pageSha256")),
        (root / ev.get("questionCropPath", ""), ev.get("questionCropSha256")),
    ]
    for path, expected in checks:
        if not expected or not path.exists() or sha(path) != expected:
            return False
    return True


def choose_native_text(d: dict):
    pairs = d.get("consensus", {}).get("pairComparisons", [])
    engines = d.get("engines", {})
    preferred = ["poppler_layout", "poppler_raw", "poppler_bbox_geometry", "poppler_bbox"]
    candidates = []
    for p in pairs:
        if not p.get("exactTokens"):
            continue
        a, b = p["a"], p["b"]
        if (a in OCR_ENGINES) == (b in OCR_ENGINES):
            continue
        native = b if a in OCR_ENGINES else a
        if native in preferred:
            candidates.append(native)
    if not candidates:
        return None, None
    native = min(candidates, key=preferred.index)
    e = engines.get(native, {})
    return native, e.get("comparisonText") or e.get("text")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = ap.parse_args()
    root = args.root.resolve()
    verified, rejected = [], []

    for fn in glob.glob(str(root / "private/source-extraction-v2/*/q*/manifest.json")):
        d = json.loads(Path(fn).read_text())
        key = (d.get("examId"), d.get("questionNo"))
        if d.get("stage1StatusBefore") != "NEEDS_SOURCE_REVIEW":
            continue
        if d.get("consensus", {}).get("status") != "OCR_NATIVE_TEXT_CONSENSUS":
            rejected.append((key, "no_ocr_native_text_consensus"))
            continue
        native, text = choose_native_text(d)
        if not text:
            rejected.append((key, "no_native_agreeing_text"))
            continue
        parsed = parse_question(text, int(d["questionNo"]))
        if not parsed:
            rejected.append((key, "question_or_choices_not_structured"))
            continue
        stem, choices = parsed
        whole = stem + " " + " ".join(c["label"] for c in choices)
        if VISUAL_RISK.search(whole):
            rejected.append((key, "visual_sensitive"))
            continue
        if MATH_RISK.search(whole):
            rejected.append((key, "formula_sensitive"))
            continue
        if "![](" in whole or "base64," in whole:
            rejected.append((key, "embedded_image_markup"))
            continue
        if not evidence_ok(root, d):
            rejected.append((key, "evidence_hash_changed"))
            continue

        ev = d["evidence"]
        verified.append({
            "examId": d["examId"],
            "questionNo": d["questionNo"],
            "sourceLanguage": "pt",
            "sourceText": stem,
            "choices": choices,
            "sourceFile": d["sourceFile"],
            "sourceSha256": d["sourceSha256"],
            "page": d["page"],
            "crop": d["crop"],
            "pageEvidence": {
                "path": ev["pagePath"],
                "sha256": ev["pageSha256"],
                "dpi": ev["dpi"],
            },
            "questionEvidence": {
                "path": ev["questionCropPath"],
                "sha256": ev["questionCropSha256"],
                "dpi": ev["dpi"],
            },
            "nativeEngine": native,
            "verificationStatus": "SOURCE_VERIFIED",
            "verificationMethod": "ocr_native_exact_token_consensus_low_risk_v2",
        })

    out = root / "private/source-digitization/verified-source-ensemble-v2.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({
        "questions": sorted(verified, key=lambda x: (x["examId"], x["questionNo"])),
        "rejected": [
            {"examId": k[0], "questionNo": k[1], "reason": reason}
            for k, reason in rejected
        ],
    }, ensure_ascii=False, indent=2))
    print(json.dumps({
        "verified": len(verified),
        "rejected": len(rejected),
        "reasons": dict(Counter(reason for _, reason in rejected)),
        "output": str(out),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
