import Link from "next/link";
import type {Metadata} from "next";
import {INTERVIEW_PROFILES} from "@/lib/career-interview-scenarios";
import styles from "@/components/career-interview.module.css";
export const metadata:Metadata={
 title:"校招与社招模拟面试训练｜职业面试体验｜SOC THINK",
 description:"校招软件研发、社招采购/供应商管理两条结构化面试训练。真实回答、岗位情景追问、复盘记录；当前为免费规则化体验版，不是AI语义评分或企业招聘认证。",
 alternates:{canonical:"/career/interviews"}
};
export default function InterviewHome(){
 return <div className={styles.listShell}>
  <nav className={styles.breadcrumb}><Link href="/career">职业资料与考试</Link><span>/</span>模拟面试</nav>
  <header className={styles.listHead}><span className={styles.kicker}>CAREER INTERVIEW / STRUCTURED PRACTICE</span>
   <h1>模拟面试训练</h1>
   <p>按招聘阶段选一个岗位，完整回答并复盘。当前版本先开放两条原创结构化练习路线，免费体验。</p>
  </header>
  <div className={styles.listGrid}>{INTERVIEW_PROFILES.map(p=><article key={p.id} className={styles.listCard}>
   <span className={styles.status}>{p.cohort==="campus"?"校招／应届":"社招／有工作经历"}</span>
   <h2>{p.title}</h2><p>{p.audience}</p><div className={styles.listMeta}>5轮主问题 · 5轮追问 · 个人复盘 · 本地留存</div>
   <Link href={"/career/interviews/"+p.id} className={styles.listButton}>进入免费模拟</Link>
  </article>)}</div>
  <p className={styles.listFoot}>说明：追问依据回答长度与文字特征选择，暂非AI模型理解。评分与胜任力推断功能尚未开放；报告仅保存真实回答和本人自行核对的证据点。以上不是企业官方真题、认证面试或就业保证。</p>
 </div>;
}
