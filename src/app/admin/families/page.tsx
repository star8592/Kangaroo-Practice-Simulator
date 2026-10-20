import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { adminOperationsSnapshot, filterAdminFamilies } from "@/lib/admin-operations";
import AdminOperationsNav from "@/components/AdminOperationsNav";
import styles from "@/components/AdminOperations.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "用户与家庭 · SOC THINK", robots: { index: false, follow: false } };

function time(at: number | null) {
  return at ? new Date(at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) : "暂无记录";
}

export default async function AdminFamiliesPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const jar = await cookies();
  const admin = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!admin) redirect("/login?next=/admin/families");
  if (!isAdmin(admin)) redirect("/");

  const qs = await searchParams;
  const q = typeof qs.q === "string" ? qs.q.slice(0, 80) : "";
  const page = Number(qs.page || "1");
  const data = adminOperationsSnapshot();
  const results = filterAdminFamilies(data.families, q, page);
  const pageUrl = (p: number) => `/admin/families?page=${p}&q=${encodeURIComponent(q)}`;

  return <div className={styles.shell}>
    <header className={styles.head}>
      <div><span className={styles.eyebrow}>SOC THINK · 管理中心</span><h1>用户与家庭</h1>
        <p>以家长为中心，查看微信登录、注册时间及关联的学生档案。当前只读，避免误操作。</p></div>
      <Link href="/admin" className="secondary-button">返回总览</Link>
    </header>
    <AdminOperationsNav />
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>家长账号 <small>共 {results.total} 条</small></h2>
      </div>
      <form method="get" action="/admin/families" className={styles.search}>
        <input type="search" name="q" defaultValue={q} maxLength={80} aria-label="搜索家庭账号" placeholder="搜索家长名称或账号编号" />
        <button type="submit">搜索</button>
      </form>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>家长 / 邮箱</th><th>方式</th><th>注册时间</th><th>最近成功登录</th><th>孩子</th><th>状态</th></tr></thead>
          <tbody>{results.rows.map((u) => <tr key={u.id}>
            <td><strong>{u.name}</strong><small>{u.maskedEmail || u.id.slice(0, 12) + "…"}</small></td>
            <td><span className={styles.pill}>{u.signIn}</span></td>
            <td>{time(u.createdAt)}</td>
            <td>{time(u.lastLoginAt)}</td>
            <td>{u.linkedChildren}</td>
            <td>{u.active ? "正常" : "已停用"}</td>
          </tr>)}</tbody>
        </table>
        {results.rows.length === 0 && <p className={styles.empty}>没有匹配的家长账号。</p>}
      </div>
      <nav className={styles.pageNav} aria-label="家庭列表分页">
        {results.page > 1 && <Link href={pageUrl(results.page - 1)}>← 上一页</Link>}
        <span>第 {results.page} / {results.pages} 页</span>
        {results.page < results.pages && <Link href={pageUrl(results.page + 1)}>下一页 →</Link>}
      </nav>
      <p className={styles.note}>账号数据仅供管理员查看，未显示任何微信 OpenID、授权令牌或密码。每次页面加载取最新数据，不缓存敏感信息。</p>
    </section>
  </div>;
}
