#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / 'private' / 'translations' / 'cemc-reviewed'
GPT_RE = re.compile(r'\bGPT(?:-|\s|$)', re.I)
LOCAL_RE = re.compile(r'qwen|ollama|deepseek|llama|local', re.I)


def fail(msg: str) -> None:
    raise SystemExit(f'CEMC_GPT_REVIEW=FAIL {msg}')


def is_gpt(name: str) -> bool:
    return bool(GPT_RE.search(name or '')) and not LOCAL_RE.search(name or '')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--exam', required=True)
    ap.add_argument('--review', type=Path)
    args = ap.parse_args()
    path = args.review or (DEFAULT / f'{args.exam}.reviewed.json')
    if not path.exists():
        fail(f'missing reviewed sidecar: {path}')
    data = json.loads(path.read_text())
    top_model = str(data.get('model') or '')
    if top_model and not is_gpt(top_model):
        fail(f'non-GPT top-level model: {top_model!r}')
    rows = data.get('questions') or []
    if len(rows) != 25:
        fail(f'expected 25 reviewed questions, found {len(rows)}')
    seen = set()
    for row in rows:
        no = int(row.get('questionNo', 0))
        if no < 1 or no > 25 or no in seen:
            fail(f'invalid/duplicate questionNo {no}')
        seen.add(no)
        review = row.get('review') or {}
        model = str(review.get('reviewModel') or top_model)
        if not is_gpt(model):
            fail(f'Q{no}: reviewModel must be GPT, got {model!r}')
        if row.get('examReady') is not True:
            fail(f'Q{no}: examReady is not true')
        if review.get('translationStatus') != 'reviewed' or review.get('needsReview') is True:
            fail(f'Q{no}: review gate incomplete')
        if review.get('visualVerified') is not True or review.get('answerVerified') is not True:
            fail(f'Q{no}: source/answer verification incomplete')
        loc = row.get('localized') or {}
        zh, en = loc.get('zh') or {}, loc.get('en') or {}
        if not str(zh.get('stem') or '').strip() or not str(en.get('stem') or '').strip():
            fail(f'Q{no}: bilingual stem missing')
    print(f'CEMC_GPT_REVIEW=PASS exam={args.exam} questions=25 provider=GPT_ONLY')


if __name__ == '__main__':
    main()
