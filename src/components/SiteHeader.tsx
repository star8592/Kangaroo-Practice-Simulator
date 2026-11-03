"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import GlobalLanguageSwitch from "@/components/GlobalLanguageSwitch";
import SessionNav from "@/components/SessionNav";
import {SITE_BRAND} from "@/lib/site-brand";
import {useSiteLanguage} from "@/lib/site-language";
import {PRIMARY_BUSINESS_NAV as TASK_LINKS} from "@/lib/site-architecture";
import styles from "./SiteHeader.module.css";

/* Main navigation is derived from the single site-architecture registry.
 * School mathematics is maintained separately; public navigation follows career tasks. */
function MenuIcon({open}:{open:boolean}){
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {open?<path d="M6 6l12 12M18 6L6 18"/>:<path d="M4 7h16M4 12h16M4 17h16"/>}
  </svg>;
}

export default function SiteHeader(){
  const lang=useSiteLanguage();
  const pathname=usePathname();
  const [mobileOpen,setMobileOpen]=useState(false);
  const active=(href:string)=>pathname===href||pathname.startsWith(href+"/");
  const dismiss=()=>setMobileOpen(false);

  useEffect(()=>{
    if(!mobileOpen)return;
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape")setMobileOpen(false);
    };
    document.addEventListener("keydown",onKey);
    return()=>document.removeEventListener("keydown",onKey);
  },[mobileOpen]);

  return <header className={styles.header}>
    <div className={styles.inner}>
      <Link href="/" className={styles.brand} aria-label={lang==="zh"?"返回首页":"Home"} onClick={dismiss}>
        <span className={styles.brandMark}>{SITE_BRAND.mark}</span>
        <span className={styles.brandCopy}>
          <strong>{lang==="zh"?SITE_BRAND.nameZh:SITE_BRAND.nameEn}</strong>
          <small>{lang==="zh"?"岗位 · 学习 · 求职":"ROLES · LEARN · PRACTICE"}</small>
        </span>
      </Link>
      <nav className={styles.primaryNav} aria-label={lang==="zh"?"主要导航":"Primary navigation"}>
        {TASK_LINKS.map(item=><Link key={item.href} href={item.href}
          className={active(item.href)?styles.activeNav:undefined}
          aria-current={active(item.href)?"page":undefined}
          onClick={dismiss}>{item[lang]}</Link>)}
      </nav>
      <div className={styles.actions}>
        <div className={styles.languageDesktop}><GlobalLanguageSwitch/></div>
        <SessionNav/>
        <button type="button" className={styles.menuButton}
          aria-label={mobileOpen?(lang==="zh"?"关闭导航菜单":"Close navigation menu"):(lang==="zh"?"打开导航菜单":"Open navigation menu")}
          aria-expanded={mobileOpen} aria-controls="site-mobile-navigation"
          onClick={()=>setMobileOpen(open=>!open)}>
          <MenuIcon open={mobileOpen}/>
        </button>
      </div>
    </div>
    <div id="site-mobile-navigation" className={`${styles.mobilePanel} ${mobileOpen?styles.mobilePanelOpen:""}`}>
      <nav aria-label={lang==="zh"?"移动端导航":"Mobile navigation"}>
        <p className={styles.mobileGroupTitle}>{lang==="zh"?"职业准备":"Career preparation"}</p>
        {TASK_LINKS.map(item=><Link href={item.href} key={item.href}
          className={active(item.href)?styles.mobileActive:undefined} onClick={dismiss}>
          {item[lang]} <span aria-hidden="true">›</span>
        </Link>)}
        <span className={styles.mobileSubTitle}>{lang==="zh"?"个人服务":"My services"}</span>
        <Link href="/membership" onClick={dismiss}>{lang==="zh"?"购买与权益":"Purchases & access"}<span aria-hidden="true">›</span></Link>
        <Link href="/account" onClick={dismiss}>{lang==="zh"?"我的订单与下载":"Orders & downloads"}<span aria-hidden="true">›</span></Link>
      </nav>
      <div className={styles.mobileLanguage}>
        <span>{lang==="zh"?"界面语言":"Language"}</span><GlobalLanguageSwitch/>
      </div>
    </div>
  </header>;
}
