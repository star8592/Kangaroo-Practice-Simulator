export type CompanionLang = "zh" | "en";
export type ExamMode = "online-home" | "offline";
export type CompanionCompetitionId = "kangaroo" | "australian-amc" | "maa-amc" | "cemc";

export type CompanionTask = {
  id: string; date: string; endDate?: string; time?: string;
  kind: "official" | "site";
  titleZh: string; titleEn: string; detailZh: string; detailEn: string;
  checklistZh?: string[]; checklistEn?: string[];
  actionUrl?: string; actionZh?: string; actionEn?: string;
};

export type CompetitionCompanion = {
  id: string; competitionId: CompanionCompetitionId; season: number; mode: ExamMode;
  stageIds?: string[]; gradeBands?: string[]; region?: string;
  titleZh: string; titleEn: string; sourceLabelZh: string; sourceLabelEn: string;
  sourceUrl: string; officialSiteUrl: string; verifiedOn: string; expiresAfter: string;
  tasks: CompanionTask[];
};

export const COMPETITION_COMPANIONS: CompetitionCompanion[] = [{
  id: "australian-amc-china-2026-online-pab",
  competitionId: "australian-amc", season: 2026, mode: "online-home",
  titleZh: "2026 澳洲 AMC · 线上居家考试",
  titleEn: "2026 Australian AMC · Online Home-based",
  sourceLabelZh: "2026 AMC Online Home-based Pre-A/A/B 官方考试说明",
  sourceLabelEn: "2026 AMC Online Home-based Pre-A/A/B instructions",
  sourceUrl: "https://attach.seedasdan.com/stem/2026AMCInstructions_for_Online_HomebasedPAB.pdf",
  officialSiteUrl: "https://www.seedasdan.asia/amc/",
  verifiedOn: "2026-10-05", expiresAfter: "2026-10-11",
  tasks: [
    { id:"official-mock", date:"2026-10-05", endDate:"2026-10-11", kind:"official",
      titleZh:"完成官方在线模考", titleEn:"Complete the official online mock",
      detailZh:"优先验证考试账号、浏览器、答题操作和设备环境。不要把第一次完整登录留到正式考试当天。",
      detailEn:"Verify the exam account, browser, answering flow and device setup before exam day.",
      checklistZh:["确认考试账号与密码","用正式考试设备登录","熟悉切题、作答和提交","确认设备不会自动休眠"],
      checklistEn:["Confirm account and password","Use the actual exam device","Practice navigation and submission","Disable automatic sleep"],
      actionUrl:"https://www.seedasdan.asia/amc/", actionZh:"前往官方 AMC 页面", actionEn:"Open official AMC page" },
    { id:"proctor-setup", date:"2026-10-09", time:"18:00–19:30", kind:"official",
      titleZh:"监考设备位置调试", titleEn:"Proctoring device setup",
      detailZh:"按官方安排检查第二设备与监考画面。正式考试前确认摄像范围和会议软件均可正常使用。",
      detailEn:"Check the second device, proctoring view and meeting software before the live exam.",
      checklistZh:["准备第二设备","检查摄像头与麦克风","确认监考画面覆盖要求","保持设备供电"],
      checklistEn:["Prepare a second device","Check camera and microphone","Verify the proctoring view","Keep devices powered"] },
    { id:"day-before", date:"2026-10-10", kind:"site",
      titleZh:"考前最终检查", titleEn:"Final pre-exam check",
      detailZh:"这是本站根据官方要求整理的执行清单，不新增考试规则。一次性把证件、文具、设备、网络和考试信息准备好。",
      detailEn:"A site checklist derived from official requirements; it does not add new exam rules.",
      checklistZh:["身份证明放到桌边","准备允许使用的文具与空白草稿纸","确认考试账号/密码和监考会议信息","关闭自动息屏并保持充电","退出与考试无关的软件"],
      checklistEn:["Prepare ID","Prepare permitted stationery and blank paper","Confirm exam and meeting credentials","Disable sleep and keep power connected","Close unrelated software"] },
    { id:"exam-day", date:"2026-10-11", time:"09:00 起", kind:"official",
      titleZh:"正式考试日", titleEn:"Exam day",
      detailZh:"09:00 起进入监考会议并调试；09:30 登录考试系统；09:45 身份核验及考前说明；10:00 正式开考。具体结束时间按组别执行。",
      detailEn:"Join proctoring from 09:00; log in at 09:30; identity check and briefing at 09:45; exam starts at 10:00. End time depends on division.",
      checklistZh:["提前完成早餐和洗手间安排","09:00 起进入监考会议","09:30 登录考试系统","09:45 完成身份核验","10:00 开始考试"],
      checklistEn:["Finish breakfast and restroom break early","Join proctoring from 09:00","Log in at 09:30","Complete identity check at 09:45","Start at 10:00"] }
  ]
}];

export function getCompetitionCompanion(competitionId: CompetitionCompanion["competitionId"], today: string) {
  return COMPETITION_COMPANIONS.filter(x=>x.competitionId===competitionId).filter(x=>x.expiresAfter>=today).sort((a,b)=>b.season-a.season)[0] || null;
}
export function companionTaskState(task: CompanionTask, today: string) {
  const end=task.endDate||task.date;
  if(today<task.date)return "upcoming" as const;
  if(today>end)return "past" as const;
  return "current" as const;
}
