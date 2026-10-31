# Release Checklist

Releases are automation-first. A human should not manually reproduce machine checks.

## Required gates

- [ ] Acceptance contract exists for behavior-changing work.
- [ ] `npm run verify:public` passes.
- [ ] Exact commit is pushed to GitHub.
- [ ] Staging release boots and passes health + authenticated smoke checks.
- [ ] Live deployment receipt matches the exact Git SHA.
- [ ] Rollback target remains available.

## Optional deep diagnostics (independent of ordinary release)

Run `npm run verify:full` or a relevant subsystem test when changing source ingestion, backup, TPM or other specialized workflows. Report findings separately. These checks do not gate unrelated page releases.

## Local deployment

`bash ops/automation/deploy_atomic.sh <git-sha>` performs build, staging, atomic switch, restart, health check and rollback.

## Rollback

`bash ops/automation/rollback_atomic.sh` switches to the newest previous immutable release and verifies health.
