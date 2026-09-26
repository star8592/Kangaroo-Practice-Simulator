#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUEUE = ROOT / 'private' / 'translation' / 'cemc.queue.enriched.json'
PILOT = ROOT / 'private' / 'exams' / 'cemc-pascal-2019.json'


def fail(message: str) -> None:
    raise SystemExit(f'CEMC_LOCALIZATION=FAIL {message}')


def main() -> None:
    if not QUEUE.exists():
        print('CEMC_LOCALIZATION=SKIP queue-not-materialized')
        return
    data = json.loads(QUEUE.read_text())
    jobs = data.get('jobs') or []
    if len(jobs) != 1225:
        fail(f'expected 1225 queue jobs, found {len(jobs)}')
    keys = {(j.get('examId'), int(j.get('questionNo', 0))) for j in jobs}
    if len(keys) != 1225:
        fail('duplicate queue identity')
    for j in jobs:
        if j.get('sourceRegistryId') != 'cemc-official':
            fail(f"{j.get('questionId')}: source registry mismatch")
        if j.get('sourceTextOrigin') != 'pdftotext':
            fail(f"{j.get('questionId')}: OCR/fallback source not allowed")
        if not str(j.get('sourceText') or '').strip():
            fail(f"{j.get('questionId')}: empty source text")
        if j.get('answerVerified') is not True or j.get('sourceVisualVerified') is not True:
            fail(f"{j.get('questionId')}: source verification incomplete")

    pilot_ready = 0
    if PILOT.exists():
        bundle = json.loads(PILOT.read_text())
        if (bundle.get('profile') or {}).get('studentReady') is True:
            qs = bundle.get('questions') or []
            if len(qs) != 25:
                fail('pilot question count')
            for q in qs:
                loc = q.get('localized') or {}
                rv = q.get('review') or {}
                if not ((loc.get('zh') or {}).get('stem') and (loc.get('en') or {}).get('stem')):
                    fail(f"{q.get('id')}: pilot localization missing")
                if q.get('examReady') is not True or rv.get('translationStatus') != 'reviewed' or rv.get('needsReview') is True:
                    fail(f"{q.get('id')}: pilot gate incomplete")
            pilot_ready = 25
    print(f'CEMC_LOCALIZATION=PASS queue=1225 pilot_ready={pilot_ready}')


if __name__ == '__main__':
    main()
