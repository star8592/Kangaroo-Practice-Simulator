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
CI_SOURCE="${SOCTHINK_CI_SOURCE:-github}"
VERIFIED_SHA="${SOCTHINK_VERIFIED_SHA:-}"
RELEASE_ROOT="${SOCTHINK_RELEASE_ROOT:-/opt/socthink-releases}"
BUILD_ROOT="${SOCTHINK_BUILD_ROOT:-/opt/socthink-builds}"
RELEASE_KEEP="${SOCTHINK_RELEASE_KEEP:-3}"
CURRENT="$RELEASE_ROOT/current"
CANDIDATE_PORT="${SOCTHINK_CANDIDATE_PORT:-3097}"
PDF_RUNTIME_DIR="$APP/.runtime/pdf-browser"
DEBUG_FILE="$APP/public/local-assets/auto-deploy-status.json"
SERVICE_DROPIN_DIR="/etc/systemd/system/${SERVICE}.d"
IMMUTABLE_DROPIN="$SERVICE_DROPIN_DIR/95-immutable-runtime.conf"
IN_PLACE_DROPIN="$SERVICE_DROPIN_DIR/90-auto-deploy-runtime.conf"
PREBUILT_DROPIN="$SERVICE_DROPIN_DIR/90-prebuilt-runtime.conf"

log(){ printf '%s %s\n' "$(date -Iseconds)" "$*"; }

write_debug(){
  local state="$1" rc="${2:-0}" command_text="${3:-}" line_no="${4:-0}"
  mkdir -p "$(dirname "$DEBUG_FILE")"
  python3 - "$DEBUG_FILE" "$state" "$rc" "$command_text" "$line_no" "${TARGET_SHA:-}" "${PREV_SHA:-}" <<'PYDBG'
import json,sys,datetime
path,state,rc,command,line,target,prev=sys.argv[1:]
payload={
  "time":datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "state":state,"rc":int(rc or 0),"command":command[:240],"line":int(line or 0),
  "targetSha":target or None,"previousSha":prev or None,
}
with open(path,"w",encoding="utf-8") as fh: json.dump(payload,fh,ensure_ascii=False)
PYDBG
}

if [[ "${EUID}" -ne 0 ]]; then log "AUTO_DEPLOY=ERROR reason=must_run_as_root"; exit 2; fi
for command in git curl python3 npm systemctl flock node; do
  command -v "$command" >/dev/null || { log "AUTO_DEPLOY=ERROR reason=missing_command command=$command"; exit 2; }
done
[[ -d "$APP/.git" ]] || { log "AUTO_DEPLOY=ERROR reason=app_git_missing app=$APP"; exit 2; }

export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0=safe.directory
export GIT_CONFIG_VALUE_0="$APP"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then log "AUTO_DEPLOY=SKIP reason=another_deploy_running"; exit 0; fi

cd "$APP"
git remote set-url origin "https://github.com/${REPO}.git"
if ! git fetch --prune origin "$BRANCH"; then log "AUTO_DEPLOY=SKIP reason=git_fetch_failed"; exit 0; fi

TARGET_SHA="$(git rev-parse "origin/$BRANCH")"
HEAD_SHA="$(git rev-parse HEAD)"
DEPLOYED_SHA="$(cat .release/deployed_sha 2>/dev/null || true)"
if [[ "$TARGET_SHA" == "$HEAD_SHA" && "$TARGET_SHA" == "$DEPLOYED_SHA" && -L "$CURRENT" && -f "$IMMUTABLE_DROPIN" ]]; then
  log "AUTO_DEPLOY=CURRENT sha=$TARGET_SHA runtime=immutable"
  exit 0
fi

case "$CI_SOURCE" in
  local)
    if [[ -z "$VERIFIED_SHA" || "$VERIFIED_SHA" != "$TARGET_SHA" ]]; then
      log "AUTO_DEPLOY=ERROR reason=local_ci_sha_mismatch target=$TARGET_SHA verified=${VERIFIED_SHA:-missing}"
      exit 2
    fi
    log "CI_GREEN source=local sha=$TARGET_SHA"
    ;;
  github)
    CI_JSON="$(mktemp)"
    trap 'rm -f "$CI_JSON"' EXIT
    CI_URL="${API_BASE}/repos/${REPO}/actions/runs?head_sha=${TARGET_SHA}&per_page=20"
    if ! curl -fsS --retry 2 --retry-delay 2 --connect-timeout 10 --max-time 30 \
      -H 'Accept: application/vnd.github+json' -H 'User-Agent: socthink-auto-deploy/2' "$CI_URL" >"$CI_JSON"; then
      log "AUTO_DEPLOY=SKIP reason=ci_api_unavailable sha=$TARGET_SHA"; exit 0
    fi
    if ! python3 - "$CI_JSON" "$TARGET_SHA" <<'PYCI'
import json,sys
path,sha=sys.argv[1],sys.argv[2]
with open(path,"r",encoding="utf-8") as fh: payload=json.load(fh)
runs=[r for r in payload.get("workflow_runs",[]) if r.get("head_sha")==sha and r.get("name")=="CI" and r.get("path")==".github/workflows/ci.yml"]
if not any(r.get("status")=="completed" and r.get("conclusion")=="success" for r in runs):
    print("CI_NOT_GREEN "+(",".join(f"{r.get('status')}:{r.get('conclusion')}" for r in runs) if runs else "missing"),file=sys.stderr)
    raise SystemExit(1)
print("CI_GREEN",sha)
PYCI
    then log "AUTO_DEPLOY=SKIP reason=ci_not_green sha=$TARGET_SHA"; exit 0; fi
    log "CI_GREEN source=github sha=$TARGET_SHA"
    ;;
  *) log "AUTO_DEPLOY=ERROR reason=invalid_ci_source source=$CI_SOURCE"; exit 2 ;;
esac

PREV_SHA="${DEPLOYED_SHA:-$HEAD_SHA}"
PREV_CURRENT="$(readlink -f "$CURRENT" 2>/dev/null || true)"
VERSION="$(git show "$TARGET_SHA:VERSION" 2>/dev/null | tr -d '\r\n' || true)"
[[ -n "$VERSION" ]] || VERSION=dev
BUILD_SRC="$BUILD_ROOT/${TARGET_SHA}-src"
BUILD_OUT="$BUILD_ROOT/${TARGET_SHA}-out"
REL="$RELEASE_ROOT/$TARGET_SHA"
IMMUTABLE_BACKUP="/tmp/socthink-immutable-${TARGET_SHA}.conf"
HAD_IMMUTABLE=0
TEST_PID=""
PROMOTED=0

wait_ready(){
  local base="$1"
  for _ in $(seq 1 60); do
    if curl -fsS --max-time 5 "$base/api/release" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

cleanup_candidate(){
  if [[ -n "$TEST_PID" ]]; then
    kill "$TEST_PID" >/dev/null 2>&1 || true
    wait "$TEST_PID" >/dev/null 2>&1 || true
    TEST_PID=""
  fi
}

cleanup_build(){
  cd "$APP" || true
  git worktree remove --force "$BUILD_SRC" >/dev/null 2>&1 || true
  git worktree prune >/dev/null 2>&1 || true
  rm -rf "$BUILD_OUT"
}

prune_old_releases(){
  python3 - "$RELEASE_ROOT" "$CURRENT" "$RELEASE_KEEP" <<'PYPRUNE'
import os,shutil,sys
root,current,keep_raw=sys.argv[1:]
keep=max(1,int(keep_raw))
current_real=os.path.realpath(current) if os.path.lexists(current) else ""
rows=[]
for name in os.listdir(root):
    path=os.path.join(root,name)
    if name.startswith("current") or os.path.islink(path) or not os.path.isdir(path):
        continue
    rows.append((os.stat(path).st_mtime,path))
rows.sort(reverse=True)
kept=1 if current_real else 0
for _,path in rows:
    if path==current_real:
        continue
    if kept<keep:
        kept+=1
        continue
    shutil.rmtree(path)
    print("AUTO_DEPLOY_PRUNE",path)
PYPRUNE
}

restore_runtime(){
  if [[ -n "$PREV_CURRENT" ]]; then
    ln -sfn "$PREV_CURRENT" "$RELEASE_ROOT/current.rollback"
    mv -Tf "$RELEASE_ROOT/current.rollback" "$CURRENT"
  else
    rm -f "$CURRENT"
  fi
  if [[ "$HAD_IMMUTABLE" == "1" && -f "$IMMUTABLE_BACKUP" ]]; then
    cp -a "$IMMUTABLE_BACKUP" "$IMMUTABLE_DROPIN"
  else
    rm -f "$IMMUTABLE_DROPIN"
  fi
  systemctl daemon-reload || true
  systemctl restart "$SERVICE" || true
  wait_ready "$LOCAL_BASE" || true
}

on_error(){
  local rc="$1" failed_command="$2" failed_line="$3"
  trap - ERR
  cleanup_candidate
  if [[ "$PROMOTED" == "1" ]]; then restore_runtime; fi
  write_debug "rollback" "$rc" "$failed_command" "$failed_line" || true
  log "AUTO_DEPLOY=ROLLBACK from=$TARGET_SHA to=$PREV_SHA promoted=$PROMOTED exit=$rc command=$failed_command line=$failed_line"
  cleanup_build
  exit "$rc"
}
trap 'on_error "$?" "$BASH_COMMAND" "$LINENO"' ERR

write_debug "start" 0 "" 0
log "AUTO_DEPLOY=START from=$PREV_SHA to=$TARGET_SHA runtime=immutable"
mkdir -p "$BUILD_ROOT" "$RELEASE_ROOT" "$SERVICE_DROPIN_DIR"
cd "$APP"
git cat-file -e "$TARGET_SHA^{commit}"
git worktree remove --force "$BUILD_SRC" >/dev/null 2>&1 || true
rm -rf "$BUILD_SRC" "$BUILD_OUT" "$REL"
git worktree prune
git worktree add --detach "$BUILD_SRC" "$TARGET_SHA"

ROOT="$BUILD_SRC" OUT="$BUILD_OUT" TARGET_SHA="$TARGET_SHA" VERSION="$VERSION" \
  bash "$BUILD_SRC/ops/release/build_prebuilt_runtime.sh"

mv "$BUILD_OUT/runtime" "$REL"
test -f "$REL/server.js"
test "$(cat "$REL/.release/deployed_sha")" = "$TARGET_SHA"
rm -rf "$REL/private" "$REL/public/local-assets" "$REL/public/generated-solutions"
ln -s "$APP/private" "$REL/private"
mkdir -p "$REL/public"
ln -s "$APP/public/local-assets" "$REL/public/local-assets"
ln -s "$APP/public/generated-solutions" "$REL/public/generated-solutions"

cd "$REL"
write_debug "candidate" 0 "node server.js" 0
PORT="$CANDIDATE_PORT" HOSTNAME=127.0.0.1 NODE_ENV=production \
SOCTHINK_PDF_RUNTIME_DIR="$PDF_RUNTIME_DIR" node server.js >"/tmp/socthink-candidate-${TARGET_SHA}.log" 2>&1 &
TEST_PID=$!
READY=0
for _ in $(seq 1 60); do
  if ! kill -0 "$TEST_PID" >/dev/null 2>&1; then cat "/tmp/socthink-candidate-${TARGET_SHA}.log" >&2 || true; exit 21; fi
  if curl -fsS "http://127.0.0.1:${CANDIDATE_PORT}/api/release" >/dev/null 2>&1; then READY=1; break; fi
  sleep 1
done
test "$READY" = "1"
python3 scripts/smoke_test.py --base "http://127.0.0.1:${CANDIDATE_PORT}"
CANDIDATE_RELEASE="$(curl -fsS "http://127.0.0.1:${CANDIDATE_PORT}/api/release")"
RELEASE_PAYLOAD="$CANDIDATE_RELEASE" EXPECTED_SHA="$TARGET_SHA" python3 - <<'PY'
import json,os
p=json.loads(os.environ["RELEASE_PAYLOAD"]); e=os.environ["EXPECTED_SHA"]
assert p.get("ok") is True,p
assert p.get("deployedSha")==e,(p,e)
assert p.get("gitSha")==e,(p,e)
PY
cleanup_candidate
log "AUTO_DEPLOY_CANDIDATE=PASS sha=$TARGET_SHA"

if [[ -f "$IMMUTABLE_DROPIN" ]]; then cp -a "$IMMUTABLE_DROPIN" "$IMMUTABLE_BACKUP"; HAD_IMMUTABLE=1; fi
NODE_BIN="$(command -v node)"
cat >"$IMMUTABLE_DROPIN" <<EOF
[Service]
WorkingDirectory=$CURRENT
ExecStart=
ExecStart=$NODE_BIN $CURRENT/server.js
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=SOCTHINK_PDF_RUNTIME_DIR=$PDF_RUNTIME_DIR
EOF

ln -sfn "$REL" "$RELEASE_ROOT/current.next"
mv -Tf "$RELEASE_ROOT/current.next" "$CURRENT"
PROMOTED=1
systemctl daemon-reload
write_debug "restart" 0 "systemctl restart $SERVICE" 0
systemctl restart "$SERVICE"
wait_ready "$LOCAL_BASE"

LOCAL_RELEASE="$(curl -fsS --max-time 10 "$LOCAL_BASE/api/release")"
RELEASE_PAYLOAD="$LOCAL_RELEASE" EXPECTED_SHA="$TARGET_SHA" python3 - <<'PY'
import json,os
p=json.loads(os.environ["RELEASE_PAYLOAD"]); e=os.environ["EXPECTED_SHA"]
assert p.get("ok") is True,p
assert p.get("deployedSha")==e,(p,e)
assert p.get("gitSha")==e,(p,e)
PY
write_debug "smoke" 0 "python3 scripts/smoke_test.py" 0
python3 "$REL/scripts/smoke_test.py" --base "$LOCAL_BASE"

# Only after the immutable runtime is fully verified do we advance the source/control checkout.
cd "$APP"
git reset --hard "$TARGET_SHA"
mkdir -p .release
printf '%s\n' "$TARGET_SHA" > .release/deployed_sha
printf '%s\n' "$VERSION" > .release/deployed_version
date -Iseconds > .release/deployed_at
install -m 0755 "$APP/ops/release/auto_deploy_server.sh" /usr/local/sbin/socthink-auto-deploy

# The immutable runtime now owns ExecStart; retire the old in-place/prebuilt overrides.
rm -f "$IN_PLACE_DROPIN" "$PREBUILT_DROPIN"
systemctl daemon-reload
rm -f "$IMMUTABLE_BACKUP" 2>/dev/null || true
cleanup_build
trap - ERR
write_debug "pass" 0 "" 0
prune_old_releases
log "AUTO_DEPLOY=PASS sha=$TARGET_SHA runtime=immutable current=$(readlink -f "$CURRENT") releases_keep=$RELEASE_KEEP"

for _ in $(seq 1 15); do
  if PUBLIC_RELEASE="$(curl -fsS --max-time 10 "$PUBLIC_BASE/api/release" 2>/dev/null)"; then
    if RELEASE_PAYLOAD="$PUBLIC_RELEASE" EXPECTED_SHA="$TARGET_SHA" python3 - <<'PY'
import json,os
p=json.loads(os.environ["RELEASE_PAYLOAD"]); e=os.environ["EXPECTED_SHA"]
assert p.get("deployedSha")==e
assert p.get("gitSha")==e
PY
    then log "AUTO_DEPLOY_PUBLIC=PASS sha=$TARGET_SHA"; exit 0; fi
  fi
  sleep 2
done
log "AUTO_DEPLOY_PUBLIC=WARN reason=public_receipt_not_yet_visible sha=$TARGET_SHA"
