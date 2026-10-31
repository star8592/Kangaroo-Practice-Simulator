import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import StudentProfileClient from "@/components/StudentProfileClient";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";

export const dynamic = "force-dynamic";

export default async function StudentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const jar = await cookies();
  const buyer=parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
  if(buyer?.active&&(buyer.wechatId||buyer.wechatOpenId))redirect("/account");
  const user = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=/student/settings");
  if (user.role !== "student") redirect("/student");
  const query = await searchParams;
  return <StudentProfileClient user={user} welcome={query.welcome === "1"} />;
}
