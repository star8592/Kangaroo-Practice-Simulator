#!/usr/bin/env python3
"""SOC THINK R180: approved, one-time production authorization DB wiring.

--plan is read-only. --apply is root-only and changes ONLY the separate
socthink_platform DB, its dedicated low-privilege login role, and an additional
systemd EnvironmentFile. It does not restart or switch production code.
Never emit connection passwords or URLs in stdout, logs, or subprocess argv.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import secrets
import subprocess
import sys

DB = "socthink_platform"
ROLE = "socthink_platform_app"
PG_BIN = Path("/usr/lib/postgresql/18/bin")
ENV_FILE = Path("/etc/socthink-math-platform.env")
UNIT_DROPIN = Path("/etc/systemd/system/socthink-math.service.d/72-platform-auth.conf")
BACKUP = Path("/var/backups/socthink-platform/platform-r180-before-app-role.dump")
SCRIPT_ROOT = Path(__file__).resolve().parents[2]
GRANTS_SQL = SCRIPT_ROOT / "ops/db/014_platform_app_privileges.sql"
DROPIN_TEXT = "[Service]\nEnvironmentFile=/etc/socthink-math-platform.env\n"


def quiet_process(cmd: list[str], *, data: str | None = None, env: dict | None = None):
    result = subprocess.run(
        cmd, input=data, text=True, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, env=env, check=False, timeout=30,
    )
    if result.returncode:
        # Neither stdout nor stderr can be trusted to be free of credentials.
        raise RuntimeError("AUTHORIZED_DATABASE_OPERATION_FAILED")
    return result.stdout.strip()


def postgres_sql(database: str, statement: str) -> str:
    return quiet_process([
        "runuser", "-u", "postgres", "--", str(PG_BIN / "psql"),
        "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-p", "5432",
        "-d", database,
    ], data=statement)


def existing_state() -> tuple[bool, bool, bool, bool]:
    database = postgres_sql("postgres",
                            "SELECT EXISTS (SELECT 1 FROM pg_database "
                            "WHERE datname='socthink_platform');").strip() == "t"
    role = postgres_sql("postgres",
                        "SELECT EXISTS (SELECT 1 FROM pg_roles "
                        "WHERE rolname='socthink_platform_app');").strip() == "t"
    return database, role, ENV_FILE.exists(), UNIT_DROPIN.exists()


def status_text(state: tuple[bool, bool, bool, bool]) -> str:
    database, role, environment, unit = state
    return ("database=" + ("PRESENT" if database else "MISSING") +
            " restricted_role=" + ("PRESENT" if role else "MISSING") +
            " env_file=" + ("PRESENT" if environment else "MISSING") +
            " unit_dropin=" + ("PRESENT" if unit else "MISSING"))


def safe_atomic_write(path: Path, content: str, mode: int) -> None:
    temp = path.with_name(path.name + ".new-" + str(os.getpid()))
    path.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
    try:
        fd = os.open(str(temp), os.O_CREAT | os.O_EXCL | os.O_WRONLY, mode)
        # An inherited restrictive umask must not change the intended service
        # drop-in mode; the secret environment file still stays at 0600.
        os.fchmod(fd, mode)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def backup_before_change() -> None:
    BACKUP.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(BACKUP.parent, 0o700)
    if BACKUP.exists():
        raise RuntimeError("BACKUP_ALREADY_EXISTS_REQUIRES_OPERATOR_REVIEW")
    temp = BACKUP.with_name(BACKUP.name + ".partial-" + str(os.getpid()))
    try:
        fd = os.open(str(temp), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "wb") as out:
            result = subprocess.run(
                ["runuser", "-u", "postgres", "--", str(PG_BIN / "pg_dump"),
                 "-p", "5432", "-Fc", "-d", DB],
                stdout=out, stderr=subprocess.DEVNULL, check=False, timeout=90,
            )
            if result.returncode:
                raise RuntimeError("PLATFORM_BACKUP_FAILED")
        if temp.stat().st_size < 100:
            raise RuntimeError("PLATFORM_BACKUP_EMPTY")
        quiet_process([str(PG_BIN / "pg_restore"), "-l", str(temp)])
        os.replace(temp, BACKUP)
    finally:
        temp.unlink(missing_ok=True)


def validate_restricted_login(password: str) -> None:
    environ = os.environ.copy()
    environ["PGPASSWORD"] = password
    check_sql = """
      SELECT
        current_user='socthink_platform_app'
        AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb
        AND NOT rolcreaterole
        AND NOT has_database_privilege(current_user,current_database(),'CREATE')
        AND NOT has_schema_privilege(current_user,'platform','CREATE')
        AND has_table_privilege(current_user,'platform.role_grants','SELECT')
        AND has_table_privilege(current_user,'platform.role_grants','INSERT')
        AND has_table_privilege(current_user,'platform.role_grants','UPDATE')
        AND has_table_privilege(current_user,'platform.role_grant_audit','SELECT')
        AND has_table_privilege(current_user,'platform.role_grant_audit','INSERT')
      FROM pg_roles WHERE rolname=current_user;
    """
    answer = quiet_process(
        [str(PG_BIN / "psql"), "-X", "-t", "-A", "-v", "ON_ERROR_STOP=1",
         "-h", "127.0.0.1", "-p", "5432", "-U", ROLE, "-d", DB],
        data=check_sql, env=environ,
    )
    if answer != "t":
        raise RuntimeError("RESTRICTED_LOGIN_VERIFY_FAILED")


def apply() -> None:
    if os.geteuid() != 0:
        raise RuntimeError("ROOT_APPROVAL_REQUIRED")
    if not (PG_BIN / "psql").is_file() or not GRANTS_SQL.is_file():
        raise RuntimeError("REQUIRED_PG18_OR_MIGRATION_MISSING")
    state = existing_state()
    database, role, environment, unit = state
    if not database:
        raise RuntimeError("PLATFORM_SCHEMA_NOT_INSTALLED")
    if role or environment or unit:
        # A partial or previous installation must be inspected, not overwritten.
        raise RuntimeError("ALREADY_OR_PARTIALLY_INSTALLED_REVIEW_FIRST")
    if postgres_sql(DB, "SELECT to_regclass('platform.role_grants') IS NOT NULL "
                            "AND to_regclass('platform.role_grant_audit') IS NOT NULL;") != "t":
        raise RuntimeError("PLATFORM_TABLES_MISSING")
    if postgres_sql(DB, "SELECT (SELECT count(*) FROM platform.role_grants) = 0 "
                            "AND (SELECT count(*) FROM platform.role_grant_audit) = 0;") != "t":
        raise RuntimeError("INITIAL_GRANTS_NOT_EMPTY")
    if not UNIT_DROPIN.parent.is_dir():
        raise RuntimeError("SOCTHINK_MAIN_SYSTEMD_UNIT_NOT_INSTALLED")

    backup_before_change()
    password = secrets.token_hex(32)
    # Password is passed via stdin, never via command-line arguments.
    postgres_sql("postgres",
                 "CREATE ROLE socthink_platform_app LOGIN NOSUPERUSER "
                 "NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '" + password + "';")
    try:
        postgres_sql("postgres",
                     "REVOKE ALL ON DATABASE socthink_platform FROM PUBLIC; "
                     "GRANT CONNECT ON DATABASE socthink_platform TO socthink_platform_app;")
        postgres_sql(DB, GRANTS_SQL.read_text(encoding="utf-8"))
        validate_restricted_login(password)
        safe_atomic_write(ENV_FILE,
                          "SOCTHINK_PLATFORM_DATABASE_URL=postgresql://" +
                          ROLE + ":" + password + "@127.0.0.1:5432/" + DB + "\n", 0o600)
        safe_atomic_write(UNIT_DROPIN, DROPIN_TEXT, 0o644)
        quiet_process(["systemctl", "daemon-reload"])
    except Exception:
        # Do not drop a role or modify a partial installation automatically.
        # Preserve the backup and require a human audit of what applied.
        raise RuntimeError("PARTIAL_INSTALL_STOP_REQUIRES_OPERATOR_REVIEW") from None

    print("PLATFORM_RUNTIME_INSTALLED restricted_login=VERIFIED "
          "backup=VERIFIED env_mode=0600 main_restart=NOT_PERFORMED")
    print("NEXT_STEP=RUN_APPLICATION_PREFLIGHT_THEN_AUTHORIZED_ATOMIC_RELEASE")


def main() -> int:
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--plan", action="store_true", help="read-only installation status")
    modes.add_argument("--apply", action="store_true", help="root-only one-time provisioning")
    args = parser.parse_args()
    try:
        if args.plan:
            print("PLATFORM_INSTALL_PLAN " + status_text(existing_state()))
        else:
            apply()
        return 0
    except (RuntimeError, OSError, subprocess.TimeoutExpired) as exc:
        # Only the fixed error codes we ourselves construct may reach stdout.
        code = str(exc) if isinstance(exc, RuntimeError) else "PLATFORM_OPERATION_UNAVAILABLE"
        print("PLATFORM_INSTALL=BLOCKED reason=" + code, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
