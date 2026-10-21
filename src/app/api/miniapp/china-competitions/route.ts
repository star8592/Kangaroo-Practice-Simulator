import { NextResponse } from "next/server";

/** Domestic competition programme is retired from public distribution.
 * Archived source records remain untouched for audit/reversal.
 */
export async function GET() {
  return NextResponse.json(
    { error: "该赛事目录已停止公开展示" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
