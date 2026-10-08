import { ACCESS_POLICY_VERSION, canAccess, type Capability, type Plan, type AccessContext } from "./access-policy";

export const ACCESS_FEATURES: ReadonlyArray<{ id: Capability; zh: string; en: string }> = [
  {id:"competition_catalog",zh:"竞赛目录与赛程",en:"Competition directory"},
  {id:"public_sample_exam",zh:"公开竞赛样题",en:"Public sample exams"},
  {id:"arithmetic_basic",zh:"全年级基础计算",en:"Core arithmetic"},
  {id:"exam_basic",zh:"基础竞赛模拟",en:"Core mock exams"},
  {id:"grading_basic",zh:"基础成绩与正确率",en:"Basic grading"},
  {id:"solution_basic",zh:"标准题解",en:"Standard solutions"},
  {id:"mistake_book",zh:"错题本长期保存",en:"Saved mistake book"},
  {id:"report_basic",zh:"基础诊断报告",en:"Basic learning report"},
  {id:"report_pdf_basic",zh:"基础报告 PDF",en:"Basic PDF report"},
  {id:"family_dashboard",zh:"家长管理中心",en:"Parent dashboard"},
  {id:"competition_reminder",zh:"个人赛事提醒",en:"Event reminders"},
  {id:"exam_premium",zh:"高级竞赛训练",en:"Advanced competition practice"},
  {id:"personalized_exam",zh:"个性化智能组卷",en:"Personalized exams"},
  {id:"solution_ai",zh:"AI 分步题解",en:"Interactive AI explanations"},
  {id:"report_advanced",zh:"深度能力分析",en:"Advanced analytics"},
  {id:"arithmetic_print_personalized",zh:"个性化批量打印",en:"Custom printing"},
  {id:"family_multi_student",zh:"多学生家庭管理",en:"Multi-child management"},
  {id:"personalized_study_plan",zh:"定制学习路径",en:"Personalized study plan"},
] as const;

export const ACCESS_PLANS: ReadonlyArray<{
  id: "guest" | Plan; zh: string; en: string; description: string; familySeats: number; checkoutAvailable: false;
}> = [
  {id:"guest",zh:"游客体验",en:"Guest",description:"公开样题、计算和基础成绩",familySeats:0,checkoutAvailable:false},
  {id:"free",zh:"注册免费",en:"Free",description:"保存错题与长期学习记录",familySeats:1,checkoutAvailable:false},
  {id:"plus",zh:"PLUS 家庭学习",en:"Plus",description:"智能组卷与诊断、最多 3 名学生",familySeats:3,checkoutAvailable:false},
  {id:"pro",zh:"PRO 深度学习",en:"Pro",description:"更多 AI 额度与专业成长分析、最多 5 名学生",familySeats:5,checkoutAvailable:false},
] as const;

function example(plan:"guest" | Plan):AccessContext {
  if(plan==="guest") return {kind:"guest"};
  const accountId="comparison_only";
  if(plan==="free") return {kind:"parent",accountId};
  return {kind:"parent",accountId,grants:[{
    ownerId:accountId,tier:plan,verified:true,startsAt:0,expiresAt:Number.MAX_SAFE_INTEGER,
  }]};
}
export function publicAccessCatalog() {
  return {
    version: ACCESS_POLICY_VERSION,
    previewOnly:true,
    checkoutAvailable:false,
    plans:ACCESS_PLANS,
    features:ACCESS_FEATURES.map(feature=>({
      ...feature,
      tiers:Object.fromEntries(ACCESS_PLANS.map(plan=>[
        plan.id,canAccess(feature.id,example(plan.id)).allowed,
      ])),
    })),
  };
}
