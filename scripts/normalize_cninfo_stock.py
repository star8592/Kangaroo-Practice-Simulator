#!/usr/bin/env python3
"""Stage CNINFO public stock codes as cross-market CANDIDATES, not live issuers.

The endpoint is named szse_stock.json but contains Shanghai, Shenzhen, Beijing
and historical rows. Never interpret its 6262 rows as listed companies or
current vacancies. The output is private and is deliberately NOT a job catalog.
"""
from __future__ import annotations
import argparse
import collections
import csv
import hashlib
import json
from pathlib import Path
import re

SOURCE_URL = "https://www.cninfo.com.cn/new/data/szse_stock.json"
VALID_CATEGORIES = {"A股", "B股"}
KNOWN_MARKETS = ("SSE", "SZSE", "BSE")


def infer_market(code: str, category: str) -> str | None:
    """Conservative prefix classification; subject to exchange verification."""
    if not re.fullmatch(r"\d{6}", code):
        return None
    if category == "A股":
        if code.startswith(("60", "68")):
            return "SSE"
        if code.startswith(("00", "30")):
            return "SZSE"
        if code.startswith(("43", "83", "87", "92")):
            return "BSE"
    if category == "B股":
        if code.startswith("90"):
            return "SSE"
        if code.startswith("20"):
            return "SZSE"
    return None


def normalize(raw: bytes, observed_at: str) -> tuple[dict, dict[str, list[dict]]]:
    if not re.fullmatch(r"20\d{2}-\d{2}-\d{2}", observed_at):
        raise ValueError("INVALID_OBSERVATION_DATE")
    data = json.loads(raw.decode("utf-8-sig"))
    if not isinstance(data, dict) or not isinstance(data.get("stockList"), list):
        raise ValueError("CNINFO_SCHEMA_CHANGED")
    records = data["stockList"]
    if not records:
        raise ValueError("EMPTY_SOURCE")
    by_market: dict[str, list[dict]] = {exchange: [] for exchange in KNOWN_MARKETS}
    seen_codes = set()
    category_counts = collections.Counter()
    unclassified = []
    status_flags = collections.Counter()
    org_appearance: dict[str, set[str]] = collections.defaultdict(set)
    for i, row in enumerate(records):
        if not isinstance(row, dict):
            raise ValueError(f"NON_OBJECT_ROW_{i}")
        code, name, category, org = (
            str(row.get(k, "")).strip() for k in ("code", "zwjc", "category", "orgId")
        )
        if not re.fullmatch(r"\d{6}", code) or not name or not org:
            raise ValueError(f"INVALID_ROW_{i}")
        if code in seen_codes:
            raise ValueError(f"DUPLICATE_CODE_{code}")
        seen_codes.add(code)
        category_counts[category] += 1
        market = infer_market(code, category)
        record = {
            "code": code,
            "name": name,
            "category": category,
            "disclosureOrgId": org,
            "exchangeCandidate": market,
            "listingStatus": "unverified",
            "statusEvidence": "name_contains_退" if "退" in name else "unknown",
            "evidenceTier": "disclosure_platform_candidate",
        }
        if "退" in name:
            status_flags["name_contains_退"] += 1
        if market is None:
            unclassified.append(record)
        else:
            by_market[market].append(record)
            org_appearance[org].add(code)
    potential_cross_share_orgs = {
        org: sorted(codes) for org, codes in org_appearance.items() if len(codes) > 1
    }
    metadata = {
        "schema": "socthink-cninfo-equity-candidates-v1",
        "sourceUrl": SOURCE_URL,
        "observedAt": observed_at,
        "rawSha256": hashlib.sha256(raw).hexdigest(),
        "rawRows": len(records),
        "uniqueSecurityCodes": len(seen_codes),
        "byCategory": dict(sorted(category_counts.items())),
        "byExchangeCandidate": {k: len(v) for k, v in by_market.items()},
        "unclassifiedRows": len(unclassified),
        "nameContainsDelistedCharacter": status_flags["name_contains_退"],
        "potentialSameDisclosureOrgMultiSecurityGroups": len(potential_cross_share_orgs),
        "warning": (
            "Historical/delisted securities may be present. Code prefix is a market "
            "candidate, not current listing proof. Disclosure orgId can suggest "
            "multiple share classes but does not establish a business-group identity. "
            "No current vacancy, Chinese-company status or sellable training is implied."
        ),
        "publication": "private_research_only",
    }
    return metadata, {**by_market, "UNCLASSIFIED": unclassified,
                      "POTENTIAL_SHARE_LINKS": [
                          {"disclosureOrgId": org, "codes": codes}
                          for org, codes in sorted(potential_cross_share_orgs.items())
                      ]}


def write_snapshot(raw_file: Path, output_dir: Path, observed_at: str) -> dict:
    raw = raw_file.read_bytes()
    metadata, partitions = normalize(raw, observed_at)
    if output_dir.exists() and any(output_dir.iterdir()):
        raise FileExistsError("OUTPUT_DIR_NOT_EMPTY")
    output_dir.mkdir(parents=True, exist_ok=True)
    for market, records in partitions.items():
        (output_dir / f"{market.lower()}_candidates.json").write_text(
            json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if market in KNOWN_MARKETS:
            with (output_dir / f"{market.lower()}_standardized.csv").open(
                "x", newline="", encoding="utf-8"
            ) as f:
                writer = csv.writer(f)
                writer.writerow(["code", "issuer_name", "security_type"])
                for record in records:
                    writer.writerow([
                        record["code"], record["name"],
                        "EQUITY" if record["category"] in VALID_CATEGORIES else "OTHER"
                    ])
    (output_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--observed-at", required=True)
    args = parser.parse_args()
    result = write_snapshot(args.source, args.out_dir, args.observed_at)
    print("CNINFO_CROSS_MARKET_STAGE=PASS", json.dumps(result, ensure_ascii=False))
