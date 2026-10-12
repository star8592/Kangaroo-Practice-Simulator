import { redirect } from "next/navigation";
import HomeLanguageBridge from "@/components/HomeLanguageBridge";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; c?: string }>;
}) {
  const { event, c } = await searchParams;
  // Preserve existing shared /competitions?event=... bookmarks.
  if (event && !c) redirect(`/events?event=${encodeURIComponent(event)}`);
  return <HomeLanguageBridge exams={listTrainingExamProfiles()}/>;
}
