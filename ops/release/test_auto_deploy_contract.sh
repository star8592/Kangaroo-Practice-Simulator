#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/ops/release/auto_deploy_server.sh"
INSTALLER="$ROOT/ops/release/install_auto_deploy_server.sh"
SERVICE="$ROOT/ops/release/systemd/socthink-auto-deploy.service"
TIMER="$ROOT/ops/release/systemd/socthink-auto-deploy.timer"
BOOTSTRAP="$ROOT/ops/release/bootstrap_auto_deploy_runtime.sh"

bash -n "$SCRIPT"
bash -n "$INSTALLER"
bash -n "$BOOTSTRAP"

grep -q 'name") == "CI"' "$SCRIPT"
grep -q 'conclusion") == "success"' "$SCRIPT"
grep -q 'CI_SOURCE="${SOCTHINK_CI_SOURCE:-github}"' "$SCRIPT"
grep -q 'CI_GREEN source=local' "$SCRIPT"
grep -q 'local_ci_sha_mismatch' "$SCRIPT"
grep -q 'AUTO_DEPLOY=ROLLBACK' "$SCRIPT"
grep -q 'GIT_CONFIG_KEY_0=safe.directory' "$SCRIPT"
grep -q 'GIT_CONFIG_VALUE_0="$APP"' "$SCRIPT"
grep -q 'scripts/smoke_test.py' "$SCRIPT"
grep -q 'deployedSha' "$SCRIPT"
grep -q 'gitSha' "$SCRIPT"
grep -q 'Never run git clean' "$SCRIPT"

grep -q '^ExecStart=/usr/local/sbin/socthink-auto-deploy$' "$SERVICE"
grep -q '^OnActiveSec=30s$' "$TIMER"
grep -q '^OnUnitActiveSec=2min$' "$TIMER"
grep -q '^Persistent=true$' "$TIMER"

grep -q 'systemctl enable --now socthink-auto-deploy.timer' "$BOOTSTRAP"
grep -q 'systemctl is-enabled --quiet socthink-auto-deploy.timer' "$BOOTSTRAP"
grep -q 'systemctl is-active --quiet socthink-auto-deploy.timer' "$BOOTSTRAP"
grep -q 'BOOTSTRAP_AUTO_DEPLOY=TIMER_READY' "$BOOTSTRAP"

echo "AUTO_DEPLOY_CONTRACT=PASS"
