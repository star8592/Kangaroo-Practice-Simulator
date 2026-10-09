import {NextRequest,NextResponse} from "next/server";
import {userFromRequest} from "@/lib/auth";
import {canFollowWorldCompetitions} from "@/lib/world-competition-follows";
import {buildStudentIntelligence} from "@/lib/competition-intelligence-student";
import {PARTICIPATION_REGIONS,type ParticipationRegion} from "@/lib/competition-intelligence";
import {setParticipationRegion} from "@/lib/competition-intelligence-preferences";

const headers={"Cache-Control":"private, no-store"};
function todayChina(){return new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Shanghai"});}
export async function GET(req:NextRequest){
  const student=userFromRequest(req);
  if(!canFollowWorldCompetitions(student))
    return NextResponse.json({error:"student login required"},{status:401,headers});
  return NextResponse.json(buildStudentIntelligence(student!,todayChina()),{headers});
}
export async function PATCH(req:NextRequest){
  const student=userFromRequest(req);
  if(!canFollowWorldCompetitions(student))
    return NextResponse.json({error:"student login required"},{status:401,headers});
  if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return NextResponse.json({error:"JSON required"},{status:415,headers});
  try {
    const body=await req.json();
    if(!body||typeof body!=="object"||!("region" in body)||
      (body.region!==null&&!PARTICIPATION_REGIONS.includes(body.region as ParticipationRegion)))
      return NextResponse.json({error:"invalid participation region"},{status:400,headers});
    setParticipationRegion(student!.id,body.region as ParticipationRegion|null);
    return NextResponse.json(buildStudentIntelligence(student!,todayChina()),{headers});
  }catch{return NextResponse.json({error:"invalid request"},{status:400,headers});}
}
