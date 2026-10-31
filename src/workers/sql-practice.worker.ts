import initSqlJs from "sql.js";
import {gradeSqlWithEngine} from "../lib/sql-practice";
type Incoming={requestId:string;taskId:string;query:string};
let engine:ReturnType<typeof initSqlJs>|null=null;
self.addEventListener("message",async(event:MessageEvent<Incoming>)=>{
 const {requestId,taskId,query}=event.data;
 if(typeof requestId!=="string"||typeof taskId!=="string"||typeof query!=="string")return;
 try{
  if(!engine)engine=initSqlJs({locateFile:()=>new URL("/assessment-center/sql-wasm.wasm",self.location.origin).toString()});
  const SQL=await engine;
  const result=gradeSqlWithEngine(SQL,taskId,query);
  self.postMessage({requestId,ok:true,result});
 }catch(error){
  const message=error instanceof Error?error.message:"SQL_EVALUATION_FAILED";
  self.postMessage({requestId,ok:false,error:message.slice(0,180)});
 }
});
