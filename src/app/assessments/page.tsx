import Link from "next/link";
import { ASSESSMENT_DOMAINS, LIVE_ASSESSMENT_DOMAINS } from "@/lib/assessment-platform";
import styles from "./assessments.module.css";

export const metadata = {
  title: "综合考试与测评中心 | SOCTHINK",
  description: "真实可用的数学能力训练和国际数学竞赛测评，并逐步扩展职场技能实操、语言与专业考试。免费浏览，选择实际可做的测评。",
};

const DOMAIN_ICON:Record<string,string> = {
  school:"01", "math-competition":"02",career:"03",language:"04",
  university:"05",professional:"06",interest:"07",
};

export default function AssessmentsPage(){
  return <main className={styles.shell}>
    <section className={styles.hero}>
      <span className={styles.eyebrow}>SOC THINK / ASSESSMENT PLATFORM</span>
      <h1>不只是练题。<br/><span>用真实考试，看见真实能力。</span></h1>
      <p>从小学数学到大学生就业技能，我们建设同一套考试、解答、报告和复测系统。
        现阶段可直接使用数学训练与国际数学竞赛，其他领域会在真题来源、评分和交付验收之后逐步开放。</p>
      <div className={styles.heroActions}>
        <Link href="/arithmetic" className={styles.primary}>马上开始数学能力训练</Link>
        <Link href="/competitions" className={styles.secondary}>进入国际数学竞赛</Link>
      </div>
    </section>

    <section className={styles.section} aria-labelledby="available-assessments">
      <div className={styles.sectionHead}>
        <div><span className={styles.eyebrow}>START NOW</span><h2 id="available-assessments">现在就能使用</h2></div>
        <p>有真实考试入口、答题与反馈路径的产品。</p>
      </div>
      <div className={styles.grid}>
        {LIVE_ASSESSMENT_DOMAINS.map(domain=><article className={styles.card} key={domain.id}>
          <div className={styles.cardTop}><span className={styles.ordinal}>{DOMAIN_ICON[domain.id]}</span>
            <span className={styles.live}>已开放</span></div>
          <h3>{domain.name.zh}</h3>
          <p>{domain.summary.zh}</p>
          <div className={styles.links}>{domain.liveRoutes.map(route=>
            <Link key={route.href} href={route.href}>{route.title.zh}<span aria-hidden="true"> ↗</span></Link>)}</div>
        </article>)}
      </div>
    </section>

    <section className={styles.section} aria-labelledby="future-assessments">
      <div className={styles.sectionHead}>
        <div><span className={styles.eyebrow}>EXPANSION ROADMAP</span><h2 id="future-assessments">同一个平台，延伸至更多考试</h2></div>
        <p>以下是正在规划和验证的业务，不会让你点击后看到空试卷或虚构收费页。</p>
      </div>
      <div className={styles.grid}>
        {ASSESSMENT_DOMAINS.filter(domain=>domain.readiness==="planned").map(domain=>
          <article className={styles.card + " " + styles.future} key={domain.id}>
            <div className={styles.cardTop}><span className={styles.ordinal}>{DOMAIN_ICON[domain.id]}</span>
              <span className={styles.planned}>待开放</span></div>
            <h3>{domain.name.zh}</h3><p>{domain.summary.zh}</p>
            <p className={styles.next}>{domain.nextProof.zh}</p>
          </article>)}
      </div>
    </section>

    <section className={styles.flow} aria-label="统一测评服务流程">
      <span className={styles.eyebrow}>ONE ENGINE / EVERY EXAM</span>
      <h2>所有业务，共用同一条用户路径</h2>
      <div className={styles.steps}>
        {["选择测评与免费体验","正式考试或实操任务","有依据的评分和可视化解析","针对性练习、复测与成长记录"].map((s,i)=>
          <div key={s}><span>{String(i+1).padStart(2,"0")}</span><strong>{s}</strong></div>)}
      </div>
      <p>内容来源、答案核查、支付权益以及用户数据始终由服务端验证。
        公开内容与按需付费增量分开；未通过验收的测评不会作为现成商品出售。</p>
    </section>
  </main>;
}
