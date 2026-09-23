#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
: "${BASE_URL:=http://127.0.0.1:3027}"
export BASE_URL
exec bash "$ROOT/ops/automation/health_check.sh" "$@"
