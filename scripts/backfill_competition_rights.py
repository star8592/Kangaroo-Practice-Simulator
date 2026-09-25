#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from competition_rights import publication_policy

ROOT = Path(__file__).resolve().parents[1]
EXAMS = ROOT / 'private' / 'exams'

SOURCE_BY_LABEL = {
    'University of Coimbra · Math Kangaroo': 'kangaroo-portugal-official',
    'Australian Maths Trust · official-supplied bilingual historical paper': 'amt-australian-amc-official',
    'Australian Maths Trust · official Problemo archive': 'amt-australian-amc-official',
    'AMT official-supplied AMC Pre-A sample': 'amt-australian-amc-official',
    'German Math Kangaroo official English paper': 'kangaroo-germany-official',
    'Austrian Math Kangaroo official English paper': 'kangaroo-austria-official',
    'User-owned bilingual AMC 8 archive': 'maa-historical-archive',
    'User-owned bilingual 2024 MAA AMC 8 paper': 'maa-historical-archive',
    'MAA Programs · Math Club Resource Hub · official practice set': 'maa-math-club-practice',
    'MAA · official Sample Competition: 2022 AMC 10 A': 'maa-official-samples',
    'MAA · official Sample Competition: 2023 AMC 8': 'maa-official-samples',
    'Math Kangaroo USA official sample questions 2006–2026': 'kangaroo-usa-official',
}

KANGAROO_SOURCES = {
    'kangaroo-portugal-official',
    'kangaroo-germany-official',
    'kangaroo-austria-official',
    'kangaroo-usa-official',
}


def compact_policy(policy: dict) -> dict:
    return {
        'rightsClass': policy.get('rightsClass'),
        'license': policy.get('license'),
        'publicQuestionDisplay': bool(policy.get('publicQuestionDisplay')),
        'commercialUse': bool(policy.get('commercialUse')),
        'attributionRequired': bool(policy.get('attributionRequired')),
    }


def main() -> None:
    changed = 0
    by_source: dict[str, int] = {}
    unmatched: list[str] = []
    restricted = 0
    public = 0

    for path in sorted(EXAMS.glob('*.json')):
        if 'before-bilingual' in path.name:
            continue
        try:
            bundle = json.loads(path.read_text())
        except Exception:
            continue
        profile = bundle.get('profile') or {}
        source_id = profile.get('sourceRegistryId')
        if not source_id:
            source_id = SOURCE_BY_LABEL.get(profile.get('sourceLabel'))
            if not source_id:
                unmatched.append(path.name)
                continue

        policy = publication_policy(source_id)
        before = json.dumps(bundle, ensure_ascii=False, sort_keys=True)
        profile['sourceRegistryId'] = source_id
        profile['rightsPolicy'] = compact_policy(policy)
        if source_id in KANGAROO_SOURCES:
            profile['competitionId'] = 'kangaroo'
        if not policy['publicQuestionDisplay']:
            profile['studentReady'] = False
            restricted += 1
        else:
            public += 1
        bundle['profile'] = profile

        after = json.dumps(bundle, ensure_ascii=False, sort_keys=True)
        if after != before:
            path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + '\n')
            changed += 1
        by_source[source_id] = by_source.get(source_id, 0) + 1

    print(f'RIGHTS_BACKFILL_OK changed={changed} public={public} restricted={restricted} unmatched={len(unmatched)}')
    for key in sorted(by_source):
        print(f'  {key}: {by_source[key]}')
    if unmatched:
        for name in unmatched[:50]:
            print(f'  UNMATCHED {name}')
        raise SystemExit(2)


if __name__ == '__main__':
    main()
