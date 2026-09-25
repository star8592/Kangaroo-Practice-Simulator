#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "private" / "source-archive" / "cemc" / "raw" / "euclid"
OUT = ROOT / "private" / "source-digitization" / "cemc" / "euclid"
MANIFEST = OUT / "manifest.json"
SUMMARY = ROOT / "private" / "source-registry" / "cemc_euclid_digitization_summary.json"
DPI = 150
SCALE = DPI / 72.0


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def clean_xml(raw: str) -> str:
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", raw)


def locate_sequence(pdf: Path, count: int = 10, min_page: int = 1):
    raw = subprocess.check_output(
        ["pdftotext", "-bbox-layout", str(pdf), "-"],
        text=True,
        errors="ignore",
    )
    root = ET.fromstring(clean_xml(raw))
    ns = {"x": "http://www.w3.org/1999/xhtml"}
    occ = {q: [] for q in range(1, count + 1)}
    page_count = 0
    for page_no, page in enumerate(root.findall(".//x:page", ns), 1):
        page_count = page_no
        for word in page.findall(".//x:word", ns):
            m = re.fullmatch(r"(\d{1,2})\.", (word.text or "").strip())
            if not m:
                continue
            q = int(m.group(1))
            x = float(word.attrib["xMin"])
            y = float(word.attrib["yMin"])
            if 1 <= q <= count and x < 150:
                occ[q].append((page_no, y, x))

    candidates = []
    for first in occ[1]:
        if first[0] < min_page:
            continue
        seq = [first]
        prev = (first[0], first[1])
        ok = True
        for q in range(2, count + 1):
            possible = [x for x in occ[q] if (x[0], x[1]) > prev]
            if not possible:
                ok = False
                break
            nxt = min(possible, key=lambda x: (x[0], x[1]))
            seq.append(nxt)
            prev = (nxt[0], nxt[1])
        if ok:
            candidates.append(seq)

    if not candidates:
        raise RuntimeError(f"{pdf}: cannot locate Q1..Q{count}")

    seq = min(
        candidates,
        key=lambda x: (x[-1][0] - x[0][0], x[0][0], x[0][1]),
    )
    return seq, page_count


def render_pages(pdf: Path, td: Path):
    prefix = td / "page"
    subprocess.run(
        ["pdftoppm", "-png", "-r", str(DPI), str(pdf), str(prefix)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return {
        i + 1: p
        for i, p in enumerate(sorted(td.glob("page-*.png")))
    }


def segment_question(pages, start, end, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    start_page, start_y, _ = start
    end_page, end_y, _ = end
    outputs = []
    cache = {}

    for page_no in range(start_page, end_page + 1):
        im = cache.setdefault(page_no, Image.open(pages[page_no]).convert("RGB"))
        w, h = im.size
        left = int(28 * SCALE)
        right = w - int(24 * SCALE)
        top = int(28 * SCALE)
        bottom = h - int(28 * SCALE)

        if page_no == start_page:
            top = max(0, int((start_y - 10) * SCALE))
        if page_no == end_page:
            bottom = min(bottom, int((end_y - 5) * SCALE))

        if bottom <= top + 20:
            continue
        out = out_dir / f"p{len(outputs) + 1:02}.png"
        im.crop((left, top, right, bottom)).save(out, optimize=True)
        outputs.append(str(out))

    if not outputs:
        raise RuntimeError(f"empty segment {start} -> {end}")
    return outputs


def digitize_pdf(pdf: Path, out_root: Path, min_page: int):
    seq, page_count = locate_sequence(pdf, 10, min_page)
    with tempfile.TemporaryDirectory(prefix="cemc-euclid-") as td_name:
        pages = render_pages(pdf, Path(td_name))
        result = []
        for i, start in enumerate(seq):
            if i + 1 < len(seq):
                end = seq[i + 1]
            else:
                end = (page_count, 10_000.0, 0.0)
            files = segment_question(pages, start, end, out_root / f"q{i + 1:02}")
            result.append(
                {
                    "questionNo": i + 1,
                    "startPage": start[0],
                    "startPdfY": start[1],
                    "imageFiles": files,
                }
            )
    return result


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    records = []
    for year_dir in sorted(RAW.glob("20*")):
        year = int(year_dir.name)
        contest = next(year_dir.glob("*contest.pdf"))
        solution = next(year_dir.glob("*solution.pdf"))
        problem_segments = digitize_pdf(
            contest,
            OUT / str(year) / "problems",
            min_page=2,
        )
        solution_segments = digitize_pdf(
            solution,
            OUT / str(year) / "solutions",
            min_page=1,
        )
        if len(problem_segments) != 10 or len(solution_segments) != 10:
            raise RuntimeError(f"{year}: incomplete Euclid digitization")
        records.append(
            {
                "year": year,
                "competitionId": "cemc-euclid",
                "sourceRegistryId": "cemc-official",
                "contestFile": str(contest),
                "solutionFile": str(solution),
                "contestSha256": sha256(contest),
                "solutionSha256": sha256(solution),
                "license": "CC BY-NC 4.0",
                "attribution": "University of Waterloo Centre for Education in Mathematics and Computing (CEMC)",
                "studentReady": False,
                "deliveryMode": "proof-and-short-answer-source-only",
                "questions": [
                    {
                        "questionNo": q,
                        "problemImages": problem_segments[q - 1]["imageFiles"],
                        "solutionImages": solution_segments[q - 1]["imageFiles"],
                    }
                    for q in range(1, 11)
                ],
            }
        )
        print(f"DIGITIZED Euclid {year} questions=10")

    payload = {
        "generatedAt": "2026-09-25",
        "sourceRegistryId": "cemc-official",
        "competitionId": "cemc-euclid",
        "paperCount": len(records),
        "questionUnits": sum(len(r["questions"]) for r in records),
        "studentReady": False,
        "reason": "Euclid contains proof/full-solution tasks and requires a dedicated response/review mode before student delivery.",
        "records": records,
    }
    MANIFEST.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    summary = {
        "sourceRegistryId": "cemc-official",
        "competitionId": "cemc-euclid",
        "paperCount": payload["paperCount"],
        "questionUnits": payload["questionUnits"],
        "studentReady": False,
        "status": "source-digitized-awaiting-proof-mode-and-localization",
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(
        f"CEMC_EUCLID_DIGITIZATION_OK papers={payload['paperCount']} "
        f"question_units={payload['questionUnits']}"
    )


if __name__ == "__main__":
    main()
