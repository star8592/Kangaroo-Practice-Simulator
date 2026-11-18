#!/usr/bin/env python3
"""Keep internal editorial annotations out of student-facing 2026 bilingual text.

Contains no original MAA problem statements. Reviewed drafts remain local-only.
"""
from __future__ import annotations

from pathlib import Path

# Private, non-routable source scans must never reside under Next.js public/.
PRIVATE_CROP_DIR = Path("private/assets/maa-amc8-2026-us-internal")
LEGACY_PUBLIC_CROP_DIR = Path("public/local-assets/maa-amc/archive-amc8/2026-us-internal")


def private_crop_directory(root: Path) -> Path:
    root = root.resolve()
    private_root = (root / "private").resolve()
    if private_root != root / "private":
        raise RuntimeError("PRIVATE_ASSET_ROOT_ESCAPED")
    target = (root / PRIVATE_CROP_DIR).resolve()
    if not target.is_relative_to(private_root):
        raise RuntimeError("PRIVATE_ASSET_ROOT_ESCAPED")
    public = root / LEGACY_PUBLIC_CROP_DIR
    if public.exists() and (not public.is_dir() or any(public.iterdir())):
        raise RuntimeError("COPYRIGHTED_SOURCE_IMAGES_INSIDE_PUBLIC_TREE")
    return target

REVIEW_SUFFIXES = (
    "两层根号的位置以及分式形式请与下方原版英文题图核对。",
    "具体记号及公式以英文原题图为准。",
)
UNACCEPTABLE_STEM_MARKERS = (
    "请与下方原版英文题图核对", "以英文原题图为准",
    "审校提示：", "译文待校对",
)


def separate_editor_notes(zh: dict[str, str]) -> tuple[dict[str, str], dict[str, str]]:
    if not isinstance(zh, dict) or set(zh) != {str(n) for n in range(1, 26)}:
        raise ValueError("TRANSLATION_COVERAGE_INVALID")
    cleaned: dict[str, str] = {}
    notes: dict[str, str] = {}
    for index in range(1, 26):
        key = str(index)
        text = zh[key]
        if not isinstance(text, str) or len(text.strip()) < 10:
            raise ValueError(f"Q{index}_TRANSLATION_MISSING")
        text = text.strip()
        for suffix in REVIEW_SUFFIXES:
            if suffix in text:
                if not text.endswith(suffix):
                    raise ValueError(f"Q{index}_EDITORIAL_NOTE_NOT_AT_END")
                text = text[:-len(suffix)].rstrip()
                notes[key] = suffix
        if len(text) < 10 or any(marker in text for marker in UNACCEPTABLE_STEM_MARKERS):
            raise ValueError(f"Q{index}_EDITORIAL_TEXT_LEAKAGE")
        cleaned[key] = text
    return cleaned, notes
