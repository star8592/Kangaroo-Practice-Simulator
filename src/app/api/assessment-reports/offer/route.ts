import {NextRequest,NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {billingConfigured,billingPool,hasVerifiedItemEntitlement} from "@/lib/billing-ledger";
import {nativeCheckoutAllowed,nativeCheckoutAllowedForBuyer} from "@/lib/wechat-native-flags";
import {getInstrument} from "@/lib/measurement-center";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store, max-age=0","Vary":"Cookie"};
function response(data:object,status=200){return NextResponse.json(data,{status,headers});}

/** Read-only offer. Never invent prices or imply payment has been enabled. */
export async function GET(req:NextRequest){
 const instrumentId=req.nextUrl.searchParams.get("instrumentId")??"";
 const instrument=getInstrument(instrumentId);
 if(!instrument)return response({error:"UNKNOWN_INSTRUMENT"},404);
 const account=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
 const loggedIn=!!(account?.active&&(account.wechatId||account.wechatOpenId));
 if(!billingConfigured())return response({available:false,loggedIn,owned:false,reason:"BILLING_NOT_READY"});
 try{
  const owned=loggedIn?await hasVerifiedItemEntitlement(account!.id,"report",instrument.id):false;
  // The existing signed-in buyer+SKU pilot must work without exposing public
  // checkout. An anonymous visitor cannot discover pilot-only prices.
  if(!nativeCheckoutAllowed()&&!loggedIn)
    return response({available:false,loggedIn,owned,reason:"REPORT_CHECKOUT_NOT_ENABLED"});
  const offers=await billingPool().query<{id:string;amount_minor:string;currency:string}>(`
    SELECT id,amount_minor::text,currency
    FROM billing_products
    WHERE product_kind='item' AND content_kind='report' AND content_id=$1
      AND enabled=true AND currency='CNY' AND amount_minor>0
      AND rights_approved=true AND delivery_verified=true AND access_restricted=true
    LIMIT 1`,[instrument.id]);
  const offer=offers.rows[0];
  if(!offer)return response({available:false,loggedIn,owned,reason:"NOT_PUBLISHED"});
  if(!nativeCheckoutAllowedForBuyer(loggedIn?account?.id:null,offer.id))
    return response({available:false,loggedIn,owned,reason:"REPORT_CHECKOUT_NOT_ENABLED"});
  const priceMinor=Number(offer.amount_minor);
  if(!Number.isSafeInteger(priceMinor)||priceMinor<=0)return response({available:false,loggedIn,owned,reason:"INVALID_PRICE"});
  return response({available:true,loggedIn,owned,productId:offer.id,priceMinor,currency:"CNY",
    deliverable:"本量表一次购买，当前微信账号可重复生成同一种量表的详细自我探索报告。不是标准化临床报告。"});
 }catch{return response({available:false,loggedIn,owned:false,reason:"OFFER_SERVICE_UNAVAILABLE"},503);}
}
