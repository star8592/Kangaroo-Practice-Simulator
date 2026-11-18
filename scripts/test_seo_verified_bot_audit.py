#!/usr/bin/env python3
import io
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parent))
import seo_verified_bot_audit as audit

GOOGLE_UA="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
BING_UA="Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
BAIDU_UA="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"

def line(ip, when, path, status, ua):
    return f'{ip} - - [{when.strftime("%d/%b/%Y:%H:%M:%S %z")}] "GET {path} HTTP/2.0" {status} 250 "-" "{ua}"\n'

class VerifiedBotAuditTest(unittest.TestCase):
    def setUp(self):
        self.now=datetime(2026,11,18,4,0,tzinfo=timezone.utc)
        self.at=self.now-timedelta(hours=3)
        self.paths={"/","/english","/teach"}
    def test_spoofed_agents_are_rejected_and_private_data_filtered(self):
        seen=[]
        def verifier(engine,ip):
            seen.append((engine,ip))
            return (engine,ip) in (("google","66.249.70.110"),("baidu","116.179.32.69"))
        lines=[
            line("66.249.70.110",self.at,"/",200,GOOGLE_UA),
            line("66.249.70.110",self.at,"/english?secret=my-token",200,GOOGLE_UA),
            line("66.249.70.110",self.at,"/english",404,GOOGLE_UA),
            line("66.249.70.110",self.at,"/my/learning?token=123",200,GOOGLE_UA),
            line("8.166.137.232",self.at,"/",200,GOOGLE_UA),
            line("198.51.100.12",self.at,"/",200,BING_UA),
            line("116.179.32.69",self.at,"/teach",200,BAIDU_UA),
            line("66.249.70.110",self.at-timedelta(days=10),"/",200,GOOGLE_UA),
        ]
        result=audit.audit_lines(lines,self.paths,self.now,verifier=verifier)
        g=result["google"]; b=result["bing"]; d=result["baidu"]
        self.assertEqual(g["verifiedRequests"],4)
        self.assertEqual(g["verifiedPublicPage200"],2)
        self.assertEqual(g["distinctPublicPages200"],2)
        self.assertEqual(g["publicPageErrors"],1)
        self.assertEqual(g["samplePublicPaths"],["/english","/"])
        self.assertEqual(b["verifiedRequests"],0)
        self.assertEqual(b["lastVerifiedAt"],None)
        self.assertEqual(d["distinctPublicPages200"],1)
        payload=json.dumps(result)
        for secret in ("66.249.70.110","198.51.100.12","secret=my-token","/my/learning","198.51.100.12"):
            self.assertNotIn(secret,payload)

    def test_sitemap_scope(self):
        xml=b'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://socthink.cn/</loc></url><url><loc>https://socthink.cn/english</loc></url><url><loc>https://elsewhere.example/out</loc></url></urlset>'
        self.assertEqual(audit.public_paths(xml),{"/","/english"})

    def test_private_json_is_atomic_and_has_no_ip(self):
        with tempfile.TemporaryDirectory() as temp:
            dest=Path(temp)/"private"/"seo-verified-bots.json"
            data={"observedAt":self.now.isoformat(),"providers":{"google":{"verifiedRequests":1}}}
            audit.write_snapshot(dest,data)
            self.assertEqual(dest.stat().st_mode & 0o777,0o600)
            self.assertEqual(dest.parent.stat().st_mode & 0o777,0o700)
            self.assertEqual(json.loads(dest.read_text()),data)

    def test_no_bare_ptr_or_host_spoof(self):
        self.assertFalse(audit.verify_crawler_ip("google","127.0.0.1"))
        self.assertFalse(audit.verify_crawler_ip("not-an-engine","66.249.70.110"))
        self.assertFalse(audit.verify_crawler_ip("google","not-ip"))

if __name__=="__main__":
    unittest.main(verbosity=2)
