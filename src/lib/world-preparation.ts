import type { CompetitionCompanion, CompanionTask } from "./competition-companion";
import { WORLD_COMPETITIONS } from "./world-competitions";

function steps(): CompanionTask[] {
  return [
    {id:"verify", kind:"site", titleZh:"核实当地赛区与参赛资格", titleEn:"Check local eligibility",
      detailZh:"确认具体主办方、当届组别与所在地区的报名渠道；不得将主办方首页视作已开放报名。",
      detailEn:"Confirm organizer, current division and local registration; an organizer homepage is not proof of an open session."},
    {id:"register", kind:"site", titleZh:"跟踪官方报名通知", titleEn:"Track the official enrollment notice",
      detailZh:"当届报名日期未核实前不显示倒计时；确认后保存回执与考生信息。",
      detailEn:"Do not show unverified deadlines; retain a receipt only after actual enrollment."},
    {id:"practice", kind:"site", titleZh:"制定备赛与模拟计划", titleEn:"Plan practice and mocks",
      detailZh:"根据真实学段选择适配题目，不能把历史资料当作当年正式题。",
      detailEn:"Use age-appropriate verified resources; historical papers are not current official tests."},
    {id:"readiness", kind:"site", titleZh:"线上设备或线下考点检查", titleEn:"Online or on-site readiness",
      detailZh:"先核实形式；线上测试账号、网络与监考要求，线下确认考点、交通、证件。",
      detailEn:"Verify the mode first; check online devices/proctoring or venue, transport and ID."},
    {id:"results", kind:"site", titleZh:"赛后复盘与成绩归档", titleEn:"Review and archive outcomes",
      detailZh:"归档实际考试记录与成绩；获奖与证书表述应与真实颁发主体一致。",
      detailEn:"Archive real results; verify award issuer and certificate provenance."},
  ];
}
export const WORLD_PREPARATION_COMPANIONS: CompetitionCompanion[] =
  WORLD_COMPETITIONS.filter(event => event.region !== "CN").map(event => ({
    id: "world-" + event.id + "-readiness",
    competitionId: (event.trainingId || "world-math") as CompetitionCompanion["competitionId"],
    season: 2026,
    mode: "varies",
    titleZh: event.nameZh + " · 参赛准备",
    titleEn: event.nameEn + " · Preparation",
    sourceLabelZh: event.sourceLabelZh,
    sourceLabelEn: event.sourceLabelEn,
    sourceUrl: event.sourceUrl,
    officialSiteUrl: event.sourceUrl,
    verifiedOn: "2026-10-09",
    expiresAfter: "9999-12-31",
    registrationVerified: false,
    tasks: steps(),
  }));
