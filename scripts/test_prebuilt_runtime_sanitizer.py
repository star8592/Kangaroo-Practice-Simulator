#!/usr/bin/env python3
"""Unit contract for the prebuilt runtime scrubber; only temporary fixtures."""
from __future__ import annotations

import importlib.util
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "ops/release/sanitize_prebuilt_runtime.py"
spec = importlib.util.spec_from_file_location("runtime_sanitize", source)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

with tempfile.TemporaryDirectory(prefix="socthink-sanitizer-") as scratch:
    root = Path(scratch)
    runtime = root / "prebuilt" / "runtime"
    runtime.mkdir(parents=True)
    (runtime / "server.js").write_text("console.log('ok')\n")
    (runtime / ".git").write_text("gitdir: /nonexistent/metadata\n")
    (runtime / ".github").mkdir()
    (runtime / ".github" / "workflow.yml").write_text("private fixture")
    protected = root / "should-stay"
    protected.mkdir()
    (protected / "account.json").write_text("test-private-value")
    (runtime / "private").symlink_to(protected, target_is_directory=True)
    module.sanitize(runtime)
    assert (runtime / "server.js").is_file()
    for name in ("private", ".git", ".github"):
        p = runtime / name
        assert not p.exists() and not p.is_symlink(), name
    assert (protected / "account.json").read_text() == "test-private-value"
    (runtime / ".git").mkdir()
    (runtime / ".git" / "config").write_text("fixture")
    module.sanitize(runtime)
    assert not (runtime / ".git").exists()
    try:
        module.sanitize(root)
    except ValueError:
        pass
    else:
        raise AssertionError("refused arbitrary directory")

print("SOCTHINK_PREBUILT_RUNTIME_SANITIZER_PASS=file_directory_symlink_clean")
