import {NextRequest,NextResponse} from "next/server";
import {isAdmin,userFromRequest} from "@/lib/auth";
import {loadWatchStore,reviewObservation,WATCH_SOURCES} from "@/lib/competition-source-watch";
const headers={"Cache-Control":"private, no-store"};
const denied=()=>NextResponse.json({error:"Admin access required"},{status:403,headers});
function authorized(req:NextRequest){return isAdmin(userFromRequest(req));}
export async function GET(req:NextRequest){
  if(!authorized(req))return denied();
  try{
    const state=loadWatchStore();
    return NextResponse.json({sources:WATCH_SOURCES,health:state.health,
      pending:state.observations.filter(x=>x.status==="pending").slice(-100).reverse(),
      history:state.observations.filter(x=>x.status!=="pending").slice(-30).reverse(),
      reviewedCount:state.observations.filter(x=>x.status==="reviewed").length,
      dismissedCount:state.observations.filter(x=>x.status==="dismissed").length,
    },{headers});
  }catch{return NextResponse.json({error:"Source-watch evidence store unavailable"},{status:503,headers});}
}
export async function PATCH(req:NextRequest){
  const u=userFromRequest(req);
  if(!isAdmin(u))return denied();
  const origin=req.headers.get("origin");
  if(!origin||origin!==new URL(req.url).origin)
    return NextResponse.json({error:"Same-origin review required"},{status:403,headers});
  if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return NextResponse.json({error:"JSON required"},{status:415,headers});
  try{
    const body=await req.json();
    if(typeof body?.id!=="string"||!["reviewed","dismissed"].includes(body?.decision)||
      typeof body?.note!=="string"||!body.note.trim()||body.note.length>1000)
      return NextResponse.json({error:"Invalid review decision/note"},{status:400,headers});
    const item=reviewObservation({id:body.id,decision:body.decision,note:body.note,reviewer:u!.id});
    return NextResponse.json({item,promotion:false,message:"Review recorded; verified edition not modified"},{headers});
  }catch(e){
    if(e instanceof Error&&e.message.includes("already running"))
      return NextResponse.json({error:"Source scan currently holds the review lock; retry"},{status:409,headers});
    return NextResponse.json({error:"Review conflict or record missing"},{status:409,headers});
  }
}
