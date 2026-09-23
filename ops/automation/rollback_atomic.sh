#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/mnt/disk1/Code/.deploy/math-competition-lab}"
SERVICE="${SERVICE:-math-competition-lab.service}"
LIVE_PORT="${LIVE_PORT:-3027}"
CURRENT="$DEPLOY_ROOT/current"

mapfile -t releases < <(find "$DEPLOY_ROOT/releases" -mindepth 1 -maxdepth 1 -type d ! -name '.tmp-*' -printf '%T@ %p\n' | sort -nr | awk '{print $2}')
active="$(readlink -f "$CURRENT" 2>/dev/null || true)"
target=""

for release in "${releases[@]}"; do
  if [[ "$release" != "$active" ]]; then
    target="$release"
    break
  fi
done

[[ -n "$target" ]] || { echo "no rollback release available" >&2; exit 1; }

ln -sfn "$target" "$DEPLOY_ROOT/current.next"
mv -Tf "$DEPLOY_ROOT/current.next" "$CURRENT"
systemctl --user restart "$SERVICE"

for _ in $(seq 1 40); do
  if curl -fsS --max-time 2 "http://127.0.0.1:$LIVE_PORT/api/release" >/dev/null 2>&1; then
    break
  fi
  sleep .25
done

BASE_URL="http://127.0.0.1:$LIVE_PORT" bash "$CURRENT/ops/automation/health_check.sh"
printf 'ROLLBACK=PASS release=%s\n' "$target"