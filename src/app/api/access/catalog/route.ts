import { NextResponse } from "next/server";
import { publicAccessCatalog } from "@/lib/access-catalog";

/** Shared read-only benefit catalog for Web and WeChat mini-program. */
export function GET() {
  return NextResponse.json(publicAccessCatalog(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
