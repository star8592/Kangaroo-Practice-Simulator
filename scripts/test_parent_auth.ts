import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

// Never destructively exercise a production account directory. The auth
// modules resolve their storage path at IMPORT TIME: set it before importing.
const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-parent-auth-test-"));
const previous=process.env.SOCTHINK_USER_DATA_DIR;
process.env.SOCTHINK_USER_DATA_DIR=sandbox;

async function main(){
 try {
  const {issueChallenge,verifyChallenge}=await import("../src/lib/auth-challenges");
  const {authenticateOrCreateWechatParent,authenticateParent,createParent,createParentSessionToken,hashPassword,parentFromSessionToken,resetParentPassword}=await import("../src/lib/parent-auth");
  const {addStudentToFamily,familyOwnsStudent,publicFamilyStudents}=await import("../src/lib/family-store");
  const {createStudent}=await import("../src/lib/auth");
  const email="parent-test@example.com",code="123456",now=Date.now();
  issueChallenge({purpose:"register",email,code,payload:{name:"Test Parent",passwordHash:hashPassword("StrongPass123"),termsAcceptedAt:now,guardianConfirmedAt:now}});
  assert.throws(()=>verifyChallenge("register",email,"000000"));
  const c=verifyChallenge("register",email,code);
  assert.equal(c.payload?.name,"Test Parent");
  assert.throws(()=>verifyChallenge("register",email,code));
  const p=createParent({email,name:c.payload!.name!,passwordHash:c.payload!.passwordHash!,termsAcceptedAt:c.payload!.termsAcceptedAt!,guardianConfirmedAt:c.payload!.guardianConfirmedAt!});
  assert.equal(authenticateParent(email,"bad"),null);
  assert.equal(authenticateParent(email,"StrongPass123")?.id,p.id);
  const old=createParentSessionToken(p.id);assert.equal(parentFromSessionToken(old)?.id,p.id);
  resetParentPassword(email,"NewPass1234");
  assert.equal(parentFromSessionToken(old),null);
  assert.equal(authenticateParent(email,"NewPass1234")?.id,p.id);
  const wx=authenticateOrCreateWechatParent({wechatId:"union_test_001",openId:"openid_test_001",name:"微信家长"});
  assert.equal(wx.email,undefined);
  assert.equal(authenticateOrCreateWechatParent({wechatId:"union_test_001",openId:"openid_test_001",name:"新昵称"}).id,wx.id);
  assert.equal(parentFromSessionToken(createParentSessionToken(wx.id))?.wechatId,"union_test_001");
  const s=createStudent({username:"family_test_"+Date.now(),candidateNo:"FT"+Date.now(),name:"Kid",grade:1,pin:"1234"});
  addStudentToFamily(p.id,s.id);
  assert.equal(familyOwnsStudent(p.id,s.id),true);
  assert.equal(publicFamilyStudents(p.id)[0]?.id,s.id);
  // The only files affected are inside the generated disposable sandbox.
  assert.equal(fs.existsSync(path.join(sandbox,"parents.json")),true);
  console.log("PARENT_AUTH=PASS otp_one_time=true password_reset_revokes_session=true family_binding=true isolated_userstore=true");
 } finally {
  if(previous===undefined)delete process.env.SOCTHINK_USER_DATA_DIR;
  else process.env.SOCTHINK_USER_DATA_DIR=previous;
  fs.rmSync(sandbox,{recursive:true,force:true});
 }
}
void main().catch((error)=>{console.error(error);process.exitCode=1;});
