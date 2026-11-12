#!/usr/bin/env python3
"""Offline tests for the read-only PG18 infrastructure readiness decision."""
from pathlib import Path
import tempfile
import unittest
from pg18_infra_preflight import BACKUP_NAMES, assess, inspect_backups, parse_clusters, package_installed

BASELINE = """16 main 5432 online postgres /var/lib/postgresql/16/main /var/log/postgresql/postgresql-16-main.log
18 rehearsal 5434 down postgres /var/lib/postgresql/18/rehearsal /var/log/postgresql/postgresql-18-rehearsal.log
"""


class PG18InfraPreflightTests(unittest.TestCase):
    def test_parse_detects_managed_clusters_only(self):
        x = parse_clusters(BASELINE)
        self.assertEqual(len(x), 2)
        self.assertEqual(x[0]["port"], "5432")
        self.assertEqual(x[1]["version"], "18")

    def test_managed_package_requires_installed_dpkg_status(self):
        self.assertTrue(package_installed(0, "install ok installed"))
        self.assertFalse(package_installed(0, "deinstall ok config-files"))
        self.assertFalse(package_installed(1, "install ok installed"))

    def test_current_unmanaged_pg18_not_ready(self):
        x = assess(
            parse_clusters(BASELINE.splitlines()[0]), False, True, True,
            {k: True for k in BACKUP_NAMES}, True
        )
        self.assertFalse(x["ready_for_isolated_rehearsal"])
        self.assertFalse(x["production_cutover_authorized"])
        self.assertIn("MANAGED_PG18_PACKAGE_NOT_INSTALLED", x["blockers"])
        self.assertIn("INDEPENDENT_MANAGED_PG18_REHEARSAL_CLUSTER_MISSING", x["blockers"])

    def test_rehearsal_ready_still_not_approved_for_cutover(self):
        x = assess(
            parse_clusters(BASELINE), True, True, True,
            {k: True for k in BACKUP_NAMES}, True
        )
        self.assertTrue(x["ready_for_isolated_rehearsal"])
        self.assertFalse(x["production_cutover_authorized"])
        self.assertEqual(x["missing_backup_names"], [])

    def test_missing_backups_block(self):
        x = assess(parse_clusters(BASELINE), True, True, True, {}, True)
        self.assertEqual(len(x["missing_backup_names"]), len(BACKUP_NAMES))
        self.assertIn("SOURCE_BACKUP_MISSING_OR_EMPTY", x["blockers"])

    def test_missing_pg16_baseline_blocks(self):
        x = assess(parse_clusters(BASELINE.splitlines()[1]), True, False, True,
                   {k: True for k in BACKUP_NAMES}, True)
        self.assertIn("PG16_BASELINE_5432_NOT_VERIFIED", x["blockers"])

    def test_backup_nonempty_and_private(self):
        with tempfile.TemporaryDirectory() as home:
            root = Path(home)
            root.chmod(0o700)
            for name in BACKUP_NAMES:
                p = root / name
                p.write_bytes(b"fixture")
                p.chmod(0o600)
            checks, private = inspect_backups(root)
            self.assertTrue(private)
            self.assertTrue(all(checks.values()))
            (root / BACKUP_NAMES[0]).chmod(0o644)
            checks, private = inspect_backups(root)
            self.assertFalse(private)
            (root / BACKUP_NAMES[0]).chmod(0o600)
            (root / BACKUP_NAMES[1]).write_bytes(b"")
            checks, private = inspect_backups(root)
            self.assertFalse(checks[BACKUP_NAMES[1]])

    def test_unavailable_backup_dir(self):
        with tempfile.TemporaryDirectory() as home:
            checks, private = inspect_backups(Path(home) / "missing")
            self.assertFalse(private)
            self.assertFalse(any(checks.values()))


if __name__ == "__main__":
    unittest.main()
