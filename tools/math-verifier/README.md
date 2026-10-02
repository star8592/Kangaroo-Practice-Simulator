# math-verifier

Backend verification prototype for socthink.cn.

Principles:
1. Lean is a trust layer, not the student UI.
2. Use the cheapest sound verifier appropriate to the problem.
3. Never mark content as Lean-verified unless the exact formal statement compiles successfully.
4. Keep verifier metadata versioned and auditable.

## Bootstrap
Run `bin/bootstrap-lean.sh`. It installs elan for the current user, creates the local Mathlib project, and fetches the Mathlib cache.

## Smoke test
Run `bin/verify.sh fixtures/Smoke.lean` after bootstrap.
