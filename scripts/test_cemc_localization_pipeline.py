#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUEUE = ROOT / 'private' / 'translation' / 'cemc.queue.enriched.json'
EXAMS = ROOT / 'private' / 'exams'


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

    ready_papers = ready_questions = 0
    for path in sorted(EXAMS.glob('cemc-*.json')):
        bundle = json.loads(path.read_text())
        profile = bundle.get('profile') or {}
        if profile.get('studentReady') is not True:
            continue
        ready_papers += 1
        qs = bundle.get('questions') or []
        if len(qs) != 25:
            fail(f'{path.name}: ready paper question count')
        for q in qs:
            loc = q.get('localized') or {}
            rv = q.get('review') or {}
            zh = loc.get('zh') or {}
            en = loc.get('en') or {}
            if not (zh.get('stem') and en.get('stem')):
                fail(f"{q.get('id')}: localization missing")
            if q.get('examReady') is not True or rv.get('translationStatus') != 'reviewed' or rv.get('needsReview') is True:
                fail(f"{q.get('id')}: ready gate incomplete")
            if q.get('answerMode') == 'choice':
                source_keys = [str(x.get('key')) for x in q.get('choices', [])]
                for lang, localized in [('zh', zh), ('en', en)]:
                    rows = localized.get('choices') or []
                    localized_keys = [str(x.get('key')) for x in rows]
                    labels = [str(x.get('label') or '').strip() for x in rows]
                    if localized_keys != source_keys or len(rows) != 5:
                        fail(f"{q.get('id')}: {lang} structured choices mismatch")
                    if not all(labels) or all(label == key for label, key in zip(labels, localized_keys)):
                        fail(f"{q.get('id')}: {lang} choices are still A-E placeholders")
            elif q.get('answerMode') == 'integer':
                if zh.get('choices') or en.get('choices'):
                    fail(f"{q.get('id')}: integer question must not expose choice placeholders")
            ready_questions += 1
    print(f'CEMC_LOCALIZATION=PASS queue=1225 ready_papers={ready_papers} ready_questions={ready_questions}')


if __name__ == '__main__':
    main()
