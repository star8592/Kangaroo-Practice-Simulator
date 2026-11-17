"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import GlobalLanguageSwitch from "@/components/GlobalLanguageSwitch";
import SessionNav from "@/components/SessionNav";
import {useSiteLanguage} from "@/lib/site-language";
import {SITE_PORTAL_NAV} from "@/lib/site-architecture";
import styles from "./SocthinkChrome.module.css";

/**
 * ONE global header for learning, career, exams, teaching and organizations.
 * No alternative career-first top navigation, legacy hamburger tree or
 * role-only menus in the learner surface.
 */
export default function SiteHeader(){
 const lang=useSiteLanguage();
 const pathname=usePathname();
 return <header className={styles.header}>
  <div className={styles.inner}>
   <Link href="/" className={styles.brand} aria-label="SOC THINK 首页">
    <span className={styles.mark}>S</span>
    <span><strong>SOC THINK</strong><small>{lang==="zh"?"学习 · 教学 · 测评":"Learn · Teach · Assess"}</small></span>
   </Link>
   <nav className={styles.links} aria-label="SOC THINK 导航">
    {SITE_PORTAL_NAV.map(item=><Link key={item.id} href={item.href}
      aria-current={pathname===item.href||pathname.startsWith(item.href+"/")?"page":undefined}>{item[lang]}</Link>)}
   </nav>
   <div className={styles.actions}><Link href="/membership" className={styles.membershipLink}>{lang==="zh"?"权益":"Plans"}</Link><GlobalLanguageSwitch/><SessionNav/></div>
  </div>
 </header>;
}
