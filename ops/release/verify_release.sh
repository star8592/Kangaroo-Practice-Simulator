#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${1:-http://localhost:3000}

echo "== Release verification =="
echo "Checking: $BASE_URL"

curl -fsS "$BASE_URL" >/dev/null

echo "web: PASS"

echo "release verification finished"
