/**
 * SOC THINK teacher pilot. Teacher-tool subscription and teacher-to-platform
 * transaction obligations are zero during the current pilot. This does NOT
 * describe tuition that independent teachers may arrange with students.
 * Never gate a granted teacher's access on billing products or orders.
 */
export const TEACHER_PILOT_POLICY = Object.freeze({
  status: "free-pilot",
  teacherPlatformFeeMinor: 0,
  platformTeachingCommissionBps: 0,
  teachingAccessRequiresPaidOrder: false,
  centralTeacherTuitionCheckoutEnabled: false,
  centralTeacherTuitionEntitlementEnabled: false,
  teacherTuitionCollectedByPlatform: false,
} as const);

export const STUDENT_FEE_MODES = [
  "not_specified",
  "teacher_managed",
  "free_for_students",
] as const;
export type StudentFeeMode = typeof STUDENT_FEE_MODES[number];

export const STUDENT_FEE_OPTIONS: readonly {id:StudentFeeMode;label:string}[] = [
  {id:"not_specified",label:"暂不说明学生课程费用"},
  {id:"teacher_managed",label:"老师自行安排收费，平台不代收"},
  {id:"free_for_students",label:"学生免费参加本班"},
] as const;

export function validStudentFeeMode(input:unknown):input is StudentFeeMode {
 return typeof input==="string" && STUDENT_FEE_MODES.some(m=>m===input);
}

/** Public display never shows an unverified price or a paid-product button. */
export function studentFeeModeLabel(mode:unknown):string {
  if(mode==="free_for_students")return "学生免费参加";
  if(mode==="teacher_managed")return "课程收费由老师自行安排 · 平台不代收";
  return "费用安排请向老师了解 · 平台不代收";
}
