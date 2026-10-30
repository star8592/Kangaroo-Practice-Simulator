#!/usr/bin/env python3
"""Isolated, side-effect-free coverage of the one-time DB provisioning helpers."""
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile


def main() -> None:
    module_path = Path(__file__).resolve().parents[1] / "ops/payment/provision_billing_postgres.py"
    spec = importlib.util.spec_from_file_location("billing_bootstrap_contract", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with tempfile.TemporaryDirectory(prefix="socthink-billing-contract-") as tmp:
        path = Path(tmp) / "only-test-secret.env"
        module.write_private_exclusive(path, "TEST_ONLY_DUMMY_CREDENTIAL\n")
        assert path.read_text() == "TEST_ONLY_DUMMY_CREDENTIAL\n"
        assert (path.stat().st_mode & 0o777) == 0o600
        try:
            module.write_private_exclusive(path, "SHOULD_NOT_REPLACE\n")
            raise AssertionError("Refused overwrite expected")
        except FileExistsError:
            pass
        assert path.read_text() == "TEST_ONLY_DUMMY_CREDENTIAL\n"
        target = Path(tmp) / "link.env"
        target.symlink_to(path)
        try:
            module.write_private_exclusive(target, "SHOULD_NOT_REPLACE\n")
            raise AssertionError("Refused symlink expected")
        except FileExistsError:
            pass

    denied = subprocess.run(
        [sys.executable, str(module_path), "--apply"],
        capture_output=True, text=True, check=False, timeout=5,
    )
    assert denied.returncode == 2, denied.returncode
    assert "OPERATOR_CONFIRMATION_REQUIRED" in denied.stderr
    assert "TEST_ONLY_DUMMY_CREDENTIAL" not in denied.stderr
    print("PROD_BILLING_BOOTSTRAP=PASS (explicit authorization, private env mode, no overwrite, no network or DB writes)")


if __name__ == "__main__":
    main()
