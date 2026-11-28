// Internal candidate. Dedicated encryption key, never a browser bundle.
import {createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
import {prepareScoringSubmission,type ScoringSubmission} from "./wuhan-scoring-job";
const domain="wuhan-stage-v1";
function aad(owner:string,attempt:string,manifest:string){
 if(!/^par_[a-f0-9]{16,48}$/.test(owner)||!/^[a-f0-9]{32}$/.test(attempt)||!/^[a-f0-9]{64}$/.test(manifest))throw Error("invalid stage binding");
 return Buffer.from([domain,owner,attempt,manifest].join("\0"));
}
export function sealScoringStage(owner:string,s:ScoringSubmission,key:Buffer){
 if(key.length!==32)throw Error("stage key unavailable");
 const manifest=prepareScoringSubmission(s).manifestSha256;
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv);
 cipher.setAAD(aad(owner,s.attemptId,manifest));
 const clear=Buffer.from(JSON.stringify({...s,recordings:s.recordings.map(r=>({...r,audio:Buffer.from(r.audio).toString("base64")}))}));
 const ciphertext=Buffer.concat([iv,cipher.update(clear),cipher.final(),cipher.getAuthTag()]);
 clear.fill(0);
 return {manifest,ciphertext};
}
export function openScoringStage(owner:string,attempt:string,manifest:string,ciphertext:Buffer,key:Buffer):ScoringSubmission{
 if(key.length!==32||ciphertext.length<29||ciphertext.length>28000000)throw Error("invalid stage envelope");
 const decipher=createDecipheriv("aes-256-gcm",key,ciphertext.subarray(0,12));
 decipher.setAAD(aad(owner,attempt,manifest));decipher.setAuthTag(ciphertext.subarray(-16));
 const clear=Buffer.concat([decipher.update(ciphertext.subarray(12,-16)),decipher.final()]);
 try{
  const p=JSON.parse(clear.toString()) as Omit<ScoringSubmission,"recordings">&{recordings:{task:string;mime:string;audio:string}[]};
  const s:ScoringSubmission={...p,recordings:p.recordings.map(r=>({...r,audio:Buffer.from(r.audio,"base64")}))};
  if(s.attemptId!==attempt||prepareScoringSubmission(s).manifestSha256!==manifest)throw Error("stage digest mismatch");
  return s;
 }finally{clear.fill(0)}
}
