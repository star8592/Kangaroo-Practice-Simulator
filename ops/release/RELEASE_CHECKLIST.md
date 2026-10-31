# Release Checklist

Releases are automation-first. A human should not manually reproduce machine checks.

## Required gates

- [ ] Acceptance contract exists for behavior-changing work.
- [ ] `npm run verify:public` passes.
- [ ] 相关专项如涉及试卷源、异机备份、TPM等，独立执行 `npm run verify:full` 或相应诊断；这不是普通网页发布的强制前置条件。
- [ ] Exact commit is pushed to GitHub.
- [ ] Staging release boots and passes health + authenticated smoke checks.
- [ ] Live deployment receipt matches the exact Git SHA.
- [ ] Rollback target remains available.

## Local deployment

`bash ops/automation/deploy_atomic.sh <git-sha>` performs build, staging, atomic switch, restart, health check and rollback.

## Rollback

`bash ops/automation/rollback_atomic.sh` switches to the newest previous immutable release and verifies health.
