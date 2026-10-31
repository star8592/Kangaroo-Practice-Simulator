import type { ResourceListing } from "./resource-catalog";

/**
 * Public competition landing-page presentation only. Official sources establish
 * the organizer and competition family; training inventory is the existing
 * training-ready catalogue, not a publication or resale licence.
 *
 * Reviewed 2026-10-31. Do not hard-code contest dates or invent exam rights.
 */
export const RESOURCE_HUBS = [
  {
    id: "kangaroo",
    name: "袋鼠数学 Math Kangaroo",
    title: "袋鼠数学历年练习与赛制参考",
    description: "袋鼠数学侧重数学思维、逻辑与问题解决，不同地区和年级可能采用不同的赛制。这里列出 SOC THINK 实际可用的训练卷，并保留各卷独立的题量与时长。",
    guide: "袋鼠数学由国际组织 Kangourou sans Frontières 推动，各地区的本地赛事安排和具体规则可能不同；请以对应地区、当届官方发布为准。",
    officialName: "Association Kangourou Sans Frontières",
    officialUrl: "https://www.aksf.org/",
  },
  {
    id: "australian-amc",
    name: "澳洲 AMC（AMT）",
    title: "澳洲 AMC 数学竞赛在线训练与资料",
    description: "澳洲 AMC 由 Australian Maths Trust 举办，涵盖不同年级组。正式比赛的分组和试卷结构有明确规则，训练时应按各卷所属组别练习。",
    guide: "澳洲 AMC 的具体年级组、时长、评分和每年的安排以 Australian Maths Trust 当前公告为准；它与美国 MAA AMC 是不同考试。",
    officialName: "Australian Maths Trust — Australian Mathematics Competition",
    officialUrl: "https://amt.edu.au/amc",
  },
  {
    id: "maa-amc",
    name: "美国 MAA AMC",
    title: "美国 AMC 8／10／12 在线模拟与练习",
    description: "美国 AMC 由 Mathematical Association of America 组织。AMC 8、AMC 10、AMC 12 对应不同年级与赛制，不能混用题量、计分和考试时间。",
    guide: "MAA 官方介绍中，AMC 8 为 25 题、40 分钟；AMC 10／12 与 AMC 8 的赛制不同。正式竞赛的年度安排、资格和具体政策请核对 MAA 官方页面。",
    officialName: "Mathematical Association of America — American Mathematics Competitions",
    officialUrl: "https://maa.org/student-programs/amc/",
  },
  {
    id: "cemc",
    name: "加拿大 CEMC",
    title: "滑铁卢 CEMC 数学竞赛资料与在线练习",
    description: "加拿大滑铁卢大学 CEMC 提供 Gauss、Pascal、Cayley、Fermat、Euclid 等多个数学竞赛系列，面向不同年级和考试形式。",
    guide: "CEMC 各竞赛的适用年级、答题形式和时间并不相同。准备时须先确认具体竞赛名称与年度，以滑铁卢大学官方公告为准。",
    officialName: "University of Waterloo — Centre for Education in Mathematics and Computing",
    officialUrl: "https://cemc.uwaterloo.ca/contests",
  },
  {
    id: "seamo",
    name: "SEAMO 新加坡数学",
    title: "SEAMO 数学竞赛规则与可用模拟练习",
    description: "SEAMO 是面向不同年龄与年级的数学竞赛。考试卷别和报名规则以官方当届指南为准，本站仅展示现阶段真正可进入的训练项目。",
    guide: "SEAMO 和 SEAMO X 属于不同比赛阶段，试卷类型、成绩和资格要求应分别核对。在线练习不等于官方报名或获得官方参赛资格。",
    officialName: "Southeast Asian Mathematical Olympiad — Competition Guidelines",
    officialUrl: "https://www.seamo-official.org/page/guidelines",
  },
] as const;

export type ResourceHub = (typeof RESOURCE_HUBS)[number];
export function getResourceHub(id: string): ResourceHub | undefined {
  return RESOURCE_HUBS.find((hub) => hub.id === id);
}
export function availableResourceHubs(rows: readonly ResourceListing[]): ResourceHub[] {
  const ids = new Set(rows.map((row) => row.competition));
  return RESOURCE_HUBS.filter((hub) => ids.has(hub.id));
}
export function resourceHubPath(hub: ResourceHub): string {
  return "/resources/competitions/" + hub.id;
}
