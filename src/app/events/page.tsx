import type { Metadata } from "next";
import EventsCompanionClient from "@/components/EventsCompanionClient";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "赛事管家 | SOC THINK",
  description: "管理中国与世界数学赛事资讯、赛事关注、报名核验、备赛清单及赛历。站内模拟考试为独立业务。",
  alternates: { canonical: "/events" },
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event } = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Shanghai", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
  return <EventsCompanionClient exams={listTrainingExamProfiles()} today={today} selectedEvent={event}/>;
}
