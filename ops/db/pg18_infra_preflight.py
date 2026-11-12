#!/usr/bin/env python3
"""Read-only SOC THINK PG18 unification infrastructure preflight.

No database connections with credentials, user switching, DDL, service changes
or secret dumps. This is a *rehearsal* preflight, NOT a production cutover gate.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess
import stat

BACKUP_NAMES = (
    "pg16_globals.sql",
    "pg16_accent_lab.dump",
    "pg16_aelos.dump",
    "pg16_commerceflow_delivery.dump",
    "pg16_commerceflow_delivery_canary.dump",
    "pg16_english_leap_accounts.dump",
    "pg16_postgres.dump",
    "pg16_socthink_billing_prod.dump",
    "pg18_vocab_globals.sql",
    "pg18_vocab_classroom.dump",
)


def parse_clusters(text: str) -> list[dict[str, str]]:
    rows = []
    for line in text.splitlines():
        columns = line.split()
        if len(columns) >= 4 and columns[0].isdigit() and columns[2].isdigit():
            rows.append({
                "version": columns[0], "name": columns[1],
                "port": columns[2], "state": columns[3],
            })
    return rows


def assess(
    clusters: list[dict[str, str]],
    managed_pg18: bool,
    pg16_ready: bool,
    vocab18_ready: bool,
    backup_checks: dict[str, bool],
    backup_private: bool,
) -> dict:
    blockers = []
    if not any(c["version"] == "16" and c["port"] == "5432" and
               c["state"].startswith("online") for c in clusters) or not pg16_ready:
        blockers.append("PG16_BASELINE_5432_NOT_VERIFIED")
    if not vocab18_ready:
        blockers.append("VOCAB_PG18_5433_NOT_READY")
    if not managed_pg18:
        blockers.append("MANAGED_PG18_PACKAGE_NOT_INSTALLED")
    if not any(c["version"] == "18" and c["port"] not in ("5432", "5433")
               for c in clusters):
        blockers.append("INDEPENDENT_MANAGED_PG18_REHEARSAL_CLUSTER_MISSING")
    missing = [name for name in BACKUP_NAMES if not backup_checks.get(name)]
    if missing:
        blockers.append("SOURCE_BACKUP_MISSING_OR_EMPTY")
    if not backup_private:
        blockers.append("BACKUP_FILE_PERMISSIONS_NOT_PRIVATE")
    return {
        "schema": "socthink.pg18.infra_preflight.v1",
        "phase": "REHEARSAL_PRECHECK_ONLY",
        "ready_for_isolated_rehearsal": not blockers,
        "production_cutover_authorized": False,
        "blockers": blockers,
        "backup_required": len(BACKUP_NAMES),
        "backup_verified_nonempty": sum(backup_checks.get(n, False) for n in BACKUP_NAMES),
        "missing_backup_names": missing,
        "managed_pg18_package": managed_pg18,
        "pg16_5432_ready": pg16_ready,
        "vocab_pg18_5433_ready": vocab18_ready,
        "detected_managed_clusters": clusters,
        "manual_actions_still_required": [
            "supported PG18 package with controlled rollback",
            "role/extension/collation mapping and identity ID shadow verification",
            "authoritative order and payment ledger reconciliation",
            "confirmed write freeze, final delta, restore point, explicit cutover approval",
            "end-to-end login/payment/exam regression before old cluster retirement",
        ],
    }


def capture(cmd: list[str]) -> tuple[int, str]:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=12, check=False)
        return p.returncode, p.stdout
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return 127, ""


def package_installed(returncode: int, status: str) -> bool:
    # A dpkg entry can exist in a removed/config-files state; only accept
    # an actually installed package with its binaries managed by the OS.
    return returncode == 0 and status.strip() == "install ok installed"


def check_ready(port: int) -> bool:
    return capture(["pg_isready", "-h", "127.0.0.1", "-p", str(port)])[0] == 0


def inspect_backups(directory: Path) -> tuple[dict[str, bool], bool]:
    files = {name: directory / name for name in BACKUP_NAMES}
    checks = {name: p.is_file() and p.stat().st_size > 0 for name, p in files.items()}
    private = directory.is_dir() and directory.stat().st_mode & 0o077 == 0
    for p in files.values():
        if p.is_file() and p.stat().st_mode & 0o077:
            private = False
    return checks, private


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--backup-dir", default="/var/backups/socthink-pg18-consolidation-20261112"
    )
    args = parser.parse_args()
    _, raw = capture(["pg_lsclusters", "-h"])
    pkg_rc, pkg_status = capture(["dpkg-query", "-W", "-f", "${Status}", "postgresql-18"])
    # Don't treat an unpacked third-party binary or apt-cache candidate as a
    # supported, installed and managed PG18 package.
    package = package_installed(pkg_rc, pkg_status)
    checks, private = inspect_backups(Path(args.backup_dir))
    result = assess(
        parse_clusters(raw), package,
        check_ready(5432), check_ready(5433),
        checks, private,
    )
    print("PG18_INFRA_READINESS=" + ("READY_FOR_REHEARSAL" if result["ready_for_isolated_rehearsal"] else "BLOCKED"))
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    # Return exit 0 for a successful read-only diagnosis; use the readiness
    # field for a separate, explicitly approved operation. No side effects.


if __name__ == "__main__":
    main()
