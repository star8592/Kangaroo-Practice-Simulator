#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.elan/bin:$PATH"
cd "$ROOT"
file="${1:-fixtures/Smoke.lean}"
exec lake env lean "$file"
