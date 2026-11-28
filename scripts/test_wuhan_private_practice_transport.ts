import assert from "node:assert/strict";
import {createServer} from "node:http";
import {createHmac} from "node:crypto";
import {scorePrivatePractice,PrivatePracticeError} from "../src/lib/wuhan-private-practice-transport";
async function main(){
 const key=Buffer.alloc(32,11),revision="a".repeat(64);let scenario="valid",calls=0;
 const server=createServer(async(req,res)=>{
  calls++;const chunks:Buffer[]=[];for await(const b of req)chunks.push(Buffer.from(b));const bytes=Buffer.concat(chunks);
  const nonce=String(req.headers["x-wuhan-nonce"]),ts=String(req.headers["x-wuhan-time"]);
  assert.equal(req.headers.host,"wuhan-private.internal");assert.equal(req.url,"/internal/practice/WH01/answer-gift-budget");assert.equal(req.headers.cookie,undefined);
  const mac=createHmac("sha256",key).update("wuhan-private-practice-v1\0");
  for(const x of ["WH01","answer-gift-budget",ts,nonce,"audio/wav",bytes]){
   const b=Buffer.from(x),n=Buffer.alloc(8);n.writeBigUInt64BE(BigInt(b.length));mac.update(n).update(b);
  }
  assert.equal(req.headers["x-wuhan-signature"],mac.digest("hex"));
  if(scenario==="busy"){res.writeHead(429).end();return}
  const body={scope:"practice_candidate_only",billable:false,official_score:false,request_nonce:nonce,machine_rule_revision:revision,result:{scope:{attempt_id:nonce,paper_id:"WH01",task_id:"answer-gift-budget",audio_sha256:"b".repeat(64)},status:"reference_match",official_score:false,reference_content_score:null,machine_rule_revision:revision,practice_content:{earned:1,possible:1,basis:"automatic_content_match"}}};
  if(scenario==="wrong_nonce")body.request_nonce="c".repeat(32);
  if(scenario==="wrong_revision")body.machine_rule_revision="d".repeat(64);
  if(scenario==="official")body.official_score=true;
  if(scenario==="wrong_task")body.result.scope.task_id="another";
  if(scenario==="false_points")body.result.practice_content.earned=100;
  res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));
 });
 await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));
 try{
  const addr=server.address();assert.ok(addr&&typeof addr!=="string");
  const settings={origin:"http://127.0.0.1:"+addr.port,key,revision};
  const audio=Buffer.from("synthetic audio fixture");
  const run=()=>scorePrivatePractice(settings,"WH01","answer-gift-budget","audio/wav",audio);
  assert.equal((await run()).official_score,false);
  for(const s of ["wrong_nonce","wrong_revision","official","wrong_task","false_points","busy"]){
   scenario=s;await assert.rejects(run(),(e:unknown)=>e instanceof PrivatePracticeError&&e.status===(s==="busy"?429:502));
  }
  const before=calls;
  for(const invalid of ["http://localhost:123","https://127.0.0.1:123","http://127.0.0.1:123/","http://127.0.0.1:123@evil.test","http://127.0.0.1:99999"]){
   await assert.rejects(scorePrivatePractice({...settings,origin:invalid},"WH01","answer-gift-budget","audio/wav",audio));
  }
  await assert.rejects(scorePrivatePractice(settings,"WH01","not-in-bank","audio/wav",audio));
  await assert.rejects(scorePrivatePractice(settings,"WH01","answer-gift-budget","audio/wav",Buffer.alloc(2*1024*1024+1)));
  assert.equal(calls,before);
  console.log("R85_PRIVATE_TRANSPORT_PASS valid signed bytes; 6 invalid responses; 7 local invalid requests");
 }finally{server.close()}
}
main().catch(e=>{console.error(e);process.exit(1)});
