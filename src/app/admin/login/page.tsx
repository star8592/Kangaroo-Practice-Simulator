import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import AdminLoginClient from "@/components/AdminLoginClient";
import styles from "@/components/AdminOperations.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "管理员认证 · SOC THINK", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const jar = await cookies();
  if (isAdmin(userFromSessionToken(jar.get(SESSION_COOKIE)?.value))) redirect("/admin");
  return <div className={styles.shell}>
    <header className={styles.head}>
      <div><span className={styles.eyebrow}>SOC THINK · 管理中心</span><h1>管理员认证</h1>
        <p>后台与家长微信扫码登录严格分离，使用原有管理员账号及 PIN 验证。</p></div>
      <Link className="secondary-button" href="/">返回网站</Link>
    </header>
    <section className={styles.panel}>
      <h2>验证管理员身份</h2>
      <AdminLoginClient />
    </section>
  </div>;
}
