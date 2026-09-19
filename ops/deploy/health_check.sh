#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

check() {
  local path="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
  if [[ "$code" != "200" && "$code" != "304" ]]; then
    echo "FAILED ${path}: ${code}"
    exit 1
  fi
  echo "OK ${path}: ${code}"
}

check "/"
check "/login"
check "/api/auth/me"

exit 0
