import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ReviewClient from "@/components/ReviewClient";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { buildReviewAttempt } from "@/lib/review-attempt";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ attemptId?: string }>;
}) {
  const jar = await cookies();
  const user = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=/review");

  const { attemptId } = await searchParams;
  const initialAttempt = attemptId ? buildReviewAttempt(user, attemptId) : null;
  if (attemptId && !initialAttempt) notFound();

  return <ReviewClient initialAttempt={initialAttempt} />;
}
