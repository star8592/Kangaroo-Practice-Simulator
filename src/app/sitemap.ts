import type { MetadataRoute } from "next";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";
import { buildTrainingResourceCatalog } from "@/lib/resource-catalog";
import { availableResourceHubs, resourceHubPath } from "@/lib/seo-resource-hubs";

export const dynamic = "force-dynamic";

// Only public, anonymous-200 routes verified against the production site.
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
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const rows = buildTrainingResourceCatalog(listTrainingExamProfiles());
  const activeHubPaths = availableResourceHubs(rows).map(resourceHubPath);
  return [...publicPaths, ...activeHubPaths].map((path) => ({
    url: `https://socthink.cn${path}`,
  }));
}
