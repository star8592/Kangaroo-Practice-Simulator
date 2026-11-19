from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts.audit_amc8_official_archive import audit


class AuditArchiveTests(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.TemporaryDirectory()
        self.root = Path(self.t.name)

    def tearDown(self):
        self.t.cleanup()

    def add(self, name, year, count, *, commercial=False):
        data = {
            "profile": {"id": name, "year": year, "formatId": "maa-amc8",
                        "rightsPolicy": {"commercialUse": commercial}},
            "questions": [{"stem": "DO NOT EXPORT THIS COPYRIGHT TEXT"}] * count,
        }
        (self.root / f"{name}.json").write_text(json.dumps(data))

    def test_only_year_metadata_is_exported(self):
        self.add("maa-amc8-2000-test", 2000, 25)
        result = audit(self.root)
        self.assertEqual(result["summary"]["local_full_year_candidates"], 1)
        self.assertEqual(result["summary"]["missing_years"][0], 1999)
        self.assertNotIn("DO NOT EXPORT THIS COPYRIGHT TEXT", json.dumps(result))
        self.assertEqual(result["summary"]["commercially_authorized_years_verified"], 0)

    def test_non_amc8_2021_is_not_an_official_year(self):
        self.add("maa-amc8-2021-test", 2021, 25)
        result = audit(self.root)
        self.assertEqual(len(result["years"]), 27)
        self.assertEqual(result["summary"]["local_full_year_candidates"], 0)
        self.assertEqual(result["summary"]["fragment_files"], 1)

    def test_declared_commercial_flag_does_not_imply_approved_license(self):
        self.add("maa-amc8-2003-test", 2003, 25, commercial=True)
        result = audit(self.root)
        self.assertEqual(result["summary"]["commercially_authorized_years_verified"], 0)
        r = next(x for x in result["years"] if x["year"] == 2003)
        self.assertFalse(r["candidates"][0]["rights_verified"])
        self.assertFalse(r["candidates"][0]["source_comparison_verified"])

    def test_sample_and_fragments_are_distinct(self):
        self.add("maa-amc8-2023-sample", 2023, 25)
        self.add("maa-amc8-2026-practice", 2026, 5)
        result = audit(self.root)
        self.assertEqual(result["summary"]["sample_years"], [2023])
        self.assertEqual(result["summary"]["fragment_files"], 1)

    def test_malformed_file_flagged_without_crash(self):
        (self.root / "maa-amc8-broken.json").write_text("{bad")
        result = audit(self.root)
        self.assertEqual(result["summary"]["corrupt_files"], 1)


if __name__ == "__main__":
    unittest.main()
