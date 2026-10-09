import { CHINA_MATH_EVENTS } from "./china-math-competitions";
import type { CompetitionCompanion, CompanionTask } from "./competition-companion";

// Advisory steps have no invented dates, mandatory fees or unsupported
// registration links. Date-scoped organizer instructions may be added later.
function preparationTasks(eventName: string): CompanionTask[] {
  const tasks: CompanionTask[] = [
    {
      id: "notice", kind: "site",
      titleZh: "核实当届活动和参赛资格", titleEn: "Verify the current event and eligibility",
      detailZh: "先核对主办方身份、地区及教育部门公开信息。未找到当届可信通知前，不安排报名或支付费用。",
      detailEn: "Confirm organizer, region and authority notice first. Do not register or pay based on unverified claims.",
      checklistZh: ["识别赛事完整名称与届次", "核实内地/港澳/国际等赛区是否适用", "核实报名条件和官方公布渠道"],
      checklistEn: ["Check full event name and season", "Confirm the eligible region", "Verify eligibility and organizer notice"],
    },
    {
      id: "enrollment", kind: "site",
      titleZh: "确认报名路径与时间", titleEn: "Confirm registration path and dates",
      detailZh: "仅在找到有效当届通知后处理报名，保存报名回执；没有真实截止日期时不生成倒计时。",
      detailEn: "Use a verified current notice before enrolling. No countdown without a confirmed deadline.",
      checklistZh: ["确认主办单位及当地承办信息", "核对报名开始/截止时间（待公告）", "按已核验流程保存确认材料"],
      checklistEn: ["Verify organizer and local operator", "Verify dates when published", "Keep an enrollment confirmation"],
    },
    {
      id: "practice", kind: "site",
      titleZh: "制定数学备赛计划", titleEn: "Plan mathematics preparation",
      detailZh: "基于历年公开题目与实际学段安排练习；历史试题不代表当届官方试卷，未经核验的题目不得标注为真题。",
      detailEn: "Use verified historical materials suitable for the student; label resources accurately.",
      checklistZh: ["评估基础计算和数学推理", "按照真实组别选历史练习", "安排一次适龄计时模拟与错题复盘"],
      checklistEn: ["Assess arithmetic and reasoning", "Choose age-appropriate verified practice", "Try a timed mock and review errors"],
    },
    {
      id: "exam-readiness", kind: "site",
      titleZh: "线上调试或线下赴考检查", titleEn: "Prepare online or on-site attendance",
      detailZh: "先依据当届公告确认具体考试形式。线上检查账号、浏览器、监考设备与网络；线下核对考点、路线、证件和允许用具。",
      detailEn: "Only after verifying the event mode: online account, browser and network; or venue, route, ID and permitted tools.",
      checklistZh: ["确认实际是线上、线下或混合", "线上：按公布要求测试登录、设备及监考流程", "线下：确认考点、交通、证件与准考要求", "核对是否允许计算器及具体文具"],
      checklistEn: ["Verify online/on-site/mixed mode", "Online: check account, equipment and proctoring", "On-site: check venue, travel and ID", "Verify permitted calculator and stationery rules"],
    },
    {
      id: "outcome", kind: "site",
      titleZh: "赛后复盘与成绩归档", titleEn: "Review results and archive evidence",
      detailZh: "记录实际参与的赛事名称、届次、赛区与分数。只对已核验的真实证书使用正式获奖表述。",
      detailEn: "Record event name, year, region and actual score; verify certificates before making official award claims.",
      checklistZh: ["记录参赛和个人复盘", "通过真实公布渠道查询成绩", "核验证书和奖项的颁发主体"],
      checklistEn: ["Record attendance and reflections", "Check results through official channels", "Validate any certificate and issuer"],
    },
  ];
  return tasks.map(task => ({
    ...task,
    detailZh: task.detailZh + "（" + eventName + "）",
  }));
}

export const CHINA_MATH_COMPANIONS: CompetitionCompanion[] = CHINA_MATH_EVENTS.map(event => ({
  id: event.companionId,
  competitionId: "china-math",
  season: 2026,
  mode: "varies",
  titleZh: event.nameZh + " · 备赛管家",
  titleEn: event.nameEn + " · Preparation guide",
  sourceLabelZh: event.sourceLabelZh,
  sourceLabelEn: event.sourceLabelEn,
  sourceUrl: event.sourceUrl,
  officialSiteUrl: event.sourceUrl,
  verifiedOn: event.verifiedOn,
  expiresAfter: "9999-12-31",
  registrationVerified: false,
  tasks: preparationTasks(event.nameZh),
}));
