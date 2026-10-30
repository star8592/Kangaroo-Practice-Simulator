"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";
import GlobalLanguageSwitch from "@/components/GlobalLanguageSwitch";
import SessionNav from "@/components/SessionNav";
import {SITE_BRAND} from "@/lib/site-brand";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "./SiteHeader.module.css";

const NAV_ITEMS=[
  {href:"/assessments",zh:"考试大全",en:"All exams"},
  {href:"/resources",zh:"资料中心",en:"Resources"},
  {href:"/arithmetic",zh:"数学训练",en:"Math practice"},
  {href:"/competitions",zh:"竞赛模拟",en:"Competition practice"},
  {href:"/events",zh:"赛事管家",en:"Competition calendar"},
  {href:"/account",zh:"我的账号",en:"My account"},
] as const;
const FEATURED=[
  {href:"/assessments#domain-school",zh:"小升初与学业考试",en:"School exams"},
  {href:"/assessments#domain-language",zh:"语言考试",en:"Language exams"},
  {href:"/assessments#domain-professional",zh:"职业资格与公考",en:"Professional exams"},
  {href:"/assessments#domain-career",zh:"岗位技能",en:"Career skills"},
] as const;

function MenuIcon({open}:{open:boolean}){
  return open?<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18"/></svg>:
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
}

export default function SiteHeader(){
  const lang=useSiteLanguage(),pathname=usePathname();
  const [mobileOpen,setMobileOpen]=useState(false);
  const isActive=(href:string)=>pathname===href||pathname.startsWith(href+"/");
  return <header className={styles.header}>
    <div className={styles.utility}>
      <div className={styles.utilityInner}>
        <span>SOCTHINK / {lang==="zh"?"综合考试与学习资源平台":"Exams & Learning Resources"}</span>
        <span>{lang==="zh"?"发现考试 · 查找资料 · 在线练习":"Find exams · Browse papers · Practise online"}</span>
      </div>
    </div>
    <div className={styles.inner}>
      <Link href="/" className={styles.brand} aria-label={lang==="zh"?"返回首页":"Home"}>
        <span className={styles.brandMark}>{SITE_BRAND.mark}</span>
        <span className={styles.brandCopy}>
          <strong>{lang==="zh"?SITE_BRAND.nameZh:SITE_BRAND.nameEn}</strong>
          <small>{lang==="zh"?"综合考试与学习平台":"EXAMS · RESOURCES · PRACTICE"}</small>
        </span>
      </Link>
      <nav className={styles.primaryNav} aria-label={lang==="zh"?"主要导航":"Primary navigation"}>
        {NAV_ITEMS.map(item=><Link key={item.href} href={item.href}
          className={isActive(item.href)?styles.activeNav:undefined}
          aria-current={isActive(item.href)?"page":undefined}>
          {item[lang]}</Link>)}
      </nav>
      <div className={styles.actions}>
        <div className={styles.languageDesktop}><GlobalLanguageSwitch/></div>
        <SessionNav/>
        <button type="button" className={styles.menuButton}
          aria-label={lang==="zh"?"打开导航菜单":"Open navigation menu"}
          aria-expanded={mobileOpen} onClick={()=>setMobileOpen(v=>!v)}>
          <MenuIcon open={mobileOpen}/>
        </button>
      </div>
    </div>
    <div className={styles.featuredBar}>
      <nav className={styles.featuredInner} aria-label={lang==="zh"?"热门考试方向":"Featured exam directions"}>
        <span>{lang==="zh"?"热门方向":"Explore"}</span>
        {FEATURED.map(item=><Link href={item.href} key={item.href}>{item[lang]}</Link>)}
        <Link href="/assessments">{lang==="zh"?"全部分类 →":"All categories →"}</Link>
      </nav>
    </div>
    <div className={`${styles.mobilePanel} ${mobileOpen?styles.mobilePanelOpen:""}`}>
      <nav aria-label={lang==="zh"?"移动端导航":"Mobile navigation"}>
        {NAV_ITEMS.map(item=><Link href={item.href} key={item.href}
          className={isActive(item.href)?styles.mobileActive:undefined}
          aria-current={isActive(item.href)?"page":undefined}
          onClick={()=>setMobileOpen(false)}>
          <span>{item[lang]}</span><span aria-hidden="true">›</span>
        </Link>)}
      </nav>
      <div className={styles.mobileLanguage}>
        <span>{lang==="zh"?"界面语言":"Language"}</span><GlobalLanguageSwitch/>
      </div>
    </div>
  </header>;
}
