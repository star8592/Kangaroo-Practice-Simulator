#!/usr/bin/env python3
"""Offline contract checks for CNINFO normalization, no network calls."""
from __future__ import annotations
import json
from normalize_cninfo_stock import infer_market, normalize


def check_market_rules() -> None:
    cases = {
        ("600000", "A股"): "SSE",
        ("688001", "A股"): "SSE",
        ("900901", "B股"): "SSE",
        ("000001", "A股"): "SZSE",
        ("300750", "A股"): "SZSE",
        ("200012", "B股"): "SZSE",
        ("920306", "A股"): "BSE",
        ("839680", "A股"): "BSE",
        ("870000", "A股"): "BSE",
        ("430047", "A股"): "BSE",
        ("688001", "CDR"): None,
        ("300750", "B股"): None,
        ("invalid", "A股"): None,
    }
    for args, expected in cases.items():
        assert infer_market(*args) == expected, (args, expected)


def check_staging() -> None:
    source = {"stockList": [
        {"code": "600000", "zwjc": "浦发银行", "category": "A股", "orgId": "sh1"},
        {"code": "000012", "zwjc": "南玻A", "category": "A股", "orgId": "sz1"},
        {"code": "200012", "zwjc": "南玻B", "category": "B股", "orgId": "sz1"},
        {"code": "920306", "zwjc": "天元重工", "category": "A股", "orgId": "bj1"},
        {"code": "430001", "zwjc": "老股退", "category": "A股", "orgId": "bj2"},
        {"code": "689001", "zwjc": "存托凭证", "category": "CDR", "orgId": "cdr1"},
    ]}
    raw = json.dumps(source, ensure_ascii=False).encode("utf-8")
    meta, partitions = normalize(raw, "2026-11-01")
    assert meta["rawRows"] == 6
    assert meta["uniqueSecurityCodes"] == 6
    assert meta["byCategory"] == {"A股": 4, "B股": 1, "CDR": 1}
    assert meta["byExchangeCandidate"] == {"SSE": 1, "SZSE": 2, "BSE": 2}
    assert meta["unclassifiedRows"] == 1
    assert meta["nameContainsDelistedCharacter"] == 1
    assert meta["potentialSameDisclosureOrgMultiSecurityGroups"] == 1
    assert partitions["SZSE"][0]["listingStatus"] == "unverified"
    assert partitions["POTENTIAL_SHARE_LINKS"] == [
        {"disclosureOrgId": "sz1", "codes": ["000012", "200012"]}
    ]
    duplicate = {"stockList": source["stockList"] + [source["stockList"][0]]}
    try:
        normalize(json.dumps(duplicate, ensure_ascii=False).encode(), "2026-11-01")
    except ValueError as e:
        assert "DUPLICATE_CODE" in str(e)
    else:
        raise AssertionError("duplicate stock codes must be rejected")
    try:
        normalize(json.dumps({"data": []}).encode(), "2026-11-01")
    except ValueError as e:
        assert "CNINFO_SCHEMA_CHANGED" in str(e)
    else:
        raise AssertionError("schema mismatch must not silently pass")


if __name__ == "__main__":
    check_market_rules()
    check_staging()
    print("CNINFO_MARKET_NORMALIZATION_TEST=PASS")
