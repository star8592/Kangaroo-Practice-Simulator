import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { PARENT_SESSION_COOKIE, parentFromSessionToken, isWechatNicknamePlaceholder } from "@/lib/parent-auth";
import { isSiteOwner, readSiteOwner } from "@/lib/site-owner";
import { adminOperationsSnapshot, filterAdminFamilies } from "@/lib/admin-operations";
import { activePlatformGrantsForSubjects } from "@/lib/platform-grants";
import AdminOperationsNav from "@/components/AdminOperationsNav";
import styles from "@/components/AdminOperations.module.css";
import local from "./users.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "用户管理 · SOC THINK", robots: { index: false, follow: false, noarchive: true } };

function displayTime(value: number | null) {
  return value ? new Date(value).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }) : "暂无记录";
}

type Params = { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

export default async function AdminUsersPage({ searchParams }: Params) {
  const jar = await cookies();
  const oldAdmin = isAdmin(userFromSessionToken(jar.get(SESSION_COOKIE)?.value));
  const owner = isSiteOwner(parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value));
  const siteOwnerId = readSiteOwner()?.parentId;
  if (!oldAdmin && !owner) redirect("/admin/login");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const rawPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const snapshot = adminOperationsSnapshot();
  const result = filterAdminFamilies(snapshot.families, q, page, 20);

  // One bulk lookup for the currently visible page, never one database call per user.
  // A failed authorization registry is unknown, not equivalent to "ordinary user".
  let roles: Awaited<ReturnType<typeof activePlatformGrantsForSubjects>> | null = null;
  try {
    roles = await activePlatformGrantsForSubjects(result.rows
      .filter(user => user.signIn === "微信" && user.active).map(user => user.id));
  } catch {
    roles = null;
  }
  const nextPage = (n: number) => `/admin/users?page=${n}&q=${encodeURIComponent(q)}`;
  const wechatCount = snapshot.families.filter(u => u.signIn === "微信").length;
  const pendingWechatNames = snapshot.families.filter(u =>
    u.signIn === "微信" && isWechatNicknamePlaceholder(u.name)).length;
  return <div className={styles.shell}>
    <header className={styles.head}>
      <div>
        <span className={styles.eyebrow}>SOC THINK / PLATFORM ADMINISTRATION</span>
        <h1>用户管理</h1>
        <p>查看微信账号、最近登录、学习关联与教师权限；从用户行直接授权，不需要猜测账号。</p>
      </div>
      <Link href="/admin" className="secondary-button">返回经营驾驶舱</Link>
    </header>
    <AdminOperationsNav />

    <div className={local.metrics}>
      <article><span>平台注册家庭账号</span><strong>{snapshot.totalFamilies}</strong></article>
      <article><span>其中微信账号</span><strong>{wechatCount}</strong></article>
      <article><span>昵称待补全</span><strong>{pendingWechatNames}</strong></article>
      <article><span>今天新增账号</span><strong>{snapshot.createdToday}</strong></article>
      <article><span>近 7 天成功登录账号</span><strong>{snapshot.loggedInLast7Days}</strong></article>
      <article><span>学生档案</span><strong>{snapshot.studentProfiles}</strong></article>
    </div>

    <section className={styles.panel} aria-labelledby="user-directory-title">
      <div className={styles.panelHead}>
        <div><h2 id="user-directory-title">用户列表 · {result.total} 条</h2>
          <p>按最近成功登录时间排序。每页 20 人；昵称待补全不影响账号登录。授权前请核对账号编号及登录时间。</p></div>
        {owner ? <Link href="/admin/platform-authorizations" className={local.secondaryLink}>批量查找 / 模块授权</Link> :
          <span className={local.readonly}>当前登录身份仅可查看，微信站点所有者才能修改角色</span>}
      </div>
      <form method="get" action="/admin/users" className={styles.search}>
        <input name="q" type="search" maxLength={80} defaultValue={q}
          aria-label="按用户昵称或平台用户编号搜索" placeholder="输入微信昵称 / 用户编号"/>
        <button type="submit">搜索用户</button>
        {q ? <Link href="/admin/users" className={local.clear}>清除</Link> : null}
      </form>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr>
            <th>账号</th><th>登录方式</th><th>加入时间</th><th>最近登录</th>
            <th>学生关联</th><th>管理身份</th><th>操作</th>
          </tr></thead>
          <tbody>{result.rows.map(user => {
            const grants = roles?.get(user.id) ?? [];
            const roleText = !user.active ? "已停用" :
              user.id === siteOwnerId ? "平台所有者" :
              user.signIn !== "微信" ? "尚未关联微信" :
              roles === null ? "权限数据暂不可用" :
              grants.some(g => g.role === "module-admin") ? "项目管理员" :
              grants.some(g => g.role === "teacher") ? "教师" : "普通用户";
            return <tr key={user.id}>
              <td><strong>{user.name || "微信用户"}</strong>
                {user.signIn === "微信" && isWechatNicknamePlaceholder(user.name) ?
                  <small>昵称待本人微信授权同步</small> : null}
                <small>{user.maskedEmail || user.id}</small></td>
              <td><span className={styles.pill}>{user.signIn}</span></td>
              <td>{displayTime(user.createdAt)}</td>
              <td>{displayTime(user.lastLoginAt)}</td>
              <td>{user.linkedChildren} 位</td>
              <td><span className={local.role}>{roleText}</span>
                {grants.length > 0 ? <small>{[...new Set(grants.map(g => g.capability))].length} 个模块</small> : null}
              </td>
              <td>{owner && user.signIn === "微信" && user.active ?
                <Link className={local.grantLink} href={`/admin/platform-authorizations?subject=${encodeURIComponent(user.id)}`}>
                  {grants.length ? "查看 / 修改权限" : "设为教师 / 授权"}
                </Link> : <span className={local.noAction}>—</span>}</td>
            </tr>;
          })}</tbody>
        </table>
        {!result.rows.length ? <p className={styles.empty}>没有匹配的用户。请确认老师已在 SOC THINK 主站完成微信登录，而不仅是扫码确认。</p> : null}
      </div>
      <nav aria-label="用户列表分页" className={styles.pageNav}>
        {result.page > 1 ? <Link href={nextPage(result.page - 1)}>上一页</Link> : null}
        <span>第 {result.page} / {result.pages} 页</span>
        {result.page < result.pages ? <Link href={nextPage(result.page + 1)}>下一页</Link> : null}
      </nav>
      <p className={styles.note}>用户数据从主站现有真实账号库实时读取；管理授权从 PostgreSQL 权限表读取。显示“微信用户”的账号并非登录失败：请本人在微信内打开 /account 并点击“同步微信昵称”。用户编号仅供管理确认，绝不显示微信 OpenID、密码或登录令牌。授权模块并不自动创建课堂任课关系。</p>
    </section>
  </div>;
}
