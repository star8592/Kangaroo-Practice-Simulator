import assert from "node:assert/strict";
import {TEACHER_PILOT_POLICY, STUDENT_FEE_MODES, STUDENT_FEE_OPTIONS,
  validStudentFeeMode,studentFeeModeLabel} from "../src/lib/teacher-pilot-policy";
assert.equal(TEACHER_PILOT_POLICY.status,"free-pilot");
assert.equal(TEACHER_PILOT_POLICY.teacherPlatformFeeMinor,0);
assert.equal(TEACHER_PILOT_POLICY.platformTeachingCommissionBps,0);
assert.equal(TEACHER_PILOT_POLICY.teachingAccessRequiresPaidOrder,false);
assert.equal(TEACHER_PILOT_POLICY.centralTeacherTuitionCheckoutEnabled,false);
assert.equal(TEACHER_PILOT_POLICY.centralTeacherTuitionEntitlementEnabled,false);
assert.equal(TEACHER_PILOT_POLICY.teacherTuitionCollectedByPlatform,false);
assert.equal(STUDENT_FEE_MODES.length,3);
assert.equal(STUDENT_FEE_OPTIONS.length,3);
for (const mode of STUDENT_FEE_MODES){
 assert.ok(validStudentFeeMode(mode));
 assert.ok(studentFeeModeLabel(mode).length>3);
}
assert.equal(validStudentFeeMode("paid"),false);
assert.equal(validStudentFeeMode("399.00"),false);
assert.equal(validStudentFeeMode({price:100}),false);
assert.ok(studentFeeModeLabel("teacher_managed").includes("平台不代收"));
assert.ok(studentFeeModeLabel("free_for_students").includes("学生免费"));
assert.ok(studentFeeModeLabel(null).includes("平台不代收"));
console.log("TEACHER_PILOT_POLICY=PASS teacher_platform_fee=0 tuition_collection=false modes=3");
