#!/usr/bin/env bash
set -Eeuo pipefail

# One-time safety bridge for installations that were switched to the immutable
# prebuilt systemd drop-in while the CI-green pull deployer still builds the
# persistent checkout. Everywhere except that exact production layout this is
# deliberately a no-op.
APP_REAL="$(pwd -P)"
EXPECTED_APP="/opt/socthink-math"
SERVICE="socthink-math.service"
DROPIN="/etc/systemd/system/${SERVICE}.d/90-prebuilt-runtime.conf"
RUNNER_SRC="$EXPECTED_APP/ops/release/auto_deploy_server.sh"
RUNNER_DST="/usr/local/sbin/socthink-auto-deploy"

if [[ "${EUID}" -ne 0 || "$APP_REAL" != "$EXPECTED_APP" ]]; then
  exit 0
fi

if [[ -f "$DROPIN" ]]; then
  grep -q '/opt/socthink-releases/current' "$DROPIN" || {
    echo "BOOTSTRAP_AUTO_DEPLOY=ERROR unexpected_dropin=$DROPIN" >&2
    exit 2
  }
  backup="${DROPIN}.migrated-$(date +%Y%m%d-%H%M%S)"
  cp -a "$DROPIN" "$backup"
  rm -f "$DROPIN"
  systemctl daemon-reload
  echo "BOOTSTRAP_AUTO_DEPLOY=RUNTIME_MODE prebuilt_to_in_place backup=$backup"
fi

if [[ -f "$RUNNER_SRC" ]]; then
  install -m 0755 "$RUNNER_SRC" "$RUNNER_DST"
  echo "BOOTSTRAP_AUTO_DEPLOY=RUNNER_UPDATED"
fi
