#!/usr/bin/env bash
set -Eeuo pipefail

APP="${SOCTHINK_APP_DIR:-/opt/socthink-math}"
SERVICE="${SOCTHINK_SERVICE:-socthink-math.service}"
REPO="${SOCTHINK_REPO:-star8592/Kangaroo-Practice-Simulator}"
BRANCH="${SOCTHINK_BRANCH:-main}"
LOCAL_BASE="${SOCTHINK_LOCAL_BASE:-http://127.0.0.1:3000}"
PUBLIC_BASE="${SOCTHINK_PUBLIC_BASE:-https://socthink.cn}"
LOCK_FILE="${SOCTHINK_DEPLOY_LOCK:-/run/lock/socthink-auto-deploy.lock}"
API_BASE="${SOCTHINK_GITHUB_API:-https://api.github.com}"

log() {
  printf '%s %s\n' "$(date -Iseconds)" "$*"
}

if [[ "${EUID}" -ne 0 ]]; then
  log "AUTO_DEPLOY=ERROR reason=must_run_as_root"
  exit 2
fi

for command in git curl python3 npm systemctl flock; do
  command -v "$command" >/dev/null || {
    log "AUTO_DEPLOY=ERROR reason=missing_command command=$command"
    exit 2
  }
done

[[ -d "$APP/.git" ]] || {
  log "AUTO_DEPLOY=ERROR reason=app_git_missing app=$APP"
  exit 2
}

# The production checkout can be owned by the deployment account rather than
# root. Trust only this exact configured application path for this process.
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0=safe.directory
export GIT_CONFIG_VALUE_0="$APP"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "AUTO_DEPLOY=SKIP reason=another_deploy_running"
  exit 0
fi

cd "$APP"
git remote set-url origin "https://github.com/${REPO}.git"
if ! git fetch --prune origin "$BRANCH"; then
  log "AUTO_DEPLOY=SKIP reason=git_fetch_failed"
  exit 0
fi

TARGET_SHA="$(git rev-parse "origin/$BRANCH")"
HEAD_SHA="$(git rev-parse HEAD)"
DEPLOYED_SHA="$(cat .release/deployed_sha 2>/dev/null || true)"

if [[ "$TARGET_SHA" == "$HEAD_SHA" && "$TARGET_SHA" == "$DEPLOYED_SHA" ]]; then
  log "AUTO_DEPLOY=CURRENT sha=$TARGET_SHA"
  exit 0
fi

CI_JSON="$(mktemp)"
trap 'rm -f "$CI_JSON"' EXIT

CI_URL="${API_BASE}/repos/${REPO}/actions/runs?head_sha=${TARGET_SHA}&per_page=20"
if ! curl -fsS   --retry 2   --retry-delay 2   --connect-timeout 10   --max-time 30   -H 'Accept: application/vnd.github+json'   -H 'User-Agent: socthink-auto-deploy/1'   "$CI_URL" >"$CI_JSON"; then
  log "AUTO_DEPLOY=SKIP reason=ci_api_unavailable sha=$TARGET_SHA"
  exit 0
fi

if ! python3 - "$CI_JSON" "$TARGET_SHA" <<'PY'
import json
import sys

path, sha = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as fh:
    payload = json.load(fh)

runs = [
    run
    for run in payload.get("workflow_runs", [])
    if run.get("head_sha") == sha
    and run.get("name") == "CI"
    and run.get("path") == ".github/workflows/ci.yml"
]
green = any(
    run.get("status") == "completed" and run.get("conclusion") == "success"
    for run in runs
)
if not green:
    states = [f"{run.get('status')}:{run.get('conclusion')}" for run in runs]
    print("CI_NOT_GREEN " + (",".join(states) if states else "missing"), file=sys.stderr)
    raise SystemExit(1)
print("CI_GREEN", sha)
PY
then
  log "AUTO_DEPLOY=SKIP reason=ci_not_green sha=$TARGET_SHA"
  exit 0
fi

PREV_SHA="$HEAD_SHA"
SERVICE_DROPIN_DIR="/etc/systemd/system/${SERVICE}.d"
PREBUILT_DROPIN="${SERVICE_DROPIN_DIR}/90-prebuilt-runtime.conf"
IN_PLACE_DROPIN="${SERVICE_DROPIN_DIR}/90-auto-deploy-runtime.conf"
PREBUILT_BACKUP="/tmp/socthink-auto-deploy-prebuilt-${TARGET_SHA}.conf"
PREBUILT_RECONCILED=0

ensure_in_place_runtime() {
  local node_bin
  node_bin="$(command -v node)"
  mkdir -p "$SERVICE_DROPIN_DIR"
  cat > "$IN_PLACE_DROPIN" <<EOF
[Service]
WorkingDirectory=$APP
ExecStart=
ExecStart=$node_bin $APP/node_modules/next/dist/bin/next start
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
EOF
}

reconcile_prebuilt_runtime() {
  if [[ ! -f "$PREBUILT_DROPIN" ]]; then
    return 0
  fi
  if ! grep -q '/opt/socthink-releases/current' "$PREBUILT_DROPIN"; then
    log "AUTO_DEPLOY=ERROR reason=unexpected_service_dropin file=$PREBUILT_DROPIN"
    return 1
  fi
  cp -a "$PREBUILT_DROPIN" "$PREBUILT_BACKUP"
  ensure_in_place_runtime
  rm -f "$PREBUILT_DROPIN"
  systemctl daemon-reload
  PREBUILT_RECONCILED=1
  log "AUTO_DEPLOY=RUNTIME_MODE from=prebuilt to=in_place"
}

restore_prebuilt_runtime() {
  if [[ "$PREBUILT_RECONCILED" == "1" && -f "$PREBUILT_BACKUP" ]]; then
    mkdir -p "$(dirname "$PREBUILT_DROPIN")"
    cp -a "$PREBUILT_BACKUP" "$PREBUILT_DROPIN"
    systemctl daemon-reload || true
    log "AUTO_DEPLOY=RUNTIME_MODE rollback=prebuilt"
  fi
}

write_release_receipt() {
  local sha="$1"
  mkdir -p .release
  printf '%s\n' "$sha" > .release/deployed_sha
  git show "$sha:VERSION" 2>/dev/null | tr -d '\r' > .release/deployed_version     || printf '%s\n' unknown > .release/deployed_version
  date -Iseconds > .release/deployed_at
}

wait_local_ready() {
  for _ in $(seq 1 60); do
    if curl -fsS --max-time 5 "$LOCAL_BASE/api/release" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

rollback() {
  local rc=$?
  trap - ERR
  log "AUTO_DEPLOY=ROLLBACK from=$TARGET_SHA to=$PREV_SHA exit=$rc"
  cd "$APP"
  git reset --hard "$PREV_SHA" || true
  npm ci || true
  npm run build || true
  write_release_receipt "$PREV_SHA" || true
  restore_prebuilt_runtime
  systemctl restart "$SERVICE" || true
  wait_local_ready || true
  exit "$rc"
}
trap rollback ERR

log "AUTO_DEPLOY=START from=$PREV_SHA to=$TARGET_SHA"
git cat-file -e "$TARGET_SHA^{commit}"
ensure_in_place_runtime
reconcile_prebuilt_runtime
systemctl daemon-reload
git reset --hard "$TARGET_SHA"

# Never run git clean here. private/, public/local-assets/, generated runtime
# data and release receipts must survive normal code deployments.
npm ci
npm run build

write_release_receipt "$TARGET_SHA"
systemctl restart "$SERVICE"
wait_local_ready

LOCAL_RELEASE="$(curl -fsS --max-time 10 "$LOCAL_BASE/api/release")"
RELEASE_PAYLOAD="$LOCAL_RELEASE" EXPECTED_SHA="$TARGET_SHA" python3 - <<'PY'
import json
import os

payload = json.loads(os.environ["RELEASE_PAYLOAD"])
expected = os.environ["EXPECTED_SHA"]
assert payload.get("ok") is True, payload
assert payload.get("deployedSha") == expected, (payload, expected)
assert payload.get("gitSha") == expected, (payload, expected)
PY

python3 scripts/smoke_test.py --base "$LOCAL_BASE"
test "$(git rev-parse HEAD)" = "$TARGET_SHA"

trap - ERR
rm -f "$PREBUILT_BACKUP" 2>/dev/null || true
# Keep the installed runner synchronized with the verified repository copy.
install -m 0755 "$APP/ops/release/auto_deploy_server.sh" /usr/local/sbin/socthink-auto-deploy
log "AUTO_DEPLOY=PASS sha=$TARGET_SHA"

for _ in $(seq 1 15); do
  if PUBLIC_RELEASE="$(curl -fsS --max-time 10 "$PUBLIC_BASE/api/release" 2>/dev/null)"; then
    if RELEASE_PAYLOAD="$PUBLIC_RELEASE" EXPECTED_SHA="$TARGET_SHA" python3 - <<'PY'
import json
import os

payload = json.loads(os.environ["RELEASE_PAYLOAD"])
expected = os.environ["EXPECTED_SHA"]
assert payload.get("deployedSha") == expected
assert payload.get("gitSha") == expected
PY
    then
      log "AUTO_DEPLOY_PUBLIC=PASS sha=$TARGET_SHA"
      exit 0
    fi
  fi
  sleep 2
done

# The deployment is locally verified and smoke-tested. A transient public-edge
# verification failure is reported but does not roll back a known-good release.
log "AUTO_DEPLOY_PUBLIC=WARN reason=public_receipt_not_yet_visible sha=$TARGET_SHA"
