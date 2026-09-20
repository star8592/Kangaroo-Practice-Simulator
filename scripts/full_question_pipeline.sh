#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "===== Competition Question Quality Pipeline ====="
echo "[1/7] Repository state"
git status --short --branch

echo "[2/7] Student delivery audit"
python3 scripts/audit_question_delivery.py --json > /tmp/kangaroo-question-delivery.json
python3 - <<'PY'
import json
p='/tmp/kangaroo-question-delivery.json'
d=json.load(open(p, encoding='utf-8'))
print(json.dumps(d['totals'], ensure_ascii=False, indent=2))
assert d['totals']['missing_asset'] == 0, 'student question assets are missing'
PY

echo "[3/7] Rebuild translation queue"
python3 scripts/translation/build_queue.py

echo "[4/7] Competition identity"
npm run test:competition-identity

echo "[5/7] Exam/library regression"
npm run test:maa
npm run test:maa-library
npm run test:aime-sections
npm run test:maa-smart

echo "[6/7] Solution regression"
npm run test:solution-books
npm run test:verified-storyboards
npm run test:maa-verified-store

echo "[7/7] Production build"
npm run build

echo "===== QUESTION PIPELINE PASS ====="
