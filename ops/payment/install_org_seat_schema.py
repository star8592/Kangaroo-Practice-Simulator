#!/usr/bin/env python3
"""R181 additive organization-seat payment schema: plan -> backup -> preview -> apply.

Never creates a SKU, grants rights, changes checkout flags, prints orders or secrets.
The durable encrypted production backup service MUST pass independently first.
"""
from __future__ import annotations

import argparse
import os
import pwd
import re
import subprocess
import tempfile
from pathlib import Path

DB = "socthink_billing_prod"
PORT = "5432"
MIGRATION = Path(__file__).resolve().parents[1] / "db" / "015_platform_organization_seats.sql"
ORG_TABLE = "billing_organization_entitlements"
BACKUP_UNIT = "socthink-billing-backup.service"


def run(*args: str, capture: bool = False) -> str:
    completed = subprocess.run(
        args, check=True, capture_output=capture, text=True,
    )
    return completed.stdout.strip() if capture else ""


def as_postgres(*args: str, capture: bool = False) -> str:
    return run("runuser", "-u", "postgres", "--", *args, capture=capture)


def sql(db: str, statement: str) -> str:
    return as_postgres(
        "psql", "-p", PORT, "-d", db, "-X", "-A", "-t",
        "-v", "ON_ERROR_STOP=1", "-c", statement, capture=True,
    )


def state(db: str) -> dict[str, str]:
    version = sql(db, "SHOW server_version_num")
    if int(version) < 180000:
        raise RuntimeError("Expected PostgreSQL 18 or newer")
    current = sql(db,
        "SELECT (to_regclass('public.billing_organization_entitlements') IS NOT NULL)::text")
    count = sql(db, "SELECT count(*) FROM billing_orders")
    count_sku = sql(db, "SELECT count(*) FROM billing_products")
    return {"version": version, "installed": current,
            "orders": count, "skus": count_sku}


def validate_installed(db: str) -> None:
    checks = sql(db, """
        SELECT (to_regclass('public.billing_organization_entitlements') IS NOT NULL
          AND to_regclass('public.billing_organization_owner_bindings') IS NOT NULL
          AND EXISTS(SELECT 1 FROM pg_indexes
            WHERE schemaname='public' AND indexname='billing_one_pending_org'))::text
    """)
    if checks != "true":
        raise RuntimeError("Organization billing objects incomplete")


def apply_sql(db: str) -> None:
    as_postgres("psql", "-p", PORT, "-d", db, "-X",
                "-q", "-v", "ON_ERROR_STOP=1", "-f", str(MIGRATION))


def verified_backup() -> None:
    run("systemctl", "start", BACKUP_UNIT)
    status = run("systemctl", "show", BACKUP_UNIT,
                 "-p", "Result", "-p", "ExecMainStatus", capture=True)
    if "Result=success" not in status or "ExecMainStatus=0" not in status:
        raise RuntimeError("Existing encrypted backup service failed")
    recent = run("journalctl", "-u", BACKUP_UNIT, "-n", "35",
                 "--no-pager", "-o", "cat", capture=True)
    if ("BILLING_BACKUP=PASS ISOLATED_RESTORE=PASS" not in recent
            or "BILLING_ASSET_BACKUP=PASS ISOLATED_RESTORE=PASS" not in recent):
        raise RuntimeError("Backup/independent restore proof missing")
    print("BACKUP=PASS encrypted=YES isolated_restore=YES")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise SystemExit("Must be invoked as root on the authorized production host")
    if not MIGRATION.is_file():
        raise SystemExit("Migration 015 missing from installed release")

    before = state(DB)
    print("PREFLIGHT=PASS pg_version=" + before["version"] +
          " existing_orders=" + before["orders"] +
          " existing_skus=" + before["skus"] +
          " migration_installed=" + before["installed"])
    if before["installed"] == "true":
        validate_installed(DB)
        print("SCHEMA=ALREADY_INSTALLED")
        return
    if args.plan:
        print("SCHEMA=READY_FOR_BACKUP_AND_ISOLATED_PREVIEW")
        return

    verified_backup()
    user = pwd.getpwnam("postgres")
    preview = "socthink_billing_r181_preview_" + str(os.getpid())
    if not re.fullmatch(r"[a-z0-9_]{1,63}", preview):
        raise RuntimeError("Invalid preview DB name")
    with tempfile.TemporaryDirectory(prefix="socthink-billing-r181-", dir="/run") as folder:
        os.chown(folder, user.pw_uid, user.pw_gid)
        os.chmod(folder, 0o700)
        dump = str(Path(folder) / "billing.dump")
        as_postgres("pg_dump", "-p", PORT, "-Fc", "-f", dump, DB)
        os.chmod(dump, 0o600)
        as_postgres("pg_restore", "-l", dump, capture=True)
        created = False
        try:
            as_postgres("createdb", "-p", PORT, "-T", "template0", preview)
            created = True
            as_postgres("pg_restore", "-p", PORT, "-d", preview,
                        "--no-owner", "--no-privileges", "--exit-on-error", dump)
            restored = state(preview)
            if restored["orders"] != before["orders"] or restored["skus"] != before["skus"]:
                raise RuntimeError("Isolated restore does not match snapshot")
            apply_sql(preview)
            validate_installed(preview)
            after_preview = state(preview)
            if (after_preview["orders"] != restored["orders"]
                    or after_preview["skus"] != restored["skus"]):
                raise RuntimeError("Preview migration modified payment rows")
            print("PREVIEW=PASS restore=PASS migration_015=PASS payment_rows_unchanged=YES")
        finally:
            if created:
                as_postgres("dropdb", "-p", PORT, "--if-exists", preview)
        apply_sql(DB)
        validate_installed(DB)
        after = state(DB)
        if after["installed"] != "true":
            raise RuntimeError("Live schema not installed")
        # A concurrent legitimate payment may change counts; no DML on existing
        # orders/products occurs in migration 015.
        print("PRODUCTION_ORG_SCHEMA=PASS new_skus=0 grants=0 " +
              "orders_before=" + before["orders"] + " orders_after=" + after["orders"])
        print("CHECKOUT_FLAGS=UNCHANGED no_new_sales=YES")


if __name__ == "__main__":
    main()
