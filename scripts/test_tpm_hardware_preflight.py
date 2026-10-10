#!/usr/bin/env python3
"""Synthetic-only tests of the fail-closed TPM preflight; no real device needed."""
import importlib.util
import os
import stat
import subprocess
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
FILE = ROOT / "ops/backup/tpm_hardware_preflight.py"
spec = importlib.util.spec_from_file_location("tpm_preflight", FILE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fake_device(device):
    if device == "/dev/tpmrm0":
        return SimpleNamespace(st_mode=stat.S_IFCHR | 0o660)
    raise FileNotFoundError(device)


assert module.device_gate(stat_func=fake_device,
                          access_func=lambda path, mode: False) == "tpm_device_access_denied"
assert module.device_gate(stat_func=fake_device,
                          access_func=lambda path, mode: True) is None
assert module.device_gate(stat_func=lambda _: (_ for _ in ()).throw(FileNotFoundError()),
                          access_func=lambda path, mode: False) == "tpm_device_unavailable"


class FakeRunner:
    def __init__(self, *, encrypt_ok=True, decrypt_ok=True, corrupt=False):
        self.calls = []
        self.encrypt_ok = encrypt_ok
        self.decrypt_ok = decrypt_ok
        self.corrupt = corrupt

    def __call__(self, command, *, input, stdout, stderr, timeout, check):
        self.calls.append(tuple(command))
        assert "--with-key=tpm2" in command or "decrypt" in command
        assert "--no-ask-password" in command
        assert timeout > 0 and check is False
        if "encrypt" in command:
            return subprocess.CompletedProcess(command, 0 if self.encrypt_ok else 1,
                                               stdout=b"fake-sealed" if self.encrypt_ok else b"")
        output = (b"x" * 32) if self.corrupt else (b"A" * 32)
        return subprocess.CompletedProcess(command, 0 if self.decrypt_ok else 1, stdout=output)


ok = FakeRunner()
assert module.synthetic_roundtrip(runner=ok, random_bytes=lambda length: b"A" * length)
assert len(ok.calls) == 2
assert not module.synthetic_roundtrip(runner=FakeRunner(encrypt_ok=False),
                                     random_bytes=lambda length: b"A" * length)
assert not module.synthetic_roundtrip(runner=FakeRunner(decrypt_ok=False),
                                     random_bytes=lambda length: b"A" * length)
assert not module.synthetic_roundtrip(runner=FakeRunner(corrupt=True),
                                     random_bytes=lambda length: b"A" * length)

seal = (ROOT / "ops/backup/seal_offsite_recovery_tpm.sh").read_text()
installer = (ROOT / "ops/backup/install_offsite_pull.sh").read_text()
fixture = (ROOT / "scripts/test_tpm_offsite_recovery.py").read_text()
assert "tpm_hardware_preflight.py" in seal and "tpm_hardware_preflight.py" in installer
assert "tpm_hardware_preflight.py" in fixture
assert seal.index("tpm_hardware_preflight.py") < seal.index("remote_hash="), (
    "TPM synthetic preflight must happen before SSH source secret read"
)
assert "--with-key=null" not in seal
print("TPM_PREFLIGHT_UNIT=PASS missing_device=BLOCKED denied=BLOCKED "
      "synthetic_crypto_fail=BLOCKED before_remote_secret=YES")
