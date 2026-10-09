import { COMPETITION_BRAND, type CompetitionBrandId } from "./competition-brand";
import { CHINA_MATH_EVENTS } from "./china-math-competitions";

/**
 * One worldwide competition identity catalogue. Geography is a *filter*,
 * never a primary/secondary product hierarchy or a claim of local eligibility.
 * An event's current registration/session is verified independently.
 */
export type WorldRegion = "global" | "CN" | "AU" | "US" | "CA" | "GB";
export type ReferenceStage = "primary" | "junior" | "senior";
export const WORLD_STAGE_OPTIONS: {value:"all"|ReferenceStage;zh:string;en:string}[] = [
  {value:"all",zh:"全部学段",en:"All stages"},
  {value:"primary",zh:"小学",en:"Primary"},
  {value:"junior",zh:"初中",en:"Middle school"},
  {value:"senior",zh:"高中",en:"High school"},
];
export type WorldCompetition = {
  id: string;
  region: WorldRegion;
  nameZh: string;
  nameEn: string;
  summaryZh: string;
  summaryEn: string;
  sourceUrl: string;
  sourceLabelZh: string;
  sourceLabelEn: string;
  registrationState: "unverified" | "session-specific";
  /** Informational audience only; never treated as confirmed edition eligibility. */
  referenceStages?: readonly ReferenceStage[];
  trainingId?: CompetitionBrandId;
  companionId?: string;
};

const globalFamilies: WorldCompetition[] = ([
  { id: "kangaroo", referenceStages:["primary","junior","senior"], region: "global", nameZh: "袋鼠数学", nameEn: "Math Kangaroo", summaryZh: "国际袋鼠数学活动，各赛区时间、规则和报名入口单独核验", summaryEn: "An international competition with region-specific schedules and rules", trainingId: "kangaroo" },
  { id: "australian-amc", referenceStages:["primary","junior","senior"], region: "AU", nameZh: "澳洲 AMC", nameEn: "Australian Mathematics Competition", summaryZh: "澳大利亚数学信托主办；赛区及组别按当届通知确认", summaryEn: "Australian Maths Trust; verify each local event and division", trainingId: "australian-amc", registrationState: "session-specific" },
  { id: "maa-amc", referenceStages:["primary","junior","senior"], region: "US", nameZh: "美国 AMC / AIME", nameEn: "MAA AMC / AIME", summaryZh: "AMC 8 / 10 / 12 及 AIME，不同阶段独立赛制", summaryEn: "AMC 8 / 10 / 12 and AIME, each with distinct formats", trainingId: "maa-amc" },
  { id: "cemc", referenceStages:["junior","senior"], region: "CA", nameZh: "加拿大 CEMC", nameEn: "Waterloo CEMC", summaryZh: "Gauss / Pascal / Cayley / Fermat / Euclid 等数学测评", summaryEn: "Gauss, Pascal, Cayley, Fermat, Euclid and more", trainingId: "cemc" },
  { id: "ukmt", referenceStages:["junior","senior"], region: "GB", nameZh: "英国 UKMT", nameEn: "United Kingdom Mathematics Trust", summaryZh: "JMC、IMC、SMC 等；可查阅官方历年资料", summaryEn: "JMC, IMC, SMC and official past-paper resources" },
] as const).map(item => ({
  ...item,
  registrationState: item.id === "australian-amc" ? "session-specific" as const : "unverified" as const,
  sourceUrl: item.id === "ukmt" ? "https://ukmt.org.uk/competition-papers" : COMPETITION_BRAND[item.trainingId as CompetitionBrandId].officialUrl,
  sourceLabelZh: item.id === "ukmt" ? "UKMT 官方试卷资料" : "赛事主办方网站（不代表本地区当届报名已开放）",
  sourceLabelEn: item.id === "ukmt" ? "UKMT official papers" : "Organizer website (does not prove local registration)",
}));

const chinaFamilies: WorldCompetition[] = CHINA_MATH_EVENTS.map(event => ({
  id: event.id,
  region: "CN",
  nameZh: event.nameZh,
  nameEn: event.nameEn,
  summaryZh: event.audienceZh,
  summaryEn: event.audienceEn,
  sourceUrl: event.sourceUrl,
  sourceLabelZh: event.sourceLabelZh,
  sourceLabelEn: event.sourceLabelEn,
  registrationState: "unverified",
  companionId: event.companionId,
  referenceStages: event.id === "cmo" || event.id === "cgmo" ? ["senior"] :
    event.id === "huabei" || event.id === "zoumei" ? ["primary"] :
    undefined, // Unknown or cross-grade historical coverage: leave visible for every stage.
}));

// Alternation in default order is deliberate: no China/overseas tier.
export const WORLD_COMPETITIONS: WorldCompetition[] = [
  globalFamilies[0], chinaFamilies[0],
  globalFamilies[1], chinaFamilies[1],
  globalFamilies[2], chinaFamilies[2],
  globalFamilies[3], chinaFamilies[3],
  globalFamilies[4], chinaFamilies[4],
];

export const WORLD_REGION_OPTIONS: {value: "all" | WorldRegion; zh: string; en: string}[] = [
  {value: "all", zh: "全部地区", en: "All regions"},
  {value: "CN", zh: "中国", en: "China"},
  {value: "US", zh: "美国", en: "United States"},
  {value: "AU", zh: "澳大利亚", en: "Australia"},
  {value: "CA", zh: "加拿大", en: "Canada"},
  {value: "GB", zh: "英国", en: "United Kingdom"},
  {value: "global", zh: "全球性", en: "Worldwide"},
];
export const worldRegionName = (region: WorldRegion, lang: "zh" | "en") =>
  WORLD_REGION_OPTIONS.find(x => x.value === region)?.[lang] || region;

export function matchesWorldReferenceStage(event:WorldCompetition, stage:"all"|ReferenceStage){
  return stage==="all"||!event.referenceStages||event.referenceStages.includes(stage);
}
