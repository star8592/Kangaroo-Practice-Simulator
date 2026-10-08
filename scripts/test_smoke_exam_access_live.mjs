import assert from "node:assert/strict";
import {createServer} from "node:http";
import {test} from "node:test";
import {verifyExamAccess} from "./smoke_exam_access_live.mjs";

const EXAM_ID="maa-amc12-practice-geometry";
const LOGIN="/login?next=%2Fexam%2F"+EXAM_ID;
async function scenario({broken=false}={}) {
  const server=createServer((req,res)=>{
    const url=new URL(req.url||"/","http://localhost");
    const write=(status,body="",headers={})=>{res.writeHead(status,headers);res.end(body)};
    const json=(body)=>write(200,JSON.stringify(body),{"Content-Type":"application/json"});
    if(url.pathname==="/api/release")return json({ok:true,deployedSha:"TEST",gitSha:"TEST"});
    if(url.pathname==="/competitions")return write(200,"catalogue");
    if(url.pathname==="/arithmetic")return write(307,"",{location:"/api/auth/guest/start?next=/arithmetic"});
    if(url.pathname==="/exam/"+EXAM_ID)return write(broken?200:307,"",broken?{}:{location:LOGIN});
    if(url.pathname==="/api/auth/guest/start"){
      const next=url.searchParams.get("next");
      if(next==="/exam/"+EXAM_ID)return write(307,"",{location:LOGIN});
      return write(307,"",{location:"/arithmetic","set-cookie":"kangaroo_session=fixture; HttpOnly; Path=/"});
    }
    if(url.pathname==="/api/auth/miniapp/guest")return json({accessToken:"fixture-token-not-real"});
    if(url.pathname==="/api/miniapp/exams")return json({exams:[]});
    if(url.pathname.startsWith("/api/exams/")||url.pathname==="/api/exam-sessions"||url.pathname==="/api/grade")
      return write(401,"{}",{"content-type":"application/json"});
    return write(404);
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const addr=server.address();
  assert.ok(addr&&typeof addr!=="string");
  return {base:"http://127.0.0.1:"+addr.port,close:()=>new Promise(resolve=>server.close(resolve))};
}

test("signed web and miniapp guests are denied every full exam route",async()=>{
  const s=await scenario();
  try {
    const r=await verifyExamAccess(s.base,{expectedSha:"TEST"});
    assert.equal(r.webGuestDenied,5);
    assert.equal(r.miniappGuestDenied,5);
    assert.equal(r.anonymousDenied,5);
  } finally {await s.close();}
});

test("a single broken full-exam HTTP guard fails the release gate",async()=>{
  const s=await scenario({broken:true});
  try {await assert.rejects(()=>verifyExamAccess(s.base,{expectedSha:"TEST"}));}
  finally {await s.close();}
});

test("a mismatched release SHA fails closed",async()=>{
  const s=await scenario();
  try {await assert.rejects(()=>verifyExamAccess(s.base,{expectedSha:"WRONG"}));}
  finally {await s.close();}
});
