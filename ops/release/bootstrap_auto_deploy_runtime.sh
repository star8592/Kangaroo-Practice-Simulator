#!/usr/bin/env bash
set -Eeuo pipefail

# One-time bridge from the immutable prebuilt service override to the regular
# CI-green pull deployer. Outside the exact production checkout this is a no-op.
APP_REAL="$(pwd -P)"
EXPECTED_APP="/opt/socthink-math"
SERVICE="socthink-math.service"
DROPIN_DIR="/etc/systemd/system/${SERVICE}.d"
PREBUILT_DROPIN="$DROPIN_DIR/90-prebuilt-runtime.conf"
IN_PLACE_DROPIN="$DROPIN_DIR/90-auto-deploy-runtime.conf"
RUNNER_SRC="$EXPECTED_APP/ops/release/auto_deploy_server.sh"
RUNNER_DST="/usr/local/sbin/socthink-auto-deploy"

if [[ "${EUID}" -ne 0 || "$APP_REAL" != "$EXPECTED_APP" ]]; then
  exit 0
fi

has_pdf_browser() {
  command -v google-chrome >/dev/null 2>&1 \
    || command -v google-chrome-stable >/dev/null 2>&1 \
    || command -v chromium >/dev/null 2>&1 \
    || command -v chromium-browser >/dev/null 2>&1 \
    || [[ -x /snap/bin/chromium ]]
}

ensure_pdf_browser() {
  if has_pdf_browser; then
    echo "BOOTSTRAP_PDF_RUNTIME=READY"
    return 0
  fi

  echo "BOOTSTRAP_PDF_RUNTIME=INSTALLING"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y chromium-browser || true
    if ! has_pdf_browser; then
      DEBIAN_FRONTEND=noninteractive apt-get install -y chromium || true
    fi
  fi
  if ! has_pdf_browser && command -v snap >/dev/null 2>&1; then
    snap install chromium || true
  fi
  if ! has_pdf_browser; then
    echo "BOOTSTRAP_PDF_RUNTIME=ERROR browser_unavailable" >&2
    exit 2
  fi
  echo "BOOTSTRAP_PDF_RUNTIME=INSTALLED"
}

ensure_pdf_browser

node_bin="$(command -v node)"
mkdir -p "$DROPIN_DIR"
cat > "$IN_PLACE_DROPIN" <<EOF2
[Service]
WorkingDirectory=$EXPECTED_APP
ExecStart=
ExecStart=$node_bin $EXPECTED_APP/node_modules/next/dist/bin/next start
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
EOF2

echo "BOOTSTRAP_AUTO_DEPLOY=IN_PLACE_DROPIN_READY file=$IN_PLACE_DROPIN"

if [[ -f "$PREBUILT_DROPIN" ]]; then
  grep -q '/opt/socthink-releases/current' "$PREBUILT_DROPIN" || {
    echo "BOOTSTRAP_AUTO_DEPLOY=ERROR unexpected_dropin=$PREBUILT_DROPIN" >&2
    exit 2
  }
  backup="${PREBUILT_DROPIN}.migrated-$(date +%Y%m%d-%H%M%S)"
  cp -a "$PREBUILT_DROPIN" "$backup"
  rm -f "$PREBUILT_DROPIN"
  echo "BOOTSTRAP_AUTO_DEPLOY=RUNTIME_MODE prebuilt_to_in_place backup=$backup"
fi

systemctl daemon-reload

if [[ -f "$RUNNER_SRC" ]]; then
  install -m 0755 "$RUNNER_SRC" "$RUNNER_DST"
  echo "BOOTSTRAP_AUTO_DEPLOY=RUNNER_UPDATED"
fi
