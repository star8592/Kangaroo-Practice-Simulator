#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LIBRARY = ROOT / "private" / "source-archive" / "cemc"
SUMMARY = ROOT / "private" / "source-registry" / "cemc_collection_summary.json"
BASE = "https://cemc.uwaterloo.ca"
CATEGORIES = {
    13: {"Gauss"},
    14: {"Pascal", "Cayley", "Fermat"},
    24: {"Euclid"},
}

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def get_pdf_href(cell) -> str | None:
    for a in cell.find_all("a", href=True):
        href = a["href"]
        if ".pdf" in href.lower():
            return urljoin(BASE, href)
    return None

def download(session: requests.Session, url: str, path: Path) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.stat().st_size == 0:
        with session.get(url, timeout=60, stream=True) as r:
            r.raise_for_status()
            tmp = path.with_suffix(path.suffix + ".part")
            with tmp.open("wb") as f:
                for chunk in r.iter_content(1024 * 256):
                    if chunk:
                        f.write(chunk)
            tmp.replace(path)
    return {"path": str(path), "bytes": path.stat().st_size, "sha256": sha256(path)}

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--library", default=str(DEFAULT_LIBRARY))
    ap.add_argument("--start-year", type=int, default=2017)
    ap.add_argument("--end-year", type=int, default=2026)
    ap.add_argument("--proxy", default=os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy"))
    args = ap.parse_args()

    library = Path(args.library)
    raw = library / "raw"
    session = requests.Session()
    session.headers["User-Agent"] = "MathCompetitionLab educational archive collector/1.0"
    if args.proxy:
        session.proxies.update({"http": args.proxy, "https": args.proxy})

    records = []
    seen = set()
    for category, wanted in CATEGORIES.items():
        for page in range(0, 6):
            page_url = f"{BASE}/resources/past-contests?contest_category={category}&page={page}"
            html = session.get(page_url, timeout=60)
            html.raise_for_status()
            soup = BeautifulSoup(html.text, "html.parser")
            found_on_page = 0
            for tr in soup.find_all("tr"):
                cells = tr.find_all("td")
                if len(cells) < 6:
                    continue
                title = cells[1].get_text(" ", strip=True)
                year_text = cells[2].get_text(" ", strip=True)
                grade = cells[3].get_text(" ", strip=True)
                if title not in wanted or not re.fullmatch(r"20\d{2}", year_text):
                    continue
                year = int(year_text)
                if not args.start_year <= year <= args.end_year:
                    continue
                key = (title, year, grade)
                if key in seen:
                    continue
                contest_url = get_pdf_href(cells[4])
                solution_url = get_pdf_href(cells[5])
                if not contest_url or not solution_url:
                    continue
                seen.add(key)
                found_on_page += 1

                slug = title.lower()
                suffix = f"-grade-{grade.replace('/', '-')}" if title == "Gauss" else ""
                out_dir = raw / slug / str(year)
                contest_path = out_dir / f"{slug}-{year}{suffix}-contest.pdf"
                solution_path = out_dir / f"{slug}-{year}{suffix}-solution.pdf"

                contest_file = download(session, contest_url, contest_path)
                solution_file = download(session, solution_url, solution_path)
                records.append({
                    "sourceRegistryId": "cemc-official",
                    "competition": title,
                    "competitionId": f"cemc-{slug}",
                    "year": year,
                    "grade": grade,
                    "sourcePage": page_url,
                    "contestUrl": contest_url,
                    "solutionUrl": solution_url,
                    "contestFile": contest_file,
                    "solutionFile": solution_file,
                    "rights": {
                        "license": "CC BY-NC 4.0",
                        "attributionRequired": True,
                        "publicQuestionDisplay": True,
                        "commercialUse": False,
                    },
                })
            if found_on_page == 0 and page >= 2:
                break

    records.sort(key=lambda r: (r["competition"], r["year"], r["grade"]))
    manifest = {
        "sourceRegistryId": "cemc-official",
        "generatedAt": "2026-09-25",
        "yearRange": [args.start_year, args.end_year],
        "count": len(records),
        "records": records,
    }
    library.mkdir(parents=True, exist_ok=True)
    (library / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    summary = {
        "sourceRegistryId": "cemc-official",
        "library": str(library),
        "yearRange": [args.start_year, args.end_year],
        "paperCount": len(records),
        "byCompetition": {},
        "totalBytes": sum(r["contestFile"]["bytes"] + r["solutionFile"]["bytes"] for r in records),
    }
    for r in records:
        summary["byCompetition"][r["competition"]] = summary["byCompetition"].get(r["competition"], 0) + 1
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(summary, ensure_ascii=False))

if __name__ == "__main__":
    main()
