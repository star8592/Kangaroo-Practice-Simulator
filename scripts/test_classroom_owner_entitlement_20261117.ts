import assert from "node:assert/strict";
import {approved,teacher,ClassroomFailure,type Actor} from "../src/lib/classroom-web-core";
const make=(admin:boolean):Actor=>({
  masterId:"par_aaaaaaaaaaaaaaaaaaaaaaaa",accountId:"11111111-1111-4111-8111-111111111111",
  name:"隔离测试用户",admin
});
async function run(){
 let calls:string[]=[];
 const noGrantDb={query:async(sql:string)=>{
   calls.push(sql);
   return {rows:[]};
 }};
 await approved(noGrantDb as never,make(true));
 assert.equal(calls.length,0,"site owner never queries the teacher-approval table");
 await assert.rejects(approved(noGrantDb as never,make(false),async()=>false),
   (e:unknown)=>e instanceof ClassroomFailure&&e.status===403);
 assert.equal(calls.length,1,"ordinary teacher must check the approval table");
 calls=[];
 await assert.rejects(teacher(noGrantDb as never,make(true),
  "22222222-2222-4222-8222-222222222222","33333333-3333-4333-8333-333333333333"),
   (e:unknown)=>e instanceof ClassroomFailure&&e.status===403);
 assert.equal(calls.length,1,"admin still must own a class before reading student information");
 console.log("CLASSROOM_SITE_OWNER_NO_SECOND_TEACHER_APPROVAL_PASS");
}
run().catch(e=>{console.error(e);process.exitCode=1});
