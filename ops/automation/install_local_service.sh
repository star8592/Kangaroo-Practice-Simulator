#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UNIT_SRC="$ROOT/ops/systemd/math-competition-lab.service"
UNIT_DST="$HOME/.config/systemd/user/math-competition-lab.service"

mkdir -p "$(dirname "$UNIT_DST")"
install -m 0644 "$UNIT_SRC" "$UNIT_DST"
systemctl --user daemon-reload
systemctl --user enable math-competition-lab.service

echo "SERVICE_UNIT_INSTALLED=$UNIT_DST"
echo "Run an atomic deploy before starting/restarting the service:"
echo "  bash $ROOT/ops/automation/deploy_atomic.sh <git-sha>"
