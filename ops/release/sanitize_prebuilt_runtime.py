#!/usr/bin/env python3
"""Remove runtime-only/private files from one built Next standalone artifact.

Never operate on source or production: this helper accepts an EXISTING
`runtime` directory below a prebuilt output folder, not arbitrary roots.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path


def sanitize(runtime: Path) -> None:
    if runtime.is_symlink() or not runtime.is_dir():
        raise ValueError("RUNTIME_DIRECTORY_REQUIRED")
    if runtime.name != "runtime" or runtime.parent.name in {"", "/"}:
        raise ValueError("PREBUILT_RUNTIME_ONLY")
    if not (runtime / "server.js").is_file():
        raise ValueError("STANDALONE_SERVER_REQUIRED")
    for name in ("private", ".git", ".github"):
        target = runtime / name
        # .git in a detached worktree is often an ordinary text *file*.
        # A dangling symlink also needs unlink(), not rmtree().
        if target.is_symlink() or target.is_file():
            target.unlink()
        elif target.is_dir():
            shutil.rmtree(target)
        if target.exists() or target.is_symlink():
            raise RuntimeError("RUNTIME_SANITIZE_FAILED:" + name)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: sanitize_prebuilt_runtime.py /path/to/output/runtime")
    sanitize(Path(sys.argv[1]))
