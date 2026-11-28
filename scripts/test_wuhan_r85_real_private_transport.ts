import assert from "node:assert/strict";
import {spawn,execFileSync} from "node:child_process";
import {createHash,randomBytes} from "node:crypto";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {scorePrivatePractice} from "../src/lib/wuhan-private-practice-transport";
async function main(){
 const root=process.env.WUHAN_ACCENT_RESEARCH_ROOT;
 if(!root||!path.isAbsolute(root))throw Error("explicit AccentLab candidate checkout required");
 const h=createHash("sha256");
 for(const f of ["src/wuhan_oral_grade.rs","scripts/evidence_lab/wuhan_oral_audio_worker.py","content/wuhan-2027/machine-semantic-r78.json","content/wuhan-2027/oral-rubric-v1.json"]){
  const b=readFileSync(path.join(root,f)),n=Buffer.alloc(8);n.writeBigUInt64BE(BigInt(b.length));h.update(n).update(b);
 }
 const revision=h.digest("hex"),dir=mkdtempSync(path.join(tmpdir(),"wh-r85-client-"));
 const key=randomBytes(32),keyfile=path.join(dir,"key");
 writeFileSync(keyfile,key.toString("hex"),{mode:0o600,flag:"wx"});
 const p=spawn(path.join(root,"target/debug/examples/wuhan-private-practice-rpc"),[],{cwd:root,env:{...process.env,WUHAN_PRIVATE_PRACTICE_ENABLED:"1",WUHAN_PRIVATE_PRACTICE_KEY_FILE:keyfile},stdio:["ignore","pipe","ignore"]});
 try{
  const origin=await new Promise<string>((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error("RPC did not start")),10000);
   p.once("error",reject);p.once("exit",()=>reject(Error("RPC exited")));
   let output="";p.stdout.on("data",b=>{output+=String(b);const m=/WUHAN_PRIVATE_LISTEN=(http:\/\/127\.0\.0\.1:\d+)/.exec(output);if(m){clearTimeout(timer);resolve(m[1]!)}})
  });
  const wav=path.join(dir,"correct.wav");execFileSync("espeak-ng",["-v","en-us","-s","145","-w",wav,"Eighteen pounds."]);
  const result=await scorePrivatePractice({origin,key,revision},"WH01","answer-gift-budget","audio/wav",readFileSync(wav));
  assert.equal((result.result as {status:string}).status,"reference_match");
  assert.equal(result.billable,false);assert.equal(result.official_score,false);
  console.log("R85_REAL_NODE_TO_RUST_AUDIO_PASS reference_match; exact revision; no billing");
 }finally{p.kill();await new Promise<void>(r=>{if(p.exitCode!==null||p.signalCode!==null)r();else p.once("exit",()=>r())});rmSync(dir,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e);process.exit(1)});
