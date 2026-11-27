import {NextRequest} from "next/server";
import {siteOwnerOnly,answer,platformFailure} from "@/lib/platform-api";
import {voucherPreviewEnabled} from "@/lib/commerce/voucher-preview";
import {readAdminVoucherOverview} from "@/lib/commerce/admin-voucher-overview";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 if(!voucherPreviewEnabled())return answer({code:"NOT_AVAILABLE"},404);
 try{
  siteOwnerOnly(req);
  return answer(await readAdminVoucherOverview({state:req.nextUrl.searchParams.get("state"),q:req.nextUrl.searchParams.get("q")}));
 }catch(e){return platformFailure(e);}
}
