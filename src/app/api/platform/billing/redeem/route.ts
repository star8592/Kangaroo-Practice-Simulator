import {NextRequest,NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {billingPool} from "@/lib/billing-ledger";
import {voucherPreviewEnabled} from "@/lib/commerce/voucher-preview";
import {createHmac} from "node:crypto";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(code:string,status:number)=>NextResponse.json({code},{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(req:NextRequest){
 if(!voucherPreviewEnabled())return reply("NOT_AVAILABLE",404);
 if(req.headers.get("origin")!==process.env.SOCTHINK_PUBLIC_ORIGIN||req.headers.get("sec-fetch-site")==="cross-site")return reply("INVALID_ORIGIN",403);
 const user=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
 if(!user?.active||!(user.wechatId||user.wechatOpenId))return reply("LOGIN_REQUIRED",401);
 let code:string;
 try{
  const raw=await req.text();
  if(raw.length>256)return reply("INVALID_CODE",400);
  const obj=JSON.parse(raw);
  code=typeof obj?.code==="string"?obj.code.trim():"";
  // Preview only accepts v1 fixture codes; live platform formats/key rotation TBD.
  if(!/^SOC-1-[A-Za-z0-9_-]{32}$/.test(code))return reply("INVALID_CODE",400);
 }catch{return reply("INVALID_CODE",400);}
 try{
  const digest=createHmac("sha256",Buffer.from(process.env.SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY!,"hex")).update("soc-voucher-lookup\0"+code).digest("hex");
  const r=await billingPool().query<{result:string}>("SELECT voucher_draft.claim_exam($1,$2) AS result",[digest,user.id]);
  const status=r.rows[0]?.result;
  return status==="claimed"||status==="already_claimed"?reply("ACTIVATED",200):reply("VOUCHER_UNAVAILABLE",409);
 }catch{return reply("TEMPORARILY_UNAVAILABLE",503);}
}
