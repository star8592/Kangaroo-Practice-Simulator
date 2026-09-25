#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "private" / "source-registry" / "competition_sources.json"

class RightsError(RuntimeError):
    pass

def load_registry(path: Path = DEFAULT_REGISTRY) -> dict[str, Any]:
    return json.loads(path.read_text())

def get_source(source_id: str, path: Path = DEFAULT_REGISTRY) -> dict[str, Any]:
    data = load_registry(path)
    for source in data.get("sources", []):
        if source.get("id") == source_id:
            return source
    raise RightsError(f"unknown sourceRegistryId: {source_id}")

def publication_policy(source_id: str, path: Path = DEFAULT_REGISTRY) -> dict[str, Any]:
    source = get_source(source_id, path)
    rights = source.get("rights") or {}
    return {
        "sourceRegistryId": source_id,
        "rightsClass": rights.get("class"),
        "publicQuestionDisplay": bool(rights.get("publicQuestionDisplay", False)),
        "commercialUse": bool(rights.get("commercialUse", False)),
        "attributionRequired": bool(rights.get("attributionRequired", False)),
        "reviewState": rights.get("reviewState"),
        "license": rights.get("license"),
        "basis": rights.get("basis"),
        "evidenceUrls": rights.get("evidenceUrls") or [],
    }
