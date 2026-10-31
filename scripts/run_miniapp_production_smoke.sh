#!/usr/bin/env bash
# Read-only production API checks pinned to ONE actually deployed immutable SHA.
# A mid-run deployment switch is not evidence of an auth or catalogue failure.
# No timers, services, mutation, or report-as-success for inconclusive checks.
set -Eeuo pipefail

BASE_URL="${MINIAPP_PROD_BASE_URL:-https://socthink.cn}"
MAX_ATTEMPTS=3

live_sha() {
  curl --fail --silent --show-error --max-time 15 "$BASE_URL/api/release" |
    python3 -c '
import json,sys
r=json.load(sys.stdin)
sha=r.get("deployedSha")
assert r.get("ok") is True and sha==r.get("gitSha") and isinstance(sha,str)
assert len(sha)==40 and all(c in "0123456789abcdef" for c in sha)
print(sha)
'
}

for ((attempt=1;attempt<=MAX_ATTEMPTS;attempt++)); do
  if ! START_SHA="$(live_sha)"; then
    echo "MINIAPP_PROD_SMOKE=FAIL reason=cannot_identify_deployed_sha attempt=$attempt" >&2
    exit 1
  fi
  echo "MINIAPP_PROD_SMOKE=START sha=$START_SHA attempt=$attempt/$MAX_ATTEMPTS"

  # Pin contracts to the deployed release; never run future main scripts
  # against yesterday's production server. This checkout is isolated to CI.
  git fetch --depth=1 origin "$START_SHA"
  git -c advice.detachedHead=false checkout --detach "$START_SHA"
  npm ci --no-audit --no-fund

  # Preserve actual failures, but first check whether production switched
  # between the start and end of this run. If so, rerun against new release.
  mini_rc=0
  exam_rc=0
  MINIAPP_LIVE_BASE="$BASE_URL" npm run test:miniapp-live || mini_rc=$?
  if ((mini_rc==0)); then
    BASE_URL="$BASE_URL" EXPECTED_SHA="$START_SHA" npm run test:exam-access-live || exam_rc=$?
  fi

  if ! END_SHA="$(live_sha)"; then
    echo "MINIAPP_PROD_SMOKE=FAIL reason=cannot_verify_final_sha attempt=$attempt" >&2
    exit 1
  fi
  if [[ "$START_SHA" != "$END_SHA" ]]; then
    echo "MINIAPP_PROD_SMOKE=RELEASE_TRANSITION from=$START_SHA to=$END_SHA attempt=$attempt" >&2
    continue
  fi
  if ((mini_rc!=0 || exam_rc!=0)); then
    echo "MINIAPP_PROD_SMOKE=FAIL reason=stable_release_test_failed sha=$START_SHA miniapp_rc=$mini_rc exam_rc=$exam_rc" >&2
    exit 1
  fi
  echo "MINIAPP_PROD_SMOKE=PASS stable_sha=$START_SHA attempts=$attempt"
  exit 0
done

echo "MINIAPP_PROD_SMOKE=INCONCLUSIVE reason=production_changed_during_all_${MAX_ATTEMPTS}_attempts" >&2
exit 1
