"use client";

import { useRouter } from "next/navigation";
import WorldCompetitionHub from "@/components/WorldCompetitionHub";
import type { ExamProfile } from "@/lib/types";
import { useSiteLanguage } from "@/lib/site-language";

export default function EventsCompanionClient({
  exams, today, selectedEvent,
}: {
  exams: ExamProfile[];
  today: string;
  selectedEvent?: string;
}) {
  const lang = useSiteLanguage();
  const router = useRouter();
  return <div className="home-shell">
    <WorldCompetitionHub
      lang={lang}
      today={today}
      exams={exams}
      initialSelected={selectedEvent}
      onSelectTraining={id => router.push(`/competitions?c=${encodeURIComponent(id)}`)}
    />
  </div>;
}
