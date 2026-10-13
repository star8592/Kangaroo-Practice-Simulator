import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

async function main(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"kps-family-link-"));
 const old=process.env.SOCTHINK_USER_DATA_DIR;
 process.env.SOCTHINK_USER_DATA_DIR=root;
 try{
  const auth=await import("../src/lib/auth");
  const parentAuth=await import("../src/lib/parent-auth");
  const family=await import("../src/lib/family-store");
  const {PUT,GET,POST}=await import("../src/app/api/family/students/route");
  const a=parentAuth.authenticateOrCreateWechatParent({wechatId:"wx_a",openId:"op_a",name:"Family A"});
  const b=parentAuth.authenticateOrCreateWechatParent({wechatId:"wx_b",openId:"op_b",name:"Family B"});
  const s=auth.createStudent({username:"existing_child",candidateNo:"EXIST100",name:"原学生",grade:3,pin:"334455"});
  const url="https://socthink.cn/api/family/students";
  function request(parentId:string|null,username:string,pin:string){
   const cookie=parentId?{cookie:parentAuth.PARENT_SESSION_COOKIE+"="+parentAuth.createParentSessionToken(parentId)}:undefined;
   return new NextRequest(url,{method:"PUT",headers:{"content-type":"application/json",...cookie},body:JSON.stringify({username,pin})});
  }
  assert.equal((await PUT(request(null,s.username,"334455"))).status,401,"parent authentication mandatory");
  assert.equal((await PUT(request(a.id,s.username,"000000"))).status,401,"wrong pin rejected");
  assert.equal(family.familyOwnsStudent(a.id,s.id),false);
  const first=await PUT(request(a.id,s.username,"334455"));
  assert.equal(first.status,200,await first.text().catch(()=>"?"));
  assert.equal(family.familyOwnsStudent(a.id,s.id),true);
  assert.equal((await PUT(request(a.id,"EXIST100","334455"))).status,200,"idempotent link");
  assert.equal((await PUT(request(b.id,s.username,"334455"))).status,409,"other family cannot claim");
  assert.equal(family.familyOwnsStudent(b.id,s.id),false);
  const response=await GET(new NextRequest(url,{headers:{cookie:parentAuth.PARENT_SESSION_COOKIE+"="+parentAuth.createParentSessionToken(a.id)}}));
  const data=await response.json();
  assert.equal(data.students.length,1);
  assert.equal(data.students[0].id,s.id);
  assert.equal(data.students[0].pinHash,undefined);
  assert.equal(auth.loadUsers().filter(x=>x.role==="student").length,1,"must not duplicate the learner");
  const created=await POST(new NextRequest(url,{method:"POST",headers:{
    "content-type":"application/json",cookie:parentAuth.PARENT_SESSION_COOKIE+"="+parentAuth.createParentSessionToken(a.id),
  },body:JSON.stringify({name:"新孩子",grade:2})}));
  const createdBody=await created.json();
  assert.equal(created.status,201,JSON.stringify(createdBody));
  assert.equal(family.familyOwnsStudent(a.id,createdBody.student.id),true,"one-click child belongs to family");
  assert.equal(createdBody.student.pinHash,undefined,"auto-generated PIN hash is never sent to the client");
  assert.equal(auth.authenticate(createdBody.student.username,"1234"),null,"new family child cannot use trivial PIN");
  console.log("FAMILY_LINK_SECURITY=PASS requires_both_credentials=true preserves_student_id=true exclusive_family=true idempotent=true");
 }finally{
  if(old===undefined)delete process.env.SOCTHINK_USER_DATA_DIR;
  else process.env.SOCTHINK_USER_DATA_DIR=old;
  fs.rmSync(root,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
