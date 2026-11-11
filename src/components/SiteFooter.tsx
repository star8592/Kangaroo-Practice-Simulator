"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import portalChrome from "./ScoreSyncChrome.module.css";
import {useSiteLanguage} from "@/lib/site-language";
const GROUPS=[
 {zh:"职业准备",en:"Career preparation",items:[
  {href:"/career",zh:"岗位方向",en:"Roles"},
  {href:"/learn",zh:"学习与实训",en:"Learning and labs"},
  {href:"/practice",zh:"模拟笔试与面试",en:"Mock tests and interviews"},
 ]},
 {zh:"深入学习",en:"Learning resources",items:[
  {href:"/skill-labs/books",zh:"技术资料与导学",en:"Technical library"},
  {href:"/assessment-center/methodology",zh:"测评方法与来源",en:"Assessment methods"},
 ]},
 {zh:"账户与服务",en:"Account and services",items:[
  {href:"/account",zh:"订单与下载",en:"Orders and downloads"},
  {href:"/membership",zh:"购买与权益",en:"Membership"},
  {href:"/privacy",zh:"隐私政策",en:"Privacy"},
  {href:"/terms",zh:"服务条款",en:"Terms"},
  {href:"/digital-purchase-policy",zh:"数字商品售后",en:"Digital purchase terms"},
 ]},
] as const;
export default function SiteFooter(){
 const lang=useSiteLanguage();
 const pathname=usePathname();
 if(pathname==="/"||pathname==="/math"||pathname==="/competitions"){
   return <footer className={portalChrome.footer}><div className={portalChrome.footerInner}>
    <span>© 2026 ScoreSync · 在线学习与考试</span>
    <nav aria-label="法律与账户"><Link href="/account">我的订单</Link><Link href="/privacy">隐私</Link><Link href="/terms">条款</Link><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2026004372号</a></nav>
   </div></footer>;
 }
 return <footer className="site-footer">
  <div className="site-footer-inner">
   <div className="site-footer-top">
    <strong>SOCTHINK · {lang==="zh"?"职业能力学习与求职准备":"Career learning and preparation"}</strong>
    <nav aria-label={lang==="zh"?"页脚导航":"Footer navigation"}>
     {GROUPS.map(group=><div className="site-footer-group" key={group.zh}>
      <b>{group[lang]}</b>
      <div>{group.items.map(item=><Link href={item.href} key={item.href}>{item[lang]}</Link>)}</div>
     </div>)}
    </nav>
   </div>
   <p>{lang==="zh"?"独立开发的职业学习与求职模拟平台；非雇主招聘方，不承诺获得工作或通过招聘考试。":"An independent career learning and mock-interview platform; no hiring outcomes are guaranteed."}</p>
   <p>{lang==="zh"?"© 2026 青梧未来（武汉）人工智能应用软件有限公司 · 版权所有":"© 2026 Qingwu Future (Wuhan) AI Application Software Co., Ltd. · All rights reserved"}</p>
   <p><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2026004372号</a></p>
  </div>
 </footer>;
}
