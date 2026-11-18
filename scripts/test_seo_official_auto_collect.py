#!/usr/bin/env python3
"""Offline contract tests: no third-party API traffic or production secrets."""
import contextlib
from datetime import date
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import seo_official_auto_collect as mod


class OfficialCollectorTests(unittest.TestCase):
    def setUp(self):
        self.now = date(2026, 11, 18)

    def test_systemd_deploy_reuses_existing_numeric_seo_identity(self):
        root=Path(__file__).resolve().parent.parent
        unit=(root/"ops/systemd/socthink-seo-official.service").read_text()
        installer=(root/"ops/release/install_seo_official_collector.sh").read_text()
        self.assertIn("--reuid=1000 --regid=1000 --clear-groups",unit)
        self.assertIn("install -d -o 1000 -g 1000 -m 0700",installer)
        self.assertNotIn("User=master",unit)
        self.assertNotIn("-o master -g master",installer)
        self.assertIn("EnvironmentFile=-/etc/socthink/seo-official.env",unit)
        self.assertIn("NoNewPrivileges=true",unit)

    def test_google_final_rows_only_and_valid_integer(self):
        obj = {"rows": [
            {"keys":["2026-11-15"],"clicks":4.0,"impressions":99.0},
            {"keys":["2026-11-16"],"clicks":7,"impressions":102},
            {"keys":["2026-11-17"],"clicks":15,"impressions":200},
        ]}
        rows = mod.parse_gsc_performance(obj,self.now)
        self.assertEqual([r.day for r in rows],["2026-11-15","2026-11-16"])
        self.assertEqual(rows[0].impressions,99)
        self.assertEqual(mod.parse_gsc_performance({"rows":[]},self.now),[])
        for bad in ({"rows":[{"keys":["2026-11-16"],"clicks":1.3,"impressions":5}]},
                    {"rows":[{"keys":["2026-11-16"],"clicks":True,"impressions":5}]},
                    {"rows":[{"keys":["fake"],"clicks":1,"impressions":5}]}):
            with self.assertRaises(mod.CollectionError): mod.parse_gsc_performance(bad,self.now)

    def test_google_auth_requires_registered_property_and_permission(self):
        entry={"siteEntry":[{"siteUrl":"https://socthink.cn/","permissionLevel":"siteOwner"}]}
        self.assertIsNone(mod.check_google_site(entry,"https://socthink.cn/"))
        with self.assertRaises(mod.CollectionError):
            mod.check_google_site(entry,"https://untrusted.example/")
        entry["siteEntry"][0]["permissionLevel"]="siteUnverifiedUser"
        with self.assertRaises(mod.CollectionError):
            mod.check_google_site(entry,"https://socthink.cn/")

    def test_bing_json_stats_timezone_and_site_verification(self):
        entries={"d":[{"Url":"https://socthink.cn/","IsVerified":True}]}
        self.assertEqual(mod.check_bing_site(entries,"https://socthink.cn/"),"https://socthink.cn/")
        entries["d"][0]["IsVerified"]=False
        with self.assertRaises(mod.CollectionError): mod.check_bing_site(entries,"https://socthink.cn/")
        date_plus="/Date(1794768000000+0800)/"
        self.assertEqual(mod.parse_bing_date(date_plus),"2026-11-16")
        obj={"d":[{"Date":"2026-11-15T00:00:00Z","Clicks":0,"Impressions":2},
                   {"Date":"2026-11-17T00:00:00Z","Clicks":10,"Impressions":20}]}
        rows=mod.parse_bing_performance(obj,self.now)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0].clicks,0)

    def test_no_credentials_never_connect_or_fake_data(self):
        with tempfile.TemporaryDirectory(prefix="seo-official-no-creds-") as tmp:
            keys=["SOCTHINK_GSC_CLIENT_ID","SOCTHINK_GSC_CLIENT_SECRET","SOCTHINK_GSC_REFRESH_TOKEN","SOCTHINK_GSC_SITE_URL",
                  "SOCTHINK_BING_WEBMASTER_API_KEY","SOCTHINK_BING_WEBMASTER_SITE_URL"]
            env={k:"" for k in keys}
            env["SOCTHINK_SEO_DATA_DIR"]=tmp
            with mock.patch.dict(os.environ,env), \
                    mock.patch.object(mod,"json_request",side_effect=AssertionError("unexpected outbound request")), \
                    contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(mod.main([]),0)
                self.assertEqual(mod.main(["--check"]),0)
            ledger=Path(tmp)/"seo-official-reports.json"
            self.assertFalse(ledger.exists())
            status=json.loads((Path(tmp)/"seo-collection-status.json").read_text())
            self.assertEqual(status["google"]["state"],"missing_credentials")
            self.assertEqual(status["bing"]["state"],"missing_credentials")
            self.assertEqual((Path(tmp)/"seo-collection-status.json").stat().st_mode & 0o777,0o600)

    def test_evidence_and_real_importer_no_fabrication(self):
        with tempfile.TemporaryDirectory(prefix="seo-official-fixture-") as tmp:
            root=Path(__file__).resolve().parent.parent
            rows=[mod.DailyRecord("2026-11-16",5,24)]
            raw=b'{"rows":[{"keys":["2026-11-16"],"clicks":5,"impressions":24}]}'
            imported=mod.import_rows("google","google_search_analytics_api",rows,raw,
                                     data_dir=Path(tmp),repo_dir=root)
            self.assertEqual(imported,1)
            history=json.loads((Path(tmp)/"seo-official-reports.json").read_text())
            self.assertEqual(len(history),2)
            self.assertEqual({r["metric"] for r in history},{"clicks","impressions"})
            self.assertEqual({r["periodEnd"] for r in history},{"2026-11-16"})
            self.assertEqual({r["value"] for r in history},{5,24})
            original=list((Path(tmp)/"evidence").glob("*.json"))
            self.assertEqual(len(original),1)
            self.assertEqual(original[0].read_bytes(),raw)
            self.assertEqual(original[0].stat().st_mode & 0o777,0o600)
            self.assertEqual(mod.import_rows("google","google_search_analytics_api",rows,raw,
                                             data_dir=Path(tmp),repo_dir=root),1)
            self.assertEqual(len(json.loads((Path(tmp)/"seo-official-reports.json").read_text())),2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
