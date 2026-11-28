import "server-only";
import {constants,openSync,fstatSync,readFileSync,closeSync} from "node:fs";
import {scorePrivatePractice,scorePrivateBatch,PrivatePracticeError,type PracticeBatchItem} from "./wuhan-private-practice-transport";
// No route exposes this helper yet. Only caller-authorized recordings may enter.
function privateSettings(){
 if(process.env.SOCTHINK_WUHAN_PRIVATE_PRACTICE!=="1")throw new PrivatePracticeError(503,"私有评分暂未开放");
 let key:Buffer;
 try{
  const fd=openSync(process.env.SOCTHINK_WUHAN_PRIVATE_KEY_FILE||"",constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try{
   const st=fstatSync(fd);
   if(!st.isFile()||(st.mode&0o077)!==0||st.size>128)throw new Error("key");
   const text=readFileSync(fd,"utf8").trim();
   if(!/^[a-f0-9]{64}$/.test(text))throw new Error("key");
   key=Buffer.from(text,"hex");
  }finally{closeSync(fd)}
 }catch{throw new PrivatePracticeError(503,"私有评分凭证不可用")}
 return {origin:process.env.SOCTHINK_WUHAN_PRIVATE_ORIGIN||"",key,revision:process.env.SOCTHINK_WUHAN_PRIVATE_REVISION||""};
}

export async function evaluateAuthorizedPracticeAudio(paper:string,task:string,mime:string,audio:Uint8Array){
 return scorePrivatePractice(privateSettings(),paper,task,mime,audio);
}
// Internal only: upstream must authorize every recording before invoking.
export async function evaluateAuthorizedPracticeBatch(items:readonly PracticeBatchItem[]){
 return scorePrivateBatch(privateSettings(),items);
}
