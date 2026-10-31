#!/usr/bin/env python3
"""Check a Linux Rust release binary against the real production ABI ceiling.

Scope: necessary ELF/loader/symbol requirements, not a claim that the service
has started on the production host or that production traffic uses Rust.
"""
import pathlib
import re
import subprocess
import sys

def run(*command):
    result = subprocess.run(command, text=True, capture_output=True, check=True)
    return result.stdout

def verify(binary, ceiling=(2, 39)):
    binary = pathlib.Path(binary).resolve(strict=True)
    header = run("readelf", "-h", str(binary))
    if "ELF64" not in header or "Advanced Micro Devices X86-64" not in header:
        raise ValueError("not an x86-64 ELF64 executable")
    versions = run("readelf", "--version-info", str(binary))
    required = {
        tuple(map(int, match))
        for match in re.findall(r"\bGLIBC_(\d+)\.(\d+)\b", versions)
    }
    if not required:
        raise ValueError("no GLIBC symbol version requirements observed")
    highest = max(required)
    if highest > ceiling:
        raise ValueError(
            f"GLIBC_{highest[0]}.{highest[1]} exceeds production ceiling "
            f"GLIBC_{ceiling[0]}.{ceiling[1]}"
        )
    libraries = run("ldd", str(binary))
    if "not found" in libraries:
        raise ValueError("binary has unresolved dynamic libraries: " + libraries)
    loader = run("readelf", "-l", str(binary))
    if "Requesting program interpreter" not in loader:
        raise ValueError("unexpected dynamic ELF loader contract")
    print(
        "RUST_PRODUCTION_ABI=PASS arch=x86_64 "
        f"maxGlibc=GLIBC_{highest[0]}.{highest[1]} "
        f"ceiling=GLIBC_{ceiling[0]}.{ceiling[1]} "
        f"binaryBytes={binary.stat().st_size}"
    )

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: check_rust_binary_abi.py /absolute/path/to/socthink-catalog-api")
    try:
        verify(sys.argv[1])
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print("RUST_PRODUCTION_ABI=FAIL " + str(error), file=sys.stderr)
        raise SystemExit(1)
