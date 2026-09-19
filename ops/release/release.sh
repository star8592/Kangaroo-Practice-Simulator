#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

VERSION="${1:-$(date +%Y.%m.%d-%H%M)}"

printf '\n== Release %s ==\n' "$VERSION"

echo "[1/5] git status"
git status --short

echo "[2/5] install"
npm ci

echo "[3/5] build"
npm run build

echo "[4/5] smoke test"
python3 scripts/smoke_test.py

echo "[5/5] release info"
mkdir -p .release
cat > .release/latest.json <<EOF
{
  "version": "$VERSION",
  "created": "$(date -Iseconds)",
  "status": "passed"
}
EOF

echo "Release $VERSION PASS"
