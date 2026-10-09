import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { canFollowWorldCompetitions, getWorldCompetitionFollows, setWorldCompetitionFollow } from "@/lib/world-competition-follows";
import { WORLD_COMPETITIONS } from "@/lib/world-competitions";

const noStore = {"Cache-Control":"private, no-store"};
export async function GET(req:NextRequest){
  const user=userFromRequest(req);
  if(!canFollowWorldCompetitions(user)) return NextResponse.json({error:"student login required"},{status:401,headers:noStore});
  return NextResponse.json({
    followedEventIds:getWorldCompetitionFollows(user!.id).map(x=>x.eventId)
  },{headers:noStore});
}
export async function PATCH(req:NextRequest){
  const user=userFromRequest(req);
  if(!canFollowWorldCompetitions(user)) return NextResponse.json({error:"student login required"},{status:401,headers:noStore});
  if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return NextResponse.json({error:"JSON required"},{status:415,headers:noStore});
  try{
    const b=await req.json();
    if(typeof b?.eventId!=="string"||typeof b?.following!=="boolean"||!WORLD_COMPETITIONS.some(x=>x.id===b.eventId))
      return NextResponse.json({error:"invalid event or following state"},{status:400,headers:noStore});
    return NextResponse.json(
      setWorldCompetitionFollow(user!.id,b.eventId,b.following),
      {headers:noStore}
    );
  }catch{return NextResponse.json({error:"invalid request"},{status:400,headers:noStore})}
}
