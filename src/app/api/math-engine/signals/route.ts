import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,userFromSessionToken} from "@/lib/auth";
import {appendLearnerSignal,loadLearnerSignals} from "@/lib/math-engine/signal-store";
import type {LearnerSignal} from "@/lib/math-engine";
const current=(r:NextRequest)=>userFromSessionToken(r.cookies.get(SESSION_COOKIE)?.value);
export async function GET(r:NextRequest){const u=current(r);if(!u)return NextResponse.json({error:"请先登录"},{status:401});return NextResponse.json({signals:loadLearnerSignals(u.id,1000)});}
export async function POST(r:NextRequest){const u=current(r);if(!u)return NextResponse.json({error:"请先登录"},{status:401});const body=await r.json() as {signal?:LearnerSignal;source?:"arithmetic"|"structure_discovery"};if(!body.signal?.entityId)return NextResponse.json({error:"invalid signal"},{status:400});appendLearnerSignal({...body.signal,studentId:u.id,source:body.source||"structure_discovery"});return NextResponse.json({ok:true});}
