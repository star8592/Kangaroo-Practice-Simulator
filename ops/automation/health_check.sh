#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3027}"
EXPECTED_SHA="${EXPECTED_SHA:-}"

code() {
  curl -sS -o /dev/null -w "%{http_code}" --max-time 8 "$BASE_URL$1"
}

expect_code() {
  local path="$1"; shift
  local got
  got="$(code "$path")"
  for wanted in "$@"; do
    if [[ "$got" == "$wanted" ]]; then
      printf 'HEALTH_OK %s -> %s\n' "$path" "$got"
      return 0
    fi
  done
  printf 'HEALTH_FAIL %s -> %s expected=%s\n' "$path" "$got" "$*" >&2
  return 1
}

expect_code "/" 200
expect_code "/login" 200
expect_code "/arithmetic" 307 308
expect_code "/arithmetic/print" 307 308
expect_code "/api/release" 200

if [[ -n "$EXPECTED_SHA" ]]; then
  payload="$(curl -fsS --max-time 8 "$BASE_URL/api/release")"
  PAYLOAD="$payload" EXPECTED_SHA="$EXPECTED_SHA" python3 - <<'PY'
import json, os
d=json.loads(os.environ["PAYLOAD"])
expected=os.environ["EXPECTED_SHA"]
actual=d.get("deployedSha") or d.get("gitSha")
assert d.get("ok") is True, d
assert actual == expected, (d, expected)
print("DEPLOYMENT_RECEIPT=PASS", expected)
PY
fi

printf 'HEALTH_CHECK=PASS base=%s\n' "$BASE_URL"
