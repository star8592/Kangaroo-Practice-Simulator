#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = {
    "src/app/layout.tsx": ["<SiteHeader/>", "<SiteFooter/>"],
    "src/app/page.tsx": ["PublicHome"],
    "src/components/PublicHome.tsx": ["useSiteLanguage", "SOC THINK · K12 MATH GROWTH", "Start a diagnostic", "Math competitions", "More than a one-time score"],
    "src/components/SiteHeader.tsx": ["GlobalLanguageSwitch", "useSiteLanguage", "SITE_BRAND.nameEn", "Competition practice", "Review"],
    "src/components/SessionNav.tsx": ["useSiteLanguage", "Student login", "Learning report", "Sign out"],
    "src/components/SiteFooter.tsx": ["useSiteLanguage", "All rights reserved"],
    "src/components/GlobalLanguageSwitch.tsx": ["useSiteLanguage", "setSiteLanguage", "router.refresh()", ">中文</button>", ">EN</button>"],
    "src/lib/site-language.ts": ["useSyncExternalStore", "socthink.lang", "socthink_lang=", "socthink:language-change"],
    "src/components/GlobalLanguageSwitch.module.css": ["@media(max-width:760px)", "position:fixed", "z-index:70"],
    "src/components/ReviewClient.tsx": ["useSiteLanguage", "const ui=UI[lang]", "Answer review", "中文题面", "Original English"],
    "src/components/ResultClient.tsx": ["useSiteLanguage", "const ui=UI[lang]", "Your result", "Review answers"],
    "src/app/student/page.tsx": ["socthink_lang", "Learning report", "Training readiness index", "Download PDF"],
    "src/components/StudentProfileClient.tsx": ["useSiteLanguage", "My learning profile", "Save profile", "Account security"],
    "src/components/HomeLanguageBridge.tsx": ["useSiteLanguage", "HomeClient"],
    "src/components/ArithmeticDashboard.tsx": ["useSiteLanguage", "const lang=useSiteLanguage(),ui=UI[lang]", "ADAPTIVE CALCULATION", "Start adaptive training", "Four-dimensional skill profile", "K12_GRADE_NOTE_EN", "skill.labelEn"],
    "src/lib/arithmetic-grade-guide.ts": ["headlineEn", "goalEn", "trainingEn", "watchEn", "Build number sense and fluency within 20", "Reduce calculation losses in comprehensive exams"],
    "src/lib/k12-grade-system.ts": ["K12_GRADE_NOTE_EN", "Grade names are aligned by typical entry age"],
    "src/components/ArithmeticPrintClient.tsx": ["useSiteLanguage", "initialLang", "Batch A4 calculation worksheets", "Download PDF (recommended)", "lang}).toString()", "profile.titleEn"],
    "src/app/api/arithmetic/print/pdf/route.ts": ["\"lang\"", "/arithmetic/print/export?"],
    "src/app/arithmetic/print/export/page.tsx": ["toLang", "initialLang={lang}"],
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
