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

step "dependency security audit" npm run audit:security
step "arithmetic regression" npm run test:arithmetic
step "arithmetic milestones" npx tsx scripts/test_arithmetic_milestones.ts
step "persistent arithmetic honors" npx tsx scripts/test_arithmetic_honors.ts
step "A4 personalization regression" npm run test:arithmetic-print
step "Chinese-default UI audit" python3 scripts/audit_chinese_ui.py
step "global bilingual navigation audit" python3 scripts/audit_global_language.py
step "design system audit" python3 scripts/audit_design_system.py
step "grade-one narration bundle" python3 scripts/test_grade1_narration_bundle.py
step "grade-one verified solution bundle" python3 scripts/test_grade1_solution_bundle.py
step "grade-one solution store" npx tsx scripts/test_grade1_solution_store.ts
step "math cardbook progression" npx tsx scripts/test_math_cardbook.ts
step "auto-deploy contract" bash ops/release/test_auto_deploy_contract.sh
step "miniapp backend contract" npm run test:miniapp-contract
step "miniapp web parity" npm run test:miniapp-parity
step "public membership benefits catalog" npx tsx scripts/test_access_catalog.ts
step "payment configuration safeguards (no real credentials)" node scripts/test_wechat_pay_readiness.mjs
step "local CI deploy contract" bash ops/release/test_local_ci_deploy_contract.sh
step "auth email SMTP contract" bash ops/release/test_auth_email_smtp_contract.sh
step "parent auth regression" npm run test:parent-auth
step "guest bootstrap reverse-proxy regression" npx tsx scripts/test_guest_bootstrap.ts
step "guest/full-exam authorization regression" npm run test:exam-access
step "wechat auth regression" npm run test:wechat-auth
step "miniapp auth install contract" bash ops/release/test_wechat_miniapp_auth_contract.sh
step "repository hygiene" python3 scripts/audit_repository_hygiene.py
step "CEMC scoring regression" npx tsx scripts/test_cemc_scoring.ts
step "competition ingestion regression" python3 scripts/test_import_pipeline.py
step "eslint" npm run lint -- --max-warnings=0
# Next-generated route validators can retain deleted/renamed routes until the next build.
# Remove only generated type outputs before standalone tsc; the production build below
# regenerates and validates the current route tree.
step "clear stale Next route types" rm -rf .next/types .next/dev/types
step "typescript" npx tsc --noEmit
if [[ -d private/solutions ]]; then
  step "solution experience V2 tagged contract" python3 scripts/validate_solution_standard_v2.py --enforce-tagged --show 0
fi
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  step "diff whitespace" git diff --check
else
  echo "==> diff whitespace: skipped (immutable archive has no .git)"
fi

if [[ "$MODE" == "full" ]]; then
  step "private-data gates" npm run test:private-gates
  step "full production build" npx next build
else
  step "public production build" npx next build
fi

SHA="$(git rev-parse HEAD 2>/dev/null || cat .release/deployed_sha 2>/dev/null || printf unknown)"
printf '\nQUALITY_GATE=PASS mode=%s sha=%s\n' "$MODE" "$SHA"
