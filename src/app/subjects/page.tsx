import Link from "next/link";
import type {Metadata} from "next";
import styles from "../teach/teach.module.css";
export const metadata:Metadata={title:"校内学科与学习资源｜SOC THINK",description:"查看已经提供的数学与英语课程、训练、竞赛和试卷资源，未开放的学科不冒充现成商品。",alternates:{canonical:"/subjects"}};
const SUBJECTS=[
 {title:"数学学习与竞赛",summary:"国际数学竞赛、口算训练与在线练习",href:"/math"},
 {title:"英语学习",summary:"听说发音、词汇、绘本与分级阅读",href:"/english"},
] as const;
const RELATED=[
 {title:"数学试卷资料",summary:"按竞赛、年级和年份检索练习卷，并非全部校内课程",href:"/resources"},
 {title:"各类考试与模拟",summary:"浏览考试目录，实际可用状态以各产品为准",href:"/assessments"},
] as const;
export default function Subjects(){
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="所在位置"><Link href="/">SOC THINK</Link><span>/</span>校内学科</nav>
  <header className={styles.hero}>
   <span className={styles.eyebrow}>SOC THINK · SCHOOL LEARNING</span>
   <h1>校内学科与学习资源</h1>
   <p>从已有真实学习活动的学科开始。学生直接练习，教师使用统一工作台，不需要按学科重复注册。</p>
   <div className={styles.actions}><Link href="#school-subjects" className={styles.primary}>选择学科</Link><Link href="/teach" className={styles.secondary}>我是老师</Link></div>
   <p className={styles.notice}>语文、科学和物理等课程将在资源与交付完成验收后逐步开放，暂不占用首页为假商品引流。</p>
  </header>
  <section id="school-subjects" className={styles.section} aria-labelledby="subjects-heading">
   <h2 id="subjects-heading">已开放的学科入口</h2>
   <div className={styles.contentGrid}>
    {SUBJECTS.map(item=><Link key={item.href} className={styles.contentCard} href={item.href}><strong>{item.title}</strong><span>{item.summary}</span><b>进入学习 →</b></Link>)}
   </div>
  </section>
  <section className={styles.section} aria-labelledby="related-heading">
   <h2 id="related-heading">相关试卷与考试目录</h2>
   <div className={styles.contentGrid}>
    {RELATED.map(item=><Link key={item.href} className={styles.contentCard} href={item.href}><strong>{item.title}</strong><span>{item.summary}</span><b>浏览资料 →</b></Link>)}
   </div>
  </section>
  <footer className={styles.bottom}><Link href="/">返回学习首页</Link><Link href="/teach">教师与机构服务</Link></footer>
 </div>;
}