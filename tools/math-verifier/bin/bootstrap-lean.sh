#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v curl >/dev/null || ! command -v git >/dev/null; then
  echo 'git and curl are required' >&2
  exit 2
fi

if [ ! -x "$HOME/.elan/bin/elan" ]; then
  curl -fsSL https://elan.lean-lang.org/elan-init.sh | sh -s -- -y --default-toolchain none
fi

export PATH="$HOME/.elan/bin:$PATH"
cd "$ROOT"
TOOLCHAIN="$(cat lean-toolchain)"
elan toolchain install "$TOOLCHAIN"
lake update
lake exe cache get
lean --version
lake --version
