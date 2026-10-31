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
# Check the exact flags in src/lib/wechat-native-flags.ts.
EXPECTED_VALUES = {
    "SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED": "1",
    "SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED": "1",
    "SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED": "1",
    "PAYMENT_PROVIDER": "wechat_native",
    "SOCTHINK_PAYMENT_SURFACE": "web-native",
}
MERCHANT_REQUIRED = (
    "WECHAT_PAY_APPID", "WECHAT_PAY_MCHID", "WECHAT_PAY_SERIAL_NO",
    "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_PUBLIC_KEY_PATH",
    "WECHAT_PAY_PUBLIC_KEY_ID", "WECHAT_PAY_API_V3_KEY",
    "WECHAT_PAY_NOTIFY_URL", "SOCTHINK_PUBLIC_ORIGIN",
)
PAYMENT_KEYS = tuple({
    "SOCTHINK_BILLING_DATABASE_URL", *EXPECTED_VALUES, *MERCHANT_REQUIRED,
})



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
                    if key in EXPECTED_VALUES:
                        results[key] = clean == EXPECTED_VALUES[key]
                    else:
                        results[key] = bool(clean)
        except (OSError, UnicodeError):
            continue
    return results


def evaluate_readiness(
    state: dict[str, bool], db_exists: bool | None, role_exists: bool | None
) -> dict[str, Any]:
    """Only the payment runtime flags. The marketing plan catalog is a preview."""
    blockers: list[str] = []
    for condition, name in (
        (db_exists is False, "PRODUCTION_BILLING_DATABASE_MISSING"),
        (role_exists is False, "PRODUCTION_BILLING_ROLE_MISSING"),
        (not state.get("SOCTHINK_BILLING_DATABASE_URL"), "BILLING_CONNECTION_NOT_CONFIGURED"),
        (not state.get("SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED"), "NATIVE_PRODUCT_APPROVAL_NOT_ATTESTED"),
        (not state.get("PAYMENT_PROVIDER"), "PAYMENT_PROVIDER_NOT_NATIVE"),
        (not state.get("SOCTHINK_PAYMENT_SURFACE"), "PAYMENT_SURFACE_NOT_WEB_NATIVE"),
        (not state.get("SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED"), "NATIVE_RECONCILIATION_DISABLED"),
        (not all(state.get(x,False) for x in MERCHANT_REQUIRED), "CURRENT_SITE_MERCHANT_CONFIG_INCOMPLETE"),
        (not state.get("SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED"), "NEW_CHARGES_DISABLED"),
    ):
        if condition:
            blockers.append(name)
    return {
        "blockers": blockers,
        "merchant_fields_present": all(state.get(x,False) for x in MERCHANT_REQUIRED),
        "native_reconciliation_flag": state.get("SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED",False),
        "native_checkout_flag": state.get("SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED",False),
        "product_approval_attested": state.get("SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED",False),
        "payment_provider_matches": state.get("PAYMENT_PROVIDER",False),
        "payment_surface_matches": state.get("SOCTHINK_PAYMENT_SURFACE",False),
    }


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

    readiness = evaluate_readiness(state, db_exists, role_exists)

    report = {
        "schema": "socthink_payment_readiness_v1",
        "read_only": True,
        "production_release_marker_matches_public": bool(
            sha and origin and sha == origin.get("deployedSha") == origin.get("gitSha")
        ),
        "production_billing_database_exists": db_exists,
        "production_billing_role_exists": role_exists,
        "production_billing_environment_exists": ENV_FILES[0].is_file(),
        "merchant_configured_for_this_site": readiness["merchant_fields_present"],
        "native_settlement_enabled": readiness["native_reconciliation_flag"],
        "native_checkout_enabled": readiness["native_checkout_flag"],
        "native_product_approval_attested": readiness["product_approval_attested"],
        "payment_provider_matches": readiness["payment_provider_matches"],
        "payment_surface_matches": readiness["payment_surface_matches"],
        "public_checkout_available": catalog.get("checkoutAvailable") if catalog else None,
        "public_catalog_is_static_plan_preview": True,
        "actual_saleable_sku_verified": None,
        "legacy_merchant_configured": bool(old and old.get("configured") is True),
        "legacy_merchant_real_mode": bool(old and old.get("mock_mode") is False),
        "blockers": readiness["blockers"],
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
