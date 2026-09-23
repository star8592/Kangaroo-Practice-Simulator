# Automated Development & Release Pipeline

Every feature follows one engineering flow:

1. Specification: define acceptance criteria before implementation.
2. Isolated change set: unrelated work must not share a feature commit.
3. Automated verification: unit/regression tests, ESLint, TypeScript, whitespace gate.
4. Production build: public CI gate plus full local gate with private-data checks.
5. Staging boot: every local release boots on port 3127 before becoming live.
6. Live smoke test: health endpoints plus authenticated arithmetic-print smoke test.
7. Immutable release: an exact Git commit is expanded into its own release directory.
8. Atomic switch: only the current symlink changes; development checkout is never the live runtime.
9. Health-gated restart: systemd starts the exact release; failures roll back automatically.
10. Release receipt: /api/release and deployments.jsonl identify the deployed commit.

## Standard commands

- Public gate: npm run verify:public
- Full local gate: npm run verify:full
- Atomic local deploy: bash ops/automation/deploy_atomic.sh <git-sha>
- Rollback: bash ops/automation/rollback_atomic.sh
- Health check: BASE_URL=http://127.0.0.1:3027 bash ops/automation/health_check.sh

## Directory model

- Development: /mnt/disk1/Code/Kangaroo-Practice-Simulator
- Immutable releases: /mnt/disk1/Code/.deploy/math-competition-lab/releases/<sha>
- Active release: /mnt/disk1/Code/.deploy/math-competition-lab/current
- Service: math-competition-lab.service on port 3027
- Staging verification: port 3127
- Runtime private/local asset/generated data are linked into releases and are never deleted by deploy.

## Hard rules

- Never deploy with git pull in the live directory.
- Never run production directly from the development checkout.
- Never use git clean during deployment.
- Deploy exact committed SHAs, not working-tree state.
- Never declare deployment success before staging, live health checks, and release receipt pass.
- Never overwrite runtime private/, public/local-assets/, or generated-solution data.
- Keep unrelated changes out of feature commits.\n- Keep staging, recovery, and build-backup artifacts outside the repository root.

## One-time host bootstrap

Run once from a normal host shell:

- bash ops/automation/install_local_service.sh <git-sha>

This installs the application service plus a systemd path watcher on reload.request.
After bootstrap, restricted automation can deploy without direct D-Bus access: it switches the immutable current release and updates reload.request; the host watcher performs the restart.
