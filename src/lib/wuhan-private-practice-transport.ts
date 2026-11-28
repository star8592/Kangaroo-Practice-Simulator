// Private Node-only transport. No browser route or account authorization.
// The calling server must authorize the learner and their recording first.
import {createHmac,randomBytes} from "node:crypto";
import {request} from "node:http";
import contract from "../../backend/socthink-core/src/wuhan-research-report-contract.json";
type Obj=Record<string,unknown>;
const obj=(v:unknown):Obj=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Obj:{};
const HEX64=/^[a-f0-9]{64}$/;
export class PrivatePracticeError extends Error{
 constructor(public readonly status:number,message:string){super(message)}
}
type Settings={origin:string;key:Buffer;revision:string};
const fail=()=>new PrivatePracticeError(502,"评分服务返回无效证据");
export function signPracticeAudio(key:Buffer,fields:readonly (string|Buffer)[],batch=false):string{
 const mac=createHmac("sha256",key).update(batch?"wuhan-private-batch-v1\0":"wuhan-private-practice-v1\0");
 for(const v of fields){
  const b=typeof v==="string"?Buffer.from(v):v,n=Buffer.alloc(8);
  // All fields are bounded under 2MiB; encode uint64 in big endian.
  n.writeUInt32BE(b.length,4);mac.update(n).update(b);
 }
 return mac.digest("hex");
}
function validSettings(settings:Settings){
 const port=/^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(settings.origin);
 if(!port||Number(port[1])>65535||settings.key.length!==32||!HEX64.test(settings.revision))throw new PrivatePracticeError(503,"私有评分服务尚未配置");
 return Number(port[1]);
}
function taskDefinition(paper:string,task:string,mime:string,audio:Uint8Array){
 const definition=contract.papers.find(p=>p.paperId===paper)?.tasks.find(t=>t.taskId===task);
 if(!definition||!["answer","read","retell"].includes(definition.kind))throw new PrivatePracticeError(404,"未知口语题目");
 if(!["audio/wav","audio/webm","audio/ogg","audio/mp4"].includes(mime))throw new PrivatePracticeError(415,"录音格式不支持");
 if(audio.byteLength>2*1024*1024)throw new PrivatePracticeError(413,"录音超过2MB");
 return definition;
}
async function signedRequest(port:number,route:string,mime:string,bytes:Buffer,nonce:string,ts:string,signature:string,deadlineMs:number,maxResponse:number){
 return new Promise<unknown>((resolve,reject)=>{
  const req=request({hostname:"127.0.0.1",port,method:"POST",
   path:route,
   headers:{Host:"wuhan-private.internal","Content-Type":mime,"Content-Length":bytes.length,
    "x-wuhan-time":ts,"x-wuhan-nonce":nonce,"x-wuhan-signature":signature}},res=>{
   if(res.statusCode!==200){res.resume();reject(new PrivatePracticeError(res.statusCode===429?429:502,res.statusCode===429?"评分服务繁忙，请稍后重练":"评分服务暂不可用"));return}
   if(res.headers["cache-control"]!=="no-store"){res.destroy();reject(fail());return}
   let size=0;const chunks:Buffer[]=[];
   res.on("data",(b:Buffer)=>{size+=b.length;if(size>maxResponse){res.destroy();reject(fail())}else chunks.push(b)});
   res.on("error",()=>reject(fail()));
   res.on("end",()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")))}catch{reject(fail())}});
  });
  const timer=setTimeout(()=>req.destroy(new PrivatePracticeError(504,"评分超时，请重试")),deadlineMs);
  req.on("close",()=>clearTimeout(timer));req.on("error",e=>reject(e instanceof PrivatePracticeError?e:new PrivatePracticeError(502,"评分服务连接失败")));req.end(bytes);
 });
}
function validateResult(value:unknown,definition:{kind:string},paper:string,task:string,nonce:string,revision:string){
 const r=obj(value),scope=obj(r.scope);
 if(scope.attempt_id!==nonce||scope.paper_id!==paper||scope.task_id!==task||typeof scope.audio_sha256!=="string"||!HEX64.test(scope.audio_sha256))throw fail();
 if(definition.kind==="read"){
  const d=obj(r.diagnosis);
  if(d.official_score!==false||d.pronunciation_score!==null||!["unanswered","needs_review","reference_text_matched","reference_text_differs","asr_disagreement"].includes(String(d.status)))throw fail();
 }else{
  if(r.official_score!==false||r.reference_content_score!==null||r.machine_rule_revision!==revision||!["unanswered","needs_review","reference_match","known_mismatch","partial_reference"].includes(String(r.status)))throw fail();
  if(definition.kind==="answer"){
   const p=obj(r.practice_content),s=r.status;
   const expected=s==="reference_match"?[1,"automatic_content_match"]:s==="known_mismatch"?[0,"automatic_known_mismatch"]:s==="unanswered"?[0,"no_answer_audio"]:null;
   if(s==="partial_reference"||(expected?(p.earned!==expected[0]||p.possible!==1||p.basis!==expected[1]||Object.keys(p).length!==3):r.practice_content!==null))throw fail();
  }else if(r.practice_content!==null)throw fail();
 }
}
export async function scorePrivatePractice(settings:Settings,paper:string,task:string,mime:string,audio:Uint8Array):Promise<Obj>{
 const port=validSettings(settings),definition=taskDefinition(paper,task,mime,audio);
 const bytes=Buffer.from(audio),nonce=randomBytes(16).toString("hex"),ts=String(Math.floor(Date.now()/1000));
 const signature=signPracticeAudio(settings.key,[paper,task,ts,nonce,mime,bytes]);
 const envelope=obj(await signedRequest(port,"/internal/practice/"+encodeURIComponent(paper)+"/"+encodeURIComponent(task),mime,bytes,nonce,ts,signature,125000,128*1024));
 if(envelope.scope!=="practice_candidate_only"||envelope.billable!==false||envelope.official_score!==false||envelope.request_nonce!==nonce||envelope.machine_rule_revision!==settings.revision)throw fail();
 validateResult(envelope.result,definition,paper,task,nonce,settings.revision);
 return envelope;
}
export type PracticeBatchItem={paper:string;task:string;mime:string;audio:Uint8Array};
export async function scorePrivateBatch(settings:Settings,items:readonly PracticeBatchItem[]):Promise<Obj>{
 const port=validSettings(settings);
 if(items.length<1||items.length>6)throw new PrivatePracticeError(400,"单批须为1至6段录音");
 const prepared=items.map(x=>({definition:taskDefinition(x.paper,x.task,x.mime,x.audio),row:{paper:x.paper,task:x.task,mime:x.mime,attempt:randomBytes(16).toString("hex"),audio_b64:Buffer.from(x.audio).toString("base64")}}));
 const bytes=Buffer.from(JSON.stringify(prepared.map(x=>x.row))),nonce=randomBytes(16).toString("hex"),ts=String(Math.floor(Date.now()/1000)),mime="application/json";
 const signature=signPracticeAudio(settings.key,["batch","v1",ts,nonce,mime,bytes],true);
 const envelope=obj(await signedRequest(port,"/internal/practice-batch",mime,bytes,nonce,ts,signature,225000,6*128*1024));
 if(envelope.scope!=="practice_batch_candidate_only"||envelope.billable!==false||envelope.official_score!==false||envelope.request_nonce!==nonce||envelope.machine_rule_revision!==settings.revision||!Array.isArray(envelope.results)||envelope.results.length!==prepared.length)throw fail();
 prepared.forEach(({row,definition},i)=>validateResult((envelope.results as unknown[])[i],definition,row.paper,row.task,row.attempt,settings.revision));
 return envelope;
}
