#!/usr/bin/env python3
"""Fail closed if a candidate release loses production exam inventory.

Read-only: both inputs come from /api/release.  Never copies exam bundles,
student records, authentication tokens or payment data.
"""
from __future__ import annotations

import argparse
import json
import re
import urllib.request
from urllib.parse import urlsplit


SHA_RE = re.compile(r"^[0-9a-f]{40}$")
METRICS = {
    "rawInventory": ("papers", "questions"),
    "trainingInventory": ("papers", "smartProfiles"),
}


class InventoryRegression(ValueError):
    pass


def _identity(payload: dict, label: str) -> str:
    if not isinstance(payload, dict) or payload.get("ok") is not True:
        raise InventoryRegression(f"{label}: missing healthy release receipt")
    deployed = payload.get("deployedSha")
    git = payload.get("gitSha")
    if not isinstance(deployed, str) or not SHA_RE.fullmatch(deployed) or git != deployed:
        raise InventoryRegression(f"{label}: invalid or mismatched release SHA")
    return deployed


def _nonnegative_int(value: object, label: str) -> int:
    if type(value) is not int or value < 0:
        raise InventoryRegression(f"{label}: expected nonnegative integer")
    return value


def _inventory(payload: dict, name: str, label: str) -> dict:
    value = payload.get(name)
    if not isinstance(value, dict):
        raise InventoryRegression(f"{label}: {name} missing")
    for key in METRICS[name]:
        _nonnegative_int(value.get(key), f"{label}.{name}.{key}")
    competitions = value.get("byCompetition")
    if not isinstance(competitions, dict):
        raise InventoryRegression(f"{label}.{name}.byCompetition: missing")
    if not competitions:
        raise InventoryRegression(f"{label}.{name}.byCompetition: empty")
    for key, count in competitions.items():
        if not isinstance(key, str) or not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", key):
            raise InventoryRegression(f"{label}.{name}: invalid competition key")
        _nonnegative_int(count, f"{label}.{name}.byCompetition.{key}")
    return value


def compare(baseline: dict, candidate: dict, expected_sha: str) -> dict:
    if not SHA_RE.fullmatch(expected_sha):
        raise InventoryRegression("expected target SHA must be exactly 40 lowercase hexadecimal characters")
    old_sha = _identity(baseline, "baseline")
    new_sha = _identity(candidate, "candidate")
    if new_sha != expected_sha:
        raise InventoryRegression("candidate release SHA differs from target SHA")
    before = {name: _inventory(baseline, name, "baseline") for name in METRICS}
    after = {name: _inventory(candidate, name, "candidate") for name in METRICS}
    if before["rawInventory"]["papers"] == 0 or before["rawInventory"]["questions"] == 0:
        raise InventoryRegression("production baseline exam inventory must not be empty")
    if before["trainingInventory"]["papers"] == 0:
        raise InventoryRegression("production baseline training inventory must not be empty")
    for name, fields in METRICS.items():
        for field in fields:
            a, b = before[name][field], after[name][field]
            if b < a:
                raise InventoryRegression(f"{name}.{field} regressed: {a} -> {b}")
        for competition, previous in before[name]["byCompetition"].items():
            current = after[name]["byCompetition"].get(competition)
            if current is None:
                raise InventoryRegression(f"{name}: missing competition {competition}")
            if current < previous:
                raise InventoryRegression(f"{name}.{competition} regressed: {previous} -> {current}")
    return {
        "baselineSha": old_sha,
        "candidateSha": new_sha,
        "rawPapers": after["rawInventory"]["papers"],
        "rawQuestions": after["rawInventory"]["questions"],
        "trainingPapers": after["trainingInventory"]["papers"],
        "smartProfiles": after["trainingInventory"]["smartProfiles"],
    }


def fetch_release(url: str) -> dict:
    parts = urlsplit(url)
    if (parts.scheme != "http" or parts.hostname not in ("localhost", "127.0.0.1")
            or parts.username or parts.password or parts.query or parts.fragment
            or parts.path != "/api/release"):
        raise InventoryRegression("release inventory guard accepts only loopback HTTP /api/release endpoints")
    req = urllib.request.Request(url, headers={"User-Agent": "SOC-THINK-ReleaseInventoryGuard/1"})
    with urllib.request.urlopen(req, timeout=20) as response:
        if response.status != 200:
            raise InventoryRegression(f"release endpoint HTTP {response.status}")
        data = response.read(100_001)
        if len(data) > 100_000:
            raise InventoryRegression("release inventory response exceeds 100KB")
    result = json.loads(data)
    if not isinstance(result, dict):
        raise InventoryRegression("release inventory endpoint did not return object")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline-url", required=True)
    parser.add_argument("--candidate-url", required=True)
    parser.add_argument("--expected-sha", required=True)
    args = parser.parse_args()
    try:
        baseline = fetch_release(args.baseline_url)
        candidate = fetch_release(args.candidate_url)
        print("RELEASE_INVENTORY_GUARD=PASS " + json.dumps(
            compare(baseline, candidate, args.expected_sha), ensure_ascii=False, sort_keys=True))
        return 0
    except (InventoryRegression, OSError, ValueError, json.JSONDecodeError) as error:
        print(f"RELEASE_INVENTORY_GUARD=FAIL reason={type(error).__name__}: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
