import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-required-name-"));
process.env.SOCTHINK_USER_DATA_DIR=dir;
try{
 const {authenticateOrCreateWechatParent,createParentSessionToken,
  parentFromSessionToken,PARENT_SESSION_COOKIE}=await import("../src/lib/parent-auth");
 const {POST}=await import("../src/app/api/auth/parent/profile/route");
 const user=authenticateOrCreateWechatParent({wechatId:"isolated-wechat-user-17",name:"微信用户"});
 const cookie=PARENT_SESSION_COOKIE+"="+createParentSessionToken(user.id);
 async function post(who:boolean,origin:string,name:unknown){
  return POST(new NextRequest("https://socthink.cn/api/auth/parent/profile",{
   method:"POST",headers:{"content-type":"application/json",host:"socthink.cn",origin,
    ...(who?{cookie}:{})},body:JSON.stringify({name})
  }));
 }
 assert.equal((await post(false,"https://socthink.cn","虚拟学生")).status,401);
 assert.equal((await post(true,"https://evil.example","虚拟学生")).status,403);
 for(const name of ["微信用户","微信家长","<script>","a"]){
  assert.equal((await post(true,"https://socthink.cn",name)).status,400,name);
 }
 const good=await post(true,"https://socthink.cn","Candy老师");
 assert.equal(good.status,200);
 assert.equal((await good.json()).name,"Candy老师");
 const stable=parentFromSessionToken(createParentSessionToken(user.id));
 assert.equal(stable?.id,user.id);
 assert.equal(stable?.name,"Candy老师");
 authenticateOrCreateWechatParent({wechatId:"isolated-wechat-user-17",name:"微信用户"});
 assert.equal(parentFromSessionToken(createParentSessionToken(user.id))?.name,"Candy老师");
 console.log("WECHAT_REQUIRED_DISPLAY_NAME_AUTH_CSRF_IDENTITY_PERSISTENCE_PASS");
}finally{
 fs.rmSync(dir,{recursive:true,force:true});
}
