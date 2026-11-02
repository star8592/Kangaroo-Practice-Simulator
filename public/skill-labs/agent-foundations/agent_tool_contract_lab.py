#!/usr/bin/env python3
"""SOC THINK original educational lab: tool calls + independent verification.
No network, no file writes, no LLM API. Python >=3.10; stdlib only.
This is a *simulator* of structured Agent tool calls, not an autonomous agent.
"""
from __future__ import annotations

import argparse
import json
import unittest
from dataclasses import dataclass, asdict
from typing import Any

ALLOWED_TOOL = "quote_order"
ALLOWED_ARGUMENTS = frozenset(("unit_price_cents", "quantity", "discount_percent"))


@dataclass(frozen=True)
class CallRecord:
    tool: str
    accepted: bool
    output_cents: int | None
    error: str | None


def exact_int(value: Any, minimum: int, maximum: int, field: str) -> int:
    """Prevent bool-as-int and dangerous coercions, then validate bounds."""
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(f"{field} must be integer in [{minimum}, {maximum}]")
    return value


def quote_order(unit_price_cents: int, quantity: int, discount_percent: int) -> int:
    """A clearly defined integer rounding policy: half-up to the nearest cent."""
    subtotal = unit_price_cents * quantity
    return (subtotal * (100 - discount_percent) + 50) // 100


def execute_call(payload: Any) -> CallRecord:
    """Tool dispatcher, with allowlist and exact schema. No unsafe capabilities."""
    if not isinstance(payload, dict):
        return CallRecord("", False, None, "call must be object")
    tool = payload.get("tool")
    if not isinstance(tool, str) or tool != ALLOWED_TOOL:
        return CallRecord(str(tool), False, None, "tool not authorized")
    args = payload.get("arguments")
    if not isinstance(args, dict) or set(args) != ALLOWED_ARGUMENTS:
        return CallRecord(tool, False, None, "arguments do not match contract")
    try:
        price = exact_int(args["unit_price_cents"], 1, 100_000_000, "unit_price_cents")
        qty = exact_int(args["quantity"], 1, 1000, "quantity")
        pct = exact_int(args["discount_percent"], 0, 100, "discount_percent")
    except ValueError as exc:
        return CallRecord(tool, False, None, str(exc))
    return CallRecord(tool, True, quote_order(price, qty, pct), None)


def independent_verify(trusted_input: dict[str, int], record: CallRecord | None,
                       claimed_success: bool) -> dict[str, Any]:
    """A claim alone is never proof. Expected result is derived from trusted input."""
    expected = quote_order(
        trusted_input["unit_price_cents"],
        trusted_input["quantity"],
        trusted_input["discount_percent"],
    )
    accepted = record is not None and record.accepted
    actual = record.output_cents if accepted else None
    passed = accepted and actual == expected
    return {
        "claimed_success": bool(claimed_success),
        "accepted_tool_record": bool(accepted),
        "expected_cents": expected,
        "actual_cents": actual,
        "verified": passed,
        "reason": "verified" if passed else (
            "no authorized tool result" if not accepted else "result mismatch"
        ),
    }


TRUSTED = {"unit_price_cents": 1299, "quantity": 3, "discount_percent": 10}


class AgentToolContractTests(unittest.TestCase):
    def test_valid_quote(self):
        rec = execute_call({"tool": ALLOWED_TOOL, "arguments": TRUSTED})
        self.assertTrue(rec.accepted)
        self.assertEqual(rec.output_cents, 3507)
        self.assertTrue(independent_verify(TRUSTED, rec, True)["verified"])

    def test_missing_field_rejected(self):
        rec = execute_call({"tool": ALLOWED_TOOL, "arguments": {"quantity": 3}})
        self.assertFalse(rec.accepted)

    def test_extra_field_rejected(self):
        rec = execute_call({"tool": ALLOWED_TOOL, "arguments": {**TRUSTED, "secret": 1}})
        self.assertFalse(rec.accepted)

    def test_bool_as_int_rejected(self):
        rec = execute_call({"tool": ALLOWED_TOOL, "arguments": {**TRUSTED, "quantity": True}})
        self.assertFalse(rec.accepted)

    def test_unauthorized_tool_rejected(self):
        rec = execute_call({"tool": "delete_all", "arguments": TRUSTED})
        self.assertFalse(rec.accepted)

    def test_false_success_cannot_pass(self):
        result = independent_verify(TRUSTED, None, True)
        self.assertFalse(result["verified"])
        self.assertTrue(result["claimed_success"])

    def test_tampered_result_rejected(self):
        rec = CallRecord(ALLOWED_TOOL, True, 999999, None)
        self.assertFalse(independent_verify(TRUSTED, rec, True)["verified"])


def run_demo() -> None:
    normal = execute_call({"tool": ALLOWED_TOOL, "arguments": TRUSTED})
    denied = execute_call({"tool": "delete_all", "arguments": TRUSTED})
    scenarios = {
        "valid": {"trace": asdict(normal), "judge": independent_verify(TRUSTED, normal, True)},
        "unauthorized": {"trace": asdict(denied), "judge": independent_verify(TRUSTED, denied, True)},
        "false_success": {"trace": None, "judge": independent_verify(TRUSTED, None, True)},
    }
    print(json.dumps(scenarios, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true", help="run seven deterministic tests")
    group.add_argument("--demo", action="store_true", help="show verified/rejected/false success")
    flags = parser.parse_args()
    if flags.self_test:
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(AgentToolContractTests)
        outcome = unittest.TextTestRunner(verbosity=2).run(suite)
        raise SystemExit(0 if outcome.wasSuccessful() else 1)
    else:
        run_demo()
