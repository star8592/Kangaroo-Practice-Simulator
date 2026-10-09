#!/usr/bin/env bash
# Read-only release, service and backup-observability check. Never changes production.
set -Eeuo pipefail
BASE_URL="${SOCTHINK_PUBLIC_URL:-https://socthink.cn}"
APP="${SOCTHINK_APP_DIR:-/opt/socthink-math}"
EXPECTED_SHA="${EXPECTED_SHA:-}"
STRICT="${STRICT:-0}"
STATUS=0
print() { printf '%s=%s\n' "$1" "$2"; }
fail() { print "$1" "FAIL"; STATUS=1; }

[[ "$BASE_URL" == https://* ]] || { echo 'Public HTTPS URL required' >&2; exit 2; }
[[ "$STRICT" == 0 || "$STRICT" == 1 ]] || exit 2

PUBLIC_JSON="$(curl -fsS --max-time 12 "$BASE_URL/api/release" 2>/dev/null || true)"
if [[ -n "$PUBLIC_JSON" ]] && RELEASE_JSON="$PUBLIC_JSON" EXPECTED_SHA="$EXPECTED_SHA" python3 - <<'PY'
import json, os, re
data=json.loads(os.environ["RELEASE_JSON"])
expect=os.environ["EXPECTED_SHA"]
deployed=data.get("deployedSha")
sha=data.get("gitSha")
assert data.get("ok") is True
assert re.fullmatch("[0-9a-f]{40}",str(deployed or ""))
assert sha == deployed
assert not expect or expect == deployed
PY
then
  PUBLIC_SHA="$(RELEASE_JSON="$PUBLIC_JSON" python3 -c 'import os,json;print(json.loads(os.environ["RELEASE_JSON"])["deployedSha"])')"
  print PUBLIC_RELEASE PASS
  print PUBLIC_SHA "$PUBLIC_SHA"
else
  fail PUBLIC_RELEASE
fi

if [[ -f "$APP/.release/deployed_sha" ]] && command -v git >/dev/null 2>&1; then
  DEPLOYED="$(cat "$APP/.release/deployed_sha" 2>/dev/null || true)"
  GIT_SHA="$(git -C "$APP" rev-parse HEAD 2>/dev/null || true)"
  if [[ -n "$DEPLOYED" && "$DEPLOYED" == "$GIT_SHA" &&
    ( -z "$EXPECTED_SHA" || "$EXPECTED_SHA" == "$DEPLOYED" ) ]]; then
    print SERVER_RELEASE PASS
  else
    fail SERVER_RELEASE
  fi
else
  print SERVER_RELEASE UNAVAILABLE
  [[ "$STRICT" == 0 ]] || STATUS=1
fi

if command -v systemctl >/dev/null 2>&1 && [[ -d /run/systemd/system ]]; then
  for UNIT in socthink-math.service socthink-auto-deploy.timer socthink-competition-source-watch.timer; do
    KEY="${UNIT//[.-]/_}"
    if systemctl is-active --quiet "$UNIT"; then print "UNIT_$KEY" PASS
    else fail "UNIT_$KEY"; fi
  done
  STATUS_TEXT="$(systemctl show -p Result --value socthink-competition-source-watch.service 2>/dev/null || true)"
  print SOURCE_WATCH_LAST_RESULT "${STATUS_TEXT:-UNKNOWN}"
  if [[ "$STATUS_TEXT" == failed || "$STATUS_TEXT" == exit-code ]]; then
    fail SOURCE_WATCH_EXECUTION
  elif [[ -z "$STATUS_TEXT" ]]; then
    print SOURCE_WATCH_EXECUTION UNKNOWN
  else
    print SOURCE_WATCH_EXECUTION OBSERVED
  fi
else
  print SYSTEMD UNAVAILABLE
  [[ "$STRICT" == 0 ]] || STATUS=1
fi

WATCH_FILE="/var/lib/socthink-competition-source-watch/competition-source-watch.json"
if [[ -r "$WATCH_FILE" ]]; then
  python3 - "$WATCH_FILE" <<'PY'
import json,sys
s=json.load(open(sys.argv[1]))
h=s.get("health",[]);o=s.get("observations",[])
print("SOURCE_MONITOR_HEALTH="+str(len(h)))
print("SOURCE_MONITOR_LAST_SUCCESSES="+str(sum(bool(x.get("lastSuccessAt")) for x in h)))
print("SOURCE_MONITOR_ERRORS="+str(sum(bool(x.get("error")) for x in h)))
print("SOURCE_REVIEW_PENDING="+str(sum(x.get("status")=="pending" for x in o)))
PY
else
  print SOURCE_MONITOR_HEALTH UNAVAILABLE
fi

# A backup directory or tarball alone is not a verified backup/restore.
# Do not auto-claim success based on merely finding files.
print OFFSITE_ENCRYPTED_BACKUP UNKNOWN
print ISOLATED_RESTORE_DRILL UNKNOWN
print WECHAT_NATIVE_PUBLISHED UNKNOWN
print PROD_READINESS "$(if [[ "$STATUS" == 0 ]]; then echo PARTIAL; else echo FAIL; fi)"
exit "$STATUS"
