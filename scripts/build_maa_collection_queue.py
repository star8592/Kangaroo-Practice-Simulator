#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from competition_rights import publication_policy

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'private' / 'source-registry' / 'maa_archive_index.json'
OUT = ROOT / 'private' / 'source-registry' / 'maa_collection_queue.json'
SOURCE_ID = 'maa-historical-archive'
PRIORITY = {'AMC10': 0, 'AMC12': 1, 'AIME': 2, 'AMC8': 3}


def main() -> None:
    index = json.loads(INDEX.read_text())
    policy = publication_policy(SOURCE_ID)
    if policy['publicQuestionDisplay']:
        raise SystemExit('historical MAA queue must remain internal-only under current rights registry')

    items = []
    for rec in index.get('records', []):
        if rec.get('localPaperPresent'):
            continue
        items.append({
            'series': rec['series'],
            'label': rec['label'],
            'formatId': rec['formatId'],
            'canonicalTargetId': rec['canonicalTargetId'],
            'referenceUrl': rec['referenceUrl'],
            'sourceRegistryId': SOURCE_ID,
            'rightsClass': policy['rightsClass'],
            'publicQuestionDisplay': False,
            'collectionMode': 'metadata-and-authorized-local-materials-only',
            'targetStorage': 'private/source-archive/maa-amc',
            'publicAssetStorageAllowed': False,
            'nextAction': 'locate-official-or-user-authorized-source-then-import-internal-only',
        })

    items.sort(key=lambda x: (PRIORITY.get(x['series'], 99), x['label']))
    by_series = Counter(x['series'] for x in items)
    payload = {
        'sourceRegistryId': SOURCE_ID,
        'publicQuestionDisplay': False,
        'count': len(items),
        'bySeries': dict(by_series),
        'items': items,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    print(f"MAA_COLLECTION_QUEUE_OK count={len(items)} by_series={dict(by_series)}")


if __name__ == '__main__':
    main()
