"use client";

import Link from "next/link";
import { ASSESSMENT_DOMAINS,LIVE_ASSESSMENT_DOMAINS } from "@/lib/assessment-platform";
import { useSiteLanguage } from "@/lib/site-language";
import styles from "@/app/assessments/assessments.module.css";

const UI = {
  zh: {
    hero1:"不只是练题。",hero2:"用真实考试，看见真实能力。",
    copy:"从小学数学到大学生就业技能，我们建设同一套考试、解答、报告和复测系统。现阶段可直接使用数学训练与国际数学竞赛，其他领域会在题目来源、评分和交付验收后逐步开放。",
    start:"马上开始数学能力训练",contest:"进入国际数学竞赛",
    liveEye:"START NOW",liveTitle:"现在就能使用",liveDesc:"有真实考试入口、答题与反馈路径的产品。",
    liveBadge:"已开放",futureEye:"EXPANSION ROADMAP",futureTitle:"同一个平台，延伸至更多考试",
    futureDesc:"以下是规划与验证中的业务。未完成的考试不会显示虚假测评或付款链接。",
    plannedBadge:"待开放",flowTitle:"所有业务，共用同一条用户路径",
    steps:["选择测评与免费体验","正式考试或实操任务","有依据的评分和可视化解析","针对性练习、复测与成长记录"],
    footer:"内容来源、答案核查、支付权益及用户数据始终由服务端验证。未通过交付验收的测评不会被当作现成商品出售。",
  },
  en: {
    hero1:"Go beyond practice.",hero2:"Prove ability through real assessments.",
    copy:"From school mathematics to job-ready data skills, we're building one system for exams, explanations, reports and retesting. Math practice and competitions are available now; other areas will open only after content rights, scoring and delivery are verified.",
    start:"Start math practice",contest:"Explore math competitions",
    liveEye:"START NOW",liveTitle:"Available today",liveDesc:"Real assessments and practice flows you can open now.",
    liveBadge:"Available",futureEye:"EXPANSION ROADMAP",futureTitle:"One platform for more kinds of assessment",
    futureDesc:"These categories are under development. We don't show fake exams or checkout links.",
    plannedBadge:"In development",flowTitle:"One learner journey across every domain",
    steps:["Choose an assessment and try it","Take an exam or practical task","See evidence-based scoring and explanations","Practice, retest and track your progress"],
    footer:"Source rights, answer verification, entitlements and learner privacy are enforced server-side. Unverified products are not sold.",
  },
} as const;
const SORT_ORDER=["school","math-competition","career","language","university","professional","interest"];
function index(id:string){return String(SORT_ORDER.indexOf(id)+1).padStart(2,"0")}

export default function AssessmentPortalClient() {
  const lang=useSiteLanguage(),ui=UI[lang];
  return <main className={styles.shell}>
    <section className={styles.hero}>
      <span className={styles.eyebrow}>SOC THINK / ASSESSMENT PLATFORM</span>
      <h1>{ui.hero1}<br/><span>{ui.hero2}</span></h1>
      <p>{ui.copy}</p>
      <div className={styles.heroActions}>
        <Link href="/arithmetic" className={styles.primary}>{ui.start}</Link>
        <Link href="/competitions" className={styles.secondary}>{ui.contest}</Link>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="available-assessments">
      <div className={styles.sectionHead}>
        <div><span className={styles.eyebrow}>{ui.liveEye}</span><h2 id="available-assessments">{ui.liveTitle}</h2></div>
        <p>{ui.liveDesc}</p>
      </div>
      <div className={styles.grid}>
        {LIVE_ASSESSMENT_DOMAINS.map(domain=><article className={styles.card} key={domain.id}>
          <div className={styles.cardTop}><span className={styles.ordinal}>{index(domain.id)}</span>
            <span className={styles.live}>{ui.liveBadge}</span></div>
          <h3>{domain.name[lang]}</h3>
          <p>{domain.summary[lang]}</p>
          <div className={styles.links}>{domain.liveRoutes.map(route=>
            <Link key={route.href} href={route.href}>{route.title[lang]}<span aria-hidden="true"> ↗</span></Link>)}</div>
        </article>)}
      </div>
    </section>
    <section className={styles.section} aria-labelledby="future-assessments">
      <div className={styles.sectionHead}>
        <div><span className={styles.eyebrow}>{ui.futureEye}</span><h2 id="future-assessments">{ui.futureTitle}</h2></div>
        <p>{ui.futureDesc}</p>
      </div>
      <div className={styles.grid}>
        {ASSESSMENT_DOMAINS.filter(domain=>domain.readiness==="planned").map(domain=>
          <article className={styles.card + " " + styles.future} key={domain.id}>
            <div className={styles.cardTop}><span className={styles.ordinal}>{index(domain.id)}</span>
              <span className={styles.planned}>{ui.plannedBadge}</span></div>
            <h3>{domain.name[lang]}</h3>
            <p>{domain.summary[lang]}</p>
            <p className={styles.next}>{domain.nextProof[lang]}</p>
          </article>)}
      </div>
    </section>
    <section className={styles.flow} aria-label="assessment workflow">
      <span className={styles.eyebrow}>ONE ENGINE / EVERY EXAM</span>
      <h2>{ui.flowTitle}</h2>
      <div className={styles.steps}>
        {ui.steps.map((step,i)=><div key={step}><span>{String(i+1).padStart(2,"0")}</span><strong>{step}</strong></div>)}
      </div>
      <p>{ui.footer}</p>
    </section>
  </main>;
}
