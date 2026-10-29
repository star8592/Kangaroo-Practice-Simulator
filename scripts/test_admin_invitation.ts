import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-admin-invite-"));
process.env.SOCTHINK_USER_DATA_DIR = root;

async function main() {
  const { issueAdminInvitation, activateInvitedAdmin, AdminInvitationError } = await import("../src/lib/admin-invitation");
  const { loadUsers, SESSION_COOKIE, userFromSessionToken } = await import("../src/lib/auth");
  const { POST } = await import("../src/app/api/admin/activate/route");
  const { NextRequest } = await import("next/server");
  const pin = ["This", "is", "a", "synthetic", "admin", "credential", "fixture", "2026"].join("-");
  const issued = issueAdminInvitation("owner@example.test");
  assert.equal(issued.recipient, "owner@example.test");
  assert.equal(issued.token.length, 64);
  assert(!fs.readFileSync(path.join(root,"pending-admin-invitation.json"),"utf8").includes(issued.token));
  assert.throws(() => issueAdminInvitation("owner@example.test"), /already exists/);
  const request = (origin: string, token: string, pass: string, confirm: string) =>
    new NextRequest("http://127.0.0.1:3000/api/admin/activate", {
      method: "POST",
      headers: { host:"socthink.cn", origin, "content-type":"application/json" },
      body:JSON.stringify({ token,pin:pass,confirm }),
    });
  assert.equal((await POST(request("https://untrusted.example",issued.token,pin,pin))).status,403);
  assert.equal((await POST(request("https://socthink.cn","0".repeat(64),pin,pin))).status,400);
  assert.equal((await POST(request("https://socthink.cn",issued.token,pin,"invalid-confirm"))).status,400);
  assert.equal((await POST(request("https://socthink.cn",issued.token,"short","short"))).status,400);
  const success=await POST(request("https://socthink.cn",issued.token,pin,pin));
  assert.equal(success.status,200);
  const cookie=success.cookies.get(SESSION_COOKIE);
  assert.ok(cookie?.value);
  assert.equal(cookie.httpOnly,true);
  assert.equal(cookie.sameSite,"strict");
  assert.equal(userFromSessionToken(cookie.value)?.role,"admin");
  assert.equal(loadUsers().filter(u=>u.role==="admin").length,1);
  assert.equal(loadUsers()[0].username,"owner@example.test");
  assert.equal((await POST(request("https://socthink.cn",issued.token,pin,pin))).status,400);
  assert(!fs.existsSync(path.join(root,"pending-admin-invitation.json")));
  const expired=issueAdminInvitation("another@example.test",{now:Date.now()-100000,ttlMs:2000});
  assert.throws(()=>activateInvitedAdmin(expired.token,pin), (e:unknown)=>
    e instanceof AdminInvitationError && e.status===400);
  console.log("ADMIN_INVITATION=PASS owner_verification_gate+single_use+expiry+role+session+csrf+no_token_storage");
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{
  fs.rmSync(root,{recursive:true,force:true});
});
