#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from competition_rights import publication_policy, RightsError

ROOT = Path(__file__).resolve().parents[1]
EXAMS = ROOT / 'private' / 'exams'


def fail(msg: str) -> None:
    raise SystemExit(f'[rights-bindings] ERROR: {msg}')


def main() -> None:
    files = 0
    public_ready = 0
    internal = 0
    for path in sorted(EXAMS.glob('*.json')):
        if 'before-bilingual' in path.name:
            continue
        try:
            bundle = json.loads(path.read_text())
        except Exception:
            continue
        files += 1
        profile = bundle.get('profile') or {}
        sid = profile.get('sourceRegistryId')
        if not sid:
            fail(f'{path.name}: sourceRegistryId missing')
        try:
            policy = publication_policy(sid)
        except RightsError as exc:
            fail(f'{path.name}: {exc}')
        embedded = profile.get('rightsPolicy') or {}
        if embedded.get('publicQuestionDisplay') != policy['publicQuestionDisplay']:
            fail(f'{path.name}: embedded rights policy disagrees with registry')
        if profile.get('studentReady') is True:
            if not policy['publicQuestionDisplay']:
                fail(f'{path.name}: studentReady=true but source forbids public question display')
            public_ready += 1
        else:
            internal += 1
    print(f'RIGHTS_BINDINGS_OK files={files} public_ready={public_ready} internal_or_not_ready={internal}')


if __name__ == '__main__':
    main()
