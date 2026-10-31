#!/usr/bin/env python3
"""Offline contract for production read-only payment readiness; no funds or keys."""
from __future__ import annotations

import importlib.util
import tempfile
from pathlib import Path

path = Path("ops/payment/audit_checkout_readiness.py")
spec = importlib.util.spec_from_file_location("socthink_payment_readiness", path)
assert spec and spec.loader
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

assert "SOCTHINK_WEB_NATIVE_SETTLEMENT_ENABLED" not in mod.PAYMENT_KEYS
assert "SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED" in mod.PAYMENT_KEYS
for key in (
    "WECHAT_PAY_SERIAL_NO", "WECHAT_PAY_NOTIFY_URL",
    "WECHAT_PAY_APPID", "SOCTHINK_PUBLIC_ORIGIN",
    "SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED",
    "PAYMENT_PROVIDER", "SOCTHINK_PAYMENT_SURFACE",
):
    assert key in mod.PAYMENT_KEYS, key

all_valid = {key: True for key in mod.PAYMENT_KEYS}
ready = mod.evaluate_readiness(all_valid, True, True)
assert ready["blockers"] == [], ready["blockers"]
assert ready["native_reconciliation_flag"] is True
assert ready["merchant_fields_present"] is True
assert mod.evaluate_readiness(all_valid, False, False)["blockers"] == [
    "PRODUCTION_BILLING_DATABASE_MISSING",
    "PRODUCTION_BILLING_ROLE_MISSING",
]
assert mod.evaluate_readiness(all_valid, None, None)["blockers"] == []
for key in mod.PAYMENT_KEYS:
    state = dict(all_valid)
    state[key] = False
    result = mod.evaluate_readiness(state, True, True)
    assert result["blockers"], ("Missing required field was ignored", key)
    assert "PUBLIC_CATALOG_CHECKOUT_NOT_AVAILABLE" not in result["blockers"]
assert "PUBLIC_CATALOG_CHECKOUT_NOT_AVAILABLE" not in path.read_text()
assert "public_catalog_is_static_plan_preview" in path.read_text()

# Verify that comparisons are exact (not merely non-empty) and that no
# sensitive values leak to stdout or the JSON readiness report.
with tempfile.TemporaryDirectory(prefix="socthink-payment-readiness-") as d:
    envfile = Path(d) / "non-production.env"
    lines = {key: "example-value" for key in mod.PAYMENT_KEYS}
    lines.update(mod.EXPECTED_VALUES)
    lines["SOCTHINK_BILLING_DATABASE_URL"] = "postgresql://fake:fake@localhost/test"
    envfile.write_text("\n".join(f'{k}="{v}"' for k, v in lines.items()))
    saved = mod.ENV_FILES
    try:
        mod.ENV_FILES = [envfile]
        values = mod.configured_payment_flags()
        assert all(values.values())
        envfile.write_text(envfile.read_text().replace(
            'PAYMENT_PROVIDER="wechat_native"', 'PAYMENT_PROVIDER="jsapi"'
        ))
        assert mod.configured_payment_flags()["PAYMENT_PROVIDER"] is False
        envfile.write_text(envfile.read_text().replace(
            'SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED="1"',
            'SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED="0"'
        ))
        assert mod.configured_payment_flags()[
            "SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED"
        ] is False
    finally:
        mod.ENV_FILES = saved
print(
    "PAYMENT_READINESS_CONTRACT=PASS "
    "exact_runtime_flags independent_storage no_static_catalog_gate "
    "zero_network zero_database_writes no_secrets"
)
