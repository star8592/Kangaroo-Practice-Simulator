import assert from "node:assert/strict";
import {NextRequest} from "next/server";
import {
  ClassroomFailure,LESSONS,learnerId,workspaceId,id,token,
  newShareToken,digest,shareUrl,actor,writeOrigin
} from "../src/lib/classroom-web-core";
function denies(fn:()=>unknown,status:number){
  assert.throws(fn,e=>e instanceof ClassroomFailure&&e.status===status);
}
const parent="par_aaaaaaaaaaaaaaaaaa";
assert.equal(LESSONS.length,9);
assert.equal(learnerId(parent),learnerId(parent));
assert.notEqual(learnerId(parent),learnerId("par_bbbbbbbbbbbbbbbbbb"));
assert.equal(learnerId(parent)[14],"8");
assert.notEqual(workspaceId(parent,"tenant"),workspaceId(parent,"class"));
const invite=newShareToken();
assert.equal(invite.length,64);
assert.equal(digest(invite).length,64);
assert.equal(token(invite),invite);
assert.match(shareUrl(workspaceId(parent,"tenant"),invite),/^https:\/\/socthink\.cn\//);
denies(()=>id("../../etc/passwd"),400);
denies(()=>token("forged"),400);
denies(()=>actor(new NextRequest("https://socthink.cn/english/pronunciation/classroom-api/me")),401);
denies(()=>writeOrigin(new NextRequest("https://socthink.cn/english/pronunciation/classroom-api/teacher/apply",{
  method:"POST",headers:{host:"socthink.cn",origin:"https://evil.example"}
})),403);
const sameOrigin=new NextRequest("https://socthink.cn/english/pronunciation/classroom-api/teacher/apply",{
  method:"POST",headers:{host:"socthink.cn",origin:"https://socthink.cn"}
});
writeOrigin(sameOrigin);
console.log("SOCTHINK_CLASSROOM_EMBEDDED_PURE_CONTRACT_PASS");
