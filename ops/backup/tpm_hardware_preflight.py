#!/usr/bin/env python3
"""Non-secret TPM2 access check and optional synthetic encrypt/decrypt roundtrip.

Do not read production backup passphrases, remote hosts or user data.
A visible TPM is not proof that the current process can use it (e.g. user namespaces).
"""
import argparse
import hmac
import os
import secrets
import shutil
import stat
import subprocess
import sys


def device_gate(devices=("/dev/tpmrm0", "/dev/tpm0"), *,
                stat_func=os.stat, access_func=os.access):
    """Return one non-secret blocker or None. Never changes permissions."""
    present = False
    for device in devices:
        try:
            node = stat_func(device)
        except OSError:
            continue
        if not stat.S_ISCHR(node.st_mode):
            continue
        present = True
        if access_func(device, os.R_OK | os.W_OK):
            return None
    return "tpm_device_access_denied" if present else "tpm_device_unavailable"


def synthetic_roundtrip(*, runner=subprocess.run, random_bytes=secrets.token_bytes):
    """Test actual TPM encrypt/decrypt using random in-memory bytes only."""
    payload = random_bytes(32)
    name = "socthink-synthetic-tpm-hardware-probe"
    encrypt_cmd = ["systemd-creds", "encrypt", "--no-ask-password",
                   "--with-key=tpm2", "--name=" + name, "-", "-"]
    decrypt_cmd = ["systemd-creds", "decrypt", "--no-ask-password",
                   "--name=" + name, "-", "-"]
    try:
        sealed = runner(encrypt_cmd, input=payload, stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE, timeout=40, check=False)
        if sealed.returncode != 0 or not sealed.stdout:
            return False
        opened = runner(decrypt_cmd, input=sealed.stdout, stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE, timeout=40, check=False)
        return opened.returncode == 0 and hmac.compare_digest(opened.stdout, payload)
    except (OSError, subprocess.TimeoutExpired, subprocess.SubprocessError):
        return False


def main():
    parser = argparse.ArgumentParser(description="Fail-closed TPM2 preflight; never reads production data.")
    parser.add_argument("--probe", action="store_true",
                        help="Use random synthetic bytes for a real TPM2 crypto roundtrip")
    args = parser.parse_args()
    problem = device_gate()
    if problem:
        print(f"TPM_PREFLIGHT=BLOCKED reason={problem}")
        return 2
    if not args.probe:
        print("TPM_PREFLIGHT=PASS device_access=YES crypto=NOT_TESTED")
        return 0
    if not shutil.which("systemd-creds"):
        print("TPM_PREFLIGHT=BLOCKED reason=systemd_creds_unavailable")
        return 2
    if not synthetic_roundtrip():
        print("TPM_PREFLIGHT=BLOCKED reason=synthetic_tpm_roundtrip_failed")
        return 2
    print("TPM_PREFLIGHT=PASS device_access=YES synthetic_crypto=PASS cloud_used=NO")
    return 0


if __name__ == "__main__":
    sys.exit(main())
