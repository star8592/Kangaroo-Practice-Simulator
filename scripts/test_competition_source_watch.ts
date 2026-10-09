import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";
async function main(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"world-source-watch-test-"));
  process.env.SOCTHINK_USER_DATA_DIR=temp;
  process.env.SOCTHINK_SOURCE_WATCH_DIR=path.join(temp,"source-watch");
  try{
    const w=await import("../src/lib/competition-source-watch");
    const auth=await import("../src/lib/auth");
    const adminApi=await import("../src/app/api/admin/competition-source-watch/route");
    const {VERIFIED_EDITIONS}=await import("../src/lib/competition-intelligence");
    const source=w.WATCH_SOURCES[0];
    assert.equal(w.WATCH_SOURCES.length,5);
    assert.equal(new Set(w.WATCH_SOURCES.map(s=>s.id)).size,5);
    assert.equal(w.WATCH_SOURCES.filter(s=>s.region==="CN").length,1);
    assert.equal(w.validateWatchSource({...source,url:"http://127.0.0.1/admin"}),false);
    assert.equal(w.validateWatchSource({...source,url:"https://example.com/"}),false);
    assert.equal(w.validateWatchSource({...source,url:"https://maa.org@127.0.0.1/internal"}),false);
    const makeHtml=(date:string)=>"<html><body><main><h2>2026-27 MAA AMC Dates</h2>"+
      "<p>AMC 12 A Competition Date November "+date+" 2026. "+
      "Regular Registration Deadline October 15 2026 for competition managers only. "+
      "We will run math contests and official registration during this season.</p></main></body></html>";
    const response=(html:string,status=200)=>new Response(status===304||status===302?null:html,{
      status,headers:{"content-type":"text/html","etag":'"v1"'},
    });
    const fake=(body:string,status=200)=>(async()=>response(body,status));
    const first=await w.runSourceWatch({sources:[source],fetcher:fake(makeHtml("05")),now:new Date("2026-10-09T12:00:00Z")});
    assert.equal(fs.existsSync(path.join(temp,"source-watch","competition-source-watch.json")),true,
      "source monitor state must not live in the broad student-data root");
    assert.equal(first.newObservations,1);
    assert.equal(first.pending,1);
    assert.equal(first.errors,0);
    const original=w.loadWatchStore().observations[0];
    assert.equal(original.previousDigest,null);
    assert.equal(original.status,"pending");
    assert.ok(original.summary.includes("competition managers"));
    assert.equal(w.loadWatchStore().health[0].digest?.length,64);
    const equal=await w.runSourceWatch({sources:[source],fetcher:fake(makeHtml("05"))});
    assert.equal(equal.newObservations,0);
    assert.equal(equal.unchanged,1);
    assert.equal(w.loadWatchStore().observations.length,1);
    const notModified=await w.runSourceWatch({sources:[source],fetcher:fake("",304)});
    assert.equal(notModified.unchanged,1);
    const modified=await w.runSourceWatch({sources:[source],fetcher:fake(makeHtml("06"))});
    assert.equal(modified.newObservations,1);
    assert.equal(modified.pending,2);
    assert.equal(w.loadWatchStore().observations.length,2);
    const broken=await w.runSourceWatch({sources:[source],fetcher:fake("",302)});
    assert.equal(broken.errors,1);
    assert.equal(w.loadWatchStore().observations.length,2);
    const latest=w.loadWatchStore().observations[1];
    assert.equal(w.loadWatchStore().health[0].digest,latest.digest,"failed fetch cannot erase evidence");
    const errorHtml=await w.runSourceWatch({sources:[source],fetcher:fake("<html><body>access denied</body></html>")});
    assert.equal(errorHtml.errors,1,"failed anchor cannot create alert");
    const huge=await w.runSourceWatch({sources:[source],fetcher:fake("2026-27 MAA AMC Dates"+ "x".repeat(900_000))});
    assert.equal(huge.errors,1,"oversize rejected");
    assert.equal(w.loadWatchStore().observations.length,2);
    const anonymously=new NextRequest("http://localhost/api/admin/competition-source-watch");
    assert.equal((await adminApi.GET(anonymously)).status,403);
    assert.equal((await adminApi.PATCH(new NextRequest(anonymously.url,{
      method:"PATCH",headers:{"content-type":"application/json","origin":"http://localhost"},
      body:JSON.stringify({id:original.id,decision:"reviewed",note:"checked source"}),
    }))).status,403);
    const user=auth.createAdmin({username:"source_watch_test_admin",name:"Source QA",pin:"123456"});
    const token=auth.createSessionToken(user.id);
    const req=(method:"GET"|"PATCH",body?:unknown,origin="http://localhost")=>
      new NextRequest("http://localhost/api/admin/competition-source-watch",{
        method,headers:{"cookie":auth.SESSION_COOKIE+"="+token,
          ...(method==="PATCH"?{"origin":origin,"content-type":"application/json"}:{})},
        ...(method==="PATCH"?{body:JSON.stringify(body)}:{}),
      });
    assert.equal((await adminApi.GET(req("GET"))).status,200);
    assert.equal((await adminApi.PATCH(req("PATCH",{id:original.id,decision:"reviewed",note:"reviewed official evidence, no dates promoted"},"https://other.example"))).status,403);
    assert.equal((await adminApi.PATCH(req("PATCH",{id:original.id,decision:"reviewed",note:"reviewed official evidence, no dates promoted"}))).status,200);
    assert.equal((await adminApi.PATCH(req("PATCH",{id:original.id,decision:"reviewed",note:"repeat decision"}))).status,409);
    const reviewed=w.loadWatchStore().observations.find(x=>x.id===original.id)!;
    assert.equal(reviewed.status,"reviewed");
    assert.equal(reviewed.reviewedBy,user.id);
    assert.equal((await adminApi.PATCH(req("PATCH",{id:latest.id,decision:"dismissed",note:"page layout only"}))).status,200);
    const postReview=await adminApi.GET(req("GET"));
    assert.equal(postReview.status,200);
    const history=(await postReview.json()).history;
    assert.equal(history.length,2);
    assert.equal(history[0].reviewNote,"page layout only");
    assert.equal(VERIFIED_EDITIONS.length,1,"review queue does not change official registry");
    const app=await import("../src/lib/competition-intelligence");
    assert.equal(app.VERIFIED_EDITIONS[0].milestones[0].date,"2026-10-15");
    console.log("COMPETITION_SOURCE_WATCH_PASS sources=5 baseline=PASS dedup=PASS change=PASS redirects=BLOCKED size=BLOCKED admin=PASS review=PASS no_auto_promotion=PASS");
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
