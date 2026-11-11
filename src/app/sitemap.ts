import type { MetadataRoute } from "next";
import { CAREER_ORIGINAL_GUIDES } from "@/lib/career-original-guides";
import { TECH_BOOKS } from "@/lib/tech-books";
import { ASSESSMENT_EVIDENCE } from "@/lib/assessment-evidence";
import { CAREER_FORMAL_PAPERS } from "@/lib/career-formal-bank";
import { CAREER_PATHS } from "@/lib/career-paths";
import { ENGINEERING_TRACK_LIST } from "@/lib/engineering-code-tracks";
import { listStoreProducts } from "@/lib/store-products";

export const dynamic = "force-dynamic";

// Only public, anonymous-readable content; verify 200 on production after publish.
// Do not use a build-time timestamp as lastModified: it would misstate changes.
// No account, checkout, private exam session, or unreviewed paper URLs here.
const publicPaths = [
  "/",
  "/english",
  "/english/pronunciation",
  "/english/vocabulary",
  "/english/reading",
  "/privacy",
  "/terms",
  "/digital-purchase-policy",
  "/shop",
  "/career",
  "/career/paths",
  "/learn",
  "/practice",
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
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use the same rights/verified-file catalogue as the public shop; no speculative SKU URLs.
  const products=await listStoreProducts();
  const publishedProductPaths=products.map(product=>"/shop/"+encodeURIComponent(product.id));
  const publicGuides = CAREER_ORIGINAL_GUIDES
    .filter(guide => guide.deliveryState === "free-original-material")
    .map(guide => "/career/guides/" + guide.id);
  const liveCareerPapers=CAREER_FORMAL_PAPERS
    .filter(p=>p.deliveryState==="free-live-preview")
    .map(p=>"/career/exams/"+p.id);
  const assessmentPages=ASSESSMENT_EVIDENCE.map(record=>record.path);
  const engineeringPages=ENGINEERING_TRACK_LIST.map(track=>"/skill-labs/engineering/"+track.id);
  return [...new Set([...publicPaths, ...publicGuides,
    ...liveCareerPapers, ...CAREER_PATHS.map(p=>"/career/paths/"+p.slug),
    ...assessmentPages, ...engineeringPages, ...publishedProductPaths,
    ...TECH_BOOKS.map(book => "/skill-labs/books/" + book.slug)])].map((path) => ({
    url: `https://socthink.cn${path}`,
  }));
}
