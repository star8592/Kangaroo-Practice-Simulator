#!/usr/bin/env python3
"""Repeatable, READ-ONLY inventory of the five independently versioned products.

Usage:
 python3 scripts/audit_english_suite_sources.py \
   socthink=/path/to/main-site accent=/path/to/AccentLab \
   vocab=/path/to/VocabLearningPlatform reading=/path/to/EnglishLeap \
   aelos=/path/to/aelos

This cannot prove that a source commit is deployed or that a login works.
No secrets, personal records or original lesson text are included in output.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

SUFFIXES = {'.ts', '.tsx', '.js', '.jsx', '.vue', '.rs', '.py', '.sql', '.css', '.mjs', '.cjs'}
IGNORED_ROOTS = {'content', 'data', 'assets', 'public', 'vendor', 'target', 'dist',
                 'node_modules', '.next', 'static', 'generated'}
KEYS = ('socthink', 'accent', 'vocab', 'reading', 'aelos')


def git(repo: Path, *args: str) -> str:
    result = subprocess.run(['git', '-C', str(repo), *args], check=True,
                            capture_output=True, timeout=15)
    return result.stdout.decode('utf-8', errors='replace').strip()


def audit(name: str, root: Path) -> dict:
    if not (root / '.git').exists():
        raise ValueError(f'Not a Git checkout: {root}')
    tracked = git(root, 'ls-files', '-z').split('\x00')
    files = [f for f in tracked if f and Path(f).suffix in SUFFIXES
             and not any(part in IGNORED_ROOTS for part in Path(f).parts)
             and not Path(f).name.endswith(('.generated.ts', '.min.js'))]
    counts = {'auth': 0, 'classroom': 0, 'learning': 0, 'database': 0}
    biggest = []
    for rel in files:
        path = root / rel
        try:
            data = path.read_text(encoding='utf-8', errors='replace')
        except (OSError, UnicodeError):
            continue
        size = len(data.encode('utf-8'))
        biggest.append((size, rel))
        if re.search(r'\b(auth|login|session|cookie|openid|wechat)\b', data, re.I):
            counts['auth'] += 1
        if re.search(r'\b(classroom|teacher|assignment|enrollment|guardian)\b', data, re.I):
            counts['classroom'] += 1
        if re.search(r'\b(progress|review|gradebook|score|attempt|learning_event)\b', data, re.I):
            counts['learning'] += 1
        if path.suffix == '.sql':
            counts['database'] += 1
    return {
        'product': name,
        'commit': git(root, 'rev-parse', 'HEAD'),
        'tracked_files': len([f for f in tracked if f]),
        'source_files_scanned': len(biggest),
        'files_containing_terms': counts,
        'largest_source_files': [{'path': p, 'bytes': n} for n, p in
                                 sorted(biggest, reverse=True)[:5]],
        'note': 'source snapshot only; not a live deployment or authorization claim',
    }


def main(argv: list[str]) -> int:
    entries = {}
    for arg in argv:
        if '=' not in arg:
            raise ValueError('Each argument must have the form product=/path')
        name, value = arg.split('=', 1)
        if name not in KEYS or not value or name in entries:
            raise ValueError('Invalid or repeated product key: ' + name)
        entries[name] = Path(value)
    if set(entries) != set(KEYS):
        raise ValueError('Expected five checkouts: ' + ', '.join(KEYS))
    products = [audit(name, entries[name]) for name in KEYS]
    print(json.dumps({'schemaVersion': 1,
                      'scope': 'code-and-SQL-file-inventory-only',
                      'sourceFilesScanned': sum(x['source_files_scanned'] for x in products),
                      'products': products}, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main(sys.argv[1:]))
    except (ValueError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        sys.stderr.write(f'AUDIT_FAILED: {exc}\n')
        sys.exit(2)
