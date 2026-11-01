"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import GlobalLanguageSwitch from "@/components/GlobalLanguageSwitch";
import SessionNav from "@/components/SessionNav";
import {ASSESSMENT_DOMAINS} from "@/lib/assessment-platform";
import {EXAM_DIRECTORY} from "@/lib/exam-directory";
import {SITE_BRAND} from "@/lib/site-brand";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "./SiteHeader.module.css";

/* Task navigation is not a copy of the exam taxonomy. Domain navigation below
 * is derived from the one authoritative assessment + directory registry. */
const TASK_LINKS=[
  {href:"/assessments",zh:"全部考试",en:"All exams"},
  {href:"/resources",zh:"真题资料",en:"Practice papers"},
  {href:"/exam-planner",zh:"考试管理",en:"Exam planner"},
  {href:"/membership",zh:"购买与权益",en:"Purchases & access"},
] as const;
const PRACTICE_LINKS=[
  {href:"/arithmetic",zh:"计算与数学训练",en:"Math practice",helpZh:"小学到高中 · 直接开练",helpEn:"School to high school · Start now"},
  {href:"/competitions",zh:"国际数学竞赛模拟",en:"Competition mocks",helpZh:"按现有赛制选择试卷",helpEn:"Select a real available exam"},
  {href:"/review",zh:"错题复盘",en:"Review mistakes",helpZh:"复查已经完成的练习",helpEn:"Review previous attempts"},
  {href:"/skill-labs",zh:"岗位技能实训",en:"Practical skill labs",helpZh:"真实 SQL 操作，独立于性格测评",helpEn:"Real SQL practice, separate from personality tests"},
] as const;
const DOMAIN_MAP=new Map(ASSESSMENT_DOMAINS.map(domain=>[domain.id,domain]));

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
          <small>{lang==="zh"?"考试 · 资料 · 训练":"EXAMS · RESOURCES · PRACTICE"}</small>
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
        <p className={styles.mobileGroupTitle}>{lang==="zh"?"按考试类别找":"Browse exam categories"}</p>
        {EXAM_DIRECTORY.map(group=>{
          const domain=DOMAIN_MAP.get(group.domainId)!;
          return <Link href={`/assessments#domain-${group.domainId}`}
            key={group.domainId} onClick={dismiss}>
            {domain.navName[lang]} <span aria-hidden="true">›</span>
          </Link>;
        })}
      </nav>
      <div className={styles.mobileLanguage}>
        <span>{lang==="zh"?"界面语言":"Language"}</span><GlobalLanguageSwitch/>
      </div>
    </div>
  </header>;
}
