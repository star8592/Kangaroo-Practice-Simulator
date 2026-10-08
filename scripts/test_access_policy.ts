import assert from "node:assert/strict";
import {
  ACCESS_POLICY_VERSION,
  CAPABILITIES,
  canAccess,
  classifyStudentIdentity,
  effectivePlan,
  maxFamilyStudents,
  type AccessContext,
} from "../src/lib/access-policy";

const NOW = 1760000000000;
const guest: AccessContext = { kind: "guest", accountId: "guest_random", now: NOW };
const free: AccessContext = { kind: "student", accountId: "stu_1", now: NOW };
const parent: AccessContext = { kind: "parent", accountId: "par_1", linkedStudentIds: ["stu_1"], now: NOW };
const plus: AccessContext = {
  ...free, billingOwnerId: "par_1",
  grants: [{ tier: "plus", ownerId: "par_1", verified: true, startsAt: NOW - 1000, expiresAt: NOW + 1000 }],
};
const pro: AccessContext = {
  ...free,
  grants: [{ tier: "pro", ownerId: "stu_1", verified: true, startsAt: NOW - 1000, expiresAt: NOW + 1000 }],
};

assert.equal(CAPABILITIES.length, 22);
assert.equal(classifyStudentIdentity({ id: "guest_abc", role: "student" }), "guest");
assert.equal(classifyStudentIdentity({ id: "wx_abc", role: "student" }), "student");
assert.equal(classifyStudentIdentity({ id: "adm_abc", role: "admin" }), "admin");
assert.equal(classifyStudentIdentity(null), "anonymous");
assert.equal(canAccess("public_sample_exam", guest).allowed, true);
assert.equal(canAccess("arithmetic_basic", guest).allowed, true);
assert.equal(canAccess("grading_basic", guest).allowed, true);
assert.equal(canAccess("mistake_book", guest).reason, "login_required");
assert.equal(canAccess("report_advanced", free).reason, "upgrade_required");
assert.equal(canAccess("report_advanced", plus).allowed, true);
assert.equal(canAccess("solution_ai", pro).allowed, true);
assert.equal(canAccess("report_basic", free, { ownerStudentId: "stu_2" }).reason, "forbidden");
assert.equal(canAccess("report_basic", parent, { ownerStudentId: "stu_1" }).allowed, true);
assert.equal(canAccess("report_basic", parent, { ownerStudentId: "stu_2" }).reason, "forbidden");
assert.equal(canAccess("family_dashboard", free).reason, "forbidden");
assert.equal(canAccess("family_dashboard", parent).allowed, true);
assert.equal(canAccess("family_multi_student", parent).reason, "upgrade_required");
assert.equal(canAccess("public_sample_exam", pro, { sourceAllowed: false }).reason, "source_unavailable");
assert.equal(canAccess("exam_premium", free, { legacyPublic: true }).allowed, true);
assert.equal(effectivePlan(plus), "plus");
assert.equal(effectivePlan(pro), "pro");
assert.equal(effectivePlan({ ...plus, now: NOW + 1001 }), "free");
assert.equal(effectivePlan({ ...plus, grants: [{ ...plus.grants![0], verified: false }] }), "free");
assert.equal(effectivePlan({ ...plus, grants: [{ ...plus.grants![0], ownerId: "par_other" }] }), "free");
assert.equal(effectivePlan({ ...plus, grants: [{ ...plus.grants![0], revokedAt: NOW - 1 }] }), "free");
assert.equal(effectivePlan({ ...plus, kind: "guest" }), "free");
assert.equal(maxFamilyStudents("free"), 1);
assert.equal(maxFamilyStudents("plus"), 3);
assert.equal(maxFamilyStudents("pro"), 5);
console.log("ACCESS_POLICY_PASS", ACCESS_POLICY_VERSION, CAPABILITIES.length, "capabilities; guest/free/plus/pro/expired/owner/source cases");
