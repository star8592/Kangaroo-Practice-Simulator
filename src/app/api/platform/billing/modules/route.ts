import {NextResponse} from "next/server";
import {publicPlatformBillingCatalog} from "@/lib/platform-billing-modules";

export const dynamic="force-dynamic";
export function GET(){
  return NextResponse.json(publicPlatformBillingCatalog(),
    {headers:{"Cache-Control":"public, max-age=300"}});
}
