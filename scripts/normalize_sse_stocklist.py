#!/usr/bin/env python3
"""Normalize SSE official public stock-list JSON to *private issuer candidates*.

SECURITY_CODE_A and SECURITY_CODE_B are separate listed shares of one company
row. A/B shares must not be counted as separate employers. This stock list
cannot prove a current recruitment vacancy. No third-party raw-data publishing.
"""
from __future__ import annotations
import argparse
import csv
import datetime as dt
import hashlib
import json
from pathlib import Path
import re

SOURCE_URL = (
    "https://query.sse.com.cn/security/stock/getStockListData2.do?"
    "isPagination=true&stockType=10&pageHelp.pageSize=2500&pageHelp.pageNo=1"
)


def normalize(raw: bytes, observed_at: str) -> tuple[dict, list[dict], list[dict]]:
    observation = dt.date.fromisoformat(observed_at)
    data = json.loads(raw.decode("utf-8-sig"))
    if not isinstance(data, dict) or not isinstance(data.get("pageHelp"), dict):
        raise ValueError("SSE_SCHEMA_CHANGED")
    page = data["pageHelp"]
    rows = page.get("data")
    if not isinstance(rows, list) or not isinstance(page.get("total"), int):
        raise ValueError("SSE_DATA_MISSING")
    if len(rows) != page["total"]:
        raise ValueError(f"SSE_INCOMPLETE_LIST:{len(rows)} != {page['total']}")
    if not rows:
        raise ValueError("SSE_EMPTY")
    listings = []
    company_groups = []
    securities = set()
    groups = set()
    anomalous_dates = []
    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"SSE_ROW_NOT_OBJECT:{i}")
        group = str(row.get("COMPANY_CODE") or "").strip()
        company_name = str(row.get("COMPANY_ABBR") or "").strip()
        date_text = str(row.get("LISTING_DATE") or "").strip()
        if not re.fullmatch(r"\d{6}", group) or not company_name:
            raise ValueError(f"SSE_INVALID_COMPANY_ROW:{i}")
        if group in groups:
            raise ValueError(f"SSE_DUPLICATE_COMPANY_CODE:{group}")
        groups.add(group)
        if date_text not in ("", "-"):
            try:
                listed_date = dt.date.fromisoformat(date_text)
            except ValueError:
                raise ValueError(f"SSE_INVALID_LISTING_DATE:{group}")
            if listed_date > observation:
                anomalous_dates.append({"companyCode": group, "listingDate": date_text})
        else:
            date_text = ""
        a_code = str(row.get("SECURITY_CODE_A") or "").strip()
        b_code = str(row.get("SECURITY_CODE_B") or "").strip()
        share_codes = []
        for kind, code, name_field in (
            ("A股", a_code, "SECURITY_ABBR_A"),
            ("B股", b_code, "SECURITY_ABBR_B"),
        ):
            if code in ("", "-"):
                continue
            if not re.fullmatch(r"\d{6}", code):
                raise ValueError(f"SSE_INVALID_SHARE_CODE:{code}")
            if code in securities:
                raise ValueError(f"SSE_DUPLICATE_SECURITY:{code}")
            securities.add(code)
            name = str(row.get(name_field) or "").strip()
            listings.append({
                "code": code,
                "securityName": name if name not in ("", "-") else company_name,
                "category": kind,
                "marketCandidate": "SSE",
                "companyRowKey": group,
                "companyName": company_name,
                "listingDate": date_text or None,
                "stockBoardRaw": str(row.get("LISTING_BOARD") or ""),
                "listingStatus": "official_list_entry_not_employment_proof",
                "sourceTier": "sse_public_stocklist",
            })
            share_codes.append(code)
        if not share_codes:
            raise ValueError(f"SSE_ROW_WITHOUT_SECURITY:{group}")
        company_groups.append({
            "companyRowKey": group,
            "companyName": company_name,
            "securityCodes": share_codes,
            "listingDate": date_text or None,
            "listingStatus": "official_list_entry_not_employment_proof",
        })
    metrics = {
        "schema": "socthink-sse-list-candidates-v1",
        "sourceUrl": SOURCE_URL,
        "observedAt": observed_at,
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "rawIssuerRows": len(rows),
        "sourceReportedTotal": page["total"],
        "expandedSecurityRows": len(listings),
        "aShares": sum(l["category"] == "A股" for l in listings),
        "bShares": sum(l["category"] == "B股" for l in listings),
        "aAndBGroupedCompanies": sum(len(x["securityCodes"]) > 1 for x in company_groups),
        "listDateAfterObservation": len(anomalous_dates),
        "futureDatedRows": anomalous_dates[:30],
        "caution": (
            "Source stock-list rows and share securities are not verified legal "
            "entities, distinct employers or jobs. Trade-exchange summary dates "
            "and stock-list publication dates can differ. Unknown or future-dated "
            "listing status must be reconciled before marking a company active."
        ),
        "distribution": "private_research_only_rights_review_required",
    }
    return metrics, company_groups, listings


def write_snapshot(raw_file: Path, out_dir: Path, observed_at: str) -> dict:
    metrics, groups, listings = normalize(raw_file.read_bytes(), observed_at)
    if out_dir.exists() and any(out_dir.iterdir()):
        raise FileExistsError("OUTPUT_DIR_NOT_EMPTY")
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, data in (("company_row_candidates.json", groups),
                       ("security_candidates.json", listings)):
        (out_dir / name).write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    with (out_dir / "standardized_sse_securities.csv").open(
        "x", newline="", encoding="utf-8"
    ) as f:
        writer = csv.writer(f)
        writer.writerow(("code", "issuer_name", "security_type"))
        for l in listings:
            writer.writerow((l["code"], l["securityName"], "EQUITY"))
    (out_dir / "metadata.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return metrics


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--source", type=Path, required=True)
    p.add_argument("--out-dir", type=Path, required=True)
    p.add_argument("--observed-at", required=True)
    args = p.parse_args()
    print("SSE_STOCK_LIST_STAGE=PASS", json.dumps(
        write_snapshot(args.source, args.out_dir, args.observed_at), ensure_ascii=False))
