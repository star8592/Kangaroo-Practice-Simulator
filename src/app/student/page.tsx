import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReportDownloadButton from "@/components/ReportDownloadButton";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { buildStudentAnalytics } from "@/lib/student-analytics";
import { studentAvatarEmoji } from "@/lib/student-avatar";
import styles from "./StudentDashboard.module.css";
import { buildStudentAttention } from "@/lib/academic-events/student-attention";

export const dynamic = "force-dynamic";

const pc = (x: number | null | undefined, n = 0) => x === null || x === undefined ? "—" : `${(x * 100).toFixed(n)}%`;
const sec = (x: number) => (x ? `${x.toFixed(1)}s` : "—");

const UI={
 zh:{report:"学习报告",titleSuffix:"的数学学习报告",grade:"年级",edit:"编辑我的资料",pending:"待建立",index:"综合训练指数",confidence:"数据置信度",modelNote:"综合训练指数至少需要 2 套完整模拟、40 道正式题后才显示；它只用于本站纵向跟踪，不是竞赛结果预测。",formal:"正式模拟",records:"套完整记录",questions:"累计题量",tracked:"道有行为轨迹",accuracy:"累计正确率",right:"对",wrong:"错",blank:"空",time:"典型单题用时",timeNote:"已扣除切出页面时间",changes:"改答案比例",w2c:"错→对",c2w:"对→错",away:"离开考试页",awayNote:"只作数据质量信号",diagnosis:"诊断建议",diagnosisTitle:"当前最值得处理的问题",priority:"优先",strength:"优势",watch:"观察",evidence:"证据：",next:"下一步：",noEvidence:"还没有足够证据",noEvidenceDesc:"先完成完整模拟，系统不会用零散样本硬下结论。",stability:"稳定性",difficulty:"难度与后程表现",items:"题",avg:"平均",phases:"前 / 中 / 后程",plan:"训练计划",planTitle:"下一阶段训练顺序",moreData:"继续积累完整卷数据，系统会根据稳定证据生成优先级。",nextPaper:"下一套试卷",recommend:"推荐真题",start:"开始 →",noPaper:"当前没有新的匹配年级试卷。",trend:"长期趋势",trendTitle:"最近考试趋势",duration:"用时",scoreRate:"得分率",view:"查看报告",download:"下载 PDF",noExam:"还没有正式考试记录。",practice:"专项训练",practiceTitle:"竞赛专项训练记录",attempts:"套专项训练",practiceNote:"专项训练单独建模，不计入正式模拟次数和综合训练指数。",calc:"计算模型",calcTitle:"计算与巧算画像",noCalc:"还没有计算行为数据，先完成一次 20 题基线诊断。",enterCalc:"进入计算诊断",principle:"建模原则",principleTitle:"系统如何避免误判",principle1:"不会因为一道题慢就判定“不会”，不会把单次错误写成稳定弱项，也不会把离开页面的时间算成思考时间。",principle2:"正式考试、计算、修改答案、空题、难度、前后程表现会分别建模，再生成训练建议。"},
 en:{report:"Learning report",titleSuffix:"'s math learning report",grade:"Grade",edit:"Edit profile",pending:"Pending",index:"Training readiness index",confidence:"Data confidence",modelNote:"The readiness index appears only after at least 2 full mocks and 40 formal questions. It is for longitudinal tracking on this site, not an outcome prediction.",formal:"Full mocks",records:"complete records",questions:"Questions",tracked:"with behavior traces",accuracy:"Overall accuracy",right:"correct",wrong:"wrong",blank:"blank",time:"Median question time",timeNote:"time away from the page excluded",changes:"Answer-change rate",w2c:"wrong→right",c2w:"right→wrong",away:"Left exam page",awayNote:"used only as a data-quality signal",diagnosis:"DIAGNOSTIC",diagnosisTitle:"Highest-priority issues now",priority:"Priority",strength:"Strength",watch:"Watch",evidence:"Evidence: ",next:"Next: ",noEvidence:"Not enough evidence yet",noEvidenceDesc:"Complete full mocks first; the system will not infer stable weaknesses from sparse samples.",stability:"STABILITY",difficulty:"Difficulty and late-test performance",items:"questions",avg:"avg",phases:"Early / middle / late",plan:"TRAINING PLAN",planTitle:"Next training sequence",moreData:"Keep accumulating complete-paper data; priorities will be generated from stable evidence.",nextPaper:"NEXT PAPER",recommend:"Recommended past papers",start:"Start →",noPaper:"No new grade-matched paper is available now.",trend:"LONG-TERM TREND",trendTitle:"Recent exam trend",duration:"Time",scoreRate:"Score rate",view:"View report",download:"Download PDF",noExam:"No formal exam record yet.",practice:"PRACTICE",practiceTitle:"Competition practice history",attempts:"practice sets",practiceNote:"Practice is modeled separately and does not count toward full mocks or the readiness index.",calc:"CALCULATION MODEL",calcTitle:"Calculation and strategy profile",noCalc:"No calculation behavior data yet. Complete a 20-question baseline diagnostic first.",enterCalc:"Open calculation diagnostic",principle:"MODELING PRINCIPLES",principleTitle:"How the system avoids false conclusions",principle1:"One slow question is not treated as lack of mastery; one error is not promoted to a stable weakness; time away from the page is not counted as thinking time.",principle2:"Formal exams, calculation, answer changes, blanks, difficulty and test-phase performance are modeled separately before recommendations are generated."},
} as const;

export default async function StudentPage() {
  const jar = await cookies();
  const user = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=/student");
  const lang=jar.get("socthink_lang")?.value==="en"?"en":"zh";
  const ui=UI[lang];
  const a = buildStudentAnalytics(user);
  const o = a.overview;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const attention = buildStudentAttention(user, today);

  return (
    <div className={`student-shell ${styles.shell}`}>
      <section className={`student-hero ${styles.hero}`}>
        <div className={styles.heroMain}>
          <span className={styles.heroLabel}>{ui.report}</span>
          <h1>{studentAvatarEmoji(user.avatarKey)} {lang==="zh"?`${user.name} ${ui.titleSuffix}`:`${user.name}${ui.titleSuffix}`}</h1>
          <p className={styles.heroMeta}>{user.candidateNo} · {lang==="zh"?`${user.grade} ${ui.grade}`:`${ui.grade} ${user.grade}`}{user.school ? ` · ${user.school}` : ""}</p>
          <div className={styles.heroActions}><Link className="secondary-button" href="/student/settings">{ui.edit}</Link><Link className="primary-button" href="/student/cards">{lang==="zh"?"我的卡册":"My Card Book"}</Link></div>
        </div>
        <div className={styles.readinessCard}>
          <div className={styles.readinessHead}><strong>{a.readiness ?? "—"}</strong><span>{a.readiness === null ? ui.pending : "/ 100"}</span></div>
          <span className={styles.readinessLabel}>{ui.index}</span>
          <div className={styles.confidenceTrack} aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, a.dataConfidence))}%` }} /></div>
          <small className={styles.confidenceText}>{ui.confidence} {a.dataConfidence}%</small>
        </div>
      </section>

      <p className={styles.modelNote}>{ui.modelNote}</p>

      {attention.doNow && <section className={styles.attentionSection}>
        <div className={styles.attentionHeading}><div><span>{lang==="zh"?"今天":"TODAY"}</span><h2>{lang==="zh"?"现在最重要的一件事":"The one thing to do now"}</h2></div><Link href="/student/calendar">{lang==="zh"?"完整赛历":"Full calendar"} →</Link></div>
        <article className={styles.doNowCard}>
          <div className={styles.attentionDate}><b>{attention.doNow.daysUntil<=0?(lang==="zh"?"现在":"NOW"):`${attention.doNow.daysUntil}D`}</b><span>{attention.doNow.milestone.start.slice(5)}</span></div>
          <div><small>{lang==="zh"?attention.doNow.event.titleZh:attention.doNow.event.titleEn}</small><h3>{lang==="zh"?attention.doNow.milestone.titleZh:attention.doNow.milestone.titleEn}</h3><p>{lang==="zh"?attention.doNow.reasonZh:attention.doNow.reasonEn}</p></div>
        </article>
        {attention.next.length>0 && <div className={styles.nextAttention}><strong>{lang==="zh"?"接下来":"NEXT"}</strong>{attention.next.map(x=><div key={x.milestone.id}><span>{x.milestone.start.slice(5)}</span><b>{lang==="zh"?x.milestone.titleZh:x.milestone.titleEn}</b><small>{lang==="zh"?x.reasonZh:x.reasonEn}</small></div>)}</div>}
        {attention.hiddenCount>0&&<p className={styles.attentionHidden}>{lang==="zh"?`另有 ${attention.hiddenCount} 项已收进完整赛历，避免干扰当前任务。`:`${attention.hiddenCount} more items are kept in the full calendar to reduce distraction.`}</p>}
      </section>}

      <section className={styles.kpiGrid}>
        <article className={styles.kpi}><span>{ui.formal}</span><strong>{o.examAttempts}</strong><small>{ui.records}</small></article>
        <article className={styles.kpi}><span>{ui.questions}</span><strong>{o.totalQuestions}</strong><small>{ui.tracked}</small></article>
        <article className={styles.kpi}><span>{ui.accuracy}</span><strong>{o.totalQuestions ? pc(o.accuracy) : "—"}</strong><small>{o.correct} {ui.right} · {o.wrong} {ui.wrong} · {o.blank} {ui.blank}</small></article>
        <article className={styles.kpi}><span>{ui.time}</span><strong>{sec(o.medianQuestionSeconds)}</strong><small>{ui.timeNote}</small></article>
        <article className={styles.kpi}><span>{ui.changes}</span><strong>{o.totalQuestions ? pc(o.answerChangeRate) : "—"}</strong><small>{ui.w2c} {o.wrongToCorrect} · {ui.c2w} {o.correctToWrong}</small></article>
        <article className={styles.kpi}><span>{ui.away}</span><strong>{o.tabAwayCount}</strong><small>{ui.awayNote}</small></article>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={`report-card ${styles.card}`}>
          <header className={styles.cardHead}><span className={styles.sectionLabel}>{ui.diagnosis}</span><h2>{ui.diagnosisTitle}</h2></header>
          {a.insights.length ? a.insights.map((x, i) => (
            <div className={`${styles.insight} ${styles[x.kind] ?? ""}`} key={i}>
              <div className={styles.insightTitle}><span className={styles.insightBadge}>{x.kind === "priority" ? ui.priority : x.kind === "strength" ? ui.strength : ui.watch}</span><h3>{x.title}</h3></div>
              <p><b>{ui.evidence}</b>{x.evidence}</p><p><b>{ui.next}</b>{x.action}</p>
            </div>
          )) : <div className={styles.empty}><h3>{ui.noEvidence}</h3><p>{ui.noEvidenceDesc}</p></div>}
        </article>

        <article className={`report-card ${styles.card}`}>
          <header className={styles.cardHead}><span className={styles.sectionLabel}>{ui.stability}</span><h2>{ui.difficulty}</h2></header>
          {a.difficulty.map((x) => <div className={styles.metricRow} key={x.key}><div><b>{x.label}</b><span>{x.count} {ui.items} · {ui.avg} {sec(x.avgSeconds)}</span></div><strong>{x.count ? pc(x.accuracy) : "—"}</strong></div>)}
          <h3>{ui.phases}</h3>
          {a.phases.map((x) => <div className={styles.metricRow} key={x.name}><div><b>{x.name}</b><span>{x.count} {ui.items} · {ui.avg} {sec(x.avgSeconds)}</span></div><strong>{x.count ? pc(x.accuracy) : "—"}</strong></div>)}
        </article>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={`report-card ${styles.card}`}>
          <header className={styles.cardHead}><span className={styles.sectionLabel}>{ui.plan}</span><h2>{ui.planTitle}</h2></header>
          {a.nextPlan.length ? <ol className={styles.planList}>{a.nextPlan.map((x, i) => <li key={i}><b>{x.title}</b><span>{x.action}</span><small>{x.evidence}</small></li>)}</ol> : <p className={styles.cardBodyText}>{ui.moreData}</p>}
        </article>
        <article className={`report-card ${styles.card}`}>
          <header className={styles.cardHead}><span className={styles.sectionLabel}>{ui.nextPaper}</span><h2>{ui.recommend}</h2></header>
          {a.recommendedExams.length ? <div className={styles.paperList}>{a.recommendedExams.map((x) => <Link className={styles.paper} key={x.id} href={`/exam/${x.id}`}><div><b>{x.name}</b><span>{x.country || ""} · {x.year || ""} · {x.questionCount} {ui.items}</span></div><strong>{ui.start}</strong></Link>)}</div> : <p className={styles.cardBodyText}>{ui.noPaper}</p>}
        </article>
      </section>

      <section className={`report-card ${styles.fullCard}`}>
        <header className={styles.cardHead}><span className={styles.sectionLabel}>{ui.trend}</span><h2>{ui.trendTitle}</h2></header>
        {a.trend.length ? <div className={styles.trendList}>{a.trend.map((x) => <div className={styles.trendRow} key={x.id}><div><b>{x.examId}</b><small>{new Date(x.submittedAt).toLocaleDateString(lang==="zh"?"zh-CN":"en-US")} · {ui.duration} {Math.floor(x.elapsedSeconds / 60)}:{String(x.elapsedSeconds % 60).padStart(2, "0")}</small></div><div className={styles.trendScores}><b>{ui.scoreRate} {pc(x.scorePct)}</b><span>{ui.accuracy} {pc(x.accuracy)}</span><div style={{display:"flex",gap:8,justifyContent:"flex-end",alignItems:"center",marginTop:5,flexWrap:"wrap"}}><Link className="secondary-button" style={{padding:"8px 10px",fontSize:10}} href={`/report/${encodeURIComponent(x.id)}`}>{ui.view}</Link><ReportDownloadButton href={`/api/reports/${encodeURIComponent(x.id)}/pdf`} label={ui.download} className="secondary-button" /></div></div></div>)}</div> : <p className={styles.cardBodyText}>{ui.noExam}</p>}
      </section>

      {a.practice.questions > 0 && <section className={`report-card ${styles.fullCard}`}><header className={styles.cardHead}><span className={styles.sectionLabel}>{ui.practice}</span><h2>{ui.practiceTitle}</h2></header><p className={styles.cardBodyText}>{lang==="zh"?`已完成 ${a.practice.attempts} ${ui.attempts}、${a.practice.questions} 道题，正确率 ${pc(a.practice.accuracy)}。${ui.practiceNote}`:`Completed ${a.practice.attempts} ${ui.attempts}, ${a.practice.questions} questions, accuracy ${pc(a.practice.accuracy)}. ${ui.practiceNote}`}</p><div className={styles.focusChips}>{a.practice.topics.slice(0, 8).map((x) => <span key={x.concept}>{x.concept.replace(/^maa_practice_/, "").replaceAll("_", " ")} · {x.correct}/{x.count}</span>)}</div></section>}

      <section className={styles.dashboardGrid}>
        <article className={`report-card ${styles.card}`}>
          <header className={styles.cardHead}><span className={styles.sectionLabel}>{ui.calc}</span><h2>{ui.calcTitle}</h2></header>
          {a.arithmetic.plan ? <><>{a.arithmetic.plan.summaryZh.slice(0, 5).map((x, i) => <p className={styles.cardBodyText} key={i}>{x}</p>)}</><div className={styles.focusChips}>{a.arithmetic.plan.focusSkills.map((x) => <span key={x}>{x}</span>)}</div></> : <p className={styles.cardBodyText}>{ui.noCalc}</p>}
          <div className={styles.cardAction}><Link className="primary-button" href="/arithmetic">{ui.enterCalc}</Link></div>
        </article>
        <article className={`report-card ${styles.card}`}><header className={styles.cardHead}><span className={styles.sectionLabel}>{ui.principle}</span><h2>{ui.principleTitle}</h2></header><div className={styles.principle}><p>{ui.principle1}</p><p>{ui.principle2}</p></div></article>
      </section>
    </div>
  );
}
