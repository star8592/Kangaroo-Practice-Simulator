import type {CareerFamilyId} from "./career-demand";

/** Growth refers to one specific occupation's 2027-graduate recruitment,
 * not overall employment demand in the much broader career family.
 * Q3 2026 figures attributed to Zhaopin Research Institute in contemporary
 * reporting. Absent data MUST render as unknown, never zero or "cold".
 */
export type CareerMarketGrowth=Readonly<{
  family:CareerFamilyId;occupation:string;growthPercent:number;
  segment:"graduate-vacancies-yoy";period:"2026-Q3";
  sourceName:string;sourceUrl:string;publishedAt:"2026-10-16";
}>;
const COMMON={
  segment:"graduate-vacancies-yoy" as const,period:"2026-Q3" as const,
  sourceName:"智联研究院《2026年三季度人才市场热点快报》（媒体转述）",
  sourceUrl:"https://finance.sina.com.cn/roll/2026-10-16/doc-inivmprk1584748.shtml",
  publishedAt:"2026-10-16" as const,
};
export const CAREER_MARKET_GROWTH:readonly CareerMarketGrowth[]=[
  {...COMMON,family:"data",occupation:"数据工程师",growthPercent:57.4},
  {...COMMON,family:"ai",occupation:"人工智能工程师",growthPercent:36.9},
  {...COMMON,family:"product",occupation:"产品经理",growthPercent:29.8},
  {...COMMON,family:"software",occupation:"软件研发",growthPercent:8.1},
];
export function getCareerMarketGrowth(family:CareerFamilyId):CareerMarketGrowth|undefined{
  return CAREER_MARKET_GROWTH.find(x=>x.family===family);
}
export function validateCareerMarketGrowth():string[]{
  const families=new Set(["software","ai","data","product","operations","sales","marketing",
    "design","games","supply","procurement","logistics","finance","hr","legal","customer_service"]);
  const seen=new Set<string>();const errors:string[]=[];
  for(const metric of CAREER_MARKET_GROWTH){
    if(seen.has(metric.family))errors.push("duplicate:"+metric.family);
    seen.add(metric.family);
    if(!families.has(metric.family))errors.push("unknown:"+metric.family);
    if(!Number.isFinite(metric.growthPercent)||Math.abs(metric.growthPercent)>500)
      errors.push("invalid-rate:"+metric.family);
    if(metric.segment!=="graduate-vacancies-yoy"||metric.period!=="2026-Q3")
      errors.push("wrong-period:"+metric.family);
    if(!metric.sourceUrl.startsWith("https://"))
      errors.push("source-missing:"+metric.family);
  }
  return errors;
}
