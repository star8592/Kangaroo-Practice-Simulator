import Link from "next/link";
import {CAREER_FORMAL_PAPERS} from "@/lib/career-formal-bank";
import styles from "@/app/assessment-center/measurement.module.css";

export const metadata={
 title:"模拟笔试与面试｜岗位求职训练｜SOC THINK",
 description:"查看已开放的岗位正式模拟笔试、结构化面试和编程实操。每套模拟说明题量与时长；结果与真实招聘无官方关联。",
 alternates:{canonical:"/practice"},
};
export default function PracticeHome(){
 return <div className={styles.shell}>
  <header className={styles.hero}>
   <span className={styles.eyebrow}>SOC THINK / CAREER PRACTICE</span>
   <h1>用模拟检验求职准备程度</h1>
   <p>按岗位选择完整模拟笔试或面试训练。成绩与反馈用于发现需要提升的技能，并非企业官方招聘考试或录用承诺。</p>
   <div className={styles.heroMeta}><span>明确题量和时长</span><span>实际交卷评分</span><span>可复盘</span></div>
  </header>
  <div className={styles.sectionHeading}><div><span className={styles.eyebrowDark}>FORMAL MOCKS</span><h2>已开放的岗位模拟笔试</h2></div></div>
  <div className={styles.grid}>{CAREER_FORMAL_PAPERS.map(p=><article className={styles.tile} key={p.id}>
    <div className={styles.tileTop}><span className={styles.tileNumber}>岗位模拟</span><span className={styles.previewBadge}>完整模拟卷</span></div>
    <h3>{p.title}</h3><p>{p.context}</p>
    <div className={styles.tileInfo}>{p.questions.length} 题 · {p.durationMinutes} 分钟 · {p.maxPoints} 分</div>
    <Link className={styles.tileLink} href={"/career/exams/"+p.id}>进入模拟笔试 <span aria-hidden="true">→</span></Link>
  </article>)}</div>
  <div className={styles.sectionHeading}><div><span className={styles.eyebrowDark}>INTERVIEWS AND LABS</span><h2>面试与实操</h2></div></div>
  <div className={styles.grid}>
   <article className={styles.tile}><div className={styles.tileTop}><span className={styles.tileNumber}>INTERVIEW</span><span className={styles.previewBadge}>免费结构化体验</span></div>
    <h3>校招与社招模拟面试</h3><p>按岗位情境提问、追问和复盘。当前为结构化体验，尚不宣传为正式 AI 语义评分。</p>
    <Link className={styles.tileLink} href="/career/interviews">进入面试训练 <span aria-hidden="true">→</span></Link>
   </article>
   <article className={styles.tile}><div className={styles.tileTop}><span className={styles.tileNumber}>SQL</span><span className={styles.previewBadge}>可运行实操</span></div>
    <h3>数据工程 SQL 实操</h3><p>直接运行 SQL 查询并核验结果。</p>
    <Link className={styles.tileLink} href="/skill-labs/sql-lab">开始实操 <span aria-hidden="true">→</span></Link>
   </article>
   <article className={styles.tile}><div className={styles.tileTop}><span className={styles.tileNumber}>CODE</span><span className={styles.previewBadge}>可运行实操</span></div>
    <h3>软件工程编程模拟</h3><p>真实代码执行判分，区别于选择题式模拟。</p>
    <Link className={styles.tileLink} href="/skill-labs/engineering-mock">进入编程模拟 <span aria-hidden="true">→</span></Link>
   </article>
  </div>
 </div>;
}
