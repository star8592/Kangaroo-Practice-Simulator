#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXAMS = ROOT / 'private' / 'exams'
SUMMARY = ROOT / 'private' / 'source-registry' / 'cemc_canonical_verification_summary.json'
SCALE = 170 / 72.0


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    files = sorted(EXAMS.glob('cemc-*.json'))
    verified = 0
    pdf_cache: dict[str, str] = {}
    by_exam = {}
    for path in files:
        data = json.loads(path.read_text())
        profile = data.get('profile') or {}
        if profile.get('sourceRegistryId') != 'cemc-official':
            raise SystemExit(f'{path.name}: unexpected sourceRegistryId')
        changed = False
        count = 0
        for q in data.get('questions', []):
            meta = q.get('sourceMeta') or {}
            crop = meta.get('crop') or {}
            pdf = Path(str(q.get('sourceFile') or ''))
            if not pdf.is_file():
                raise SystemExit(f"{q.get('id')}: source PDF missing")
            key = str(pdf)
            actual_sha = pdf_cache.setdefault(key, sha256(pdf))
            expected_sha = str(meta.get('contestSha256') or '')
            if not expected_sha or actual_sha != expected_sha:
                raise SystemExit(f"{q.get('id')}: official PDF SHA256 mismatch")
            crop_file = Path(str(crop.get('cropFile') or ''))
            if not crop_file.is_file() or crop_file.stat().st_size == 0:
                raise SystemExit(f"{q.get('id')}: frozen question crop missing")
            if int(crop.get('questionNo', -1)) != int(q.get('questionNo', -2)):
                raise SystemExit(f"{q.get('id')}: crop question number mismatch")
            page = int(crop.get('page', 0))
            if page <= 0:
                raise SystemExit(f"{q.get('id')}: invalid source page")
            box = crop.get('pixelBox')
            if not isinstance(box, list) or len(box) != 4:
                raise SystemExit(f"{q.get('id')}: invalid crop box")
            canonical = {
                'status': 'SOURCE_VERIFIED',
                'manifest': 'cemc-official-pdf-v1',
                'verificationMethod': 'official_pdf_sha256_plus_question_sequence_and_frozen_crop',
                'sourceSha256': actual_sha,
                'sourceLanguage': 'en',
                'page': page,
                'pageSpan': None,
                'crop': [round(float(v) / SCALE, 3) for v in box],
            }
            if meta.get('canonicalSource') != canonical:
                meta['canonicalSource'] = canonical
                q['sourceMeta'] = meta
                changed = True
            count += 1
            verified += 1
        if changed:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
        by_exam[profile.get('id') or path.stem] = count

    payload = {
        'sourceRegistryId': 'cemc-official',
        'verificationMethod': 'official_pdf_sha256_plus_question_sequence_and_frozen_crop',
        'paperCount': len(files),
        'questionCount': verified,
        'allSourceVerified': verified == 1225 and len(files) == 49,
        'byExam': by_exam,
    }
    SUMMARY.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    if not payload['allSourceVerified']:
        raise SystemExit(f'CEMC_CANONICAL=FAIL papers={len(files)} questions={verified}')
    print(f'CEMC_CANONICAL=PASS papers={len(files)} questions={verified}')


if __name__ == '__main__':
    main()
