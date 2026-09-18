#!/usr/bin/env python3
"""Generate a lightweight metadata index from discovered files."""

import json
from pathlib import Path
from classifier import classify


def build_index(root):
    items = []
    for p in Path(root).rglob('*'):
        if p.is_file():
            info = classify(p.name)
            info['file'] = str(p)
            items.append(info)
    return items


if __name__ == '__main__':
    import sys
    data = build_index(sys.argv[1] if len(sys.argv)>1 else '.')
    print(json.dumps(data, ensure_ascii=False, indent=2))
