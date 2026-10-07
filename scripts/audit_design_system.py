#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

required_tokens = [
    "--layout-standard:1200px",
    "--layout-wide:1440px",
    "--layout-focus:960px",
    "--layout-auth:1040px",
    "--layout-reading:820px",
    "--page-gutter:28px",
    "--page-gutter-tablet:20px",
    "--page-gutter-mobile:14px",
    "--page-top-tablet:36px",
    "--page-top-compact:28px",
    "--surface-subtle:#f7f9f6",
    "--field-border:#d9dfda",
    "--focus-ring:0 0 0 3px rgba(255,122,69,.10)",
    "--radius-card:18px",
    "--radius-panel:22px",
    "--radius-hero:28px",
    "--control-height:44px",
    "--control-height-lg:48px",
    "--header-height:72px",
    "--title-page:36px",
    "--title-hero:48px",
]

checks = {
    "src/app/globals.css": [
        *required_tokens,
        "max-width:var(--layout-standard)",
        "max-width:var(--layout-wide)",
        "max-width:var(--layout-focus)",
        "max-width:var(--layout-reading)",
        ".verification-shell,.legal-page{padding-left:var(--page-gutter-mobile);padding-right:var(--page-gutter-mobile)}",
    ],
    "src/components/SiteHeader.module.css": ["var(--layout-wide)", "var(--header-height)", "var(--page-gutter-mobile)", "@media(max-width:1080px)", "@media(max-width:760px)"],
    "src/components/AuthExperience.module.css": ["var(--layout-auth)", "var(--page-gutter-tablet)", "var(--page-gutter-mobile)", "var(--field-border)", "var(--focus-ring)"],
    "src/components/ParentDashboard.module.css": ["max-width: var(--layout-standard)", "padding-top: var(--page-top)", "var(--radius-card)", "var(--page-top-compact)"],
    "src/components/AdminQuestions.module.css": ["max-width: var(--layout-standard)", "padding-top: var(--page-top)", "var(--field-border)", "var(--focus-ring)", "var(--page-top-compact)"],
    "src/components/AdminStudents.module.css": ["max-width: var(--layout-standard)", "padding-top: var(--page-top)", "var(--radius-card)", "var(--page-top-compact)"],
    "src/components/StudentProfileClient.module.css": ["max-width: var(--layout-standard)", "padding-top: var(--page-top)", "var(--field-border)", "var(--focus-ring)", "var(--page-top-compact)"],
    "src/app/student/StudentDashboard.module.css": ["max-width: var(--layout-standard)", "padding-top: var(--page-top)", "var(--radius-card)", "var(--page-top-compact)"],
    "src/app/student/cards/CardsPage.module.css": ["max-width: var(--layout-standard)", "var(--page-gutter-mobile)"],
    "src/app/student/calendar/page.module.css": ["max-width:var(--layout-focus)", "var(--page-gutter-mobile)"],
    "src/app/parent/ParentPage.module.css": ["max-width: var(--layout-standard)", "var(--page-gutter-mobile)"],
    "src/components/SiteFooter.tsx": ["site-footer-inner"],
}

errors = []
for rel, tokens in checks.items():
    path = ROOT / rel
    if not path.exists():
        errors.append(f"{rel}: missing file")
        continue
    text = path.read_text(encoding="utf-8")
    for token in tokens:
        if token not in text:
            errors.append(f"{rel}: missing {token!r}")


# Route-level CSS modules may choose a named layout tier, but not invent another literal width.
import re
for css in sorted((ROOT / "src").rglob("*.css")):
    text = css.read_text(encoding="utf-8")
    for selector in ("shell", "page", "accountBar"):
        for match in re.finditer(r"\." + selector + r"\s*\{([^}]*)\}", text, re.S):
            body = match.group(1)
            width = re.search(r"max-width:\s*([^;]+)", body)
            if width and "var(--layout-" not in width.group(1):
                errors.append(f"{css.relative_to(ROOT)}: .{selector} uses literal max-width {width.group(1)!r}")


# Product surfaces must share the same surface/radius/shadow language.
globals_css = (ROOT / "src/app/globals.css").read_text(encoding="utf-8")
for selector in (
    ".candidate-card", ".analysis-section", ".diagnostic-empty-state",
    ".parent-diagnosis-card", ".competition-intro", ".training-launchpad",
    ".exam-companion", ".center-card", ".result-stats article",
):
    match = re.search(re.escape(selector) + r"\{([^}]*)\}", globals_css, re.S)
    if not match:
        errors.append(f"src/app/globals.css: missing governed product surface {selector}")
        continue
    body = match.group(1)
    if "var(--radius-" not in body:
        errors.append(f"src/app/globals.css: {selector} must use a radius token")
    if "var(--shadow-soft)" not in body:
        errors.append(f"src/app/globals.css: {selector} must use --shadow-soft")

if ".site-header{" in globals_css:
    errors.append("src/app/globals.css: obsolete legacy .site-header rules still present")

if errors:
    print("DESIGN_SYSTEM_AUDIT=FAIL")
    for error in errors:
        print("-", error)
    raise SystemExit(1)

print(f"DESIGN_SYSTEM_AUDIT=PASS files={len(checks)} tokens={len(required_tokens)}")
