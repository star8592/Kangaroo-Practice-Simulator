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
if [ ! -f lakefile.toml ] && [ ! -f lakefile.lean ]; then
  lake +leanprover-community/mathlib4:lean-toolchain init math-verifier math
fi
lake exe cache get
lean --version
lake --version
