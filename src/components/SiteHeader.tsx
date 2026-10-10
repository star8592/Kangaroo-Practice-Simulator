"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import GlobalLanguageSwitch from "@/components/GlobalLanguageSwitch";
import SessionNav from "@/components/SessionNav";
import { SITE_BRAND } from "@/lib/site-brand";
import { useSiteLanguage } from "@/lib/site-language";
import styles from "./SiteHeader.module.css";

const NAV_ITEMS = [
  { href: "/arithmetic", zh: "计算训练", en: "Practice" },
  { href: "/competitions", zh: "竞赛模拟", en: "Mock exams" },
  { href: "/events", zh: "全球赛事", en: "Competitions" },
  { href: "/student", zh: "成长档案", en: "My progress" },
] as const;

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export default function SiteHeader() {
  const lang = useSiteLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label={lang === "zh" ? "返回首页" : "Home"}>
          <span className={styles.brandMark}>{SITE_BRAND.mark}</span>
          <span className={styles.brandCopy}>
            <strong>{lang === "zh" ? SITE_BRAND.nameZh : SITE_BRAND.nameEn}</strong>
            <small>{lang === "zh" ? "全球数学竞赛与成长" : "Global Math Growth"}</small>
          </span>
        </Link>

        <nav className={styles.primaryNav} aria-label={lang === "zh" ? "主要导航" : "Primary navigation"}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? styles.activeNav : undefined}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {lang === "zh" ? item.zh : item.en}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <div className={styles.languageDesktop}>
            <GlobalLanguageSwitch />
          </div>
          <SessionNav />
          <button
            type="button"
            className={styles.menuButton}
            aria-label={lang === "zh" ? "打开导航菜单" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            <MenuIcon open={mobileOpen} />
          </button>
        </div>
      </div>

      <div className={`${styles.mobilePanel} ${mobileOpen ? styles.mobilePanelOpen : ""}`}>
        <nav aria-label={lang === "zh" ? "移动端导航" : "Mobile navigation"}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? styles.mobileActive : undefined}
              aria-current={isActive(item.href) ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span>{lang === "zh" ? item.zh : item.en}</span>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4l6 6-6 6" /></svg>
            </Link>
          ))}
        </nav>
        <div className={styles.mobileLanguage}>
          <span>{lang === "zh" ? "界面语言" : "Language"}</span>
          <GlobalLanguageSwitch />
        </div>
      </div>
    </header>
  );
}
