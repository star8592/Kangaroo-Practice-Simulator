#!/usr/bin/env bash
# Fast, bounded acceptance for ordinary Web changes.
#
# Keep high-risk user-visible invariants (exam integrity, identity, payment,
# compilation) in this lane. Component diagnostics, source intelligence,
# backup restore drills and offline QA run independently through
# 'verify:full': they must not block an unrelated page release.
set -Eeuo pipefail

MODE="${1:-public}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

case "$MODE" in
  public) ;;
  full) exec bash "$ROOT/ops/automation/extended_diagnostics.sh" full ;;
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

# Four real boundaries; no dependency on source monitoring or disaster drills.
step "exam mathematics and symbol-input contract" npm run test:arithmetic
step "Web and miniapp answer-input parity" npm run test:math-answer-input
step "training catalog and exam availability" npm run test:platform
step "single WeChat buyer and exam entitlements" npm run test:single-wechat-buyer
step "server-side exam access" npm run test:exam-access
step "exam access live-smoke fixture contract" npm run test:exam-access-live-contract
step "exactly-once exam submission" npm run test:exam-submit-recovery
step "WeChat Native cryptographic boundary" npm run test:wechat-native-boundary
step "WeChat Native transport" npm run test:wechat-native-transport
step "WeChat QR expiry" npm run test:native-qr-expiry
step "Native checkout buyer scope" npm run test:wechat-native-flags
step "release smoke and rollback wiring" npm run test:engineering-contract

step "lint" npm run lint -- --max-warnings=0
# Build tools may retain deleted route types in the worktree.
step "clear generated stale Next route types" rm -rf .next/types .next/dev/types
step "typescript" npx tsc --noEmit
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  step "diff whitespace" git diff --check
fi
step "candidate Web build" npx next build

SHA="$(git rev-parse HEAD 2>/dev/null || cat .release/deployed_sha 2>/dev/null || printf unknown)"
printf '\nQUALITY_GATE=PASS mode=public sha=%s\n' "$SHA"
