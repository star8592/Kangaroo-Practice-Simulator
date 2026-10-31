#!/usr/bin/env python3
"""Verify published canonical URLs and optionally notify IndexNow.

No periodic worker, account credentials, or new publishing pipeline. Use the
current public Sitemap as the only URL source, and explicitly name changed
paths for subsequent notifications. --bootstrap is for one initial submission.
IndexNow acceptance is NOT a guarantee of crawling, indexing, or ranking.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html import unescape

BASE = "https://socthink.cn"
HOST = "socthink.cn"
KEY = "f4d6c6f4e8735cc9cea17156fdeac577591666a9"  # public key, not a secret
KEY_URL = f"{BASE}/{KEY}.txt"
INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
SITEMAP_URL = BASE + "/sitemap.xml"
USER_AGENT = "SOCTHINK-IndexNow-Publisher/1.0"


def request(url: str, *, payload: bytes | None = None) -> tuple[int, str, str]:
    headers = {"User-Agent": USER_AGENT}
    if payload is not None:
        headers["Content-Type"] = "application/json; charset=utf-8"
    req = urllib.request.Request(url, headers=headers, data=payload)
    with urllib.request.urlopen(req, timeout=20) as response:
        return response.status, response.read(2_000_000).decode("utf-8", "replace"), response.geturl()


def canonical_url(path: str) -> str:
    """Convert only local, path-only URLs into safe public URLs."""
    if not path.startswith("/") or path.startswith("//") or any(c in path for c in ("\r", "\n", "\\", "?", "#")):
        raise ValueError(f"Only canonical local URL paths may be submitted: {path!r}")
    return BASE + path


def extract_sitemap_urls(xml_text: str) -> list[str]:
    root = ET.fromstring(xml_text)
    if not root.tag.endswith("urlset"):
        raise ValueError("Expected a URL set, not an index or other XML document")
    urls: list[str] = []
    for child in root:
        if not child.tag.endswith("url"):
            continue
        loc = next((e.text for e in child if e.tag.endswith("loc")), None)
        if not loc:
            raise ValueError("Sitemap URL has no loc")
        parsed = urllib.parse.urlsplit(loc.strip())
        if (parsed.scheme, parsed.netloc, parsed.query, parsed.fragment) != ("https", HOST, "", ""):
            raise ValueError(f"Foreign, non-HTTPS, or noncanonical Sitemap URL: {loc!r}")
        if loc not in urls:
            urls.append(loc)
    if not urls:
        raise ValueError("Sitemap contains no URLs")
    return urls


def verify_key() -> None:
    status, content, target = request(KEY_URL)
    if status != 200 or target != KEY_URL or content.strip() != KEY:
        raise RuntimeError("IndexNow public key file did not match expected host and content")


def verify_page(url: str) -> None:
    status, page, target = request(url)
    if status != 200 or target != url:
        raise RuntimeError(f"Invalid published page response: {url!r} -> {status} {target}")
    canonical = re.search(
        r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', page, re.I
    )
    if not canonical:
        raise RuntimeError(f"Missing canonical tag in {url}")
    claimed = unescape(canonical.group(1)).rstrip("/")
    if claimed != url.rstrip("/"):
        raise RuntimeError(f"Canonical mismatch for {url}: {claimed}")


def choose_urls(available: list[str], requested_paths: list[str], bootstrap: bool) -> list[str]:
    if bootstrap and requested_paths:
        raise ValueError("Do not combine --bootstrap and --path")
    if bootstrap:
        return available
    if not requested_paths:
        raise ValueError("Specify at least one --path, or --bootstrap for the first run")
    requested = [canonical_url(path) for path in requested_paths]
    if any(url not in available for url in requested):
        raise ValueError("All submitted paths must already be listed in the public Sitemap")
    return list(dict.fromkeys(requested))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--path", action="append", default=[], help="Changed canonical path, e.g. /resources")
    parser.add_argument("--bootstrap", action="store_true", help="One-time initial submission of all published Sitemap URLs")
    parser.add_argument("--submit", action="store_true", help="Actually send IndexNow POST; default is dry-run")
    args = parser.parse_args(argv)

    # Fail safely before any network write when arguments do not name URLs.
    if not args.bootstrap and not args.path:
        parser.error("Specify --path (changed published URLs) or --bootstrap (one-time first run)")

    try:
        verify_key()
        status, xml, target = request(SITEMAP_URL)
        if status != 200 or target != SITEMAP_URL:
            raise RuntimeError("Unable to retrieve canonical public Sitemap")
        selected = choose_urls(extract_sitemap_urls(xml), args.path, args.bootstrap)
        for url in selected:
            verify_page(url)
        print("INDEXNOW_PUBLIC_KEY=PASS")
        print(f"INDEXNOW_URLS_VALIDATED={len(selected)}")
        if not args.submit:
            print("INDEXNOW_DRY_RUN=PASS")
            print(json.dumps({"host": HOST, "keyLocation": KEY_URL, "urlList": selected}, ensure_ascii=False))
            return 0

        payload = json.dumps(
            {"host": HOST, "key": KEY, "keyLocation": KEY_URL, "urlList": selected},
            ensure_ascii=False, separators=(",", ":")
        ).encode("utf-8")
        code, response_body, _ = request(INDEXNOW_ENDPOINT, payload=payload)
        if code not in (200, 202):
            raise RuntimeError(f"Unexpected IndexNow response code {code}: {response_body[:200]}")
        print(f"INDEXNOW_SUBMISSION_ACCEPTED={code}")
        print(f"INDEXNOW_URL_COUNT={len(selected)}")
        print("INDEXNOW_INDEXING_STATUS=UNKNOWN")
        return 0
    except (ValueError, RuntimeError, urllib.error.URLError, ET.ParseError) as error:
        print("INDEXNOW_ERROR=" + str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
