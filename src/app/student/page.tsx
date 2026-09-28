import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReportDownloadButton from "@/components/ReportDownloadButton";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { buildStudentAnalytics } from "@/lib/student-analytics";
import { studentAvatarEmoji } from "@/lib/student-avatar";
import styles from "./StudentDashboard.module.css";

export const dynamic = "force-dynamic";

const pc = (x: number | null | undefined, n = 0) =>
  x === null || x === undefined ? "—" : `${(x * 100).toFixed(n)}%`;
const sec = (x: number) => (x ? `${x.toFixed(1)}s` : "—");

export default async function StudentPage() {
  const jar = await cookies();
  const user = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=/student");

  const a = buildStudentAnalytics(user);
  const o = a.overview;

  return (
    <div className={`student-shell ${styles.shell}`}>
      <section className={`student-hero ${styles.hero}`}>
        <div className={styles.heroMain}>
          <span className={styles.heroLabel}>学习报告</span>
          <h1>{studentAvatarEmoji(user.avatarKey)} {user.name} 的数学学习报告</h1>
          <p className={styles.heroMeta}>
            {user.candidateNo} · {user.grade} 年级{user.school ? ` · ${user.school}` : ""}
          </p>
          <div className={styles.heroActions}>
            <Link className="secondary-button" href="/student/settings">编辑我的资料</Link>
          </div>
        </div>

        <div className={styles.readinessCard}>
          <div className={styles.readinessHead}>
            <strong>{a.readiness ?? "—"}</strong>
            <span>{a.readiness === null ? "待建立" : "/ 100"}</span>
          </div>
          <span className={styles.readinessLabel}>综合训练指数</span>
          <div className={styles.confidenceTrack} aria-hidden="true">
            <i style={{ width: `${Math.max(0, Math.min(100, a.dataConfidence))}%` }} />
          </div>
          <small className={styles.confidenceText}>数据置信度 {a.dataConfidence}%</small>
        </div>
      </section>

      <p className={styles.modelNote}>
        综合训练指数至少需要 2 套完整模拟、40 道正式题后才显示；它只用于本站纵向跟踪，不是竞赛结果预测。
      </p>

      <section className={styles.kpiGrid}>
        <article className={styles.kpi}><span>正式模拟</span><strong>{o.examAttempts}</strong><small>套完整记录</small></article>
        <article className={styles.kpi}><span>累计题量</span><strong>{o.totalQuestions}</strong><small>道有行为轨迹</small></article>
        <article className={styles.kpi}><span>累计正确率</span><strong>{o.totalQuestions ? pc(o.accuracy) : "—"}</strong><small>{o.correct} 对 · {o.wrong} 错 · {o.blank} 空</small></article>
        <article className={styles.kpi}><span>典型单题用时</span><strong>{sec(o.medianQuestionSeconds)}</strong><small>已扣除切出页面时间</small></article>
        <article className={styles.kpi}><span>改答案比例</span><strong>{o.totalQuestions ? pc(o.answerChangeRate) : "—"}</strong><small>错→对 {o.wrongToCorrect} · 对→错 {o.correctToWrong}</small></article>
        <article className={styles.kpi}><span>离开考试页</span><strong>{o.tabAwayCount}</strong><small>只作数据质量信号</small></article>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={`report-card ${styles.card}`}>
          <header className={styles.cardHead}>
            <span className={styles.sectionLabel}>诊断建议</span>
            <h2>当前最值得处理的问题</h2>
          </header>
          {a.insights.length ? a.insights.map((x, i) => (
            <div className={`${styles.insight} ${styles[x.kind] ?? ""}`} key={i}>
              <div className={styles.insightTitle}>
                <span className={styles.insightBadge}>{x.kind === "priority" ? "优先" : x.kind === "strength" ? "优势" : "观察"}</span>
                <h3>{x.title}</h3>
              </div>
              <p><b>证据：</b>{x.evidence}</p>
              <p><b>下一步：</b>{x.action}</p>
            </div>
          )) : (
            <div className={styles.empty}>
              <h3>还没有足够证据</h3>
              <p>先完成完整模拟，系统不会用零散样本硬下结论。</p>
            </div>
          )}
        </article>

        <article className={`report-card ${styles.card}`}>
          <header className={styles.cardHead}>
            <span className={styles.sectionLabel}>稳定性</span>
            <h2>难度与后程表现</h2>
          </header>
          {a.difficulty.map((x) => (
            <div className={styles.metricRow} key={x.key}>
              <div><b>{x.label}</b><span>{x.count} 题 · 平均 {sec(x.avgSeconds)}</span></div>
              <strong>{x.count ? pc(x.accuracy) : "—"}</strong>
            </div>
          ))}
          <h3>前 / 中 / 后程</h3>
          {a.phases.map((x) => (
            <div className={styles.metricRow} key={x.name}>
              <div><b>{x.name}</b><span>{x.count} 题 · 平均 {sec(x.avgSeconds)}</span></div>
              <strong>{x.count ? pc(x.accuracy) : "—"}</strong>
            </div>
          ))}
        </article>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={`report-card ${styles.card}`}>
          <header className={styles.cardHead}>
            <span className={styles.sectionLabel}>训练计划</span>
            <h2>下一阶段训练顺序</h2>
          </header>
          {a.nextPlan.length ? (
            <ol className={styles.planList}>
              {a.nextPlan.map((x, i) => (
                <li key={i}><b>{x.title}</b><span>{x.action}</span><small>{x.evidence}</small></li>
              ))}
            </ol>
          ) : <p className={styles.cardBodyText}>继续积累完整卷数据，系统会根据稳定证据生成优先级。</p>}
        </article>

        <article className={`report-card ${styles.card}`}>
          <header className={styles.cardHead}>
            <span className={styles.sectionLabel}>下一套试卷</span>
            <h2>推荐真题</h2>
          </header>
          {a.recommendedExams.length ? (
            <div className={styles.paperList}>
              {a.recommendedExams.map((x) => (
                <Link className={styles.paper} key={x.id} href={`/exam/${x.id}`}>
                  <div><b>{x.name}</b><span>{x.country || ""} · {x.year || ""} · {x.questionCount} 题</span></div>
                  <strong>开始 →</strong>
                </Link>
              ))}
            </div>
          ) : <p className={styles.cardBodyText}>当前没有新的匹配年级试卷。</p>}
        </article>
      </section>

      <section className={`report-card ${styles.fullCard}`}>
        <header className={styles.cardHead}>
          <span className={styles.sectionLabel}>长期趋势</span>
          <h2>最近考试趋势</h2>
        </header>
        {a.trend.length ? (
          <div className={styles.trendList}>
            {a.trend.map((x) => (
              <div className={styles.trendRow} key={x.id}>
                <div>
                  <b>{x.examId}</b>
                  <small>{new Date(x.submittedAt).toLocaleDateString("zh-CN")} · 用时 {Math.floor(x.elapsedSeconds / 60)}:{String(x.elapsedSeconds % 60).padStart(2, "0")}</small>
                </div>
                <div className={styles.trendScores}>
                  <b>得分率 {pc(x.scorePct)}</b>
                  <span>正确率 {pc(x.accuracy)}</span>
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end",alignItems:"center",marginTop:5,flexWrap:"wrap"}}>
                    <Link className="secondary-button" style={{padding:"8px 10px",fontSize:10}} href={`/report/${encodeURIComponent(x.id)}`}>查看报告</Link>
                    <ReportDownloadButton href={`/api/reports/${encodeURIComponent(x.id)}/pdf`} label="下载 PDF" className="secondary-button" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className={styles.cardBodyText}>还没有正式考试记录。</p>}
      </section>

      {a.practice.questions > 0 && (
        <section className={`report-card ${styles.fullCard}`}>
          <header className={styles.cardHead}>
            <span className={styles.sectionLabel}>专项训练</span>
            <h2>竞赛专项训练记录</h2>
          </header>
          <p className={styles.cardBodyText}>已完成 {a.practice.attempts} 套专项训练、{a.practice.questions} 道题，正确率 {pc(a.practice.accuracy)}。专项训练单独建模，不计入正式模拟次数和综合训练指数。</p>
          <div className={styles.focusChips}>
            {a.practice.topics.slice(0, 8).map((x) => <span key={x.concept}>{x.concept.replace(/^maa_practice_/, "").replaceAll("_", " ")} · {x.correct}/{x.count}</span>)}
          </div>
        </section>
      )}

      <section className={styles.dashboardGrid}>
        <article className={`report-card ${styles.card}`}>
          <header className={styles.cardHead}>
            <span className={styles.sectionLabel}>口算模型</span>
            <h2>口算与巧算画像</h2>
          </header>
          {a.arithmetic.plan ? (
            <>
              {a.arithmetic.plan.summaryZh.slice(0, 5).map((x, i) => <p className={styles.cardBodyText} key={i}>{x}</p>)}
              <div className={styles.focusChips}>{a.arithmetic.plan.focusSkills.map((x) => <span key={x}>{x}</span>)}</div>
            </>
          ) : <p className={styles.cardBodyText}>还没有口算行为数据，先完成一次 20 题基线诊断。</p>}
          <div className={styles.cardAction}><Link className="primary-button" href="/arithmetic">进入口算诊断</Link></div>
        </article>

        <article className={`report-card ${styles.card}`}>
          <header className={styles.cardHead}>
            <span className={styles.sectionLabel}>建模原则</span>
            <h2>系统如何避免误判</h2>
          </header>
          <div className={styles.principle}>
            <p>不会因为一道题慢就判定“不会”，不会把单次错误写成稳定弱项，也不会把离开页面的时间算成思考时间。</p>
            <p>正式考试、口算、修改答案、空题、难度、前后程表现会分别建模，再生成训练建议。</p>
          </div>
        </article>
      </section>
    </div>
  );
}
