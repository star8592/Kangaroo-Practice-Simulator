#!/usr/bin/env python3
"""Guard the converged repository structure against obsolete paths and malformed docs."""

from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FORBIDDEN_EXACT = {
    "scripts/import_level_a.py",
    "scripts/create_student.mjs",
    "ops/data/seed_production.sh",
    "ops/release/changelog.sh",
    "ops/release/deploy_production.sh",
    "ops/release/release.sh",
    "ops/release/rollback.sh",
    "ops/release/verify_release.sh",
    "ops/release/version.sh",
    "ops/release/publish_grade1_solution_hotfix.sh",
}
FORBIDDEN_PREFIXES = (
    "ops/server/",
    "ops/deploy/",
    ".release-tmp/",
    ".ci-check",
    "src/domains/profile/",
)
REQUIRED_PATHS = {
    "ops/automation/quality_gate.sh",
    "ops/automation/deploy_atomic.sh",
    "ops/automation/rollback_atomic.sh",
    "ops/automation/health_check.sh",
    "ops/release/auto_deploy_server.sh",
    "ops/release/publish_socthink.sh",
    "ops/release/publish_prebuilt_socthink.sh",
    "ops/data/promote_verified_sources.sh",
    "ops/data/promote_training_ready.sh",
    "ops/data/promote_student_ready.sh",
}


def tracked_files() -> list[str]:
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [x.decode("utf-8", "surrogateescape") for x in raw.split(b"\0") if x]


def main() -> None:
    tracked = tracked_files()
    tracked_set = set(tracked)
    errors: list[str] = []

    for path in sorted(FORBIDDEN_EXACT & tracked_set):
        errors.append(f"obsolete tracked path returned: {path}")
    for path in tracked:
        if any(path.startswith(prefix) for prefix in FORBIDDEN_PREFIXES):
            errors.append(f"runtime/obsolete path must not be tracked: {path}")

    for path in sorted(REQUIRED_PATHS - tracked_set):
        errors.append(f"canonical project entry point missing: {path}")

    for path in tracked:
        if not path.endswith(".md"):
            continue
        file = ROOT / path
        try:
            text = file.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        physical_lines = text.splitlines()
        # Catch the historical failure mode where a whole Markdown file was
        # serialized as one line containing literal \\n escapes. Allow normal
        # prose/code examples that mention escaped newlines occasionally.
        if len(text) > 500 and len(physical_lines) <= 3 and text.count("\\n") >= 3:
            errors.append(f"malformed Markdown with literal newline escapes: {path}")

    if errors:
        print("REPOSITORY_HYGIENE=FAIL")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print(
        "REPOSITORY_HYGIENE=PASS "
        f"tracked={len(tracked)} required={len(REQUIRED_PATHS)} markdown_checked="
        f"{sum(path.endswith('.md') for path in tracked)}"
    )


if __name__ == "__main__":
    main()
