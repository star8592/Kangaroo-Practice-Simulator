import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { adminOperationsSnapshot } from "@/lib/admin-operations";
import AdminOperationsNav from "@/components/AdminOperationsNav";
import styles from "@/components/AdminOperations.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "运营总览 · SOC THINK", robots: { index: false, follow: false } };

function formatted(at: number | null) {
  return at ? new Date(at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) : "暂无记录";
}

export default async function AdminPage() {
  const jar = await cookies();
  const user = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin(user)) redirect("/");
  const data = adminOperationsSnapshot();
  const tiles = [
    { label: "累计家庭账号", value: data.totalFamilies, help: "按家长账号去重，多个孩子仍算一个家庭" },
    { label: "今日新增家庭", value: data.createdToday, help: "北京时间，自然日" },
    { label: "近7天登录家庭", value: data.loggedInLast7Days, help: "仅计算有成功登录时间的家庭，不等于在线人数" },
    { label: "学生档案", value: data.studentProfiles, help: `已关联学生 ${data.linkedChildren} 位` },
  ];

  return <div className={styles.shell}>
    <header className={styles.head}>
      <div><span className={styles.eyebrow}>SOC THINK · 管理中心</span><h1>运营总览</h1>
        <p>关注真实家庭用户和学习情况，不用技术术语堆砌后台。</p></div>
      <Link href="/" className="secondary-button">返回网站</Link>
    </header>
    <AdminOperationsNav />
    <section className={styles.grid} aria-label="运营指标">
      {tiles.map((tile) => <article className={styles.metric} key={tile.label}>
        <span>{tile.label}</span><strong>{tile.value}</strong><small>{tile.help}</small>
      </article>)}
    </section>
    <section className={styles.panel}>
      <div className={styles.panelHead}><h2>最近登录的家长</h2><Link className={styles.textLink} href="/admin/families">查看全部家庭 →</Link></div>
      <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th>家长</th><th>登录方式</th><th>上次成功登录</th><th>关联孩子</th></tr></thead>
        <tbody>{data.families.filter((row) => row.lastLoginAt !== null).slice(0, 8).map((row) =>
          <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.signIn}</td>
            <td>{formatted(row.lastLoginAt)}</td><td>{row.linkedChildren}</td></tr>)}</tbody>
      </table></div>
      {!data.families.some((row) => row.lastLoginAt !== null) &&
        <p className={styles.empty}>暂无可用的成功登录时间。历史数据不会猜测或补造。</p>}
      <p className={styles.note}>仅管理员可见。扫码新建家庭和再次登录会记录成功时间；“在线人数”需要心跳数据，本版不展示。</p>
    </section>
    <section className={styles.panel}>
      <h2>现有管理功能</h2>
      <p>继续使用已经开发的学生画像、学生 PIN 重置和题库检查。
        支付、订阅和营销数据待接入真实订单流水后再显示，不提供虚假的营收数字。</p>
    </section>
    <p className={styles.note}>数据截至：{formatted(data.asOf)} · 历史未记录首次登录时间的家庭：{data.neverLoggedInCount}。</p>
  </div>;
}
