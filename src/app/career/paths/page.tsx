import Link from "next/link";
import {CAREER_PATHS} from "@/lib/career-paths";
import styles from "./career-paths.module.css";

export const metadata={
 title:"职业学习路线｜校招与社招可用的岗位课程及实训｜SOC THINK",
 description:"按岗位查看真实可用的学习、实训、模拟笔试和面试。尚未开发的环节明确标记，不销售尚未交付的商品。",
 alternates:{canonical:"/career/paths"},
};

export default function CareerPathsPage(){
 return <div className={styles.shell}>
   <nav className={styles.breadcrumb} aria-label="位置"><Link href="/">首页</Link><span>/</span><Link href="/career">岗位方向</Link><span>/</span><span>学习路线</span></nav>
   <header className={styles.hero}>
    <span className={styles.eyebrow}>Career paths · SOC THINK</span>
    <h1>从一个目标岗位，开始真正的训练</h1>
    <p>这里优先展示已经有真实课程、项目或模拟服务的岗位路线。不会因为网站收录了某个职位名称，就声称相关训练已经上线。</p>
    <div className={styles.meta}><span>{CAREER_PATHS.length} 条重点路线</span><span>免费内容优先</span><span>明确可用与建设中</span></div>
   </header>
   <h2 className={styles.title}>选择你的岗位路线</h2>
   <p className={styles.note}>既适用于大学生校招，也适用于在职求职与转岗。内容按实际可交付的服务组织，不把 X 热帖或开源仓库直接包装成付费课程。</p>
   <section className={styles.cards} aria-label="真实可用的岗位路线">
    {CAREER_PATHS.map(p=><article className={styles.card} key={p.slug}>
      <span className={styles.eyebrow}>ROLE TRACK</span>
      <h2>{p.title}</h2><p>{p.subtitle}</p>
      <div className={styles.cardTags}>{p.recommendedFor.slice(0,3).map(name=><span key={name}>{name}</span>)}</div>
      <p>{p.steps.filter(s=>s.status==="live").length} 项已开放内容 · {p.steps.filter(s=>s.status==="planned").length} 项正在建设</p>
      <Link className={styles.action} href={"/career/paths/"+p.slug}>查看完整路线 →</Link>
    </article>)}
   </section>
   <p className={styles.warning}>说明：公开岗位目录不等于当前在招职位。模拟题与面试由本站自主开发，不声称是企业官方考试、招聘录用评价或就业保证。</p>
 </div>;
}
