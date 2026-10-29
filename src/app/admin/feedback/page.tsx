import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { readCustomerFeedbackOverview } from "@/lib/customer-feedback-admin";
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
        <h2>反馈队列（优先级排序）</h2>
        <span className={styles.pill}>{data.total === 0 ? "尚无实际反馈" : "显示前" + data.items.length + "条"}</span>
      </div>
      {data.items.length === 0 ? <p className={styles.empty}>目前没有可以处理的真实用户反馈；这不等于用户满意度已获验证。</p> :
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>类型</th><th>考试与题目</th><th>用户意见</th><th>提交时间</th></tr></thead>
          <tbody>{data.items.map(item => <tr key={item.id}>
            <td><strong>{categoryLabel[item.category]}</strong>
              <small>{item.source === "review" ? "逐题复盘" : "成绩报告"}</small></td>
            <td><strong>{item.examId}</strong><small>{item.questionId ? "题目：" + item.questionId : "整场测评"}</small></td>
            <td>{item.message ? item.message : "用户未补充文字"}
              {item.rating !== undefined && <small>体验评分：{item.rating} / 5</small>}</td>
            <td>{time(item.createdAt)}</td>
          </tr>)}</tbody>
        </table></div>}
      {data.truncated && <p className={styles.note}>只显示优先级最高的100条。完整数据保存在受限服务端，不提供公开下载。</p>}
      {data.unreadable > 0 && <p className={styles.note}>发现 {data.unreadable} 条未能安全识别的反馈记录，请检查数据完整性。</p>}
      <p className={styles.note}>仅管理员可访问。联系电话、证件号码和邮箱在展示前作基础遮蔽；请勿将任何含学生个人信息的文本复制到公开沟通渠道。</p>
    </section>
    <section className={styles.panel}>
      <h2>处理原则</h2>
      <p>题目答案争议优先人工复核，依据原题、计算与题目版本更正；解答与报告意见依据用户可理解性改进。此页面首先完成收集和分类，不会根据一条投诉自动改写试卷或发布未经审查的解析。</p>
    </section>
  </main>;
}
