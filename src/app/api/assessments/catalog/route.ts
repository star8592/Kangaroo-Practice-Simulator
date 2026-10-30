import { NextResponse } from "next/server";
import { ASSESSMENT_DOMAINS,validateAssessmentCatalog } from "@/lib/assessment-platform";
export const dynamic = "force-static";
const CACHE = { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" };
/**
 * Shared read-only discovery endpoint for Web and Miniapp.
 * Future product implementations must register with honest readiness status;
 * this does not return exams, copyrighted sources, student data or paid grants.
 */
export function GET() {
  const issues = validateAssessmentCatalog();
  if (issues.length) return NextResponse.json({ error:"Assessment catalogue unavailable" },{status:503});
  return NextResponse.json({
    schemaVersion:1,
    platform:"SOCTHINK",
    liveDomains:ASSESSMENT_DOMAINS.filter(x=>x.readiness==="live").length,
    domains:ASSESSMENT_DOMAINS.map(x=>({
      id:x.id,name:x.name,summary:x.summary,audience:x.audience,
      readiness:x.readiness,formats:x.formats,liveRoutes:x.liveRoutes,
    })),
  },{headers:CACHE});
}
