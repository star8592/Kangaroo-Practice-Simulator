import type { Metadata } from "next";
import { redirect } from "next/navigation";
import HomeLanguageBridge from "@/components/HomeLanguageBridge";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "国际数学竞赛真题与在线模拟 | SOC THINK",
  description: "袋鼠数学、澳洲 AMC、美国 AMC、加拿大 CEMC 等数学竞赛的可用训练资源与独立赛制模拟。",
  alternates: { canonical: "/competitions" },
};

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
