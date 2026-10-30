import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

async function main(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-buyer-"));
 const previous=process.env.SOCTHINK_USER_DATA_DIR;
 process.env.SOCTHINK_USER_DATA_DIR=root;
 try{
  const auth=await import("../src/lib/auth");
  const parents=await import("../src/lib/parent-auth");
  const {hasFullExamAccess}=await import("../src/lib/exam-access");
  const {GET:accessMe}=await import("../src/app/api/access/me/route");
  const account=parents.authenticateOrCreateWechatParent({
   wechatId:"wx_union_single_buyer_test",openId:"wx_openid_test",
   name:"微信考试用户",
  });
  const session=parents.createParentSessionToken(account.id);
  const url="https://socthink.cn/api/access/me";
  const request=new NextRequest(url,{
   headers:{cookie:parents.PARENT_SESSION_COOKIE+"="+session},
  });
  const user=auth.userFromRequest(request);
  assert.ok(user && user.id.startsWith("guest_family_"));
  assert.equal(user.candidateNo,"WECHAT");
  const policy=await import("../src/lib/access-policy");
  assert.equal(policy.classifyStudentIdentity(user),"student");

  assert.equal(user.role,"student");
  assert.equal(user.id,auth.wechatBuyerStudyUser(account.id).id);
  assert.equal(hasFullExamAccess(user),true,
   "One authorized WeChat buyer must enter a full exam without a child PIN");
  assert.equal(auth.userFromRequest(request)?.id,user.id,
   "The same WeChat account must use one stable study identity");
  const bearer=auth.createMiniappWechatSessionToken("unrelated_miniapp_openid");
  const miniappRequest=new NextRequest(url,{
   headers:{
    cookie:parents.PARENT_SESSION_COOKIE+"="+session,
    authorization:"Bearer "+bearer,
   },
  });
  assert.notEqual(auth.userFromRequest(miniappRequest)?.id,user.id,
   "A verified miniapp Bearer must not be silently merged with website OAuth");

  const originalPracticeToken=auth.createFamilyPracticeSessionToken(account.id);
  const legacy=auth.userFromSessionToken(originalPracticeToken);
  assert.equal(legacy?.id,user.id,"Old learning records must keep their stable identity");
  assert.equal(hasFullExamAccess(legacy),false,
   "A bare legacy practice/guest token is not sufficient to unlock full exams");
  const anonymous=new NextRequest(url);
  assert.equal(auth.userFromRequest(anonymous),null);
  const bogus=new NextRequest(url,{headers:{cookie:parents.PARENT_SESSION_COOKIE+"=forged"}});
  assert.equal(auth.userFromRequest(bogus),null);
  const other=parents.authenticateOrCreateWechatParent({
   wechatId:"wx_union_another_buyer",openId:"wx_openid_other",
  });
  assert.notEqual(auth.wechatBuyerStudyUser(other.id).id,user.id,
   "Different WeChat identities must not share study or purchase records");
  const access=await accessMe(request);
  assert.equal(access.status,200);
  const entitlements=await access.json();
  assert.equal(entitlements.accountModel,"single-wechat-buyer");
  assert.equal(entitlements.identity,"parent",
   "Legacy parent storage is only the internal billing principal");
  assert.equal(entitlements.maxFamilyStudents,undefined,
   "The public API must not advertise family seats");
  const unauthorized=await accessMe(anonymous);
  assert.equal((await unauthorized.json()).identity,"anonymous");
  console.log("SINGLE_WECHAT_BUYER=PASS stable_study_identity full_exam_authorized guest_denied owner_isolated no_family_seats");
 }finally{
  if(previous===undefined)delete process.env.SOCTHINK_USER_DATA_DIR;
  else process.env.SOCTHINK_USER_DATA_DIR=previous;
  fs.rmSync(root,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error("SINGLE_WECHAT_BUYER_FAILED",e);process.exitCode=1});
