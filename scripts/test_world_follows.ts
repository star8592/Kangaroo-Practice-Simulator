import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

async function main(){
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-world-follows-"));
process.env.SOCTHINK_USER_DATA_DIR=temp;
try{
  const {createMiniappWechatSessionToken,createGuestSessionToken} = await import("../src/lib/auth");
  const {GET,PATCH}=await import("../src/app/api/competition-follow/route");
  const {GET:world}=await import("../src/app/api/miniapp/world-competitions/route");
  const {buildWorldFollowedCalendar}=await import("../src/lib/world-followed-calendar");
  const {matchesWorldReferenceStage,WORLD_COMPETITIONS}=await import("../src/lib/world-competitions");
  const tokenA=createMiniappWechatSessionToken("test_world_follows_A");
  const tokenB=createMiniappWechatSessionToken("test_world_follows_B");
  const guest=createGuestSessionToken();
  const req=(path:string,token?:string)=>new NextRequest("http://localhost"+path,{
    headers:token?{authorization:"Bearer "+token}:{},
  });
  const patch=(token:string|undefined,b:unknown,contentType="application/json")=>
    new NextRequest("http://localhost/api/competition-follow",{
      method:"PATCH",headers:{...token?{authorization:"Bearer "+token}:{}, "content-type":contentType},
      body:JSON.stringify(b),
    });
  assert.equal((await GET(req("/api/competition-follow"))).status,401,"anonymous follow read is denied");
  assert.equal((await PATCH(patch(undefined,{eventId:"ukmt",following:true}))).status,401,"anonymous cannot save");
  assert.equal((await GET(req("/api/competition-follow",guest))).status,401,"guest pseudo-student cannot persist");
  assert.equal((await PATCH(patch(guest,{eventId:"ukmt",following:true}))).status,401,"guest write blocked");
  assert.equal((await PATCH(patch(tokenA,{eventId:"fake-event",following:true}))).status,400);
  assert.equal((await PATCH(patch(tokenA,{eventId:"ukmt",following:"true"}))).status,400);
  assert.equal((await PATCH(patch(tokenA,{eventId:"ukmt",following:true},"text/plain"))).status,415);
  assert.equal((await GET(req("/api/competition-follow",tokenA))).status,200);

  assert.equal((await PATCH(patch(tokenA,{eventId:"ukmt",following:true}))).status,200);
  assert.equal((await PATCH(patch(tokenA,{eventId:"ukmt",following:true}))).status,200,"idempotent follow");
  assert.equal((await PATCH(patch(tokenA,{eventId:"huabei",following:true}))).status,200);
  const a=await (await GET(req("/api/competition-follow",tokenA))).json();
  const b=await (await GET(req("/api/competition-follow",tokenB))).json();
  assert.deepEqual(a.followedEventIds,["ukmt","huabei"]);
  assert.deepEqual(b.followedEventIds,[],"cross-student follows isolation");
  const publicWorld=await (await world(req("/api/miniapp/world-competitions"))).json();
  assert.equal(publicWorld.entries.every((x:{following:unknown})=>x.following===null),true);
  const studentWorld=await (await world(req("/api/miniapp/world-competitions",tokenA))).json();
  assert.deepEqual(studentWorld.entries.filter((x:{following:boolean})=>x.following).map((x:{event:{id:string}})=>x.event.id),["huabei","ukmt"]);
  const userId=fs.readFileSync(path.join(temp,"session-secret.txt"),"utf8").length>0;assert.ok(userId);
  const stored=JSON.parse(fs.readFileSync(path.join(temp,"world-competition-follows.json"),"utf8"));
  assert.equal(stored.length,2,"duplicate follows do not create duplicate records");
  const calendar=buildWorldFollowedCalendar(stored[0].userId,"2026-10-09");
  assert.equal(calendar.length,2);
  assert.equal(calendar.filter(x=>x.nextTaskZh).length,2,"both have meaningful next actions");
  assert.equal(calendar.find(x=>x.eventId==="huabei")?.registrationVerified,false);
  assert.equal(WORLD_COMPETITIONS.length,10);
  assert.equal(matchesWorldReferenceStage(WORLD_COMPETITIONS.find(x=>x.id==="cmo")!,"primary"),false);
  assert.equal(matchesWorldReferenceStage(WORLD_COMPETITIONS.find(x=>x.id==="xiwang")!,"primary"),true,"unknown scope remains visible");
  assert.equal((await PATCH(patch(tokenA,{eventId:"ukmt",following:false}))).status,200);
  assert.equal((await PATCH(patch(tokenA,{eventId:"ukmt",following:false}))).status,200,"idempotent unfollow");
  const final=await (await GET(req("/api/competition-follow",tokenA))).json();
  assert.deepEqual(final.followedEventIds,["huabei"]);
  console.log("WORLD_FOLLOWS_PASS auth=6 isolation=PASS idempotency=PASS calendar=PASS stage_filter=PASS api=PASS");
}finally{fs.rmSync(temp,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e);process.exitCode=1});
