import {NextResponse} from "next/server";
import {englishPlatformCatalog} from "@/lib/english-products";

/** Public, non-personal service discovery. Never return account tokens,
 * private per-student records, paid entitlement state or backend secrets.
 * Product-specific authorization is enforced by each verified backend.
 */
export async function GET() {
 return NextResponse.json(englishPlatformCatalog(),{
  headers:{"Cache-Control":"public, max-age=300, stale-while-revalidate=60",
    "X-Content-Type-Options":"nosniff"},
 });
}
