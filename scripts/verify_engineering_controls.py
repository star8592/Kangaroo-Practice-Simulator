#!/usr/bin/env python3
"""Fail-closed repository engineering invariants. Never interprets CI as production."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FILES = {
    "ci": ".github/workflows/ci.yml",
    "quality": "ops/automation/quality_gate.sh",
    "package": "package.json",
    "deploy": "ops/release/auto_deploy_server.sh",
    "receipt": ".github/workflows/production-receipt.yml",
    "mini": "ops/release/miniapp_ci.sh",
    "miniqa": "scripts/verify_miniapp_qa_receipt.mjs",
    "ignore": ".gitignore",
    "watch": "src/lib/competition-source-watch.ts",
    "watchunit": "ops/intelligence/socthink-competition-source-watch.service",
    "watchapi": "src/app/api/admin/competition-source-watch/route.ts",
    "pr": ".github/PULL_REQUEST_TEMPLATE.md",
    "runbook": "docs/engineering/ENGINEERING_OPERATING_SYSTEM.md",
    "baseline": "docs/engineering/BASELINE_AUDIT_20261010.md",
    "backup": "ops/backup/backup_verified.sh",
    "backup_restore": "ops/backup/verify_backup_restore.sh",
    "backup_unit": "ops/backup/socthink-verified-backup.service",
    "backup_timer": "ops/backup/socthink-verified-backup.timer",
    "backup_install": "ops/backup/install_verified_backup.sh",
    "backup_health": "ops/backup/check_backup_health.py",
    "offsite_pull": "ops/backup/pull_offsite_encrypted.sh",
    "offsite_verify": "ops/backup/verify_offsite_replica.py",
    "offsite_unit": "ops/backup/socthink-offsite-backup-pull.service",
    "offsite_timer": "ops/backup/socthink-offsite-backup-pull.timer",
    "offsite_install": "ops/backup/install_offsite_pull.sh",
    "offsite_health": "ops/backup/check_offsite_health.py",
    "tpm_seal": "ops/backup/seal_offsite_recovery_tpm.sh",
    "tpm_restore": "ops/backup/offsite_restore_drill_tpm.sh",


    "self": "scripts/verify_engineering_controls.py",
}

def evaluate(root=ROOT, replacements=None):
    replacements = replacements or {}
    errors = []
    content = {}
    for key, name in FILES.items():
        if key in replacements:
            content[key] = replacements[key]
        else:
            try:
                content[key] = (root / name).read_text(encoding="utf-8")
            except OSError:
                errors.append(f"{key}: required file absent: {name}")
                content[key] = ""
    registry = root / "ops/engineering/controls.json"
    try:
        controls = json.loads(registry.read_text(encoding="utf-8"))
        entries = controls["controls"]
        ids = [c["id"] for c in entries]
        if controls["schemaVersion"] != 1 or len(set(ids)) != len(ids) or len(entries) < 14:
            errors.append("control register incomplete or has duplicate IDs")
        if not all(c.get("level") in ("block","manual") for c in entries):
            errors.append("control has invalid enforcement level")
    except (OSError, ValueError, KeyError, TypeError) as exc:
        errors.append(f"control register unreadable: {exc}")
        entries = []

    def needs(file, *tokens):
        for token in tokens:
            if token not in content.get(file, ""):
                errors.append(f"{file}: missing required invariant {token}")
    def no_pattern(file, pattern, label):
        if re.search(pattern, content.get(file, ""), re.MULTILINE):
            errors.append(f"{file}: forbidden {label}")

    needs("ci", "pull_request:", "branches:", "- main", "quality:", "billing-ledger:",
          "miniapp-build-and-contract:", "web-browser-click-e2e:", "npm ci",
          "npm run verify:public", "npm run test:e2e:smoke", "npm run verify:miniapp")
    needs("ci", "permissions:", "contents: read")
    no_pattern("ci", r"^\s*pull_request_target\s*:", "privileged pull_request_target workflow")
    needs("quality", "npm run lint -- --max-warnings=0", "npx tsc --noEmit",
          "step \"enforce end-to-end release wiring\"", "npm run test:exam-access",
          "npm run test:exam-submit-recovery", "npm run audit:security",
          "step \"engineering operating controls\" npm run test:engineering-controls")
    needs("package", '"test:engineering-controls"', "scripts/test_engineering_controls.py")
    needs("deploy", "flock -n", "CI_NOT_GREEN", "AUTO_DEPLOY_CANDIDATE=PASS",
          "restore_runtime", "AUTO_DEPLOY_PUBLIC=PASS", "TARGET_SHA", "EXPECTED_SHA")
    needs("receipt", "github.event.workflow_run.head_sha", "deployedSha", "gitSha", "PRODUCTION_RECEIPT=PASS")
    needs("mini", "not_exact_remote_main", "dirty_checkout", "verify_miniapp_qa_receipt.mjs",
          "bash \"$ROOT/ops/automation/miniapp_quality_gate.sh\"")
    needs("miniqa", "physical-android", "WeChat DevTools", "receipt.commitSha",
          "network-failure-retry", "exam-answer-submit-review", "homepage-to-arithmetic-click")
    needs("ignore", ".env*", "*.pem", "private/*", "/.release-tmp/")
    needs("watch", "status:\"pending\"", "reviewObservation", "no redirected or blocked content accepted")
    needs("watchunit", "DynamicUser=yes", "StateDirectory=socthink-competition-source-watch",
          "ProtectSystem=strict")
    needs("watchapi", "isAdmin", "Same-origin review required", "promotion:false")
    needs("pr", "变更风险", "回滚方案", "真实验收证据", "微信小程序")
    needs("runbook", "RTO", "RPO", "DORA", "Web 上线≠微信上线")
    needs("baseline", "OPEN", "required_approving_review_count", "备份")
    needs("backup", "private public/local-assets public/generated-solutions",
          "--passphrase-file", "verify_backup_restore.sh", "BACKUP=PASS",
          "flock -n", "BACKUP=BLOCKED")
    needs("backup_restore", "sha256sum -c", "--decrypt", "verify_tree.py",
          "BACKUP_ISOLATED_RESTORE=PASS", "missing_secret_or_checksum")
    needs("backup_unit", "ProtectSystem=strict", "ReadWritePaths=/var/backups/socthink-math",
          "SOCTHINK_BACKUP_PASSPHRASE_FILE", "NoNewPrivileges=yes")
    needs("backup_timer", "OnCalendar=", "Persistent=true")
    needs("backup_install", "deployed_sha_mismatch", "systemctl enable --now")
    needs("backup_health", "LOCAL_ENCRYPTED_BACKUP=PASS", "ISOLATED_RESTORE_DRILL=PASS")
    needs("quality", "scripts/test_verified_backup_restore.py")
    needs("quality", "scripts/test_offsite_replica.py")
    needs("offsite_pull", "StrictHostKeyChecking=yes", "SOCTHINK_OFFSITE_DIR",
          "verify_offsite_replica.py", "OFFSITE_PULL=PASS", "flock -n",
          "OFFSITE_PULL=BLOCKED", "mv -- \"$STAGING/$RECEIPT\"")
    needs("offsite_verify", "archiveSha256", "isolatedRestore", "OFFSITE_REPLICA_VERIFY=PASS")
    needs("offsite_unit", "NoNewPrivileges=yes", "ExecStartPost=")
    needs("offsite_timer", "OnCalendar=", "Persistent=true")
    needs("offsite_install", "not_clean_exact_main", "systemctl --user enable --now")
    needs("offsite_health", "OFFSITE_ENCRYPTED_BACKUP=PASS", "OFFSITE_RECOVERY_KEY_ESCROW=NOT_VERIFIED")
    needs("quality", "scripts/test_tpm_offsite_recovery.py")
    needs("tpm_seal", "StrictHostKeyChecking=yes", "--with-key=tpm2",
          "systemd-creds decrypt", "production_secret_rotated_existing_credential_preserved",
          "plaintext_persisted=NO", "independent_offline_key=NO")
    needs("tpm_restore", "tmpfs_required", "systemd-creds decrypt",
          "verify_offsite_replica.py", "verify_tree.py",
          "TPM_RECOVERY_DRILL=PASS", "--passphrase-file <(")
    needs("offsite_install", "seal_offsite_recovery_tpm.sh", "offsite_restore_drill_tpm.sh")


    # Avoid accidental self-certification: checks are hardcoded and mutation-tested.
    automated = [c for c in entries if c.get("level") == "block"]
    if len(automated) < 8:
        errors.append("automated gate coverage below minimum 8 controls")
    return errors, len(entries), len(automated)

def main():
    errors, total, automated = evaluate()
    summary = {"status": "FAIL" if errors else "PASS", "controls": total,
               "automated": automated, "manual": total - automated,
               "errors": errors}
    if "--json" in sys.argv:
        print(json.dumps(summary, ensure_ascii=False))
    else:
        print(f"ENGINEERING_CONTROLS={summary['status']} total={total} automated={automated} manual={total-automated}")
        for error in errors:
            print(" - "+error)
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
