"use client";

import Link from "next/link";
import GlobalLanguageSwitch from "@/components/GlobalLanguageSwitch";
import SessionNav from "@/components/SessionNav";
import { SITE_BRAND } from "@/lib/site-brand";
import { useSiteLanguage } from "@/lib/site-language";

export default function SiteHeader(){
 const lang=useSiteLanguage();
 return <header className="site-header">
  <Link href="/" className="brand"><span className="brand-mark">{SITE_BRAND.mark}</span><span>{lang==="zh"?SITE_BRAND.nameZh:SITE_BRAND.nameEn}</span></Link>
  <nav>
   <Link href="/arithmetic">{lang==="zh"?"计算训练":"Calculation"}</Link>
   <Link href="/competitions">{lang==="zh"?"竞赛实战":"Competition practice"}</Link>
   <Link href="/review">{lang==="zh"?"错题复盘":"Review"}</Link>
   <Link href="/verification">{lang==="zh"?"验证中心":"Verification"}</Link>
   <SessionNav/>
   <GlobalLanguageSwitch/>
  </nav>
 </header>;
}
