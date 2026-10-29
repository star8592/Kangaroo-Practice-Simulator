import Link from "next/link";
import AdminActivationClient from "./AdminActivationClient";
import styles from "@/components/AdminOperations.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "管理员安全激活 · SOCTHINK", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default function AdminActivationPage() {
  return <main className={styles.shell}><header className={styles.head}>
    <div><span className={styles.eyebrow}>SOCTHINK · 安全验证</span><h1>设置正式管理员密码</h1>
    <p>仅限收到一次性邀请邮件的账号。此流程不公开注册管理员，也不会重置已有账号。</p></div>
    <Link href="/" className="secondary-button">返回首页</Link>
  </header><section className={styles.panel}><h2>完成管理员账号激活</h2>
    <AdminActivationClient /></section></main>;
}
