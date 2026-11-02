"use client";
import Link from "next/link";
import {useSiteLanguage} from "@/lib/site-language";
const GROUPS=[
 {zh:"学习与考试",en:"Learning and exams",items:[
  {href:"/assessments",zh:"全部考试",en:"All exams"},
  {href:"/resources",zh:"真题资料",en:"Papers"},
  {href:"/competitions",zh:"竞赛模拟",en:"Competition mocks"},
  {href:"/exam-planner",zh:"考试日程",en:"Exam calendar"},
 ]},
 {zh:"职业与技能",en:"Careers and skills",items:[
  {href:"/career",zh:"职业岗位",en:"Careers"},
  {href:"/skill-labs",zh:"技能实训",en:"Skill labs"},
  {href:"/skill-labs/books",zh:"技术书库",en:"Technical books"},
 ]},
 {zh:"专业测评",en:"Assessments",items:[
  {href:"/assessment-center",zh:"测评中心",en:"Assessment center"},
  {href:"/assessment-center/methodology",zh:"方法与来源",en:"Methods and sources"},
 ]},
 {zh:"商城与账户",en:"Store and account",items:[
  {href:"/shop",zh:"数字商城",en:"Digital store"},
  {href:"/account",zh:"订单与下载",en:"Orders and downloads"},
  {href:"/membership",zh:"购买与权益",en:"Membership"},
  {href:"/privacy",zh:"隐私政策",en:"Privacy"},
  {href:"/terms",zh:"服务条款",en:"Terms"},
  {href:"/digital-purchase-policy",zh:"数字商品售后",en:"Digital purchase terms"},
 ]},
] as const;
export default function SiteFooter(){
 const lang=useSiteLanguage();
 return <footer className="site-footer">
  <div className="site-footer-inner">
   <div className="site-footer-top">
    <strong>SOCTHINK · {lang==="zh"?"考试、学习与技能":"Exams, learning and skills"}</strong>
    <nav aria-label={lang==="zh"?"页脚导航":"Footer navigation"}>
     {GROUPS.map(group=><div className="site-footer-group" key={group.zh}>
      <b>{group[lang]}</b>
      <div>{group.items.map(item=><Link href={item.href} key={item.href}>{item[lang]}</Link>)}</div>
     </div>)}
    </nav>
   </div>
   <p>{lang==="zh"?"独立开发的综合学习与考试平台；非考试主办方，不保证任何考试资格或通过结果。":"An independent learning and assessment platform; not affiliated with exam organizers."}</p>
   <p>{lang==="zh"?"© 2026 青梧未来（武汉）人工智能应用软件有限公司 · 版权所有":"© 2026 Qingwu Future (Wuhan) AI Application Software Co., Ltd. · All rights reserved"}</p>
   <p><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2026004372号</a></p>
  </div>
 </footer>;
}
