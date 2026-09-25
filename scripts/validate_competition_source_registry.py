#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "private" / "source-registry" / "competition_sources.json"

ALLOWED_CLASSES = {
    "open-noncommercial",
    "educational-share",
    "copyright-restricted",
    "review-required",
    "licensed",
    "user-owned",
}
ALLOWED_PRIORITIES = {"S", "A", "B", "C"}

def fail(message: str) -> None:
    raise SystemExit(f"[rights-registry] ERROR: {message}")

def main() -> None:
    data = json.loads(REGISTRY.read_text())
    if data.get("siteMode") != "noncommercial-free":
        fail("siteMode must currently be noncommercial-free")
    sources = data.get("sources")
    if not isinstance(sources, list) or not sources:
        fail("sources must be a non-empty list")

    seen = set()
    public = 0
    internal = 0
    for source in sources:
        sid = source.get("id")
        if not sid or sid in seen:
            fail(f"missing or duplicate source id: {sid!r}")
        seen.add(sid)

        if source.get("priority") not in ALLOWED_PRIORITIES:
            fail(f"{sid}: invalid priority")
        if not source.get("competitionIds"):
            fail(f"{sid}: competitionIds missing")

        collection = source.get("collection") or {}
        rights = source.get("rights") or {}
        if collection.get("allowed") is not True:
            fail(f"{sid}: collection.allowed must be true for a registered collection source")
        if rights.get("class") not in ALLOWED_CLASSES:
            fail(f"{sid}: invalid rights.class {rights.get('class')!r}")
        if rights.get("commercialUse") is not False:
            fail(f"{sid}: this free-site registry must not mark commercialUse true")
        if not rights.get("basis"):
            fail(f"{sid}: rights.basis missing")
        urls = rights.get("evidenceUrls") or []
        if not urls:
            fail(f"{sid}: rights.evidenceUrls missing")
        for url in urls:
            parsed = urlparse(url)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                fail(f"{sid}: invalid evidence URL {url!r}")

        if rights.get("publicQuestionDisplay"):
            public += 1
            if rights.get("reviewState") != "verified":
                fail(f"{sid}: publicQuestionDisplay requires reviewState=verified")
            if rights.get("class") not in {"open-noncommercial", "educational-share", "licensed"}:
                fail(f"{sid}: public display requires an affirmative rights class")
        else:
            internal += 1

    print(f"RIGHTS_REGISTRY_OK sources={len(sources)} public={public} internal_only={internal}")

if __name__ == "__main__":
    main()
