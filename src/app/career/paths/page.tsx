import Link from "next/link";
import {CAREER_PATHS} from "@/lib/career-paths";
import styles from "./career-paths.module.css";

export const metadata={
 title:"职业学习路线｜校招与社招可用的岗位课程及实训｜SOC THINK",
 description:"按岗位查看真实可用的学习、实训、模拟笔试和面试。尚未开发的环节明确标记，不销售尚未交付的商品。",
 alternates:{canonical:"/career/paths"},
};

type Props={searchParams:Promise<{audience?:string}>};
export default async function CareerPathsPage({searchParams}:Props){
 const {audience:raw}=await searchParams;
 const audience=raw==="social"?"social":"campus";
 const audienceQuery=raw==="social"||raw==="campus"?"?audience="+audience:"";
 return <div className={styles.shell}>
   <nav className={styles.breadcrumb} aria-label="位置"><Link href="/">首页</Link><span>/</span><Link href="/career">岗位方向</Link><span>/</span><span>学习路线</span></nav>
   <header className={styles.hero}>
    <span className={styles.eyebrow}>Career paths · SOC THINK</span>
    <h1>从一个目标岗位，开始真正的训练</h1>
    <p>选岗位，先看能完成的真实练习与模拟，再决定下一步。只展示已经可进入的训练。</p>
    <div className={styles.meta}><span>{CAREER_PATHS.length} 条重点路线</span><span>可免费开始</span><span>未上线服务不收款</span></div>
   </header>
   <nav className={styles.switch} aria-label="选择求职阶段">
      <Link href="/career/paths?audience=campus" aria-current={audience==="campus"?"page":undefined}>校招 / 应届生</Link>
      <Link href="/career/paths?audience=social" aria-current={audience==="social"?"page":undefined}>社招 / 转岗</Link>
   </nav>
   <h2 className={styles.title}>选择你的岗位路线</h2>
   <p className={styles.note}>先从下面四条已开放的路线开始。每条都告诉你能练什么、交付什么；未完成的专项服务不会出现付款按钮。</p>
   <section className={styles.cards} aria-label="真实可用的岗位路线">
    {CAREER_PATHS.map(p=><article className={styles.card} key={p.slug}>
      <span className={styles.eyebrow}>ROLE TRACK</span>
      <h2>{p.title}</h2><p>{p.subtitle}</p>
      <div className={styles.cardTags}>{p.recommendedFor.slice(0,3).map(name=><span key={name}>{name}</span>)}</div>
      <p>{p.steps.filter(s=>s.status==="live"&&(s.audience==="both"||s.audience===audience)).length} 个环节可直接开始 · {p.steps.filter(s=>s.status==="planned"&&(s.audience==="both"||s.audience===audience)).length} 个仍在建设</p>
      <Link className={styles.action} href={"/career/paths/"+p.slug+audienceQuery}>查看路线和可用服务 →</Link>
    </article>)}
   </section>
   <p className={styles.warning}>说明：公开岗位目录不等于当前在招职位。模拟题与面试由本站自主开发，不声称是企业官方考试、招聘录用评价或就业保证。</p>
 </div>;
}
