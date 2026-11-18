#!/usr/bin/env python3
"""SEO-only audit of *DNS-verified* search crawler requests in Nginx logs.

Never persist crawler IP addresses, access-log contents, cookies, query strings,
or non-public URL paths. User-Agent alone is untrusted and does not count.
"""
from __future__ import annotations

from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from functools import lru_cache
import gzip
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import sys
import tempfile
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

SITE = "https://socthink.cn"
WINDOW_DAYS = 7
MAX_LOG_BYTES = 16_000_000
MAX_CANDIDATES = 350
MAX_ENTRIES = 30000
LOG_ROOT = Path("/var/log/nginx")
SUFFIXES = {
    "google": (".googlebot.com",),
    "bing": (".search.msn.com",),
    "baidu": (".crawl.baidu.com",),
}
REQUEST_LINE = re.compile(
    r'^(\S+) \S+ \S+ \[([^\]]+)\] "(GET|HEAD) ([^ ]+) HTTP/[^"]+" (\d{3}) '
)


def candidate_engine(raw: str) -> str | None:
    try:
        user_agent = raw.rsplit('"', 2)[-2].lower()
    except IndexError:
        return None
    if "googlebot" in user_agent:
        return "google"
    if "bingbot" in user_agent:
        return "bing"
    if "baiduspider" in user_agent:
        return "baidu"
    return None


@lru_cache(maxsize=512)
def verify_crawler_ip(engine: str, ip: str) -> bool:
    """Reverse/PTR domain suffix + forward A/AAAA match; never trust bare PTR."""
    if engine not in SUFFIXES:
        return False
    try:
        addr = ipaddress.ip_address(ip)
        if not addr.is_global:
            return False
        hostname = socket.gethostbyaddr(ip)[0].lower().rstrip(".")
        if not hostname.endswith(SUFFIXES[engine]):
            return False
        forward = {ipaddress.ip_address(x[4][0]) for x in socket.getaddrinfo(hostname, None)}
        return addr in forward
    except (ValueError, OSError, socket.error):
        return False


def public_paths(site_xml: bytes) -> set[str]:
    root = ET.fromstring(site_xml)
    urls = [node.text or "" for node in root.iter() if node.tag.endswith("loc")]
    out: set[str] = set()
    for url in urls:
        parsed = urlsplit(url)
        if parsed.scheme != "https" or parsed.netloc != "socthink.cn" or parsed.query or parsed.fragment:
            continue
        if not parsed.path.startswith("/"):
            continue
        out.add(parsed.path)
    if not out:
        raise ValueError("empty_or_invalid_sitemap")
    return out


def read_log_lines(log_root: Path, names: list[str]):
    read_count = 0
    for name in names:
        fp = log_root / name
        try:
            if not fp.is_file() or fp.stat().st_size > MAX_LOG_BYTES:
                continue
            opener = gzip.open if name.endswith(".gz") else open
            with opener(fp, "rt", encoding="utf-8", errors="replace") as infile:
                for raw in infile:
                    yield raw
                    read_count += 1
                    if read_count > 120000:
                        return
        except OSError:
            continue


def audit_lines(lines, paths: set[str], now: datetime, verifier=verify_crawler_ip):
    earliest = now - timedelta(days=WINDOW_DAYS)
    candidate: list[tuple[str, str, datetime, str, int]] = []
    all_ips: set[tuple[str, str]] = set()
    for raw in lines:
        engine = candidate_engine(raw)
        if engine is None:
            continue
        match = REQUEST_LINE.match(raw)
        if not match:
            continue
        ip, when, method, target, http = match.groups()
        try:
            at = datetime.strptime(when, "%d/%b/%Y:%H:%M:%S %z").astimezone(timezone.utc)
        except ValueError:
            continue
        if at < earliest or at > now + timedelta(minutes=5):
            continue
        try:
            path = urlsplit(target).path
        except ValueError:
            continue
        if not path.startswith("/"):
            continue
        pair = engine, ip
        if len(all_ips) >= MAX_CANDIDATES and pair not in all_ips:
            continue
        all_ips.add(pair)
        if len(candidate) >= MAX_ENTRIES:
            break
        candidate.append((engine, ip, at, path, int(http)))

    # Fixed pool and bounded candidate set avoid blocking the production website.
    with ThreadPoolExecutor(max_workers=12) as pool:
        good = set(pair for pair, ok in zip(sorted(all_ips), pool.map(lambda item: verifier(*item), sorted(all_ips))) if ok)

    summary = {}
    for engine in SUFFIXES:
        selected = [(at,path,status) for eng,ip,at,path,status in candidate if eng == engine and (eng,ip) in good]
        allowed = [(at,path,status) for at,path,status in selected if path in paths]
        ok_pages = [(at,path) for at,path,status in allowed if status == 200]
        failed_pages = [(at,path,status) for at,path,status in allowed if status >= 400]
        latest = max((at for at,_,_ in selected),default=None)
        recent = sorted(ok_pages,reverse=True)
        seen: set[str] = set()
        distinct_recent: list[str] = []
        for _,path in recent:
            if path not in seen:
                seen.add(path)
                distinct_recent.append(path)
            if len(distinct_recent) >= 4:
                break
        summary[engine] = {
            "verifiedRequests": len(selected),
            "verifiedPublicPage200": len(ok_pages),
            "distinctPublicPages200": len({path for _,path in ok_pages}),
            "publicPageErrors": len(failed_pages),
            "lastVerifiedAt": latest.isoformat().replace("+00:00", "Z") if latest else None,
            "samplePublicPaths": distinct_recent,
        }
    return summary


def generate_snapshot(log_root: Path, site_xml: bytes, *, now: datetime | None = None):
    now = now or datetime.now(timezone.utc)
    names = ["access.log","access.log.1"] + ["access.log."+str(n)+".gz" for n in range(2,9)]
    if not any((log_root / name).exists() for name in names):
        raise RuntimeError("nginx_access_logs_missing")
    return {
        "observedAt": now.isoformat().replace("+00:00", "Z"),
        "windowDays": WINDOW_DAYS,
        "method": "reverse_forward_dns",
        "source": "nginx_access_logs",
        "providers": audit_lines(read_log_lines(log_root,names),public_paths(site_xml),now),
    }


def write_snapshot(path: Path, snapshot: dict) -> None:
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    if path.parent.is_symlink():
        raise RuntimeError("unexpected_data_dir_symlink")
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent,
                                     prefix=".crawler-audit-", delete=False) as f:
        tmp = Path(f.name)
        os.chmod(tmp,0o600)
        json.dump(snapshot,f,ensure_ascii=False,indent=2)
        f.write("\n")
    try:
        os.replace(tmp,path)
    finally:
        tmp.unlink(missing_ok=True)


def main() -> int:
    try:
        req = Request(SITE+"/sitemap.xml",headers={"User-Agent":"SOC-SEO-BotAudit/1.0"})
        with urlopen(req,timeout=12) as res:
            if res.status != 200:
                raise RuntimeError("sitemap_http_failure")
            sitemap = res.read(300_000)
        data = generate_snapshot(LOG_ROOT,sitemap)
        location = Path(os.environ.get("SOCTHINK_SEO_DATA_DIR",
                                      "/opt/socthink-math/private/seo"))
        write_snapshot(location/"seo-verified-bots.json",data)
        print("SEO_VERIFIED_BOT_AUDIT=PASS verified_requests=" +
              ",".join(engine+":"+str(data["providers"][engine]["verifiedRequests"])
                       for engine in SUFFIXES))
        return 0
    except (OSError, RuntimeError, ValueError, ET.ParseError) as exc:
        print("SEO_VERIFIED_BOT_AUDIT=FAIL "+type(exc).__name__,file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
