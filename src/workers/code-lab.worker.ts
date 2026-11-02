import {getQuickJS} from "quickjs-emscripten";
import {gradeCodeWithQuickJS} from "../lib/code-lab-engine";
type Message={requestId:string;taskId:string;source:string};
self.addEventListener("message",async(event:MessageEvent<Message>)=>{
 const {requestId,taskId,source}=event.data??{};
 if(typeof requestId!=="string"||typeof taskId!=="string"||typeof source!=="string")return;
 try{
  const q=await getQuickJS();
  const result=gradeCodeWithQuickJS(q,taskId,source);
  self.postMessage({requestId,ok:true,result});
 }catch(error){
  self.postMessage({requestId,ok:false,error:(error instanceof Error?error.message:String(error)).slice(0,170)});
 }
});
