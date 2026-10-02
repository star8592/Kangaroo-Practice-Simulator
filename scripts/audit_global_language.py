#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = {
    "src/app/layout.tsx": ["<SiteHeader/>", "<SiteFooter/>"],
    "src/components/SiteHeader.tsx": ["GlobalLanguageSwitch", "useSiteLanguage", "SITE_BRAND.nameEn", "Mock exams", "Review"],
    "src/components/SessionNav.tsx": ["useSiteLanguage", "Student login", "Learning report", "Sign out"],
    "src/components/SiteFooter.tsx": ["useSiteLanguage", "All rights reserved"],
    "src/components/GlobalLanguageSwitch.tsx": ["useSiteLanguage", "setSiteLanguage", "router.refresh()", ">中文</button>", ">EN</button>"],
    "src/lib/site-language.ts": ["useSyncExternalStore", "socthink.lang", "socthink_lang=", "socthink:language-change"],
    "src/components/GlobalLanguageSwitch.module.css": ["@media(max-width:760px)", "position:fixed", "z-index:70"],
    "src/components/ReviewClient.tsx": ["useSiteLanguage", "const ui=UI[lang]", "Answer review", "中文题面", "Original English"],
    "src/app/student/page.tsx": ["socthink_lang", "Learning report", "Training readiness index", "Download PDF"],
    "src/components/StudentProfileClient.tsx": ["useSiteLanguage", "My learning profile", "Save profile", "Account security"],
    "src/components/HomeLanguageBridge.tsx": ["useSiteLanguage", "HomeClient"],
}
errors=[]
for rel,tokens in checks.items():
    path=ROOT/rel
    if not path.exists():
        errors.append(f"{rel}: missing file")
        continue
    text=path.read_text(encoding="utf-8")
    for token in tokens:
        if token not in text:
            errors.append(f"{rel}: missing {token!r}")
if errors:
    print("GLOBAL_LANGUAGE_AUDIT=FAIL")
    for error in errors:
        print("-",error)
    raise SystemExit(1)
print(f"GLOBAL_LANGUAGE_AUDIT=PASS files={len(checks)}")
