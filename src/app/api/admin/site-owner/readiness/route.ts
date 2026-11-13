import { NextResponse } from "next/server";
import { hasSiteOwnerBinding, readSiteOwner } from "@/lib/site-owner";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    status: hasSiteOwnerBinding() && readSiteOwner() ? "configured" : "unconfigured",
    service: "socthink-site-owner",
  },{headers:{"Cache-Control":"no-store"}});
}
