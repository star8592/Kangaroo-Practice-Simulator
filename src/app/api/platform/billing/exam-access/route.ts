import {NextRequest,NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {billingPool} from "@/lib/billing-ledger";
import {voucherPreviewEnabled} from "@/lib/commerce/voucher-preview";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});
export async function GET(req:NextRequest){
 if(!voucherPreviewEnabled())return reply({code:"NOT_AVAILABLE"},404);
 const user=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
 if(!user?.active||!(user.wechatId||user.wechatOpenId))return reply({code:"LOGIN_REQUIRED"},401);
 try{
  // Account scope always comes from the verified session. Return one SQL
  // snapshot to avoid contradictory paper/remaining values on concurrent refund.
  const q=await billingPool().query<{
   remaining:string;papers:string[];active_cards:number;
  }>(`SELECT
    COALESCE((SELECT sum(remaining) FROM exam_access_draft.active_grants WHERE owner_id=$1 AND exam_key='wuhan-2027'),0)::text AS remaining,
    COALESCE((SELECT array_agg(paper_id ORDER BY paper_id) FROM exam_access_draft.paper_registry WHERE exam_key='wuhan-2027'
     AND exam_access_draft.can_open_paper($1,exam_key,paper_id)),ARRAY[]::text[]) AS papers,
    (SELECT count(*)::int FROM exam_access_draft.active_grants WHERE owner_id=$1 AND exam_key='wuhan-2027') AS active_cards`,[user.id]);
  const row=q.rows[0];
  return reply({examKey:"wuhan-2027",remainingScoredAttempts:Number(row.remaining),availablePaperIds:row.papers,activeCards:row.active_cards,preview:true});
 }catch{return reply({code:"TEMPORARILY_UNAVAILABLE"},503);}
}
