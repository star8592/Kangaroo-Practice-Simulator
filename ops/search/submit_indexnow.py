#!/usr/bin/env python3
"""Submit *already published* SOC THINK URLs to IndexNow.

This script never publishes source code or content. It only notifies participating
search engines of canonical public HTML pages listed in the LIVE sitemap.
A 200/202 response is a receipt of submission, NOT proof of search indexing.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from xml.etree import ElementTree

ORIGIN = "https://socthink.cn"
KEY_FILE = Path(__file__).resolve().parents[2] / "public" / "indexnow-key.txt"
ENDPOINT = "https://api.indexnow.org/indexnow"
MAX_URLS = 100


def fetch(url: str, timeout: int = 15) -> tuple[int, str, bytes, str]:
    with urlopen(Request(url, headers={"User-Agent": "SOCTHINK-IndexNow/1.0"}), timeout=timeout) as response:
        return response.status, response.url, response.read(2_000_000), response.headers.get("Content-Type", "")


def submit(paths: list[str], dry_run: bool = False) -> dict[str, object]:
    if not paths or len(paths) > MAX_URLS:
        raise ValueError("must submit 1-100 paths per run")
    if any(not path.startswith("/") or path.startswith("//") or "?" in path or "#" in path for path in paths):
        raise ValueError("all paths must be canonical local paths without query or fragment")
    if len(set(paths)) != len(paths):
        raise ValueError("duplicate URLs in request")
    key = KEY_FILE.read_text(encoding="ascii").strip()
    if not (8 <= len(key) <= 128 and all(c in "0123456789abcdefABCDEF" for c in key)):
        raise ValueError("invalid IndexNow key")
    status, effective_url, content, _ = fetch(ORIGIN + "/indexnow-key.txt")
    if status != 200 or effective_url != ORIGIN + "/indexnow-key.txt" or content.decode("utf-8").strip() != key:
        raise RuntimeError("public key file is missing or does not match repository")
    status, _, xml, _ = fetch(ORIGIN + "/sitemap.xml")
    if status != 200:
        raise RuntimeError("live sitemap unavailable")
    root = ElementTree.fromstring(xml)
    indexed = {elem.text for elem in root.findall(".//{*}loc")}
    urls = [ORIGIN + path for path in paths]
    for url in urls:
        if url not in indexed:
            raise RuntimeError(f"URL is not in live sitemap: {url}")
        status, final_url, html, content_type = fetch(url)
        if status != 200 or final_url != url or "text/html" not in content_type.lower() or b"<h1" not in html.lower():
            raise RuntimeError(f"URL is not a canonical public HTML page: {url}")
    payload = {
        "host": urlparse(ORIGIN).netloc,
        "key": key,
        "keyLocation": ORIGIN + "/indexnow-key.txt",
        "urlList": urls,
    }
    if dry_run:
        return {"status": "VERIFIED_NOT_SENT", "count": len(urls), "urls": urls}
    req = Request(ENDPOINT, data=json.dumps(payload).encode("utf-8"),
                  headers={"Content-Type": "application/json; charset=utf-8"},
                  method="POST")
    try:
        with urlopen(req, timeout=20) as response:
            code = response.status
    except HTTPError as exc:
        raise RuntimeError(f"IndexNow rejected submission HTTP {exc.code}") from exc
    except URLError as exc:
        raise RuntimeError(f"IndexNow submission transport error: {exc.reason}") from exc
    if code not in (200, 202):
        raise RuntimeError(f"unexpected IndexNow response: {code}")
    return {"status": "RECEIVED" if code == 200 else "RECEIVED_PENDING_KEY_VALIDATION",
            "http_status": code, "count": len(urls), "urls": urls}


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("paths", nargs="+", help="public canonical paths from live sitemap")
    ap.add_argument("--dry-run", action="store_true", help="only verify public pages and key")
    args = ap.parse_args()
    try:
        print(json.dumps(submit(args.paths, args.dry_run), ensure_ascii=False, indent=2))
    except Exception as exc:
        print(json.dumps({"status": "FAILED", "error": str(exc)}, ensure_ascii=False))
        raise SystemExit(1)
