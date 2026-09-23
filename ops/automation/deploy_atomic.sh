#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${REPO:-/mnt/disk1/Code/Kangaroo-Practice-Simulator}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/mnt/disk1/Code/.deploy/math-competition-lab}"
SERVICE="${SERVICE:-math-competition-lab.service}"
LIVE_PORT="${LIVE_PORT:-3027}"
STAGING_PORT="${STAGING_PORT:-3127}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
TARGET_SHA="${1:-$(git -C "$REPO" rev-parse HEAD)}"

PRIVATE_STATE="${PRIVATE_STATE:-$REPO/private}"
LOCAL_ASSETS_STATE="${LOCAL_ASSETS_STATE:-$REPO/public/local-assets}"
GENERATED_STATE="${GENERATED_STATE:-$REPO/public/generated-solutions}"

mkdir -p "$DEPLOY_ROOT/releases" "$DEPLOY_ROOT/logs"
exec 9>"$DEPLOY_ROOT/deploy.lock"
flock -n 9 || { echo "another deployment is running" >&2; exit 75; }

git -C "$REPO" cat-file -e "$TARGET_SHA^{commit}"
TARGET_SHA="$(git -C "$REPO" rev-parse "$TARGET_SHA")"
FINAL="$DEPLOY_ROOT/releases/$TARGET_SHA"
TMP="$DEPLOY_ROOT/releases/.tmp-$TARGET_SHA-$$"
CURRENT="$DEPLOY_ROOT/current"
PREVIOUS="$(readlink -f "$CURRENT" 2>/dev/null || true)"
STAGING_PID=""

cleanup() {
  if [[ -n "$STAGING_PID" ]]; then
    kill "$STAGING_PID" 2>/dev/null || true
    wait "$STAGING_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT

restart_live() {
  if [[ "${RESTART_MODE:-auto}" == "systemctl" ]]; then
    systemctl --user restart "$SERVICE"
    return
  fi
  if systemctl --user restart "$SERVICE" >/dev/null 2>&1; then
    return
  fi
  mkdir -p "$DEPLOY_ROOT"
  date -Iseconds > "$DEPLOY_ROOT/reload.request"
  echo "restart requested through systemd path watcher"
}

rollback_live() {
  local rc="$1"
  trap - ERR
  echo "deployment failed rc=$rc; rolling back" >&2
  if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
    ln -sfn "$PREVIOUS" "$DEPLOY_ROOT/current.next"
    mv -Tf "$DEPLOY_ROOT/current.next" "$CURRENT"
    restart_live || true
  fi
  exit "$rc"
}
trap 'rollback_live $?' ERR

if [[ ! -d "$FINAL" ]]; then
  mkdir -p "$TMP"
  git -C "$REPO" archive "$TARGET_SHA" | tar -x -C "$TMP"

  rm -rf "$TMP/private" "$TMP/public/local-assets" "$TMP/public/generated-solutions"
  mkdir -p "$TMP/public" "$GENERATED_STATE"

  snapshot_dir() {
    local source="$1"
    local destination="$2"
    if cp -al "$source" "$destination" 2>/dev/null; then
      return 0
    fi
    cp -a --reflink=auto "$source" "$destination"
  }

  # Turbopack rejects a project-root symlink that points outside the build root.
  # Build from a cheap same-filesystem snapshot, then restore persistent runtime links.
  snapshot_dir "$PRIVATE_STATE" "$TMP/private"
  snapshot_dir "$LOCAL_ASSETS_STATE" "$TMP/public/local-assets"
  snapshot_dir "$GENERATED_STATE" "$TMP/public/generated-solutions"

  mkdir -p "$TMP/.release"
  printf '%s\n' "$TARGET_SHA" > "$TMP/.release/deployed_sha"
  date -Iseconds > "$TMP/.release/deployed_at"

  cd "$TMP"
  npm ci
  npm run build

  rm -rf "$TMP/private" "$TMP/public/local-assets" "$TMP/public/generated-solutions"
  ln -s "$PRIVATE_STATE" "$TMP/private"
  ln -s "$LOCAL_ASSETS_STATE" "$TMP/public/local-assets"
  ln -s "$GENERATED_STATE" "$TMP/public/generated-solutions"

  node node_modules/next/dist/bin/next start -p "$STAGING_PORT" >"$DEPLOY_ROOT/logs/staging-$TARGET_SHA.log" 2>&1 &
  STAGING_PID="$!"
  for _ in $(seq 1 40); do
    if curl -fsS --max-time 2 "http://127.0.0.1:$STAGING_PORT/api/release" >/dev/null 2>&1; then
      break
    fi
    sleep .25
  done

  BASE_URL="http://127.0.0.1:$STAGING_PORT" EXPECTED_SHA="$TARGET_SHA"     bash ops/automation/health_check.sh
  BASE_URL="http://127.0.0.1:$STAGING_PORT" npx tsx scripts/smoke_arithmetic_print_live.ts

  kill "$STAGING_PID" 2>/dev/null || true
  wait "$STAGING_PID" 2>/dev/null || true
  STAGING_PID=""

  mv "$TMP" "$FINAL"
fi

if [[ "${STAGING_ONLY:-0}" == "1" ]]; then
  trap - ERR
  printf 'STAGING_RELEASE=PASS sha=%s release=%s\n' "$TARGET_SHA" "$FINAL"
  exit 0
fi

ln -sfn "$FINAL" "$DEPLOY_ROOT/current.next"
mv -Tf "$DEPLOY_ROOT/current.next" "$CURRENT"

restart_live
for _ in $(seq 1 40); do
  if curl -fsS --max-time 2 "http://127.0.0.1:$LIVE_PORT/api/release" >/dev/null 2>&1; then
    break
  fi
  sleep .25
done

BASE_URL="http://127.0.0.1:$LIVE_PORT" EXPECTED_SHA="$TARGET_SHA"   bash "$CURRENT/ops/automation/health_check.sh"
BASE_URL="http://127.0.0.1:$LIVE_PORT"   "$CURRENT/node_modules/.bin/tsx" "$CURRENT/scripts/smoke_arithmetic_print_live.ts"

printf '{"sha":"%s","deployedAt":"%s","previous":"%s"}\n'   "$TARGET_SHA" "$(date -Iseconds)" "$PREVIOUS" >> "$DEPLOY_ROOT/deployments.jsonl"

mapfile -t releases < <(find "$DEPLOY_ROOT/releases" -mindepth 1 -maxdepth 1 -type d ! -name '.tmp-*' -printf '%T@ %p\n' | sort -nr | awk '{print $2}')
for ((i=KEEP_RELEASES; i<${#releases[@]}; i++)); do
  candidate="${releases[$i]}"
  [[ "$candidate" == "$FINAL" || "$candidate" == "$PREVIOUS" ]] && continue
  rm -rf "$candidate"
done

trap - ERR
printf 'DEPLOYMENT=PASS sha=%s live=http://127.0.0.1:%s\n' "$TARGET_SHA" "$LIVE_PORT"