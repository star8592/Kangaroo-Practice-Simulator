import type { MetadataRoute } from "next";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";
import { buildTrainingResourceCatalog } from "@/lib/resource-catalog";
import { availableResourceHubs, resourceHubPath } from "@/lib/seo-resource-hubs";
import { CAREER_ORIGINAL_GUIDES } from "@/lib/career-original-guides";
import { TECH_BOOKS } from "@/lib/tech-books";
import { ASSESSMENT_EVIDENCE } from "@/lib/assessment-evidence";
import { CAREER_FORMAL_PAPERS } from "@/lib/career-formal-bank";
import { ENGINEERING_TRACK_LIST } from "@/lib/engineering-code-tracks";

export const dynamic = "force-dynamic";

// Only public, anonymous-readable content; verify 200 on production after publish.
// Do not use a build-time timestamp as lastModified: it would misstate changes.
// No account, checkout, private exam session, or unreviewed paper URLs here.
const publicPaths = [
  "/",
  "/assessments",
  "/competitions",
  "/events",
  "/resources",
  "/math-practice",
  "/exam-planner",
  "/privacy",
  "/terms",
  "/digital-purchase-policy",
  "/shop",
  "/career",
  "/skill-labs",
  "/skill-labs/books",
  "/skill-labs/agent-foundations",
  "/career/exams/agent-engineering-paper-2026q4-v1",
  "/skill-labs/webgpu-basics",
  "/skill-labs/sql-lab",
  "/skill-labs/code-lab",
  "/skill-labs/engineering-mock",
  "/assessment-center",
  "/assessment-center/about",
  "/assessment-center/methodology",
  "/assessment-center/report-preview",
  "/career/companies",
  "/career/interviews",
  "/verification",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const rows = buildTrainingResourceCatalog(listTrainingExamProfiles());
  const activeHubPaths = availableResourceHubs(rows).map(resourceHubPath);
  const publicGuides = CAREER_ORIGINAL_GUIDES
    .filter(guide => guide.deliveryState === "free-original-material")
    .map(guide => "/career/guides/" + guide.id);
  const liveCareerPapers=CAREER_FORMAL_PAPERS
    .filter(p=>p.deliveryState==="free-live-preview")
    .map(p=>"/career/exams/"+p.id);
  const assessmentPages=ASSESSMENT_EVIDENCE.map(record=>record.path);
  const engineeringPages=ENGINEERING_TRACK_LIST.map(track=>"/skill-labs/engineering/"+track.id);
  return [...new Set([...publicPaths, ...activeHubPaths, ...publicGuides,
    ...liveCareerPapers, ...assessmentPages, ...engineeringPages,
    ...TECH_BOOKS.map(book => "/skill-labs/books/" + book.slug)])].map((path) => ({
    url: `https://socthink.cn${path}`,
  }));
}
