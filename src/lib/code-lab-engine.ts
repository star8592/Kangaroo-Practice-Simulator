import type {QuickJSWASMModule} from "quickjs-emscripten";
import {CODE_CHALLENGES} from "./code-lab";

export type CodeCheck={
 taskId:string;correct:boolean;passed:number;total:number;message:string;
 sample:{input:unknown;expected:unknown;actual:unknown}|null;
 elapsedMs:number;
};
const MAX_SOURCE_LENGTH=5000;
const MAX_PER_CASE_MS=850;
const MAX_VM_MEMORY_BYTES=16*1024*1024;
function stableSerialize(value:unknown):string{
 const normalize=(v:unknown):unknown=>{
  if(Array.isArray(v))return v.map(normalize);
  if(v&&typeof v==="object"){
   const obj=v as Record<string,unknown>;
   return Object.fromEntries(Object.keys(obj).sort().map(k=>[k,normalize(obj[k])]));
  }
  return v;
 };
 return JSON.stringify(normalize(value));
}
export function gradeCodeWithQuickJS(QuickJS:QuickJSWASMModule,taskId:string,source:string):CodeCheck{
 const task=CODE_CHALLENGES.find(t=>t.id===taskId);
 if(!task)throw new Error("UNKNOWN_CODE_TASK");
 if(typeof source!=="string"||!source.trim()||source.length>MAX_SOURCE_LENGTH)
  throw new Error("SOURCE_LENGTH_MUST_BE_1_TO_5000");
 const started=Date.now();
 const runtime=QuickJS.newRuntime();
 runtime.setMemoryLimit(MAX_VM_MEMORY_BYTES);
 runtime.setMaxStackSize(256*1024);
 let passed=0;
 let sample:CodeCheck["sample"]=null;
 try{
  for(const testCase of task.cases){
   const ctx=runtime.newContext();
   const deadline=Date.now()+MAX_PER_CASE_MS;
   runtime.setInterruptHandler(()=>Date.now()>deadline);
   try{
    // The candidate is evaluated inside QuickJS WASM, not with host eval/Function.
    // QuickJS receives no fetch/DOM/Node/Worker bindings or module loader.
    const script="(()=>{ 'use strict';\n"+source+
      "\n;return JSON.stringify("+task.functionName+"("+JSON.stringify(testCase.input)+"));})()";
    const result=ctx.evalCode(script);
    if(result.error){
     const error=ctx.dump(result.error);
     result.error.dispose();
     const msg=error&&typeof error==="object"&&"message" in error?
      String((error as {message:unknown}).message):String(error);
     return {taskId,correct:false,passed,total:task.cases.length,
      message:"执行或语法错误："+msg.slice(0,130),sample,elapsedMs:Date.now()-started};
    }
    const raw=ctx.dump(result.value);
    result.value.dispose();
    let actual:unknown;
    try{actual=JSON.parse(String(raw))}catch{
     return {taskId,correct:false,passed,total:task.cases.length,
      message:"函数必须返回可序列化的JSON结果（不能是undefined、循环对象等）。",
      sample,elapsedMs:Date.now()-started};
    }
    if(!sample)sample={input:testCase.input,expected:testCase.expected,actual};
    if(stableSerialize(actual)!==stableSerialize(testCase.expected)){
     return {taskId,correct:false,passed,total:task.cases.length,
      message:passed===0?"基础样例未通过，请检查输出类型、顺序和业务规则。":
       "已通过部分输入，但边界场景不符合要求。请检查空输入、重复或异常状态。",
      sample,elapsedMs:Date.now()-started};
    }
    passed++;
   }finally{ctx.dispose();}
  }
  return {taskId,correct:true,passed,total:task.cases.length,
   message:"全部真实执行用例通过（含边界输入）。",sample,elapsedMs:Date.now()-started};
 }finally{runtime.dispose();}
}
