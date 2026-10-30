#!/usr/bin/env python3
"""Read-only readiness facts for the single SOCTHINK production payment chain.

No secrets, private keys, payment requests, database writes, service restarts
or implicit merchant approvals. It differentiates old ThinkAI configuration
from current socthink.cn transactions and explains why HTTP 503 is expected.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
from typing import Any
import urllib.request

RELEASE = Path("/opt/socthink-releases/current")
ENV_FILES = [
    Path("/etc/socthink-math-billing.env"),
    Path("/etc/socthink-math-payment.env"),
    Path("/etc/socthink-math-payments.env"),
    Path("/etc/socthink-math-wechatpay.env"),
]
PAYMENT_KEYS = [
    "SOCTHINK_BILLING_DATABASE_URL",
    "SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED",
    "SOCTHINK_WEB_NATIVE_SETTLEMENT_ENABLED",
    "WECHAT_PAY_APPID",
    "WECHAT_PAY_MCHID",
    "WECHAT_PAY_PRIVATE_KEY_PATH",
    "WECHAT_PAY_PUBLIC_KEY_PATH",
    "WECHAT_PAY_PUBLIC_KEY_ID",
    "WECHAT_PAY_API_V3_KEY",
]


def quiet_run(args: list[str]) -> str | None:
    try:
        proc = subprocess.run(
            args, capture_output=True, text=True, timeout=7, check=False,
        )
        return proc.stdout.strip() if proc.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def public_json(url: str) -> dict[str, Any] | None:
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": "SOCTHINK-ReadOnly-Readiness/1.0"},
        )
        with urllib.request.urlopen(req, timeout=7) as response:
            data = json.load(response)
        return data if isinstance(data, dict) else None
    except (ValueError, OSError):
        return None


def configured_payment_flags() -> dict[str, bool]:
    # Values are NEVER returned, printed or written to logs.
    results: dict[str, bool] = {key: False for key in PAYMENT_KEYS}
    for p in ENV_FILES:
        if not p.is_file():
            continue
        try:
            # Do not follow secrets symlinks; only read known operator env files.
            if p.is_symlink():
                continue
            with p.open(encoding="utf-8") as stream:
                for raw in stream:
                    if raw.lstrip().startswith("#") or "=" not in raw:
                        continue
                    key, value = raw.split("=", 1)
                    key = key.strip()
                    if key not in results:
                        continue
                    clean = value.strip().strip('"').strip("'")
                    if key in ("SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED",
                               "SOCTHINK_WEB_NATIVE_SETTLEMENT_ENABLED"):
                        results[key] = clean == "1"
                    else:
                        results[key] = bool(clean)
        except (OSError, UnicodeError):
            continue
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    state = configured_payment_flags()
    db_exists: bool | None = None
    role_exists: bool | None = None
    if os.geteuid() == 0:
        # Catalog boolean queries only; never select any customer/payments.
        v = quiet_run([
            "runuser", "-u", "postgres", "--", "psql", "-Atq",
            "-d", "postgres", "-c",
            "SELECT EXISTS(SELECT 1 FROM pg_database "
            "WHERE datname='socthink_billing_prod');",
        ])
        if v in ("t", "f"):
            db_exists = v == "t"
        v = quiet_run([
            "runuser", "-u", "postgres", "--", "psql", "-Atq",
            "-d", "postgres", "-c",
            "SELECT EXISTS(SELECT 1 FROM pg_roles "
            "WHERE rolname='socthink_billing');",
        ])
        if v in ("t", "f"):
            role_exists = v == "t"
    origin = public_json("https://socthink.cn/api/release")
    catalog = public_json("https://socthink.cn/api/access/catalog")
    old = public_json("https://www.socthink.cn/api/subscription/provider-status")
    release_path = RELEASE.resolve() if RELEASE.exists() else None
    sha = None
    if release_path:
        marker = release_path / ".release/deployed_sha"
        try:
            sha = marker.read_text(encoding="utf-8").strip()
        except OSError:
            pass

    blockers = []
    if db_exists is False:
        blockers.append("PRODUCTION_BILLING_DATABASE_MISSING")
    if not state["SOCTHINK_BILLING_DATABASE_URL"]:
        blockers.append("BILLING_CONNECTION_NOT_CONFIGURED")
    if not state["SOCTHINK_WEB_NATIVE_SETTLEMENT_ENABLED"]:
        blockers.append("NATIVE_SETTLEMENT_DISABLED")
    merchant_required = [
        "WECHAT_PAY_APPID", "WECHAT_PAY_MCHID", "WECHAT_PAY_PRIVATE_KEY_PATH",
        "WECHAT_PAY_PUBLIC_KEY_PATH", "WECHAT_PAY_PUBLIC_KEY_ID",
        "WECHAT_PAY_API_V3_KEY",
    ]
    if any(not state[x] for x in merchant_required):
        blockers.append("CURRENT_SITE_MERCHANT_CONFIG_INCOMPLETE")
    if not state["SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED"]:
        blockers.append("NEW_CHARGES_DISABLED")
    if catalog is not None and catalog.get("checkoutAvailable") is False:
        blockers.append("PUBLIC_CATALOG_CHECKOUT_NOT_AVAILABLE")

    report = {
        "schema": "socthink_payment_readiness_v1",
        "read_only": True,
        "production_release_marker_matches_public": bool(
            sha and origin and sha == origin.get("deployedSha") == origin.get("gitSha")
        ),
        "production_billing_database_exists": db_exists,
        "production_billing_role_exists": role_exists,
        "production_billing_environment_exists": ENV_FILES[0].is_file(),
        "merchant_configured_for_this_site": all(state[k] for k in merchant_required),
        "native_settlement_enabled": state["SOCTHINK_WEB_NATIVE_SETTLEMENT_ENABLED"],
        "native_checkout_enabled": state["SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED"],
        "public_checkout_available": catalog.get("checkoutAvailable") if catalog else None,
        "legacy_merchant_configured": bool(old and old.get("configured") is True),
        "legacy_merchant_real_mode": bool(old and old.get("mock_mode") is False),
        "blockers": blockers,
    }
    if args.json:
        print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    else:
        for key, value in report.items():
            print(f"{key.upper()}={json.dumps(value, ensure_ascii=False)}")
        print("NO_DATABASE_MUTATIONS=YES")
        print("NO_PAYMENT_REQUESTS=YES")
        print("NO_MERCHANT_KEYS_EXPORTED=YES")


if __name__ == "__main__":
    main()
