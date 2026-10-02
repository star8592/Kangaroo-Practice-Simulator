import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,userFromSessionToken} from "@/lib/auth";
import {appendLearnerSignal,loadUnifiedLearnerSignals} from "@/lib/math-engine/signal-store";
import type {LearnerSignal} from "@/lib/math-engine";
const current=(r:NextRequest)=>userFromSessionToken(r.cookies.get(SESSION_COOKIE)?.value);
export async function GET(r:NextRequest){const u=current(r);if(!u)return NextResponse.json({error:"请先登录"},{status:401});const raw=r.nextUrl.searchParams.get("grade"),grade=raw?Number(raw):undefined;if(grade!==undefined&&(!Number.isInteger(grade)||grade<1||grade>6))return NextResponse.json({error:"invalid grade"},{status:400});return NextResponse.json({signals:loadUnifiedLearnerSignals(u.id,grade,1000)});}
export async function POST(r:NextRequest){const u=current(r);if(!u)return NextResponse.json({error:"请先登录"},{status:401});const body=await r.json() as {signal?:LearnerSignal;source?:"arithmetic"|"structure_discovery"};if(!body.signal?.entityId)return NextResponse.json({error:"invalid signal"},{status:400});appendLearnerSignal({...body.signal,studentId:u.id,source:body.source||"structure_discovery"});return NextResponse.json({ok:true});}
