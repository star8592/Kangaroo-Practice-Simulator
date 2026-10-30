import ResourceLibraryClient from "@/components/ResourceLibraryClient";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";
import { buildTrainingResourceCatalog } from "@/lib/resource-catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "试卷资料检索与在线练习 | SOCTHINK",
  description: "按竞赛、年份与年级查找已核查的数学练习试卷；直接进入在线练习。未开放未经授权的商业下载或付费。",
};

export default function ResourceLibraryPage() {
  // Reuse the same content gate and source inventory as the existing exam
  // launcher. No second index, copy of private questions or new exam path.
  const rows = buildTrainingResourceCatalog(listTrainingExamProfiles());
  return <ResourceLibraryClient resources={rows} />;
}
