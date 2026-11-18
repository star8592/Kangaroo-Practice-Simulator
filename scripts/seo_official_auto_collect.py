#!/usr/bin/env python3
"""Read-only official Google/Bing webmaster performance collector.

Requires explicit credentials provisioned separately from the repository.
No credentials: no API calls and no fabricated metrics. Only the existing
evidence-backed private SEO importer may write the provider ledger.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request

SITE = "https://socthink.cn"
GOOGLE_SITES = "https://www.googleapis.com/webmasters/v3/sites"
GOOGLE_SEARCH = "https://www.googleapis.com/webmasters/v3/sites/{}/searchAnalytics/query"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
BING_API = "https://ssl.bing.com/webmaster/api.svc/json"
UA = "SOC-THINK-SEO-Official-Collector/1.0"
MAX_RESPONSE = 3_000_000
MAX_DAYS = 30


class CollectionError(Exception):
    """Sanitized errors safe to display in operating logs."""


class MissingCredential(CollectionError):
    pass


@dataclass(frozen=True)
class DailyRecord:
    day: str
    clicks: int
    impressions: int


def require_env(*names: str) -> list[str]:
    result = [os.getenv(name, "").strip() for name in names]
    if any(not x for x in result):
        raise MissingCredential("missing_credentials")
    return result


def json_request(url: str, *, method: str = "GET", payload: bytes | None = None,
                 headers: dict[str, str] | None = None) -> tuple[dict, bytes]:
    if not url.startswith(("https://www.googleapis.com/", "https://oauth2.googleapis.com/",
                           "https://ssl.bing.com/")):
        raise CollectionError("unexpected_api_host")
    h = {"User-Agent": UA, "Accept": "application/json"}
    if payload is not None:
        h["Content-Type"] = "application/json; charset=utf-8"
    h.update(headers or {})
    req = urllib.request.Request(url, data=payload, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read(MAX_RESPONSE + 1)
            if len(raw) > MAX_RESPONSE:
                raise CollectionError("api_response_too_large")
            if not 200 <= response.status < 300:
                raise CollectionError("api_status_not_success")
    except urllib.error.HTTPError as exc:
        raise CollectionError("api_http_" + str(exc.code)) from None
    except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
        raise CollectionError("api_connection_failed") from None
    try:
        obj = json.loads(raw)
        if not isinstance(obj, dict):
            raise CollectionError("unexpected_api_shape")
        return obj, raw
    except (UnicodeError, ValueError):
        raise CollectionError("invalid_api_json") from None


def valid_metric(v: object) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and \
        float(v).is_integer() and 0 <= float(v) <= 1_000_000_000_000


def valid_day(s: object) -> bool:
    if not isinstance(s, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return False
    try:
        return date.fromisoformat(s).isoformat() == s
    except ValueError:
        return False


def choose_daily(rows: list[DailyRecord], today: date) -> list[DailyRecord]:
    earliest = today - timedelta(days=MAX_DAYS)
    latest = today - timedelta(days=2)
    unique = {r.day: r for r in rows if earliest.isoformat() <= r.day <= latest.isoformat()}
    return [unique[day] for day in sorted(unique)]


def parse_gsc_performance(response: dict, today: date) -> list[DailyRecord]:
    rows = response.get("rows", [])
    if not isinstance(rows, list):
        raise CollectionError("invalid_google_rows")
    records: list[DailyRecord] = []
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("keys"), list) or \
                len(row["keys"]) != 1 or not valid_day(row["keys"][0]) or \
                not valid_metric(row.get("clicks")) or not valid_metric(row.get("impressions")):
            raise CollectionError("invalid_google_stat_row")
        records.append(DailyRecord(row["keys"][0], int(row["clicks"]), int(row["impressions"])))
    return choose_daily(records, today)


def parse_bing_date(value: object) -> str:
    if isinstance(value, str) and valid_day(value[:10]) and ("T" in value or len(value) == 10):
        return value[:10]
    match = re.fullmatch(r"/Date\((\d+)([+-]\d{4})?\)/", value) if isinstance(value, str) else None
    if not match:
        raise CollectionError("invalid_bing_day")
    epoch_ms = int(match.group(1))
    utc = datetime.fromtimestamp(epoch_ms / 1000, tz=timezone.utc)
    if match.group(2):
        hh, mm = int(match.group(2)[1:3]), int(match.group(2)[3:5])
        minutes = (hh * 60 + mm) * (1 if match.group(2)[0] == "+" else -1)
        utc += timedelta(minutes=minutes)
    return utc.date().isoformat()


def parse_bing_performance(response: dict, today: date) -> list[DailyRecord]:
    rows = response.get("d")
    if not isinstance(rows, list):
        raise CollectionError("invalid_bing_rows")
    records: list[DailyRecord] = []
    for row in rows:
        if not isinstance(row, dict) or \
                not valid_metric(row.get("Clicks")) or not valid_metric(row.get("Impressions")):
            raise CollectionError("invalid_bing_stat_row")
        records.append(DailyRecord(parse_bing_date(row.get("Date")), int(row["Clicks"]), int(row["Impressions"])))
    return choose_daily(records, today)


def normalize_property(url: str) -> str:
    return url.strip().rstrip("/")


def check_google_site(sites: dict, property_url: str) -> None:
    entries = sites.get("siteEntry")
    if not isinstance(entries, list):
        raise CollectionError("google_sites_response_missing")
    for item in entries:
        if isinstance(item, dict) and normalize_property(str(item.get("siteUrl", ""))) == normalize_property(property_url):
            permission = item.get("permissionLevel")
            if permission in ("siteOwner", "siteFullUser", "siteRestrictedUser"):
                return
            raise CollectionError("google_property_not_verified")
    raise CollectionError("google_property_not_authorized")


def check_bing_site(response: dict, site_url: str) -> str:
    entries = response.get("d")
    if not isinstance(entries, list):
        raise CollectionError("bing_sites_response_invalid")
    for item in entries:
        if not isinstance(item, dict):
            continue
        url = item.get("Url") or item.get("SiteUrl")
        if not isinstance(url, str):
            continue
        if normalize_property(url) == normalize_property(site_url):
            if item.get("IsVerified") is True:
                return url
            raise CollectionError("bing_property_not_verified")
    raise CollectionError("bing_property_not_authorized")


def collect_google(today: date) -> tuple[list[DailyRecord], bytes]:
    client, secret, refresh, property_url = require_env(
        "SOCTHINK_GSC_CLIENT_ID", "SOCTHINK_GSC_CLIENT_SECRET",
        "SOCTHINK_GSC_REFRESH_TOKEN", "SOCTHINK_GSC_SITE_URL")
    if normalize_property(property_url) not in (SITE, "sc-domain:socthink.cn"):
        raise CollectionError("google_property_wrong_site")
    form = urllib.parse.urlencode({
        "client_id": client, "client_secret": secret,
        "refresh_token": refresh, "grant_type": "refresh_token",
    }).encode("ascii")
    # OAuth token request requires form encoding, not JSON.
    req = urllib.request.Request(GOOGLE_TOKEN, data=form, method="POST", headers={
        "User-Agent": UA, "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            tokens = json.loads(response.read(30_000))
    except urllib.error.HTTPError as exc:
        raise CollectionError("google_oauth_http_" + str(exc.code)) from None
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise CollectionError("google_oauth_failed") from None
    access = tokens.get("access_token") if isinstance(tokens, dict) else None
    if not isinstance(access, str) or not access:
        raise CollectionError("google_oauth_access_missing")
    auth = {"Authorization": "Bearer " + access}
    sites, _ = json_request(GOOGLE_SITES, headers=auth)
    check_google_site(sites, property_url)
    start = today - timedelta(days=MAX_DAYS)
    end = today - timedelta(days=2)
    query = json.dumps({
        "startDate": start.isoformat(), "endDate": end.isoformat(),
        "dimensions": ["date"], "type": "web", "dataState": "final",
        "rowLimit": 250,
    }, separators=(",", ":")).encode("utf-8")
    url = GOOGLE_SEARCH.format(urllib.parse.quote(property_url, safe=""))
    payload, raw = json_request(url, method="POST", payload=query, headers=auth)
    return parse_gsc_performance(payload, today), raw


def collect_bing(today: date) -> tuple[list[DailyRecord], bytes]:
    key, property_url = require_env("SOCTHINK_BING_WEBMASTER_API_KEY", "SOCTHINK_BING_WEBMASTER_SITE_URL")
    if normalize_property(property_url) != SITE:
        raise CollectionError("bing_property_wrong_site")
    def url_for(action: str, params: dict[str, str]) -> str:
        return BING_API + "/" + action + "?" + urllib.parse.urlencode({"apikey": key, **params})
    sites, _ = json_request(url_for("GetUserSites", {}))
    registered = check_bing_site(sites, property_url)
    response, raw = json_request(url_for("GetRankAndTrafficStats", {"siteUrl": registered}))
    return parse_bing_performance(response, today), raw


def import_rows(provider: str, source: str, rows: list[DailyRecord],
                raw: bytes, *, data_dir: Path, repo_dir: Path) -> int:
    if not rows:
        return 0
    # Evidence is official API payload, never authorization credentials.
    evidence_dir = data_dir / "evidence"
    evidence_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    digest = sha256(raw).hexdigest()
    evidence = evidence_dir / (provider + "-" + digest[:20] + ".json")
    if not evidence.exists():
        fd = os.open(evidence, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as fh:
            fh.write(raw)
    count = 0
    for row in rows:
        request = {
            "site": SITE, "provider": provider, "source": source,
            "periodStart": row.day, "periodEnd": row.day,
            "metrics": {"clicks": row.clicks, "impressions": row.impressions},
        }
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", suffix=".json", prefix="seo-normalized-",
            dir=data_dir, delete=False
        ) as temp:
            tmp = Path(temp.name)
            os.chmod(tmp, 0o600)
            json.dump(request, temp)
        try:
            process = subprocess.run(
                [str(repo_dir / "node_modules/.bin/tsx"),
                 str(repo_dir / "scripts/import_seo_official_report.ts"),
                 "--input", str(tmp), "--evidence", str(evidence)],
                cwd=repo_dir, env={**os.environ, "SOCTHINK_SEO_DATA_DIR": str(data_dir)},
                timeout=50, capture_output=True, text=True, check=False,
            )
            if process.returncode or "SEO_OFFICIAL_IMPORT=PASS" not in process.stdout:
                raise CollectionError("official_import_failed")
            count += 1
        finally:
            tmp.unlink(missing_ok=True)
    return count


def safe_write_json(filename: Path, payload: dict) -> None:
    filename.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=filename.parent,
        prefix=".seo-collector-", delete=False
    ) as fh:
        tmp = Path(fh.name)
        os.chmod(tmp, 0o600)
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    os.replace(tmp, filename)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check credential presence only, no API requests")
    args = parser.parse_args(argv)
    repo_dir = Path(__file__).resolve().parent.parent
    data_dir = Path(os.environ.get("SOCTHINK_SEO_DATA_DIR", str(repo_dir / "private/seo"))).resolve()
    now = datetime.now(timezone.utc)
    out: dict[str, dict] = {}
    for provider, required, operation, source in [
        ("google", ("SOCTHINK_GSC_CLIENT_ID","SOCTHINK_GSC_CLIENT_SECRET","SOCTHINK_GSC_REFRESH_TOKEN","SOCTHINK_GSC_SITE_URL"),
         collect_google, "google_search_analytics_api"),
        ("bing", ("SOCTHINK_BING_WEBMASTER_API_KEY","SOCTHINK_BING_WEBMASTER_SITE_URL"),
         collect_bing, "bing_webmaster_api"),
    ]:
        try:
            require_env(*required)
            if args.check:
                out[provider] = {"state": "configured", "checkedAt": now.isoformat()}
                continue
            rows, raw = operation(now.date())
            imported = import_rows(provider, source, rows, raw, data_dir=data_dir, repo_dir=repo_dir)
            out[provider] = {"state": "imported" if imported else "no_final_rows",
                             "checkedAt": now.isoformat(), "importedDays": imported,
                             "lastPeriod": rows[-1].day if rows else None}
        except MissingCredential:
            out[provider] = {"state": "missing_credentials", "checkedAt": now.isoformat()}
        except (CollectionError, OSError, subprocess.TimeoutExpired) as exc:
            out[provider] = {"state": "error", "checkedAt": now.isoformat(),
                             "reason": str(exc) if isinstance(exc, CollectionError) else "io_or_import_failure"}
        print("SEO_ENGINE_" + provider.upper() + "=" + out[provider]["state"])
    if not args.check:
        safe_write_json(data_dir / "seo-collection-status.json", out)
    # Individual failures are isolated. A deployment without credentials is
    # intentionally nonfatal and never overwrites real values with zeros.
    return 0 if all(x["state"] != "error" for x in out.values()) else 2


if __name__ == "__main__":
    sys.exit(main())
