#!/usr/bin/env python3
"""
CompetitionBank Agent MVP

Scans local folders for math competition resources.
"""

import json
import os
import sys
from pathlib import Path

KEYWORDS = [
    "kangaroo",
    "袋鼠",
    "amc",
    "aime",
    "ukmt",
    "数学竞赛",
    "真题",
    "exam",
    "paper",
]

SEARCH_ROOTS = [
    "/mnt/disk1",
    "/home/master/下载",
]


def discover():
    results = []
    for root in SEARCH_ROOTS:
        if not os.path.exists(root):
            continue
        for base, _, files in os.walk(root):
            for f in files:
                name = f.lower()
                if any(k.lower() in name for k in KEYWORDS):
                    results.append(str(Path(base) / f))
    return results


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "scan"
    if cmd == "scan":
        data = discover()
        print(json.dumps({"files": len(data), "items": data}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
