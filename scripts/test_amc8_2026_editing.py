#!/usr/bin/env python3
"""Synthetic-only R17 test: internal reviewer remarks never appear as questions."""
from __future__ import annotations

from amc8_2026_editing import REVIEW_SUFFIXES, separate_editor_notes, validate_zh_choice_drafts


def main() -> None:
    samples = {str(n): f"第{n}题：这是一个用于验证编辑边界的合成题目。" for n in range(1, 26)}
    samples["9"] += REVIEW_SUFFIXES[0]
    samples["24"] += REVIEW_SUFFIXES[1]
    cleaned, notes = separate_editor_notes(samples)
    assert len(cleaned) == 25 and set(notes) == {"9", "24"}
    assert all(suffix not in text for text in cleaned.values() for suffix in REVIEW_SUFFIXES)
    assert notes["9"] == REVIEW_SUFFIXES[0]
    assert notes["24"] == REVIEW_SUFFIXES[1]
    assert samples["9"] != cleaned["9"] and samples["24"] != cleaned["24"]
    assert all(cleaned[str(i)] == samples[str(i)] for i in range(1, 26) if i not in (9, 24))

    injections = {
        "unknown_review_marker": (1, "请与下方原版英文题图核对"),
        "nonterminal_marker": (2, REVIEW_SUFFIXES[0] + "其他正文"),
        "review_status_marker": (3, "审校提示：此题待确认"),
    }
    for _, (number, marker) in injections.items():
        bad = dict(samples)
        bad[str(number)] += marker
        try:
            separate_editor_notes(bad)
        except ValueError:
            pass
        else:
            raise AssertionError(f"QA_NOT_FAIL_CLOSED_{number}")
    try:
        separate_editor_notes({"1": "合成题"})
    except ValueError as exc:
        assert "COVERAGE_INVALID" in str(exc)
    else:
        raise AssertionError("INCOMPLETE_TRANSLATIONS_ACCEPTED")
    sample_choices = {
        "year": 2026, "edition": "US", "humanApproved": False,
        "choices": {str(i): {k: f"合成选项{i}-{k}" for k in "ABCDE"} for i in range(1, 26)}
    }
    assert len(validate_zh_choice_drafts(sample_choices)) == 25
    bad_choices = {"year": 2026, "edition": "US", "humanApproved": False,
                   "choices": {k: dict(v) for k, v in sample_choices["choices"].items()}}
    bad_choices["choices"]["9"]["B"] = "审校提示：请核对"
    try:
        validate_zh_choice_drafts(bad_choices)
    except ValueError:
        pass
    else:
        raise AssertionError("EDITORIAL_NOTE_IN_OPTION_ACCEPTED")
    print("AMC8_R18_SYNTHETIC_BILINGUAL_CHOICES=PASS 125/125")
    print("AMC8_R17_SYNTHETIC_EDITORIAL_SEPARATION=PASS 25/25")


if __name__ == "__main__":
    main()
