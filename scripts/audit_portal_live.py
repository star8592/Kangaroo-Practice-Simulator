#!/usr/bin/env python3
"""Read-only customer route inventory for the unified SOCTHINK Web portal.

No logins, cookies, POST requests, payments or protected user details.
The shared navigation and publicly reachable links are verified over HTTPS.
"""
from __future__ import annotations

import argparse
from html.parser import HTMLParser
import json
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

PUBLIC = (
    "/", "/assessments", "/resources", "/arithmetic", "/competitions",
    "/events", "/membership", "/login", "/terms",
    "/digital-purchase-policy", "/privacy", "/verification",
)
LEGACY = (
    "/parent", "/parent/login", "/parent/register", "/account", "/student",
)
NAV = (
    "/assessments", "/resources", "/arithmetic", "/competitions",
    "/events", "/membership", "/account",
)


class PageHTML(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_title = False
        self.in_h1 = False
        self.title: list[str] = []
        self.h1: list[str] = []
        self.h1_count = 0
        self.nav_links: set[str] = set()
        self.main_count = 0

    def handle_starttag(self, tag, attrs) -> None:
        d = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "h1":
            self.in_h1 = True
            self.h1_count += 1
        if tag == "main":
            self.main_count += 1
        if tag == "a":
            u = d.get("href")
            if u:
                self.nav_links.add(u.split("?")[0].split("#")[0])

    def handle_endtag(self, tag) -> None:
        if tag == "title":
            self.in_title = False
        if tag == "h1":
            self.in_h1 = False

    def handle_data(self, data) -> None:
        if self.in_title:
            self.title.append(data)
        if self.in_h1:
            self.h1.append(data)


def check(base: str, path: str) -> dict:
    url = urljoin(base + "/", path.lstrip("/"))
    req = Request(url, headers={"User-Agent": "SOCTHINK-Portal-ReadOnly-Audit/1.0"})
    try:
        with urlopen(req, timeout=12) as r:
            code = r.status
            final = r.url
            body = r.read(800_000).decode("utf-8", "replace")
    except HTTPError as err:
        target = err.headers.get("Location", "")
        if path == "/arithmetic" and err.code == 307 and target.startswith(
            "/api/auth/guest/start?next=/arithmetic"
        ):
            # The public calculation route intentionally creates an ephemeral
            # guest session via a same-origin cookie. A stateless HTTP probe
            # must not follow it and fabricate a redirect-loop finding.
            return {"path": path, "status": 307, "guest_bootstrap": True}
        return {"path": path, "status": err.code, "error": "HTTP"}
    except (URLError, OSError) as err:
        return {"path": path, "status": None, "error": type(err).__name__}
    p = PageHTML()
    p.feed(body)
    final_path = urlparse(final).path
    result = {
        "path": path, "status": code, "final_path": final_path,
        "title": "".join(p.title)[:70], "h1": "".join(p.h1)[:80],
        "h1_count": p.h1_count, "main_count": p.main_count,
        "nav_complete": set(NAV).issubset(p.nav_links),
    }
    if path == "/membership":
        result["purchase_policy_visible"] = "不支持无理由退款" in body
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="https://socthink.cn")
    args = parser.parse_args()
    parsed = urlparse(args.base)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username:
        raise SystemExit("HTTPS_ORIGIN_REQUIRED")
    rows = [check(args.base.rstrip("/"), p) for p in (*PUBLIC, *LEGACY)]
    failures = [
        r for r in rows
        if not (r["path"] == "/arithmetic" and r.get("guest_bootstrap"))
        and (r["status"] != 200
             or (r["path"] in PUBLIC and not r.get("nav_complete"))
             or (r["path"] in PUBLIC and not r.get("title"))
             or (r["path"] in PUBLIC and r.get("h1_count") != 1)
             or (r["path"] in PUBLIC and r.get("main_count") != 1))
    ]
    print(json.dumps({
        "origin": args.base,
        "read_only": True,
        "checked": len(rows), "failures": len(failures), "routes": rows,
    }, ensure_ascii=False, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
