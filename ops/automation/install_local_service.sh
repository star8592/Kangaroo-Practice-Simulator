#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEPLOY_ROOT="${DEPLOY_ROOT:-/mnt/disk1/Code/.deploy/math-competition-lab}"
UNIT_DIR="$HOME/.config/systemd/user"
TARGET_SHA="${1:-$(git -C "$ROOT" rev-parse HEAD)}"

mkdir -p "$UNIT_DIR" "$DEPLOY_ROOT"
touch "$DEPLOY_ROOT/reload.request"

install -m 0644 "$ROOT/ops/systemd/math-competition-lab.service" "$UNIT_DIR/math-competition-lab.service"
install -m 0644 "$ROOT/ops/systemd/math-competition-lab-reload.service" "$UNIT_DIR/math-competition-lab-reload.service"
install -m 0644 "$ROOT/ops/systemd/math-competition-lab-reload.path" "$UNIT_DIR/math-competition-lab-reload.path"

systemctl --user daemon-reload
systemctl --user enable --now math-competition-lab-reload.path
systemctl --user enable math-competition-lab.service

RESTART_MODE=systemctl DEPLOY_ROOT="$DEPLOY_ROOT"   bash "$ROOT/ops/automation/deploy_atomic.sh" "$TARGET_SHA"

echo "LOCAL_AUTOMATION_BOOTSTRAP=PASS sha=$TARGET_SHA"
