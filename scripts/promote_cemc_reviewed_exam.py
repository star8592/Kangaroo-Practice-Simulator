#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from competition_rights import publication_policy

ROOT = Path(__file__).resolve().parents[1]
EXAMS = ROOT / 'private' / 'exams'
DEFAULT_REVIEWS = ROOT / 'private' / 'translations' / 'cemc-reviewed'
PUBLIC = ROOT / 'public' / 'local-assets' / 'cemc'


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--exam', required=True)
    ap.add_argument('--review', type=Path)
    args = ap.parse_args()

    bundle_path = EXAMS / f'{args.exam}.json'
    bundle = json.loads(bundle_path.read_text())
    profile = bundle.get('profile') or {}
    source_id = profile.get('sourceRegistryId')
    if source_id != 'cemc-official':
        raise SystemExit(f'{args.exam}: expected cemc-official source, got {source_id!r}')
    policy = publication_policy(source_id)
    if not policy['publicQuestionDisplay']:
        raise SystemExit(f'{args.exam}: rights registry forbids public question display')

    review_path = args.review or (DEFAULT_REVIEWS / f'{args.exam}.reviewed.json')
    review = json.loads(review_path.read_text())
    rows = {int(x['questionNo']): x for x in review.get('questions', [])}
    questions = bundle.get('questions', [])
    expected = {int(q['questionNo']) for q in questions}
    if set(rows) != expected:
        raise SystemExit(f'{args.exam}: reviewed coverage {len(rows)}/{len(expected)}')
    blocked = [n for n, row in sorted(rows.items()) if not row.get('examReady') or (row.get('review') or {}).get('translationStatus') != 'reviewed']
    if blocked:
        raise SystemExit(f'{args.exam}: review gate blocked questions {blocked}')

    out_dir = PUBLIC / args.exam
    out_dir.mkdir(parents=True, exist_ok=True)
    for q in questions:
        no = int(q['questionNo'])
        row = rows[no]
        q['localized'] = row['localized']
        q['review'] = row['review']
        crop = (q.get('sourceMeta') or {}).get('crop') or {}
        src = Path(str(crop.get('cropFile') or ''))
        if not src.is_file():
            raise SystemExit(f'{args.exam} Q{no}: source crop missing: {src}')
        dst = out_dir / f'q{no:02d}.png'
        shutil.copy2(src, dst)
        url = f'/local-assets/cemc/{args.exam}/q{no:02d}.png'
        q['assetUrl'] = url
        q['studentAssetUrl'] = url
        q['examReady'] = True

    profile['studentReady'] = True
    profile['rightsPolicy'] = {
        'rightsClass': policy.get('rightsClass'),
        'license': policy.get('license'),
        'publicQuestionDisplay': True,
        'commercialUse': bool(policy.get('commercialUse')),
        'attributionRequired': bool(policy.get('attributionRequired')),
    }
    bundle['profile'] = profile
    bundle.setdefault('localization', {})
    bundle['localization'].update({'studentLanguages':['zh','en'],'sourceFallback':False,'reviewModel':review.get('model')})
    bundle_path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'exam':args.exam,'questions':len(questions),'studentReady':True,'publicAssets':str(out_dir)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
