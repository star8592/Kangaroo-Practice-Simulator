import {listCareerDemandFamilies,type CareerFamilyId} from "./career-demand";
import {CAREER_FORMAL_PAPERS} from "./career-formal-bank";

export type CareerOfferFormat = "tutorial"|"exam"|"lab"|"case"|"interview";
export type CareerSupplyCandidate = Readonly<{
  id:string;
  title:string;
  format:CareerOfferFormat;
  skillCode:string;
  evidenceCount:number;
  employerCount:number;
  sourceSignalIds:readonly string[];
  sourceUrls:readonly string[];
  readiness:"proposal"|"free-exam";
  liveHref?:string;
}>;

/**
 * Reusable supply templates. A template alone cannot create a sellable SKU.
 * Candidates exist only when verified job-level evidence contains this skill.
 * A category-page mention never invents an aptitude test or job examination.
 */
const TRAINING_TEMPLATES:Readonly<Record<string,Readonly<{title:string,format:CareerOfferFormat}>>> = {
  python:{title:"Python数据与应用编程实操",format:"lab"},
  sql:{title:"SQL业务查询与数据分析实操",format:"lab"},
  rag:{title:"RAG应用开发与检索评估实验",format:"lab"},
  agent:{title:"Agent工作流与工具调用实验",format:"lab"},
  mcp:{title:"MCP工具接入与联调实验",format:"lab"},
  api:{title:"接口开发、调试与工程实操",format:"lab"},
  category_management:{title:"商品类目规划与经营案例",format:"case"},
  price_strategy:{title:"零售定价与毛利分析案例",format:"case"},
  retail_metrics:{title:"零售复购与经营指标分析",format:"exam"},
  inventory_planning:{title:"库存计划与补货决策沙盘",format:"lab"},
  roi:{title:"营销活动ROI分析与复盘",format:"case"},
  supplier_selection:{title:"供应商寻源与评分模拟",format:"case"},
  cost_negotiation:{title:"采购价格与合同谈判模拟",format:"interview"},
  market_research:{title:"市场调研与行业研究实操",format:"case"},
  product_lifecycle:{title:"新品开发与商品生命周期案例",format:"case"},
  process_design:{title:"业务流程设计与优化案例",format:"case"},
  project_management:{title:"跨部门项目推进情景面试",format:"interview"},
  business_model:{title:"SaaS商业化模型构建案例",format:"case"},
  saas_metrics:{title:"SaaS留存与经营指标分析",format:"exam"},
  visual_design:{title:"营销视觉设计任务与作品评审",format:"lab"},
  brief_interpretation:{title:"客户创意Brief解读实操",format:"case"},
  data_analysis:{title:"真实感业务数据分析项目",format:"lab"},
  user_segmentation:{title:"用户画像与分层策略实操",format:"lab"},
  statistics:{title:"统计推断与业务解释训练",format:"exam"},
  ab_testing:{title:"A/B测试设计与结果诊断",format:"exam"},
  causal_inference:{title:"因果推断与实验评估案例",format:"case"},
  technical_sales:{title:"工业销售技术方案解读与客户沟通",format:"case"},
  energy_systems:{title:"配电与工业能源系统场景训练",format:"case"},
  solution_design:{title:"B2B解决方案构建与技术提案",format:"case"},
  business_analysis:{title:"业务经营分析与结论报告",format:"case"},
  pipeline_management:{title:"销售商机Pipeline管理实操",format:"lab"},
  marketing_kpi:{title:"B2B营销指标与转化复盘",format:"lab"},
  data_governance:{title:"主数据管理与数据质量实操",format:"lab"},
  customs_compliance:{title:"进出口海关合规情景判断",format:"exam"},
  export_documentation:{title:"出口单证核验与错误排查",format:"lab"},
  logistics_network:{title:"物流网络建模与运输方案",format:"case"},
  cross_cultural:{title:"跨文化业务沟通模拟面试",format:"interview"},
  apqp:{title:"工业质量APQP项目案例",format:"case"},
  quality_risk:{title:"制造质量风险排查演练",format:"case"},
  fmea:{title:"FMEA故障模式与风险分析",format:"case"},
  integration_testing:{title:"系统集成测试用例设计",format:"lab"},
  test_automation:{title:"自动化测试设计与调试",format:"lab"},
  requirements_analysis:{title:"工程需求分析与测试映射",format:"case"},
  java:{title:"Java服务端业务工程实操",format:"lab"},
  mysql:{title:"MySQL数据建模与查询排障",format:"lab"},
  supply_chain_digitalization:{title:"供应链数字化业务系统案例",format:"case"},
  mlops:{title:"机器学习工程化部署与监控",format:"lab"},
  technical_english:{title:"工业技术英文汇报与沟通",format:"interview"},
  b2b_sales:{title:"工业B2B销售与项目机会判断",format:"interview"},
  operations_digitalization:{title:"工厂与配送中心数字化改进方案",format:"case"},
  stakeholder_management:{title:"跨部门协作与利益相关方沟通",format:"interview"},
};

/**
 * This is an evidence-to-product *hypothesis* function, not inventory.
 * Rank by observed independent job signals in the sample, not market demand.
 */
export function getCareerSupplyCandidates(familyId:CareerFamilyId):CareerSupplyCandidate[]{
  const group=listCareerDemandFamilies().find(x=>x.id===familyId);
  if(!group)return [];
  const bySkill=new Map<string,{signalIds:Set<string>,employers:Set<string>,urls:Set<string>}>();
  for(const signal of group.signals){
    if(signal.evidenceLevel!=="job")continue;
    for(const skill of signal.skills){
      if(!TRAINING_TEMPLATES[skill])continue;
      const agg=bySkill.get(skill)??{signalIds:new Set<string>(),employers:new Set<string>(),urls:new Set<string>()};
      agg.signalIds.add(signal.id);agg.employers.add(signal.company);agg.urls.add(signal.sourceUrl);
      bySkill.set(skill,agg);
    }
  }
  return [...bySkill.entries()].map(([skillCode,a])=>{
    const exam=CAREER_FORMAL_PAPERS.find(p=>
      p.family===familyId&&p.deliveryState==="free-live-preview"&&
      p.evidenceSkillCodes.includes(skillCode)&&a.signalIds.has(p.evidenceSignalId));
    return {
      id:"career-"+familyId+"-"+skillCode,
      skillCode,
      title:TRAINING_TEMPLATES[skillCode].title,
      format:TRAINING_TEMPLATES[skillCode].format,
      evidenceCount:a.signalIds.size,
      employerCount:a.employers.size,
      sourceSignalIds:[...a.signalIds].sort(),
      sourceUrls:[...a.urls].sort(),
      readiness:exam?"free-exam" as const:"proposal" as const,
      ...(exam?{liveHref:"/career/exams/"+exam.id}:{}),
    };
  }).sort((a,b)=>b.employerCount-a.employerCount||
    b.evidenceCount-a.evidenceCount||a.title.localeCompare(b.title,"zh"));
}

export function careerSupplyCoverage(){
  const groups=listCareerDemandFamilies();
  return {
    groupsWithJobEvidence:groups.filter(x=>x.observedJobExamples>0).length,
    groupsWithCandidates:groups.filter(x=>getCareerSupplyCandidates(x.id).length>0).length,
    candidates:groups.reduce((n,x)=>n+getCareerSupplyCandidates(x.id).length,0),
  };
}
