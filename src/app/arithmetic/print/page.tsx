import "./print.css";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ArithmeticPrintClient from "@/components/ArithmeticPrintClient";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import type { ArithmeticGrade } from "@/lib/arithmetic";
import { loadArithmeticSessions } from "@/lib/arithmetic-session-store";

function clampGrade(value: string | undefined, fallback: number): ArithmeticGrade {
  const parsed = Number(value);
  const grade = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(6, Math.max(1, Math.round(grade))) as ArithmeticGrade;
}

function stableSeed(value: string, grade: ArithmeticGrade) {
  let hash = grade * 1000003;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

export default async function ArithmeticPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>;
}) {
  const jar = await cookies();
  const user = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=/arithmetic/print");

  const params = await searchParams;
  const grade = clampGrade(params.grade, user.grade);
  const sessions = loadArithmeticSessions(user.id, 500);

  return (
    <ArithmeticPrintClient
      initialGrade={grade}
      initialSeed={stableSeed(user.id, grade)}
      studentName={user.name}
      sessions={sessions}
    />
  );
}
