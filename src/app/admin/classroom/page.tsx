import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";
import { hasSiteOwnerBinding, isSiteOwner, readSiteOwner } from "@/lib/site-owner";
import { authEmailStatus } from "@/lib/auth-email";
import AdminOperationsNav from "@/components/AdminOperationsNav";
import ClassroomAdminClient from "./ClassroomAdminClient";
import styles from "./classroom.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title:"英语教师管理 · SOC THINK", robots:{index:false,follow:false} };

export default async function ClassroomAdminPage() {
  const jar = await cookies();
  const oldAdmin = isAdmin(userFromSessionToken(jar.get(SESSION_COOKIE)?.value));
  const parent = parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
  const owner = isSiteOwner(parent);
  if (!oldAdmin && !owner) redirect("/admin/login");
  return <main className={styles.wrap}>
    <header className={styles.header}>
      <div><p className={styles.kicker}>SOC THINK · 统一运营后台</p>
        <h1>英语课堂与教师管理</h1>
        <p>主站微信登录，管理员审批教师，老师建班布置跟读作业。</p></div>
      <Link href="/admin">返回经营驾驶舱</Link>
    </header>
    <AdminOperationsNav/>
    <ClassroomAdminClient
      ownerBound={hasSiteOwnerBinding()}
      ownerEmailVerified={Boolean(readSiteOwner()?.emailVerifiedAt)}
      ownerContactEmail={owner ? readSiteOwner()?.contactEmail || "" : ""}
      emailDeliveryReady={authEmailStatus().productionReady}
      siteOwner={owner}
      legacyAdmin={oldAdmin}
      wechatLoggedIn={Boolean(parent?.wechatId || parent?.wechatOpenId)}
    />
  </main>;
}
