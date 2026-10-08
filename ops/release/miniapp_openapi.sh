#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${MINIAPP_ENV_FILE:-/etc/socthink-math-wechat.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi
cd "$ROOT"
exec node ops/release/miniapp_openapi.mjs "${1:-status}"
