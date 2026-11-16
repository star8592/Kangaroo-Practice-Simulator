#!/usr/bin/env python3
"""Offline regression: organization-seat installer must verify THIS backup run."""
from __future__ import annotations

import importlib.util
import io
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

INSTALLER = Path(__file__).resolve().parents[1] / "ops/payment/install_org_seat_schema.py"
spec = importlib.util.spec_from_file_location("org_seat_install", INSTALLER)
assert spec and spec.loader
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)

PREVIOUS = "1" * 32
CURRENT = "2" * 32
RECEIPTS = (
    "BILLING_BACKUP=PASS ISOLATED_RESTORE=PASS RESTORED_TABLES=15\n"
    "BILLING_ASSET_BACKUP=PASS ISOLATED_RESTORE=PASS ASSETS=13"
)


class BackupProofTests(unittest.TestCase):
    def simulate(self, *, invocation=CURRENT, result="success", receipts=RECEIPTS):
        calls = []

        def fake_run(*args, capture=False):
            calls.append(args)
            if args == ("systemctl", "show", installer.BACKUP_UNIT,
                        "-p", "InvocationID", "--value"):
                return PREVIOUS
            if args == ("systemctl", "start", installer.BACKUP_UNIT):
                return ""
            if args == ("systemctl", "show", installer.BACKUP_UNIT,
                        "-p", "Result", "-p", "ExecMainStatus", "-p", "InvocationID"):
                return (f"Result={result}\nExecMainStatus=0\n"
                        f"InvocationID={invocation}")
            if args == ("journalctl", f"_SYSTEMD_INVOCATION_ID={invocation}",
                        "--no-pager", "-o", "cat"):
                return receipts
            raise AssertionError(f"Unexpected command: {args}")

        return calls, fake_run

    def test_fresh_invocation_with_both_restores_passes(self):
        calls, runner = self.simulate()
        with patch.object(installer, "run", side_effect=runner), redirect_stdout(io.StringIO()) as out:
            installer.verified_backup()
        self.assertIn("BACKUP=PASS", out.getvalue())
        self.assertIn(("journalctl", f"_SYSTEMD_INVOCATION_ID={CURRENT}",
                       "--no-pager", "-o", "cat"), calls)

    def test_rejects_stale_invocation_even_with_prior_success(self):
        calls, runner = self.simulate(invocation=PREVIOUS)
        with patch.object(installer, "run", side_effect=runner):
            with self.assertRaisesRegex(RuntimeError, "Fresh encrypted backup"):
                installer.verified_backup()
        self.assertFalse(any(command[0] == "journalctl" for command in calls))

    def test_rejects_missing_current_asset_restore(self):
        _, runner = self.simulate(receipts="BILLING_BACKUP=PASS ISOLATED_RESTORE=PASS")
        with patch.object(installer, "run", side_effect=runner):
            with self.assertRaisesRegex(RuntimeError, "Current backup/restore proof missing"):
                installer.verified_backup()

    def test_rejects_bad_unit_status(self):
        _, runner = self.simulate(result="failed")
        with patch.object(installer, "run", side_effect=runner):
            with self.assertRaisesRegex(RuntimeError, "Fresh encrypted backup"):
                installer.verified_backup()

    def test_rejects_missing_invocation_identity(self):
        _, runner = self.simulate(invocation="")
        with patch.object(installer, "run", side_effect=runner):
            with self.assertRaisesRegex(RuntimeError, "Fresh encrypted backup"):
                installer.verified_backup()


if __name__ == "__main__":
    unittest.main()
