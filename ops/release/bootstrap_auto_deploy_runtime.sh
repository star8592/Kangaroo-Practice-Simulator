#!/usr/bin/env bash
set -Eeuo pipefail

APP_REAL="$(pwd -P)"
EXPECTED_APP="/opt/socthink-math"
SERVICE="socthink-math.service"
DROPIN_DIR="/etc/systemd/system/${SERVICE}.d"
IMMUTABLE_DROPIN="$DROPIN_DIR/95-immutable-runtime.conf"
IN_PLACE_DROPIN="$DROPIN_DIR/90-auto-deploy-runtime.conf"
PREBUILT_DROPIN="$DROPIN_DIR/90-prebuilt-runtime.conf"
RUNNER_SRC="$EXPECTED_APP/ops/release/auto_deploy_server.sh"
RUNNER_DST="/usr/local/sbin/socthink-auto-deploy"
AUTO_SERVICE_SRC="$EXPECTED_APP/ops/release/systemd/socthink-auto-deploy.service"
AUTO_TIMER_SRC="$EXPECTED_APP/ops/release/systemd/socthink-auto-deploy.timer"
AUTO_SERVICE_DST="/etc/systemd/system/socthink-auto-deploy.service"
AUTO_TIMER_DST="/etc/systemd/system/socthink-auto-deploy.timer"
PDF_RUNTIME_DIR="$EXPECTED_APP/.runtime/pdf-browser"
PDF_RUNTIME_VERSION="chromium-153.0.0_puppeteer-25.12.0"

if [[ "${EUID}" -ne 0 || "$APP_REAL" != "$EXPECTED_APP" ]]; then
  exit 0
fi

ensure_pdf_runtime(){
  local marker="$PDF_RUNTIME_DIR/.runtime-version"
  if [[ -f "$marker" ]] && [[ "$(cat "$marker")" == "$PDF_RUNTIME_VERSION" ]] \
    && [[ -f "$PDF_RUNTIME_DIR/node_modules/@sparticuz/chromium/package.json" ]] \
    && [[ -f "$PDF_RUNTIME_DIR/node_modules/puppeteer-core/package.json" ]]; then
    echo "BOOTSTRAP_PDF_RUNTIME=READY version=$PDF_RUNTIME_VERSION"
    return 0
  fi
  echo "BOOTSTRAP_PDF_RUNTIME=INSTALL version=$PDF_RUNTIME_VERSION"
  mkdir -p "$PDF_RUNTIME_DIR"
  printf '%s\n' '{"private":true}' > "$PDF_RUNTIME_DIR/package.json"
  rm -rf "$PDF_RUNTIME_DIR/node_modules"
  npm install --prefix "$PDF_RUNTIME_DIR" --no-save --no-package-lock --omit=dev --no-audit --no-fund \
    @sparticuz/chromium@153.0.0 puppeteer-core@25.12.0
  test -f "$PDF_RUNTIME_DIR/node_modules/@sparticuz/chromium/package.json"
  test -f "$PDF_RUNTIME_DIR/node_modules/puppeteer-core/package.json"
  printf '%s\n' "$PDF_RUNTIME_VERSION" > "$marker"
  echo "BOOTSTRAP_PDF_RUNTIME=READY version=$PDF_RUNTIME_VERSION"
}

ensure_pdf_runtime
node_bin="$(command -v node)"
mkdir -p "$DROPIN_DIR"

# During the one-time migration, production may still be running in-place.
# Preserve an existing immutable/prebuilt runtime; otherwise keep a known-good
# in-place fallback until the new deployer has built and smoke-tested a release.
if [[ -f "$IMMUTABLE_DROPIN" ]]; then
  echo "BOOTSTRAP_AUTO_DEPLOY=RUNTIME_MODE immutable_preserved"
elif [[ -f "$PREBUILT_DROPIN" ]]; then
  echo "BOOTSTRAP_AUTO_DEPLOY=RUNTIME_MODE prebuilt_preserved"
else
  cat > "$IN_PLACE_DROPIN" <<EOF
[Service]
WorkingDirectory=$EXPECTED_APP
ExecStart=
ExecStart=$node_bin $EXPECTED_APP/node_modules/next/dist/bin/next start
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
EOF
  echo "BOOTSTRAP_AUTO_DEPLOY=RUNTIME_MODE in_place_fallback"
fi

if [[ -f "$RUNNER_SRC" ]]; then
  install -m 0755 "$RUNNER_SRC" "$RUNNER_DST"
  echo "BOOTSTRAP_AUTO_DEPLOY=RUNNER_UPDATED"
fi

if [[ -f "$AUTO_SERVICE_SRC" && -f "$AUTO_TIMER_SRC" ]]; then
  install -m 0644 "$AUTO_SERVICE_SRC" "$AUTO_SERVICE_DST"
  install -m 0644 "$AUTO_TIMER_SRC" "$AUTO_TIMER_DST"
  systemctl daemon-reload
  systemctl enable --now socthink-auto-deploy.timer
  systemctl is-enabled --quiet socthink-auto-deploy.timer
  systemctl is-active --quiet socthink-auto-deploy.timer
  echo "BOOTSTRAP_AUTO_DEPLOY=TIMER_READY"
else
  systemctl daemon-reload
  echo "BOOTSTRAP_AUTO_DEPLOY=ERROR timer_units_missing" >&2
  exit 2
fi
