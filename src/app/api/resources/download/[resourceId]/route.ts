import {NextRequest,NextResponse} from "next/server";
import {billingConfigured,billingPool,hasVerifiedItemEntitlement} from "@/lib/billing-ledger";
import {verifiedBuyerIdForItem} from "@/lib/item-access-server";
import {attachmentFilename,readVerifiedDigitalResource,type DigitalResourceFile} from "@/lib/digital-resource-file";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={
  "Cache-Control":"private, no-store, max-age=0",
  "Vary":"Cookie, Authorization",
  "X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"no-referrer",
};
const reply=(code:string,status:number)=>NextResponse.json({code},{
  status,headers,
});

/** Paid files NEVER leave private storage without server-verifying the buyer,
 * settled item grant, immutable digest and exact bytes. No signed public URL.
 */
export async function GET(req:NextRequest,ctx:{params:Promise<{resourceId:string}>}){
  const buyerId=verifiedBuyerIdForItem(req);
  if(!buyerId)return reply("WECHAT_LOGIN_REQUIRED",401);
  if(!billingConfigured())return reply("BILLING_UNAVAILABLE",503);
  const {resourceId}=await ctx.params;
  if(!/^[A-Za-z0-9_.-]{4,120}$/.test(resourceId))return reply("RESOURCE_NOT_FOUND",404);
  try{
    if(!await hasVerifiedItemEntitlement(buyerId,"resource",resourceId))
      return reply("RESOURCE_NOT_PURCHASED",403);
    const meta=await billingPool().query<DigitalResourceFile>(`
      SELECT sha256,size_bytes,file_name,mime_type
      FROM billing_resource_assets
      WHERE resource_id=$1 AND rights_approved=true AND delivery_verified=true`,
      [resourceId]);
    if(!meta.rows[0])return reply("RESOURCE_UNAVAILABLE",503);
    const bytes=await readVerifiedDigitalResource(meta.rows[0]);
    const fileName=attachmentFilename(meta.rows[0].file_name);
    return new NextResponse(new Uint8Array(bytes),{
      status:200,
      headers:{...headers,"Content-Type":meta.rows[0].mime_type,
        "Content-Length":String(bytes.length),"Content-Disposition":fileName},
    });
  }catch{
    // No path or credential details are returned to clients.
    return reply("RESOURCE_DELIVERY_UNAVAILABLE",503);
  }
}
