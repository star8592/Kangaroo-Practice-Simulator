#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-full}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

case "$MODE" in
  public|full) ;;
  *) echo "usage: $0 [public|full]" >&2; exit 2 ;;
esac

step() {
  printf '\n==> %s\n' "$1"
  shift
  "$@"
}

if [[ "${INSTALL_DEPS:-0}" == "1" ]]; then
  step "install locked dependencies" npm ci
fi

step "arithmetic regression" npm run test:arithmetic
step "A4 personalization regression" npm run test:arithmetic-print
step "eslint" npm run lint
step "typescript" npx tsc --noEmit
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  step "diff whitespace" git diff --check
else
  echo "==> diff whitespace: skipped (immutable archive has no .git)"
fi

if [[ "$MODE" == "full" ]]; then
  step "full production build + private-data gates" npm run build
else
  step "public production build" npx next build
fi

SHA="$(git rev-parse HEAD 2>/dev/null || cat .release/deployed_sha 2>/dev/null || printf unknown)"
printf '\nQUALITY_GATE=PASS mode=%s sha=%s\n' "$MODE" "$SHA"