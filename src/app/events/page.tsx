import type { Metadata } from "next";
import WorldEventsExplorer from "@/components/WorldEventsExplorer";
import { WORLD_COMPETITIONS } from "@/lib/world-competitions";

export const metadata: Metadata = {
  title: "全球数学赛事 | SOC THINK",
  description: "一站式探索中国与世界数学竞赛，核对赛事来源、学段范围与备赛资源。报名资格与日期请以当届当地官方公告为准。",
};

export default function EventsPage() {
  return <WorldEventsExplorer events={WORLD_COMPETITIONS} />;
}
