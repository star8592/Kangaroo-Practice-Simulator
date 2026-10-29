import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Isolate all test records; never touch production's private/users directory.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-admin-ops-"));
process.env.SOCTHINK_USER_DATA_DIR = dir;

async function main() {
  const { authenticateOrCreateWechatParent } = await import("../src/lib/parent-auth");
  const { adminOperationsSnapshot, filterAdminFamilies, maskAdminEmail } = await import("../src/lib/admin-operations");
  const before = Date.now();
  const parent = authenticateOrCreateWechatParent({ wechatId: "unionid_fake_test", openId: "openid_fake_test", name: "测试家长" });
  assert.ok(parent.lastLoginAt && parent.lastLoginAt >= before, "first WeChat sign-in must have time");
  const signedAgain = authenticateOrCreateWechatParent({ wechatId: "unionid_fake_test", openId: "openid_fake_test" });
  assert.equal(signedAgain.id, parent.id, "same WeChat identity must reuse household");
  assert.ok(signedAgain.lastLoginAt && signedAgain.lastLoginAt >= parent.lastLoginAt);

  fs.writeFileSync(path.join(dir, "users.json"), JSON.stringify([
    { id: "stu_fake", username: "learner", candidateNo: "X1", name: "孩子",
      grade: 2, role: "student", active: true, createdAt: Date.now(), pinHash: "secret_pin_hash" },
    { id: "admin_fake", username: "staff", candidateNo: "ADMIN-staff", name: "管理员",
      grade: 0, role: "admin", active: true, createdAt: Date.now(), pinHash: "secret_admin_hash" },
  ]));
  fs.writeFileSync(path.join(dir, "families.json"), JSON.stringify([
    { id: "fam_1", parentId: parent.id, studentIds: ["stu_fake", "stu_fake", "nonexistent_id"], createdAt: Date.now() },
  ]));
  const { createSessionToken, createGuestSessionToken, userFromSessionToken, isAdmin } = await import("../src/lib/auth");
  const { createParentSessionToken } = await import("../src/lib/parent-auth");
  assert.equal(isAdmin(userFromSessionToken(createSessionToken("admin_fake"))), true, "admin PIN-backed student session grants admin role");
  assert.equal(isAdmin(userFromSessionToken(createSessionToken("stu_fake"))), false, "student has no admin access");
  assert.equal(isAdmin(userFromSessionToken(createGuestSessionToken())), false, "guest has no admin access");
  assert.equal(isAdmin(userFromSessionToken(createParentSessionToken(parent.id))), false, "WeChat family session must never become admin session");

  const { createAdmin } = await import("../src/lib/auth");
  const adminAccount = createAdmin({ username: "admin-pin-test", name: "负责人", pin: "strong-admin-test-pin" });
  const { POST: adminLogin } = await import("../src/app/api/admin/login/route");
  const { NextRequest } = await import("next/server");
  const loginRequest = (username: string, pin: string, origin = "https://socthink.cn", proxied = false) =>
    new NextRequest(proxied ? "http://127.0.0.1:3000/api/admin/login" : "https://socthink.cn/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin, "x-real-ip": "192.0.2.41", ...(proxied ? { host: "socthink.cn" } : {}) },
      body: JSON.stringify({ username, pin }),
    });
  const blockedCrossOrigin = await adminLogin(loginRequest("admin-pin-test", "strong-admin-test-pin", "https://other.example"));
  assert.equal(blockedCrossOrigin.status, 403, "cross-origin admin login must be refused");
  const proxiedInvalid = await adminLogin(loginRequest("nonexistent-proxy-fixture", "invalid-test-value", "https://socthink.cn", true));
  assert.equal(proxiedInvalid.status, 401, "legitimate proxied login must reach credential verification rather than return 403");
  const proxyCrossOrigin = await adminLogin(loginRequest("nonexistent-proxy-fixture", "invalid-test-value", "https://untrusted.example", true));
  assert.equal(proxyCrossOrigin.status, 403, "different-origin login remains forbidden behind proxy");
  const blockedStudent = await adminLogin(loginRequest("learner", "student-pin-wrong"));
  assert.ok(blockedStudent.status === 401 || blockedStudent.status === 429);
  assert.equal(blockedStudent.headers.get("set-cookie"), null, "student must not receive admin cookie");
  const grantedAdmin = await adminLogin(loginRequest(adminAccount.username, "strong-admin-test-pin"));
  assert.equal(grantedAdmin.status, 200);
  assert.ok(grantedAdmin.headers.get("set-cookie")?.includes("HttpOnly"));
  assert.ok(grantedAdmin.headers.get("set-cookie")?.includes("Max-Age=28800"));
  assert.equal((await grantedAdmin.json()).ok, true);
  const now = Date.now();
  const snapshot = adminOperationsSnapshot(now);
  assert.equal(snapshot.totalFamilies, 1);
  assert.equal(snapshot.createdToday, 1);
  assert.equal(snapshot.loggedInLast7Days, 1);
  assert.equal(snapshot.studentProfiles, 1, "admin must not count as a student");
  assert.equal(snapshot.linkedChildren, 1, "duplicate and dangling child ids must not count");
  assert.equal(snapshot.families[0].linkedChildren, 1);
  assert.equal(snapshot.families[0].signIn, "微信");
  assert.equal(snapshot.families[0].maskedEmail, null);
  assert.equal(filterAdminFamilies(snapshot.families, "测试家长").total, 1);
  assert.equal(filterAdminFamilies(snapshot.families, "not-found").total, 0);

  const response = JSON.stringify(snapshot);
  for (const confidential of ["unionid_fake_test", "openid_fake_test", "secret_pin_hash", "secret_admin_hash", "passwordHash"]) {
    assert.ok(!response.includes(confidential), "credential or raw identifier leaked: " + confidential);
  }
  assert.equal(maskAdminEmail("someone@example.com"), "s***@example.com");
  console.log("ADMIN_OPS_R0=PASS first_wechat_login=true roles_isolated=true family_deduped=true pii_masked=true admin_role_isolated=true admin_login_pin_protected=true");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});
