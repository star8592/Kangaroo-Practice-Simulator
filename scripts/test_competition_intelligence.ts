import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";
import type {EvidenceEdition} from "../src/lib/competition-intelligence";
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-intelligence-"));
process.env.SOCTHINK_USER_DATA_DIR=dir;

const day=(offset:number)=>{
  const d=new Date(Date.UTC(2026,9,9)+offset*86400000);
  return d.toISOString().slice(0,10);
};
async function run(){
try{
  const intelligence=await import("../src/lib/competition-intelligence");
  const {GET,PATCH}=await import("../src/app/api/competition-intelligence/route");
  const {createMiniappWechatSessionToken,createGuestSessionToken}=await import("../src/lib/auth");
  const {setWorldCompetitionFollow}=await import("../src/lib/world-competition-follows");
  const {getParticipationRegion}=await import("../src/lib/competition-intelligence-preferences");
  const {trustedAcademicMilestones}=await import("../src/lib/academic-events/trusted-milestones");
  const {buildStudentAttention}=await import("../src/lib/academic-events/student-attention");
  const {getWorldCompetitionFollows}=await import("../src/lib/world-competition-follows");
  const {userFromSessionToken}=await import("../src/lib/auth");
  const {setStudentEnrollment}=await import("../src/lib/academic-events/enrollment-store");
  const edition:EvidenceEdition={
    id:"ukmt-g1-gb-2026",eventId:"ukmt",sessionId:"ukmt-gb-2026-test",season:2026,region:"GB",
    titleZh:"英国 UKMT 赛区测试赛事",sourceUrl:"https://example.com/verified-fake-test",
    sourceAuthority:"organizer",verifiedBy:"QA verifier",verifiedAt:day(0),
    validThrough:day(60),verification:"verified",minGrade:5,maxGrade:12,
    milestones:[
      {id:"registration",kind:"registration-deadline",date:day(5),titleZh:"报名截止"},
      {id:"exam",kind:"exam",date:day(10),titleZh:"考试"},
    ],
  };
  assert.equal(intelligence.validateEvidenceEdition(edition),true);
  const rawRegistry=JSON.parse(fs.readFileSync(path.join(process.cwd(),"data/competition-intelligence/verified-editions.json"),"utf8")) as unknown[];
  assert.equal(intelligence.invalidEvidenceCount(rawRegistry),0,"invalid reviewed edition must fail release gate");
  assert.equal(new Set(intelligence.VERIFIED_EDITIONS.map(x=>x.id)).size,intelligence.VERIFIED_EDITIONS.length,"duplicate review identity");
  assert.equal(intelligence.VERIFIED_EDITIONS.length,1,"one reviewed MAA official US session");
  const liveEdition=intelligence.VERIFIED_EDITIONS[0];
  assert.equal(liveEdition.sourceUrl,"https://maa.org/amcreg/");
  assert.equal(liveEdition.milestones[0].audience,"competition-manager");
  const managerNotices=intelligence.deriveVerifiedNotices({
    editions:intelligence.VERIFIED_EDITIONS,followedEventIds:["maa-amc"],
    participationRegion:"US",grade:9,registeredSessionIds:[],today:day(0),
  });
  assert.equal(managerNotices.length,2);
  assert.equal(managerNotices[0].priority,"P3","manager notices must not be urgent personal deadlines");
  assert.ok(managerNotices[0].detailZh.includes("并非学生个人报名截止"));
  assert.equal(intelligence.deriveVerifiedNotices({
    editions:intelligence.VERIFIED_EDITIONS,followedEventIds:["maa-amc"],
    participationRegion:"CN",grade:9,registeredSessionIds:[],today:day(0),
  }).length,0,"US registration cannot trigger for China");
  for(const invalid of [
    {...edition,verification:"raw"}, {...edition,sourceUrl:"http://example.com"},
    {...edition,region:"CN-invalid"}, {...edition,verifiedBy:""}, 
    {...edition,validThrough:day(-1)}, {...edition,validThrough:day(190)},
    {...edition,milestones:[{...edition.milestones[0],date:"2026-02-30"}]},
    {...edition,milestones:[edition.milestones[0],edition.milestones[0]]},
  ])assert.equal(intelligence.validateEvidenceEdition(invalid),false);
  const mk=(changes:Partial<Parameters<typeof intelligence.deriveVerifiedNotices>[0]>={})=>
    intelligence.deriveVerifiedNotices({
      editions:[edition],followedEventIds:["ukmt"],participationRegion:"GB",
      grade:7,registeredSessionIds:[],today:day(0),...changes,
    });
  assert.equal(mk().length,1,"not enrolled: no exam alert");
  assert.equal(mk()[0].priority,"P1");
  assert.equal(mk()[0].sourceUrl,edition.sourceUrl);
  assert.equal(mk({registeredSessionIds:["ukmt-gb-2026-test"]}).length,2);
  assert.equal(mk({participationRegion:null}).length,0);
  assert.equal(mk({participationRegion:"CN"}).length,0);
  assert.equal(mk({followedEventIds:[]}).length,0);
  assert.equal(mk({grade:2}).length,0);
  assert.equal(mk({today:day(62)}).length,0);
  assert.equal(mk({today:day(1)}).length,1);
  assert.equal(mk({today:day(6),registeredSessionIds:["ukmt-gb-2026-test"]}).length,1);
  assert.equal(mk({editions:[edition,edition]}).length,1,"dedup");
  assert.deepEqual(trustedAcademicMilestones(day(0)),[],"raw school list cannot produce dated reminders");
  const tokenA=createMiniappWechatSessionToken("intelligence-test-a");
  const tokenB=createMiniappWechatSessionToken("intelligence-test-b");
  const tokenGuest=createGuestSessionToken();
  const req=(token?:string)=>new NextRequest("http://localhost/api/competition-intelligence",{
    headers:token?{authorization:"Bearer "+token}:{},
  });
  const patch=(token:string|undefined,body:unknown)=>
    new NextRequest("http://localhost/api/competition-intelligence",{
      method:"PATCH",headers:{"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{})},
      body:JSON.stringify(body),
    });
  assert.equal((await GET(req())).status,401);
  assert.equal((await PATCH(patch(undefined,{region:"GB"}))).status,401);
  assert.equal((await GET(req(tokenGuest))).status,401);
  assert.equal((await PATCH(patch(tokenGuest,{region:"GB"}))).status,401);
  assert.equal((await PATCH(patch(tokenA,{region:"XX"}))).status,400);
  assert.equal((await PATCH(patch(tokenA,{region:7}))).status,400);
  assert.equal((await PATCH(patch(tokenA,{}))).status,400);
  assert.equal((await PATCH(patch(tokenA,{region:"GB"}))).status,200);
  const a=await (await GET(req(tokenA))).json();
  const b=await (await GET(req(tokenB))).json();
  assert.equal(a.region,"GB");assert.equal(b.region,null,"cross-account region isolation");
  assert.deepEqual(a.notices,[],"following none means no notices");
  const idA=userFromSessionToken(tokenA)!.id;
  setWorldCompetitionFollow(idA,"ukmt",true);
  const aFollow=await (await GET(req(tokenA))).json();
  assert.equal(aFollow.followedCount,1);
  assert.equal(getWorldCompetitionFollows(idA).length,1);
  assert.equal(getParticipationRegion(idA),"GB");
  assert.equal((await PATCH(patch(tokenA,{region:null}))).status,200);
  assert.equal(getParticipationRegion(idA),null);
  assert.equal(buildStudentAttention({id:idA,grade:6},day(0)).doNow,null,"legacy source cannot drive student homepage");
  // A historical enrollment created from a raw school source must not expose its dates.
  setStudentEnrollment(idA,"au-amc-cn-2026","interested","student");
  const {buildAcademicCalendar}=await import("../src/lib/academic-events/calendar");
  const calendar=buildAcademicCalendar({id:idA,grade:6},day(0));
  assert.equal(calendar.length,1);
  assert.deepEqual(calendar[0].milestones,[],"raw imported dates hidden in student calendar");
  console.log("COMPETITION_INTELLIGENCE_PASS trust_gate=PASS anonymous=401 isolated=PASS region=PASS reminder_scoping=PASS legacy_raw_hidden=PASS");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
run().catch(e=>{console.error(e);process.exitCode=1});
