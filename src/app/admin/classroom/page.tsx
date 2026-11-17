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
import {PLATFORM_SUBJECT_PATTERN} from "@/lib/platform-capabilities";

export const dynamic = "force-dynamic";
export const metadata = { title:"英语教务管理 · SOC THINK", robots:{index:false,follow:false} };

export default async function ClassroomAdminPage({searchParams}:{
  searchParams:Promise<{subject?:string|string[]}>
}) {
  const rawSubject=(await searchParams).subject;
  const initialSubject=typeof rawSubject==="string"&&PLATFORM_SUBJECT_PATTERN.test(rawSubject)?rawSubject:"";
  const jar = await cookies();
  const oldAdmin = isAdmin(userFromSessionToken(jar.get(SESSION_COOKIE)?.value));
  const parent = parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
  const owner = isSiteOwner(parent);
  if (!oldAdmin && !owner) {
    if (parent?.active && (parent.wechatId || parent.wechatOpenId)) redirect("/workspace");
    redirect("/login?next=%2Fadmin%2Fclassroom");
  }
  return <div className={styles.wrap}>
    <header className={styles.header}>
      <div><p className={styles.kicker}>SOC THINK · 统一运营后台</p>
        <h1>英语教务管理</h1>
        <p>一个主站微信身份，管理跟读任课授权、教师名单和班级入口；不用申请成为老师。</p></div>
      <Link href="/admin">返回经营驾驶舱</Link>
    </header>
    <AdminOperationsNav/>
    <ClassroomAdminClient
      initialSubject={initialSubject}
      ownerBound={hasSiteOwnerBinding()}
      ownerEmailVerified={Boolean(readSiteOwner()?.emailVerifiedAt)}
      ownerContactEmail={owner ? readSiteOwner()?.contactEmail || "" : ""}
      emailDeliveryReady={authEmailStatus().productionReady}
      siteOwner={owner}
      legacyAdmin={oldAdmin}
      wechatLoggedIn={Boolean(parent?.wechatId || parent?.wechatOpenId)}
    />
  </div>;
}
