#!/usr/bin/env bash
set -Eeuo pipefail
[[ "${EUID}" == "0" ]] || { echo "Must run as root" >&2; exit 1; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
[[ "$ROOT" == "/opt/socthink-math" ]] || { echo "Run only from verified production checkout" >&2; exit 2; }
DEPLOYED="$(cat "$ROOT/.release/deployed_sha" 2>/dev/null || true)"
HEAD="$(git -C "$ROOT" rev-parse HEAD)"
[[ -n "$DEPLOYED" && "$DEPLOYED" == "$HEAD" ]] || { echo "Deploy SHA mismatch; reject unverified source-watch install" >&2; exit 2; }
test -x "$ROOT/node_modules/.bin/tsx" || { echo "tsx executable not present" >&2; exit 2; }

for f in socthink-competition-source-watch.service socthink-competition-source-watch.timer; do
  install -o root -g root -m 0644 "$ROOT/ops/intelligence/$f" "/etc/systemd/system/$f"
done
systemctl daemon-reload
systemctl reset-failed socthink-competition-source-watch.service || true
systemctl enable --now socthink-competition-source-watch.timer
systemctl start --no-block socthink-competition-source-watch.service
systemctl status socthink-competition-source-watch.timer --no-pager -l
