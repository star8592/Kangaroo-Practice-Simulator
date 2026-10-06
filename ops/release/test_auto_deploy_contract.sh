#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/ops/release/auto_deploy_server.sh"
INSTALLER="$ROOT/ops/release/install_auto_deploy_server.sh"
SERVICE="$ROOT/ops/release/systemd/socthink-auto-deploy.service"
TIMER="$ROOT/ops/release/systemd/socthink-auto-deploy.timer"
BOOTSTRAP="$ROOT/ops/release/bootstrap_auto_deploy_runtime.sh"
BUILDER="$ROOT/ops/release/build_prebuilt_runtime.sh"

bash -n "$SCRIPT"
bash -n "$INSTALLER"
bash -n "$BOOTSTRAP"
bash -n "$BUILDER"

grep -q 'name")=="CI"' "$SCRIPT"
grep -q 'conclusion")=="success"' "$SCRIPT"
grep -q 'CI_SOURCE="${SOCTHINK_CI_SOURCE:-github}"' "$SCRIPT"
grep -q 'CI_GREEN source=local' "$SCRIPT"
grep -q 'local_ci_sha_mismatch' "$SCRIPT"
grep -q 'AUTO_DEPLOY=ROLLBACK' "$SCRIPT"
grep -q 'GIT_CONFIG_KEY_0=safe.directory' "$SCRIPT"
grep -q 'GIT_CONFIG_VALUE_0="$APP"' "$SCRIPT"
grep -q 'git worktree add --detach' "$SCRIPT"
grep -q 'build_prebuilt_runtime.sh' "$SCRIPT"
grep -q 'RELEASE_ROOT="${SOCTHINK_RELEASE_ROOT:-/opt/socthink-releases}"' "$SCRIPT"
grep -q 'CURRENT="$RELEASE_ROOT/current"' "$SCRIPT"
grep -q 'CANDIDATE_PORT="${SOCTHINK_CANDIDATE_PORT:-3097}"' "$SCRIPT"
grep -q '95-immutable-runtime.conf' "$SCRIPT"
grep -q 'SOCTHINK_PDF_RUNTIME_DIR' "$SCRIPT"
grep -q 'python3 scripts/smoke_test.py --base' "$SCRIPT"
grep -q 'mv -Tf "$RELEASE_ROOT/current.next" "$CURRENT"' "$SCRIPT"
grep -q 'runtime=immutable' "$SCRIPT"
grep -q 'deployedSha' "$SCRIPT"
grep -q 'gitSha' "$SCRIPT"

# The production checkout is control/data only. Dependency installation belongs
# to the isolated builder, never the live application directory.
if grep -Eq '^[[:space:]]*npm ci([[:space:]]|$)' "$SCRIPT"; then
  echo "AUTO_DEPLOY_CONTRACT=FAIL direct_npm_ci_in_runtime" >&2
  exit 1
fi

grep -q 'render_arithmetic_pdf_runtime.mjs' "$BUILDER"
grep -q 'render_diagnostic_pdf_runtime.mjs' "$BUILDER"
grep -q 'NEXT_STANDALONE_BUILD=1 npm run build' "$BUILDER"

grep -q '^ExecStart=/usr/local/sbin/socthink-auto-deploy$' "$SERVICE"
grep -q '^OnActiveSec=30s$' "$TIMER"
grep -q '^OnUnitActiveSec=2min$' "$TIMER"
grep -q '^Persistent=true$' "$TIMER"

grep -q 'immutable_preserved' "$BOOTSTRAP"
grep -q 'prebuilt_preserved' "$BOOTSTRAP"
grep -q 'in_place_fallback' "$BOOTSTRAP"
grep -q 'systemctl enable --now socthink-auto-deploy.timer' "$BOOTSTRAP"
grep -q 'systemctl is-enabled --quiet socthink-auto-deploy.timer' "$BOOTSTRAP"
grep -q 'systemctl is-active --quiet socthink-auto-deploy.timer' "$BOOTSTRAP"
grep -q 'BOOTSTRAP_AUTO_DEPLOY=TIMER_READY' "$BOOTSTRAP"

echo "AUTO_DEPLOY_CONTRACT=PASS"
