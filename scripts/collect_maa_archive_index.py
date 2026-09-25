#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "private" / "source-registry" / "maa_archive_index.json"
BASE = "https://live.poshenloh.com"
INDEX_URL = f"{BASE}/past-contests"
SERIES = {
    "amc8": "maa-amc8",
    "amc10": "maa-amc10",
    "amc12": "maa-amc12",
    "aime": "maa-aime-classic",
}

def canonical_id(series: str, label: str) -> str:
    compact = re.sub(r"\s+", "", label).upper()
    m = re.fullmatch(r"(\d{4})([ABCD]|I|II)?", compact)
    if not m:
        return f"maa-{series}-{re.sub(r'[^a-z0-9]+','-',label.lower()).strip('-')}"
    year, variant = m.groups()
    if series == "amc8":
        return f"maa-amc8-{year}"
    if series in {"amc10", "amc12"}:
        suffix = f"-{variant.lower()}" if variant else ""
        return f"maa-{series}-{year}{suffix}"
    suffix = ""
    if variant:
        suffix = "-" + variant.lower()
    return f"maa-aime-{year}{suffix}"

def parse_target_key(series: str, label: str):
    compact = re.sub(r"\s+", "", label).upper()
    m = re.fullmatch(r"(\d{4})([ABCD]|I|II)?", compact)
    if not m:
        return None
    year, variant = m.groups()
    return (series, int(year), variant or "")

def local_inventory():
    ids = set()
    formats = Counter()
    keys = set()
    fmt_to_series = {
        "maa-amc8": "amc8",
        "maa-amc10": "amc10",
        "maa-amc12": "amc12",
        "maa-aime-classic": "aime",
        "maa-aime-2027": "aime",
    }
    for p in (ROOT / "private" / "exams").glob("maa-*.json"):
        try:
            data = json.loads(p.read_text())
        except Exception:
            continue
        profile = data.get("profile") or {}
        pid = profile.get("id") or p.stem
        ids.add(pid)
        fmt = profile.get("formatId")
        if fmt:
            formats[fmt] += 1
        if profile.get("paperType") not in {"past", "sample"}:
            continue
        series = fmt_to_series.get(fmt)
        year = profile.get("year")
        if not series or not isinstance(year, int):
            continue
        variant = ""
        if series in {"amc10", "amc12"}:
            m = re.search(rf"-{year}-([abcd])(?:-|$)", pid, re.I)
            if m:
                variant = m.group(1).upper()
        elif series == "aime":
            m = re.search(rf"-{year}-(i|ii)(?:-|$)", pid, re.I)
            if m:
                variant = m.group(1).upper()
        keys.add((series, year, variant))
    return ids, formats, keys

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--proxy", default=os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy"))
    args = ap.parse_args()

    session = requests.Session()
    session.headers["User-Agent"] = "MathCompetitionLab metadata indexer/1.0"
    if args.proxy:
        session.proxies.update({"http": args.proxy, "https": args.proxy})

    r = session.get(INDEX_URL, timeout=60)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    local_ids, local_formats, local_keys = local_inventory()

    records = []
    seen = set()
    pat = re.compile(r"/past-contests/(amc8|amc10|amc12|aime)/([^/?#]+)")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        m = pat.search(href)
        if not m:
            continue
        series, path_label = m.groups()
        label = a.get_text(" ", strip=True) or path_label
        key = (series, path_label)
        if key in seen:
            continue
        seen.add(key)
        cid = canonical_id(series, label)
        target_key = parse_target_key(series, label)
        records.append({
            "series": series.upper(),
            "formatId": SERIES[series],
            "label": label,
            "canonicalTargetId": cid,
            "referenceUrl": urljoin(BASE, href),
            "localExactIdPresent": cid in local_ids,
            "localPaperPresent": target_key in local_keys if target_key else False,
            "collectionPolicy": "metadata-index-only-until-project-rights-basis-is-recorded",
        })

    order = {"AMC8": 0, "AMC10": 1, "AMC12": 2, "AIME": 3}
    records.sort(key=lambda x: (order.get(x["series"], 99), x["label"]), reverse=False)
    by_series = Counter(r["series"] for r in records)
    exact_present = Counter(r["series"] for r in records if r["localExactIdPresent"])
    paper_present = Counter(r["series"] for r in records if r["localPaperPresent"])
    summary = {
        "reference": INDEX_URL,
        "referenceRightsNote": "The reference site states its own MAA authorization. That authorization is not treated as a sublicense to this project.",
        "totalIndexedPapers": len(records),
        "indexedBySeries": dict(by_series),
        "localExamFilesByFormat": dict(local_formats),
        "exactTargetIdsAlreadyPresent": dict(exact_present),
        "localHistoricalPaperCoverage": dict(paper_present),
        "missingHistoricalPapers": {
            k: by_series[k] - paper_present.get(k, 0)
            for k in by_series
        },
    }
    payload = {"generatedAt": "2026-09-25", "summary": summary, "records": records}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(summary, ensure_ascii=False))

if __name__ == "__main__":
    main()
