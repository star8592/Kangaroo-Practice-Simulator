import type { MetadataRoute } from "next";

// Only public, anonymous-200 routes verified against the production site.
// Do not use a build-time timestamp as lastModified: it would misstate changes.
// No account, checkout, private exam session, or unreviewed paper URLs here.
const publicPaths = [
  "/",
  "/assessments",
  "/competitions",
  "/events",
  "/resources",
  "/exam-planner",
  "/privacy",
  "/terms",
  "/digital-purchase-policy",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({
    url: `https://socthink.cn${path}`,
  }));
}
