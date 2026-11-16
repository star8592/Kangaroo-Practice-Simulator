#!/usr/bin/env python3
"""Privilege-free tests for R180 operator-controlled installation."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "ops/release/install_platform_authorization_runtime.py"
SPEC = importlib.util.spec_from_file_location("platform_runtime_installer", SCRIPT)
assert SPEC and SPEC.loader
installer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(installer)


class PlatformRuntimeInstallerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="socthink-platform-runtime-test.")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.env = self.root / "etc/platform.env"
        self.unit = self.root / "systemd/socthink-math.service.d/72-platform-auth.conf"
        self.unit.parent.mkdir(parents=True)
        self.backup = self.root / "backup/platform-r180.dump"
        fake_pg = self.root / "postgresql/18/bin"
        fake_pg.mkdir(parents=True)
        (fake_pg / "psql").write_text("")
        for name, value in (("ENV_FILE", self.env),
                            ("UNIT_DROPIN", self.unit),
                            ("BACKUP", self.backup),
                            ("PG_BIN", fake_pg)):
            patcher = patch.object(installer, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_missing_root_never_changes_database(self):
        with patch.object(installer.os, "geteuid", return_value=1000), \
             patch.object(installer, "postgres_sql") as sql:
            with self.assertRaisesRegex(RuntimeError, "ROOT_APPROVAL_REQUIRED"):
                installer.apply()
            sql.assert_not_called()

    def test_partial_install_refuses_overwrite(self):
        with patch.object(installer.os, "geteuid", return_value=0), \
             patch.object(installer, "existing_state",
                          return_value=(True, True, False, False)), \
             patch.object(installer, "backup_before_change") as backup:
            with self.assertRaisesRegex(RuntimeError,
                                        "ALREADY_OR_PARTIALLY_INSTALLED_REVIEW_FIRST"):
                installer.apply()
            backup.assert_not_called()

    def test_install_only_dedicated_role_env_and_unit(self):
        sql_commands = []
        backup_calls = []
        grants = []
        system_calls = []

        def fake_sql(database, query):
            sql_commands.append((database, query))
            if query.startswith("SELECT"):
                return "t"
            return ""

        def validate(password):
            grants.append(password)
            self.assertEqual(len(password), 64)
            self.assertTrue(all(c in "0123456789abcdef" for c in password))

        with patch.object(installer.os, "geteuid", return_value=0), \
             patch.object(installer, "existing_state",
                          return_value=(True, False, False, False)), \
             patch.object(installer, "postgres_sql", side_effect=fake_sql), \
             patch.object(installer, "backup_before_change",
                          side_effect=lambda: backup_calls.append(True)), \
             patch.object(installer, "validate_restricted_login",
                          side_effect=validate), \
             patch.object(installer, "quiet_process",
                          side_effect=lambda argv, **kw: system_calls.append(argv)):
            installer.apply()

        self.assertEqual(backup_calls, [True])
        self.assertEqual(len(grants), 1)
        self.assertEqual(system_calls, [["systemctl", "daemon-reload"]])
        self.assertEqual(self.env.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.unit.stat().st_mode & 0o777, 0o644)
        secret_env = self.env.read_text()
        self.assertEqual(secret_env.count("SOCTHINK_PLATFORM_DATABASE_URL="), 1)
        self.assertIn("127.0.0.1:5432/socthink_platform", secret_env)
        self.assertIn(":" + grants[0] + "@", secret_env)
        self.assertEqual(self.unit.read_text(), installer.DROPIN_TEXT)
        self.assertTrue(any("CREATE ROLE socthink_platform_app" in q
                            for _, q in sql_commands))
        self.assertTrue(any("GRANT CONNECT ON DATABASE socthink_platform" in q
                            for _, q in sql_commands))

    def test_database_failure_never_writes_secret_file(self):
        def fake_sql(database, query):
            if "CREATE ROLE" in query:
                raise RuntimeError("AUTHORIZED_DATABASE_OPERATION_FAILED")
            return "t" if query.startswith("SELECT") else ""
        with patch.object(installer.os, "geteuid", return_value=0), \
             patch.object(installer, "existing_state",
                          return_value=(True, False, False, False)), \
             patch.object(installer, "postgres_sql", side_effect=fake_sql), \
             patch.object(installer, "backup_before_change"):
            with self.assertRaises(RuntimeError):
                installer.apply()
        self.assertFalse(self.env.exists())
        self.assertFalse(self.unit.exists())

    def test_read_only_plan_has_no_secret(self):
        self.assertEqual(
            installer.status_text((True, False, False, False)),
            "database=PRESENT restricted_role=MISSING env_file=MISSING unit_dropin=MISSING",
        )


if __name__ == "__main__":
    unittest.main()
