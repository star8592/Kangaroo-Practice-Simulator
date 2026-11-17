"use client";
import Link from "next/link";
import {useSiteLanguage} from "@/lib/site-language";
import {SITE_PORTAL_NAV} from "@/lib/site-architecture";
import styles from "./SocthinkChrome.module.css";

// One site footer, including career subroutes and existing account/billing.
const SERVICE_LINKS=[
 {href:"/career",zh:"岗位方向",en:"Careers"},
 {href:"/learn",zh:"学习实训",en:"Learning & labs"},
 {href:"/practice",zh:"模拟笔试面试",en:"Practice"},
 {href:"/my/learning",zh:"我的学习",en:"My learning"},
 {href:"/workspace",zh:"教师工作台",en:"Teaching workspace"},
 {href:"/account",zh:"我的订单",en:"Orders"},
 {href:"/membership",zh:"购买与权益",en:"Purchases & access"},
 {href:"/privacy",zh:"隐私",en:"Privacy"},
 {href:"/terms",zh:"条款",en:"Terms"},
] as const;
export default function SiteFooter(){
 const lang=useSiteLanguage();
 return <footer className={styles.footer}>
  <div className={styles.footerInner}>
   <span>© 2026 SOC THINK · {lang==="zh"?"多学科学习与教学":"All rights reserved · Learning and teaching"}</span>
   <nav aria-label={lang==="zh"?"学科、服务和政策":"Subjects, services and policies"}>
    {SITE_PORTAL_NAV.map(item=><Link key={item.id} href={item.href}>{item[lang]}</Link>)}
    {SERVICE_LINKS.map(item=><Link key={item.href} href={item.href}>{item[lang]}</Link>)}
    <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2026004372号</a>
   </nav>
  </div>
 </footer>;
}
