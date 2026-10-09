/**
 * China mathematics events: information catalogue, NOT a registration gateway.
 * Annual schedules are intentionally absent until an organizer/education authority
 * publishes a verifiable, region-specific notice.
 */
export type ChinaMathEvent = {
  id: string;
  companionId: string;
  nameZh: string;
  nameEn: string;
  aliases: string[];
  audienceZh: string;
  audienceEn: string;
  overviewZh: string;
  overviewEn: string;
  status: "national-list" | "historical";
  statusZh: string;
  statusEn: string;
  formatZh: string;
  formatEn: string;
  sourceUrl: string;
  sourceLabelZh: string;
  sourceLabelEn: string;
  verifiedOn: string;
};
export const NATIONAL_LIST_URL = "https://www.moe.gov.cn/srcsite/A29/202510/t20251029_1418393.html";
export const CHINA_MATH_EVENTS: ChinaMathEvent[] = [
  {
    id: "huabei", companionId: "china-huabei-readiness",
    nameZh: "华罗庚金杯少年数学邀请赛（华杯赛）", nameEn: "Hua Luogeng Golden Cup (historical)",
    aliases: ["华杯赛", "华赛", "华罗庚金杯"],
    audienceZh: "历史上以少年数学爱好者为主要对象；当届学段待核验",
    audienceEn: "Historically for school-aged students; current eligibility unverified",
    overviewZh: "保留赛事历史与数学训练规划。2018年曾暂停相关赛程；不可据非官方网页宣称2026年中国内地赛区开放。",
    overviewEn: "Historical competition and preparation reference. A 2018 round was suspended; no verified mainland 2026 registration.",
    status: "historical", statusZh: "历史赛事 · 内地当届报名未核验", statusEn: "Historical · current mainland entry unverified",
    formatZh: "当届线上/线下及赛制均以可信通知为准", formatEn: "Current format and venue unverified",
    sourceUrl: "https://www.xinhuanet.com/politics/2018-03/03/c_1122480371.htm",
    sourceLabelZh: "新华网：2018年相关杯赛暂停报道", sourceLabelEn: "Xinhua: 2018 suspension report",
    verifiedOn: "2026-10-09",
  },
  {
    id: "zoumei", companionId: "china-zoumei-readiness",
    nameZh: "走进美妙的数学花园（走美杯）", nameEn: "Beautiful Mathematics Garden (historical)",
    aliases: ["走美杯", "走进美妙的数学花园"],
    audienceZh: "历史上主要面向小学阶段；当届学段待核验",
    audienceEn: "Historically primary-school focused; current eligibility unverified",
    overviewZh: "纳入数学实践、思维拓展与历年赛题规划。目前没有经核验的中国内地2026年正式报名安排。",
    overviewEn: "Mathematics projects, enrichment and historical practice; no verified 2026 mainland registration.",
    status: "historical", statusZh: "历史赛事 · 当届赛程未核验", statusEn: "Historical · annual schedule unverified",
    formatZh: "历史活动形式仅供参考，2026年安排未知", formatEn: "Historical formats only; 2026 format unknown",
    sourceUrl: NATIONAL_LIST_URL,
    sourceLabelZh: "教育部2025—2028全国性赛事名单（政策范围核验）", sourceLabelEn: "MOE 2025–2028 national competition list",
    verifiedOn: "2026-10-09",
  },
  {
    id: "xiwang", companionId: "china-xiwang-readiness",
    nameZh: "希望杯数学邀请赛", nameEn: "Hope Cup Mathematics Invitational",
    aliases: ["希望杯", "Hope Cup"],
    audienceZh: "历届面向不同学段；内地与港澳及国际赛区须区分",
    audienceEn: "Multiple grades historically; mainland, Hong Kong/Macao, and international entries differ",
    overviewZh: "2026年存在国际、港澳赛区活动信息，但不能据此推断中国内地可报名。按具体组别、赛区和主办方逐届核实。",
    overviewEn: "2026 international/Hong Kong-Macao events exist, but do not imply mainland entry is open.",
    status: "historical", statusZh: "国际活动有信息 · 内地资格待核验", statusEn: "International events found · mainland entry unverified",
    formatZh: "港澳及国际活动与中国内地活动分别核验", formatEn: "Verify regional formats separately",
    sourceUrl: "https://www.hopemath.world/",
    sourceLabelZh: "Hope Math 国际活动网站（非内地报名证明）", sourceLabelEn: "Hope Math international site (not proof of mainland registration)",
    verifiedOn: "2026-10-09",
  },
  {
    id: "cmo", companionId: "china-cmo-readiness",
    nameZh: "全国中学生数学奥林匹克竞赛", nameEn: "Chinese Mathematical Olympiad pathway",
    aliases: ["高中数学联赛", "中国数学奥林匹克", "CMO"],
    audienceZh: "普通高中；各赛区选拔条件以中国数学会通知为准",
    audienceEn: "Senior high school; region-specific selection rules apply",
    overviewZh: "2025—2028教育部全国性竞赛名单收录。中国数学会发布高中数学联赛、全国决赛等公告；目前不预填2026届报名和考试日期。",
    overviewEn: "Included in MOE 2025–2028 national list. Check Chinese Mathematical Society for regional selection and dates.",
    status: "national-list", statusZh: "教育部全国性竞赛名单内 · 日期待核验", statusEn: "On MOE national list · dates unverified",
    formatZh: "预赛/高中数学联赛、选拔与决赛按最新官方公告", formatEn: "Preliminary/league, selection and finals per current notices",
    sourceUrl: "https://www.cms.org.cn/Home/comp/comp.html",
    sourceLabelZh: "中国数学会：数学竞赛公告", sourceLabelEn: "Chinese Mathematical Society notices",
    verifiedOn: "2026-10-09",
  },
  {
    id: "cgmo", companionId: "china-cgmo-readiness",
    nameZh: "中国女子数学奥林匹克（CGMO）", nameEn: "Chinese Girls' Mathematical Olympiad",
    aliases: ["CGMO", "女子数学奥林匹克"],
    audienceZh: "高中阶段女子数学活动，选拔及参赛资格按组织方通知",
    audienceEn: "High-school girls; selection and eligibility determined by organizer",
    overviewZh: "中国数学会确认组织该项活动；不能等同于教育部名单里的单独全国性竞赛项目。当届通知、赛区和资格需逐项核验。",
    overviewEn: "Organized by CMS; not independently listed as a separate MOE national competition entry.",
    status: "historical", statusZh: "学会组织的专项活动 · 当届通知待核验", statusEn: "Society-organized event · annual notice unverified",
    formatZh: "具体地点及流程待公告", formatEn: "Venue and process pending verified notice",
    sourceUrl: "https://www.cms.org.cn/Home/comp/comp.html",
    sourceLabelZh: "中国数学会：数学竞赛分类与声明", sourceLabelEn: "Chinese Mathematical Society",
    verifiedOn: "2026-10-09",
  },
];
