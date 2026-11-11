import Link from "next/link";
import styles from "./ScoreSyncPortal.module.css";

const ENTRIES = [
 {id:"math",label:"数学",detail:"国际竞赛 · 口算训练",icon:"∑",href:"/math",status:"ready"},
 {id:"english",label:"英语",detail:"发音训练 · 英语学习",icon:"Aa",href:"https://toktik.tech/accent-lab/",status:"external"},
 {id:"k12",label:"校内学科",detail:"语文 · 真题资料",icon:"课",href:"/resources",status:"ready"},
 {id:"career",label:"职业技能",detail:"课程 · 项目实训",icon:"技",href:"/learn",status:"ready"},
 {id:"assessment",label:"能力测评",detail:"推理 · 职业测评",icon:"测",href:"/assessment-center",status:"ready"},
 {id:"exams",label:"考试升学",detail:"模拟考试 · 备考",icon:"考",href:"/assessments",status:"ready"},
] as const;

export default function ScoreSyncPortal() {
 return <div className={styles.shell} data-scoresync-portal="true">
  <section className={styles.intro}>
   <span className={styles.kicker}>SCORESYNC · LEARNING & ASSESSMENT</span>
   <h1>今天想学什么？</h1>
   <p>选择一个方向，直接进入。</p>
   <form action="/search" method="get" role="search" className={styles.search}>
    <label htmlFor="scoresync-query" className={styles.srOnly}>搜索课程、考试或测评</label>
    <input id="scoresync-query" type="search" name="q" placeholder="搜索课程、考试或测评" maxLength={100}/>
    <button type="submit">搜索</button>
   </form>
  </section>
  <nav aria-label="学习与考试分类" className={styles.grid}>
   {ENTRIES.map(entry=> <div key={entry.id} className={styles.card}>
    {entry.status==="external"
      ? <a href={entry.href} className={styles.cardLink} rel="noopener noreferrer">
          <span className={styles.icon} aria-hidden="true">{entry.icon}</span>
          <strong>{entry.label}</strong><span>{entry.detail}</span>
          <small>进入现有发音训练站 ↗</small>
        </a>
      : <Link href={entry.href} className={styles.cardLink}>
          <span className={styles.icon} aria-hidden="true">{entry.icon}</span>
          <strong>{entry.label}</strong><span>{entry.detail}</span>
          <small>进入 →</small>
        </Link>}
   </div>)}
  </nav>
  <p className={styles.note}>各学习馆保留自己的界面和内容。统一账号、支付及子目录接入将分阶段完成。</p>
 </div>;
}
