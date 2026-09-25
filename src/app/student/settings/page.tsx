import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import StudentProfileClient from "@/components/StudentProfileClient";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const jar = await cookies();
  const user = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=/student/settings");
  if (user.role !== "student") redirect("/student");
  const query = await searchParams;
  return <StudentProfileClient user={user} welcome={query.welcome === "1"} />;
}
