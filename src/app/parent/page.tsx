import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ParentDashboard from "@/components/ParentDashboard";
import ParentLogoutButton from "@/components/ParentLogoutButton";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";
import styles from "./ParentPage.module.css";

export default async function Page() {
  const jar = await cookies();
  const user = parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
  if (!user) redirect("/parent/login");

  return (
    <>
      <header className={styles.accountBar}>
        <div>
          <span>家长账号</span>
          <strong>{user.name}</strong>
          <small>{user.email || (user.wechatId ? "微信账号" : "家长账号")}</small>
        </div>
        <ParentLogoutButton />
      </header>
      <ParentDashboard />
    </>
  );
}
