"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import GlobalLanguageSwitch from "@/components/GlobalLanguageSwitch";
import SessionNav from "@/components/SessionNav";
import {SITE_BRAND} from "@/lib/site-brand";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "./SiteHeader.module.css";

/* Task navigation is not a copy of the exam taxonomy. Domain navigation below
 * is derived from the one authoritative assessment + directory registry. */
const TASK_LINKS=[
  {href:"/assessments",zh:"全部考试",en:"All exams"},
  {href:"/resources",zh:"真题资料",en:"Papers"},
  {href:"/career",zh:"职业岗位",en:"Careers"},
  {href:"/skill-labs",zh:"技能实训",en:"Skill labs"},
  {href:"/assessment-center",zh:"测评中心",en:"Assessments"},
  {href:"/shop",zh:"数字商城",en:"Digital store"},
  {href:"/exam-planner",zh:"考试管理",en:"Exam planner"},
] as const;
const PRACTICE_LINKS=[
  {href:"/arithmetic",zh:"计算与数学训练",en:"Math practice",helpZh:"小学到高中 · 直接开练",helpEn:"School to high school · Start now"},
  {href:"/competitions",zh:"国际数学竞赛模拟",en:"Competition mocks",helpZh:"按现有赛制选择试卷",helpEn:"Select a real available exam"},
  {href:"/review",zh:"错题复盘",en:"Review mistakes",helpZh:"复查已经完成的练习",helpEn:"Review previous attempts"},
] as const;

function MenuIcon({open}:{open:boolean}){
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {open?<path d="M6 6l12 12M18 6L6 18"/>:<path d="M4 7h16M4 12h16M4 17h16"/>}
  </svg>;
}

export default function SiteHeader(){
  const lang=useSiteLanguage();
  const pathname=usePathname();
  const [mobileOpen,setMobileOpen]=useState(false);
  const [practiceOpen,setPracticeOpen]=useState(false);
  const practiceRef=useRef<HTMLDivElement>(null);
  const practiceButtonRef=useRef<HTMLButtonElement>(null);
  const active=(href:string)=>pathname===href||pathname.startsWith(href+"/");
  const practiceActive=PRACTICE_LINKS.some(link=>active(link.href));
  const dismiss=()=>{setMobileOpen(false);setPracticeOpen(false);};

  useEffect(()=>{
    if(!mobileOpen&&!practiceOpen)return;
    const onPointer=(event:PointerEvent)=>{
      if(practiceOpen&&!practiceRef.current?.contains(event.target as Node))
        setPracticeOpen(false);
    };
    const onKey=(event:KeyboardEvent)=>{
      if(event.key!=="Escape")return;
      if(practiceOpen)practiceButtonRef.current?.focus();
      setMobileOpen(false);
      setPracticeOpen(false);
    };
    document.addEventListener("pointerdown",onPointer);
    document.addEventListener("keydown",onKey);
    return()=>{
      document.removeEventListener("pointerdown",onPointer);
      document.removeEventListener("keydown",onKey);
    };
  },[mobileOpen,practiceOpen]);

  return <header className={styles.header}>
    <div className={styles.inner}>
      <Link href="/" className={styles.brand} aria-label={lang==="zh"?"返回首页":"Home"} onClick={dismiss}>
        <span className={styles.brandMark}>{SITE_BRAND.mark}</span>
        <span className={styles.brandCopy}>
          <strong>{lang==="zh"?SITE_BRAND.nameZh:SITE_BRAND.nameEn}</strong>
          <small>{lang==="zh"?"考试 · 资料 · 技能":"EXAMS · RESOURCES · SKILLS"}</small>
        </span>
      </Link>
      <nav className={styles.primaryNav} aria-label={lang==="zh"?"主要导航":"Primary navigation"}>
        {TASK_LINKS.slice(0,2).map(item=><Link key={item.href} href={item.href}
          className={active(item.href)?styles.activeNav:undefined}
          aria-current={active(item.href)?"page":undefined}
          onClick={()=>setPracticeOpen(false)}>{item[lang]}</Link>)}
        <div className={styles.practiceRoot} ref={practiceRef}>
          <button ref={practiceButtonRef} type="button"
            className={practiceActive?styles.activeNav:undefined}
            aria-expanded={practiceOpen} aria-controls="header-practice-menu"
            onClick={()=>setPracticeOpen(open=>!open)}>
            {lang==="zh"?"在线练习":"Practice"} <span aria-hidden="true" className={styles.chevron}>⌄</span>
          </button>
          {practiceOpen&&<div className={styles.practiceMenu} id="header-practice-menu">
            <strong>{lang==="zh"?"选择已开放的练习":"Available practice"}</strong>
            {PRACTICE_LINKS.map(item=><Link href={item.href} key={item.href}
              onClick={()=>setPracticeOpen(false)}>
              <b>{item[lang]}</b><small>{lang==="zh"?item.helpZh:item.helpEn}</small>
            </Link>)}
          </div>}
        </div>
        {TASK_LINKS.slice(2).map(item=><Link key={item.href} href={item.href}
          className={active(item.href)?styles.activeNav:undefined}
          aria-current={active(item.href)?"page":undefined}
          onClick={()=>setPracticeOpen(false)}>{item[lang]}</Link>)}
      </nav>
      <div className={styles.actions}>
        <div className={styles.languageDesktop}><GlobalLanguageSwitch/></div>
        <SessionNav/>
        <button type="button" className={styles.menuButton}
          aria-label={mobileOpen?(lang==="zh"?"关闭导航菜单":"Close navigation menu"):(lang==="zh"?"打开导航菜单":"Open navigation menu")}
          aria-expanded={mobileOpen} aria-controls="site-mobile-navigation"
          onClick={()=>{setMobileOpen(open=>!open);setPracticeOpen(false);}}>
          <MenuIcon open={mobileOpen}/>
        </button>
      </div>
    </div>
    <div id="site-mobile-navigation" className={`${styles.mobilePanel} ${mobileOpen?styles.mobilePanelOpen:""}`}>
      <nav aria-label={lang==="zh"?"移动端导航":"Mobile navigation"}>
        <p className={styles.mobileGroupTitle}>{lang==="zh"?"找考试 · 找服务":"Exams & services"}</p>
        {TASK_LINKS.slice(0,2).map(item=><Link href={item.href} key={item.href}
          className={active(item.href)?styles.mobileActive:undefined} onClick={dismiss}>
          {item[lang]} <span aria-hidden="true">›</span>
        </Link>)}
        <span className={styles.mobileSubTitle}>{lang==="zh"?"在线练习（已开放）":"Available practice"}</span>
        {PRACTICE_LINKS.map(item=><Link href={item.href} key={item.href} onClick={dismiss}>
          {item[lang]} <span aria-hidden="true">›</span>
        </Link>)}
        {TASK_LINKS.slice(2).map(item=><Link href={item.href} key={item.href}
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
