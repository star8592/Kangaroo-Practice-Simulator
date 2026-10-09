#!/usr/bin/env python3
"""Read-only public acceptance for deployed competition catalogue and guest protection."""
import argparse
import json
import urllib.error
import urllib.request
from urllib.parse import urlsplit

PUBLIC_CHECKS = (
    ("/api/release", 200),
    ("/competitions", 200),
    ("/api/miniapp/world-competitions", 200),
    ("/api/competition-follow", 401),
    ("/api/competition-intelligence", 401),
    ("/api/admin/competition-source-watch", 403),
)

def run(base: str, expected_sha: str = "") -> list[str]:
    parts = urlsplit(base)
    if parts.scheme not in ("https", "http") or not parts.hostname or parts.username:
        raise ValueError("Invalid base URL")
    if parts.scheme == "http" and parts.hostname not in ("127.0.0.1", "localhost"):
        raise ValueError("Only HTTPS public origins or loopback HTTP allowed")
    findings = []
    for uri, status in PUBLIC_CHECKS:
        request = urllib.request.Request(
            base.rstrip("/") + uri, headers={"User-Agent": "SocThink-ProductionAcceptance/1.0"}
        )
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                got = response.status
                body = response.read(500_000)
        except urllib.error.HTTPError as error:
            got = error.code
            body = error.read(10_000)
        if got != status:
            raise RuntimeError(f"{uri}: expected HTTP {status}, got {got}")
        if uri == "/api/release":
            value = json.loads(body)
            sha = value.get("deployedSha")
            if value.get("ok") is not True or sha != value.get("gitSha"):
                raise RuntimeError("Release identity mismatch")
            if expected_sha and sha != expected_sha:
                raise RuntimeError(f"Expected {expected_sha} but got {sha}")
        if uri == "/api/miniapp/world-competitions":
            entries = json.loads(body).get("entries")
            if not isinstance(entries, list) or not entries:
                raise RuntimeError("World catalogue unavailable")
            if any(x.get("following") is not None or x.get("progress") is not None for x in entries):
                raise RuntimeError("Anonymous catalogue reveals private progress")
        findings.append(f"PROD_GUEST_ACCEPT=PASS {uri} HTTP={got}")
    return findings

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="https://socthink.cn")
    parser.add_argument("--sha", default="")
    args = parser.parse_args()
    for line in run(args.base, args.sha):
        print(line)
    print(f"PROD_PUBLIC_ACCEPTANCE=PASS checks={len(PUBLIC_CHECKS)}")

if __name__ == "__main__":
    main()
