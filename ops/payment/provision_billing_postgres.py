#!/usr/bin/env python3
"""One-time, reviewed SOCTHINK production billing database bootstrap.

NEVER run automatically during npm build, deploy, CI or app startup.
Operator must run locally on the authorized production host after review.
Creates a NEW isolated localhost PostgreSQL DB and a 0600 connection envfile.
Does not copy any WeChat key, enable merchant product or permit checkout.
Never logs SQL containing a password or prints the DB connection string.

Usage:
  python3 ops/payment/provision_billing_postgres.py --check
  sudo python3 ops/payment/provision_billing_postgres.py --apply --confirm INITIALIZE_SOCTHINK_BILLING
"""
from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
import secrets
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
# The real systemd WorkingDirectory is the immutable-release symlink.
# Compare resolved directories, never provision inside the obsolete tree.
EXPECTED_ROOT = Path("/opt/socthink-releases/current").resolve()
ROLE = "socthink_billing"
DATABASE = "socthink_billing_prod"
ENV_FILE = Path("/etc/socthink-math-billing.env")
DROP_IN = Path("/etc/systemd/system/socthink-math.service.d/40-billing.conf")
DDL = ROOT / "ops/db/001_billing_entitlements.sql"


def run(command: list[str], *, input_text: str | None = None,
        env: dict[str, str] | None = None) -> str:
    """Never forward raw postgres error messages or SQL credentials."""
    p = subprocess.run(command, input=input_text, text=True, env=env,
                       capture_output=True, timeout=45, check=False)
    if p.returncode:
        raise RuntimeError("DATABASE_COMMAND_FAILED")
    return p.stdout.strip()


def pg(sql: str, db: str = "postgres") -> str:
    return run(["runuser", "-u", "postgres", "--", "psql",
                "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", db],
               input_text=sql)


def existing(name: str, catalog: str, column: str) -> bool:
    if name not in (ROLE, DATABASE):
        raise ValueError("Invalid catalog lookup")
    return pg(f"SELECT COUNT(*) FROM {catalog} WHERE {column}='{name}';") == "1"


def write_private_exclusive(path: Path, value: str) -> None:
    # Use O_EXCL rather than overwriting existing production credentials.
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(value)
        f.flush()
        os.fsync(f.fileno())
    os.chmod(path, 0o600)


def preflight() -> dict[str, bool]:
    result = {
        "target_repo": ROOT.resolve() == EXPECTED_ROOT and
            (ROOT / ".git").exists(),
        "schema_found": DDL.is_file() and
            (ROOT / "ops/db/002_wechat_reconciliation.sql").is_file(),
        "postgres_binary": Path("/usr/bin/psql").exists(),
        "role_absent": False,
        "database_absent": False,
        "envfile_absent": not ENV_FILE.exists(),
        "service_dropin_absent": not DROP_IN.exists(),
    }
    if result["postgres_binary"] and os.geteuid() == 0:
        try:
            result["role_absent"] = not existing(ROLE, "pg_roles", "rolname")
            result["database_absent"] = not existing(DATABASE, "pg_database", "datname")
        except Exception:
            pass
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    ap.add_argument("--confirm", default="")
    args = ap.parse_args()
    state = preflight()
    if args.check:
        for k, v in state.items():
            print(f"{k.upper()}={'YES' if v else 'NO'}")
        print("CHECK_ONLY=YES; NO DATABASE OR SECRETS WRITTEN")
        return 0

    if args.confirm != "INITIALIZE_SOCTHINK_BILLING" or os.geteuid() != 0:
        print("OPERATOR_CONFIRMATION_REQUIRED", file=sys.stderr)
        return 2
    if not all(state.values()):
        print("PROVISION_PREFLIGHT_NOT_SAFE: existing resources, missing SQL or incorrect host")
        return 3
    if run(["systemctl", "is-active", "postgresql"]) != "active":
        print("POSTGRES_NOT_ACTIVE")
        return 3
    listeners = run(["ss", "-lnt"])
    if ("0.0.0.0:5432" in listeners or "[::]:5432" in listeners
            or "*:5432" in listeners):
        print("POSTGRES_PUBLIC_LISTENER_REFUSED")
        return 3

    # The role secret never appears in argv, stdout, a source file or a log.
    secret = secrets.token_hex(32)
    pg(f"CREATE ROLE {ROLE} LOGIN PASSWORD '{secret}';")
    # PostgreSQL CREATE DATABASE is not allowed within a multi-SQL transaction.
    run(["runuser", "-u", "postgres", "--", "createdb",
         "--owner=postgres", DATABASE])
    pg(f"REVOKE CONNECT ON DATABASE {DATABASE} FROM PUBLIC;"
       f"GRANT CONNECT ON DATABASE {DATABASE} TO {ROLE};")
    run(["runuser", "-u", "postgres", "--", "psql",
         "-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", DATABASE,
         "-f", str(DDL)])
    run(["runuser", "-u", "postgres", "--", "psql",
         "-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", DATABASE,
         "-f", str(ROOT / "ops/db/002_wechat_reconciliation.sql")])
    pg(f"GRANT USAGE ON SCHEMA public TO {ROLE};"
       f"GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO {ROLE};"
       f"GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO {ROLE};",
       DATABASE)
    number = pg("SELECT COUNT(*) FROM pg_tables "
                "WHERE schemaname='public' AND tablename LIKE 'billing_%';",
                DATABASE)
    if number != "8":
        raise RuntimeError("EXPECTED_EIGHT_BILLING_TABLES_MISSING")
    if pg("SELECT COUNT(*) FROM information_schema.columns "
          "WHERE table_schema='public' AND table_name='billing_orders' "
          "AND column_name='reconcile_checked_at';", DATABASE) != "1":
        raise RuntimeError("RECOVERY_MIGRATION_NOT_APPLIED")

    # Verify a real TCP password login, matching the Node pg client path.
    secret_env = dict(os.environ, PGPASSWORD=secret, PGCONNECT_TIMEOUT="5")
    result = run(["psql", "-X", "-q", "-A", "-t", "-h", "127.0.0.1",
                  "-U", ROLE, "-d", DATABASE, "-c",
                  "SELECT COUNT(*) FROM billing_products;"], env=secret_env)
    if result != "0":
        raise RuntimeError("BILLING_LOGIN_OR_SCHEMA_VERIFICATION_FAILED")

    url = f"postgresql://{ROLE}:{secret}@127.0.0.1:5432/{DATABASE}"
    write_private_exclusive(ENV_FILE, f'SOCTHINK_BILLING_DATABASE_URL="{url}"\n')
    DROP_IN.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
    write_private_exclusive(DROP_IN,
        "[Service]\nEnvironmentFile=/etc/socthink-math-billing.env\n")
    os.chmod(DROP_IN, 0o644)
    run(["systemctl", "daemon-reload"])
    print("BILLING_BOOTSTRAP_COMPLETED=YES")
    print("SCHEMA_TABLES=8")
    print("PRODUCTION_PAYMENT_ENABLED=NO")
    print("SECRET_EXPORTED_TO_CHAT_OR_LOGS=NO")
    print("SCHEMA_SHA256="+hashlib.sha256(DDL.read_bytes()).hexdigest())
    print("NEXT=independently verify environment, backups, keys, merchant approvals")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        # Partial bootstrap is never silently deleted. Preserve evidence and
        # have an authorized operator reconcile before any manual retry.
        print("BOOTSTRAP_STOPPED_REQUIRES_OPERATOR_RECONCILIATION", file=sys.stderr)
        raise SystemExit(4)
