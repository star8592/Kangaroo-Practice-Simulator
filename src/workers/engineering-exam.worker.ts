import {getQuickJS} from "quickjs-emscripten";
import {ENGINEERING_MOCK_ITEMS,ENGINEERING_MOCK_QUESTIONS} from "../lib/engineering-code-exam";
import {gradeCodeWithQuickJS} from "../lib/code-lab-engine";
type Request=
 | {requestId:string;mode:"sample";id:string;source:string}
 | {requestId:string;mode:"submit";drafts:Record<string,string>};
self.addEventListener("message",async(event:MessageEvent<Request>)=>{
 const data=event.data;
 if(!data||typeof data.requestId!=="string")return;
 try{
  const engine=await getQuickJS();
  if(data.mode==="sample"){
   if(!ENGINEERING_MOCK_ITEMS.some(x=>x.id===data.id))throw Error("UNKNOWN_EXAM_QUESTION");
   const result=gradeCodeWithQuickJS(engine,data.id,data.source,{sampleOnly:true});
   self.postMessage({requestId:data.requestId,type:"sample",result});
  }else if(data.mode==="submit"){
   if(!data.drafts||typeof data.drafts!=="object")throw Error("INVALID_DRAFTS");
   const marks=[];
   for(const item of ENGINEERING_MOCK_ITEMS){
    const source=data.drafts[item.id]??"";
    const original=ENGINEERING_MOCK_QUESTIONS.find(q=>q.id===item.id)!.task.starter;
    if(!source.trim()||source===original){
     marks.push({id:item.id,passed:0,total:4,message:"未填写有效代码（初始模板不计分）"});
     self.postMessage({requestId:data.requestId,type:"progress",completed:marks.length,total:ENGINEERING_MOCK_ITEMS.length});
     continue;
    }
    try{
     const result=gradeCodeWithQuickJS(engine,item.id,source,{collectAll:true});
     marks.push({id:item.id,passed:result.passed,total:result.total,message:result.message});
    }catch(e){
     marks.push({id:item.id,passed:0,total:4,message:"无法判分："+(e instanceof Error?e.message:"运行错误")});
    }
    self.postMessage({requestId:data.requestId,type:"progress",completed:marks.length,total:ENGINEERING_MOCK_ITEMS.length});
   }
   self.postMessage({requestId:data.requestId,type:"complete",marks});
  }
 }catch(e){
  self.postMessage({requestId:data.requestId,type:"error",error:(e instanceof Error?e.message:String(e)).slice(0,180)});
 }
});
