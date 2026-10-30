import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { readCustomerFeedbackOverview } from "@/lib/customer-feedback-admin";
import { readCaseStates, type CaseStatus } from "@/lib/customer-feedback-workflow";
import FeedbackCaseActions from "@/components/FeedbackCaseActions";
import AdminOperationsNav from "@/components/AdminOperationsNav";
import styles from "@/components/AdminOperations.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "客户反馈 · SOC THINK", robots: { index: false, follow: false } };

const categoryLabel: Record<string, string> = {
  question_error: "题目／答案问题",
  solution_unclear: "解析不清楚",
  report_inaccurate: "测评报告争议",
  usability: "操作体验",
  other: "其他建议",
};

function time(value: string) {
  return new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
}

export default async function FeedbackPage() {
  const jar = await cookies();
  const user = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/admin/login");
  if (!isAdmin(user)) redirect("/");
  const data = readCustomerFeedbackOverview({ days: 30, limit: 100 });
  const cases = readCaseStates();
  const pending = data.items.filter(x => !["closed","dismissed"].includes(cases.get(x.id)?.status || "open")).length;
  return <main className={styles.shell}>
    <header className={styles.head}>
      <div><span className={styles.eyebrow}>SOC THINK · 客户驱动</span>
        <h1>客户反馈处理台</h1>
        <p>依据真实用户的考试和解析意见安排修复，不以题库规模代替客户价值。</p>
      </div>
      <Link href="/admin" className="secondary-button">运营总览</Link>
    </header>
    <AdminOperationsNav />
    <section className={styles.grid} aria-label="近30天客户反馈统计">
      <article className={styles.metric}><span>反馈总数</span><strong>{data.total}</strong><small>仅包含近30天有效反馈</small></article>
      <article className={styles.metric}><span>优先核查</span><strong>{data.highPriority}</strong><small>题目答案与报告争议</small></article>
      <article className={styles.metric}><span>题目／答案问题</span><strong>{data.categories.question_error}</strong><small>必须核对原题和独立验算</small></article>
      <article className={styles.metric}><span>解析不清楚</span><strong>{data.categories.solution_unclear}</strong><small>优先改进解释与图形</small></article>
    </section>
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>反馈处理队列（优先级排序）</h2>
        <span className={styles.pill}>{data.total === 0 ? "尚无实际反馈" : "待处理 " + pending + " 条"}</span>
      </div>
      {data.items.length === 0 ? <p className={styles.empty}>目前没有可以处理的真实用户反馈；这不等于用户满意度已获验证。</p> :
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>类型</th><th>考试与题目</th><th>用户意见</th><th>提交时间</th><th>核查与处理</th></tr></thead>
          <tbody>{data.items.map(item => <tr key={item.id}>
            <td><strong>{categoryLabel[item.category]}</strong>
              <small>{item.source === "review" ? "逐题复盘" : "成绩报告"}</small></td>
            <td><strong>{item.examId}</strong><small>{item.questionId ? "题目：" + item.questionId : "整场测评"}</small></td>
            <td>{item.message ? item.message : "用户未补充文字"}
              {item.rating !== undefined && <small>体验评分：{item.rating} / 5</small>}</td>
            <td>{time(item.createdAt)}</td>
            <td><FeedbackCaseActions key={item.id + ":" + (cases.get(item.id)?.version || 0)} feedbackId={item.id}
              status={(cases.get(item.id)?.status || "open") as CaseStatus}
              version={cases.get(item.id)?.version || 0}/>
              {cases.get(item.id)?.lastNote && <small>上次记录：{cases.get(item.id)?.lastNote}</small>}
              {cases.get(item.id)?.evidenceRef && <small>证据：{cases.get(item.id)?.evidenceRef}</small>}
              {cases.get(item.id)?.updatedAt && <small>更新时间：{time(cases.get(item.id)!.updatedAt!)}</small>}
            </td>
          </tr>)}</tbody>
        </table></div>}
      {data.truncated && <p className={styles.note}>只显示优先级最高的100条。完整数据保存在受限服务端，不提供公开下载。</p>}
      {data.unreadable > 0 && <p className={styles.note}>发现 {data.unreadable} 条未能安全识别的反馈记录，请检查数据完整性。</p>}
      <p className={styles.note}>仅管理员可访问。联系电话、证件号码和邮箱在展示前作基础遮蔽；请勿将任何含学生个人信息的文本复制到公开沟通渠道。</p>
    </section>
    <section className={styles.panel}>
      <h2>处理原则</h2>
      <p>严格按「待核查 → 核查中 → 已修复／有结论 → 已复测 → 已归档」处理，疑似误报可在核查中附证据驳回，复测失败可退回核查。每一步独立追加审计记录，禁止覆盖原始反馈或依据投诉直接修改试题答案；完成状态不代表客户本人确认满意。</p>
    </section>
  </main>;
}
