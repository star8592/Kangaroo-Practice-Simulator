#!/usr/bin/env python3
"""Offline safety tests for the public IndexNow one-shot workflow."""
from __future__ import annotations

import contextlib
import io
import json
import unittest
from unittest.mock import patch
import seo_indexnow_submit as sut


def sitemap(*urls: str) -> str:
    return '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(
        f"<url><loc>{u}</loc></url>" for u in urls
    ) + "</urlset>"


class IndexNowTests(unittest.TestCase):
    def test_public_sitemap_only_and_dedupe(self):
        urls = [sut.BASE + "/", sut.BASE + "/resources"]
        self.assertEqual(sut.extract_sitemap_urls(sitemap(*urls, urls[1])), urls)
        self.assertEqual(sut.choose_urls(urls, ["/resources", "/resources"], False), [urls[1]])

    def test_private_or_foreign_urls_never_enter_submission(self):
        bad = ["https://evil.example/resources", "http://socthink.cn/", "https://socthink.cn/resources?x=1"]
        for url in bad:
            with self.subTest(url=url):
                with self.assertRaises(ValueError):
                    sut.extract_sitemap_urls(sitemap(url))
        for path in ["//evil.example", "/resources?query=1", "/foo#bar", r"/foo\bar", "https://elsewhere.example"]:
            with self.subTest(path=path):
                with self.assertRaises(ValueError):
                    sut.canonical_url(path)
        with self.assertRaises(ValueError):
            sut.choose_urls([sut.BASE + "/resources"], ["/api/release"], False)
        with self.assertRaises(ValueError):
            sut.choose_urls([sut.BASE + "/resources"], ["/resources"], True)

    def test_no_submission_without_explicit_submit_flag(self):
        calls = []
        def fake_request(url, *, payload=None):
            calls.append((url, payload))
            if url == sut.KEY_URL:
                return 200, sut.KEY, url
            if url == sut.SITEMAP_URL:
                return 200, sitemap(sut.BASE + "/resources"), url
            if url == sut.BASE + "/resources":
                return 200, '<link rel="canonical" href="https://socthink.cn/resources"/>', url
            raise AssertionError("Unexpected remote call in dry-run")
        with patch.object(sut, "request", side_effect=fake_request), contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(sut.main(["--path", "/resources"]), 0)
        self.assertIn("INDEXNOW_DRY_RUN=PASS", output.getvalue())
        self.assertFalse(any(url == sut.INDEXNOW_ENDPOINT for url, _ in calls))

    def test_submission_only_after_public_validation(self):
        posted = []
        def fake_request(url, *, payload=None):
            if url == sut.KEY_URL:
                return 200, sut.KEY, url
            if url == sut.SITEMAP_URL:
                return 200, sitemap(sut.BASE + "/resources"), url
            if url == sut.BASE + "/resources":
                return 200, '<link rel="canonical" href="https://socthink.cn/resources"/>', url
            if url == sut.INDEXNOW_ENDPOINT:
                posted.append(json.loads(payload))
                return 202, "", url
            raise AssertionError("Unknown request")
        with patch.object(sut, "request", side_effect=fake_request), contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(sut.main(["--submit", "--path", "/resources"]), 0)
        self.assertEqual(posted[0]["urlList"], [sut.BASE + "/resources"])
        self.assertEqual(posted[0]["keyLocation"], sut.KEY_URL)
        self.assertIn("INDEXNOW_INDEXING_STATUS=UNKNOWN", output.getvalue())


if __name__ == "__main__":
    unittest.main()
