import type { MetadataRoute } from "next";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";
import { buildTrainingResourceCatalog } from "@/lib/resource-catalog";
import { availableResourceHubs, resourceHubPath } from "@/lib/seo-resource-hubs";
import { CAREER_ORIGINAL_GUIDES } from "@/lib/career-original-guides";

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
  "/skill-labs/agent-foundations",
  "/skill-labs/webgpu-basics",
  "/skill-labs/sql-lab",
  "/skill-labs/code-lab",
  "/skill-labs/engineering-mock",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const rows = buildTrainingResourceCatalog(listTrainingExamProfiles());
  const activeHubPaths = availableResourceHubs(rows).map(resourceHubPath);
  const publicGuides = CAREER_ORIGINAL_GUIDES
    .filter(guide => guide.deliveryState === "free-original-material")
    .map(guide => "/career/guides/" + guide.id);
  return [...new Set([...publicPaths, ...activeHubPaths, ...publicGuides])].map((path) => ({
    url: `https://socthink.cn${path}`,
  }));
}
