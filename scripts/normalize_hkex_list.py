#!/usr/bin/env python3
"""Normalize the HKEX official ListOfSecurities.xlsx into a *private* equity
candidate CSV. This is a minimal, read-only ZIP/XML source adapter; it does not
modify a spreadsheet or publish exchange bulk data.

The source file must already have been obtained via lawful official access.
No browser/login automation, anti-bot bypass, or raw public redistribution.
Run in an approved local private data directory, never commit bulk exports.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS = {"a": ROOT}
ALLOWED = {"Equity Securities (Main Board)", "Equity Securities (GEM)"}
SOURCE_URL = "https://www.hkex.com.hk/eng/services/trading/securities/securitieslists/ListOfSecurities.xlsx"


def col(ref: str) -> str:
    return re.sub(r"[^A-Z]", "", ref)


def read_cells(row, strings: list[str]) -> dict[str, str]:
    result: dict[str, str] = {}
    for c in row.findall("a:c", NS):
        key = col(c.get("r", ""))
        node = c.find("a:v", NS)
        value = node.text if node is not None and node.text else ""
        if c.get("t") == "s" and value:
            value = strings[int(value)]
        if c.get("t") == "inlineStr":
            value = "".join(x.text or "" for x in c.findall(".//a:t", NS))
        result[key] = value.strip()
    return result


def normalize(source: Path) -> tuple[list[tuple[str, str, str]], str, dict]:
    data = source.read_bytes()
    if len(data) < 1000 or not zipfile.is_zipfile(source):
        raise ValueError("not a valid HKEX XLSX archive")
    with zipfile.ZipFile(source) as z:
        strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            string_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            strings = [
                "".join(t.text or "" for t in si.findall(".//a:t", NS))
                for si in string_root.findall("a:si", NS)
            ]
        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    rows = sheet.findall(".//a:sheetData/a:row", NS)
    if len(rows) < 1000:
        raise ValueError("HKEX source unexpectedly small")
    intro = read_cells(rows[0], strings)
    header = read_cells(rows[2], strings)
    if intro.get("A") != "List of Securities" or any(
        header.get(k) != v for k, v in (
            ("A", "Stock Code"),
            ("B", "Name of Securities"),
            ("C", "Category"),
            ("D", "Sub-Category"),
        )
    ):
        raise ValueError("HKEX source sheet layout changed; human review needed")
    verified = set()
    equity = []
    subtypes: dict[str, int] = {}
    for row in rows[3:]:
        values = read_cells(row, strings)
        if values.get("C") != "Equity" or values.get("D") not in ALLOWED:
            continue
        ticker = values.get("A", "").zfill(5)
        name = values.get("B", "").strip()
        if not re.fullmatch(r"\d{5}", ticker) or not name:
            continue
        if ticker in verified:
            raise ValueError("duplicate HKEX stock code: " + ticker)
        verified.add(ticker)
        equity.append((ticker, name, "EQUITY"))
        subtype = values["D"]
        subtypes[subtype] = subtypes.get(subtype, 0) + 1
    if len(equity) < 1500:
        raise ValueError("unexpectedly few HKEX equity securities")
    for key in ("00700", "09618", "09888", "09988", "09999"):
        if key not in verified:
            raise ValueError("HKEX expected verified reference missing: " + key)
    snapshot = intro.get("A", "") + " / " + read_cells(rows[1], strings).get("A", "")
    metadata = {
        "schema": "hkex-official-equity-source-v1",
        "sourceUrl": SOURCE_URL,
        "sourceAsOfText": read_cells(rows[1], strings).get("A", ""),
        "sourceFileSha256": hashlib.sha256(data).hexdigest(),
        "listedEquitySecurityCandidates": len(equity),
        "categories": dict(sorted(subtypes.items())),
        "identity": "Equity security candidates, NOT verified Chinese corporations, employers or active job vacancies.",
        "rights": "Private research stage; bulk republication rights unverified.",
        "noAutomaticPublication": True,
    }
    return equity, snapshot, metadata


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--source", type=Path, required=True)
    p.add_argument("--csv", type=Path, required=True)
    p.add_argument("--metadata", type=Path, required=True)
    p.add_argument("--observed-at", required=True)
    args = p.parse_args()
    if not re.fullmatch(r"20\d\d-\d\d-\d\d", args.observed_at):
        raise SystemExit("expected --observed-at YYYY-MM-DD")
    if args.csv.exists() or args.metadata.exists():
        raise SystemExit("refusing to overwrite existing normalized snapshot")
    equity, _, metadata = normalize(args.source)
    metadata["observedAt"] = args.observed_at
    args.csv.parent.mkdir(parents=True, exist_ok=True)
    with args.csv.open("x", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(("code", "issuer_name", "security_type"))
        w.writerows(equity)
    args.metadata.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("HKEX_EQUITY_STAGE=PASS", json.dumps(metadata, ensure_ascii=False))


if __name__ == "__main__":
    main()
