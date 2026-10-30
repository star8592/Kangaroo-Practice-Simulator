"use client";
import Link from "next/link";
import {useSiteLanguage} from "@/lib/site-language";

export default function SiteFooter(){
  const lang=useSiteLanguage();
  const items=[
    {href:"/assessments",zh:"考试大全",en:"All exams"},
    {href:"/resources",zh:"资料中心",en:"Resources"},
    {href:"/events",zh:"赛事管家",en:"Event companion"},
    {href:"/membership",zh:"学习权益",en:"Membership"},
    {href:"/privacy",zh:"隐私政策",en:"Privacy"},
    {href:"/terms",zh:"服务条款",en:"Terms"},
    {href:"/digital-purchase-policy",zh:"数字商品售后",en:"Digital purchase terms"},
  ];
  return <footer className="site-footer">
    <div className="site-footer-inner">
      <div className="site-footer-top">
        <strong>SOCTHINK · {lang==="zh"?"考试与学习资源":"Exams and learning resources"}</strong>
        <nav aria-label={lang==="zh"?"页脚导航":"Footer navigation"}>
          {items.map(x=><Link key={x.href} href={x.href}>{x[lang]}</Link>)}
        </nav>
      </div>
      <p>{lang==="zh"?
        "独立开发的综合考试与学习辅助平台；不代表任何考试主办方，不保证报名资格或通过结果。":
        "An independent learning and assessment platform. Not affiliated with exam organizers; no guarantee of eligibility or passing."}</p>
      <p>{lang==="zh"?
        "© 2026 青梧未来（武汉）人工智能应用软件有限公司 · 版权所有":
        "© 2026 Qingwu Future (Wuhan) AI Application Software Co., Ltd. · All rights reserved"}</p>
      <p><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2026004372号</a></p>
    </div>
  </footer>;
}
