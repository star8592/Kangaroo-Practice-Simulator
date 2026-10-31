import raw from "../../data/career/demand_signals_seed_20261101.json";

/**
 * Demand-first career offering catalog. Employment evidence is independent of
 * proposed SOCTHINK training. There is NO implication of official employer exams.
 * Data comes from a replaceable, versioned evidence feed, never one hardcoded SKU.
 */
export const CAREER_FAMILIES = [
  {id:"software",name:"软件研发与测试",summary:"后端、客户端、测试、工程稳定性",ideas:["编程与系统设计训练","故障排查实操","项目技术面试"]},
  {id:"ai",name:"AI与算法",summary:"模型、Agent、AI应用和工程实验",ideas:["算法与AI原理训练","AI应用工程实操","研究/项目技术答辩"]},
  {id:"data",name:"数据与商业分析",summary:"经营指标、统计、实验和业务洞察",ideas:["数据分析案例","统计与实验模拟","业务报告表达"]},
  {id:"product",name:"产品与策略",summary:"需求洞察、方案设计、指标和产品落地",ideas:["产品Case模拟","PRD与指标实操","项目追问面试"]},
  {id:"operations",name:"运营与零售",summary:"商品、用户、内容、增长和经营管理",ideas:["运营经营案例","活动ROI实训","运营情景面试"]},
  {id:"sales",name:"销售与商务拓展",summary:"客户沟通、商务方案、渠道和商业谈判",ideas:["客户场景模拟","商业方案与报价","商务表达练习"]},
  {id:"marketing",name:"市场与品牌",summary:"市场研究、品牌传播、投放和活动策划",ideas:["营销策略案例","广告预算分析","提案展示训练"]},
  {id:"design",name:"设计与创意",summary:"视觉、交互、素材制作和需求理解",ideas:["设计任务作品集","创意Brief还原","设计评审模拟"]},
  {id:"games",name:"游戏与内容",summary:"游戏策划、玩法、内容体验和制作",ideas:["玩法设计案例","游戏数据分析","作品展示与答辩"]},
  {id:"supply",name:"供应链与计划",summary:"需求预测、库存策略、履约和流程协同",ideas:["库存预测模拟","S&OP情景演练","供应链流程诊断"]},
  {id:"procurement",name:"采购与供应商管理",summary:"寻源、成本、供应商评估和质量协同",ideas:["供应商选择案例","采购谈判角色演练","成本与风险分析"]},
  {id:"logistics",name:"物流与交付",summary:"配送、仓储、时效与履约管理",ideas:["配送运营案例","仓储效率模拟","异常交付处置"]},
  {id:"finance",name:"财经与审计",summary:"会计、财务分析、资金与风险控制",ideas:["财务报表分析","经营预算案例","合规与风险情景问答"]},
  {id:"hr",name:"人力资源与组织",summary:"招聘、绩效、组织发展和员工关系",ideas:["组织管理案例","面试官角色演练","绩效与人才分析"]},
  {id:"legal",name:"法务与合规",summary:"合同、制度、合规与业务风险",ideas:["合同条款研判","合规情景模拟","法律检索与论证"]},
  {id:"customer_service",name:"客户服务与解决方案",summary:"服务交付、客户问题与解决方案沟通",ideas:["客户投诉情景","服务流程诊断","解决方案讲解"]},
] as const;

export type CareerFamilyId = typeof CAREER_FAMILIES[number]["id"];
export type CareerDemandSignal = Readonly<{
  id:string;
  company:string;
  roleTitle:string;
  roleFamily:CareerFamilyId;
  evidenceLevel:"job"|"category"|"process";
  sourceUrl:string;
  skills:readonly string[];
  observedAt:string;
}>;
export type CareerDemandFamily = Readonly<{
  id:CareerFamilyId;
  name:string;
  summary:string;
  ideas:readonly string[];
  signals:readonly CareerDemandSignal[];
  employers:readonly string[];
  observedJobExamples:number;
  taxonomyExamples:number;
  skillCodes:readonly string[];
}>;

const SIGNALS=raw.signals as CareerDemandSignal[];
export const CAREER_DEMAND_OBSERVED_AT=raw.observedAt;

/** A vacancy page supports requirements; a category page proves only taxonomy. */
export function validateCareerDemandSignals():string[]{
  const errors:string[]=[];
  const known=new Set<string>(CAREER_FAMILIES.map(x=>x.id));
  const ids=new Set<string>();
  for(const row of SIGNALS){
    if(ids.has(row.id))errors.push("duplicate signal "+row.id);
    ids.add(row.id);
    if(!known.has(row.roleFamily))errors.push("unknown role family "+row.id);
    if(!row.company.trim()||!row.roleTitle.trim())errors.push("blank employer or role "+row.id);
    try{
      const u=new URL(row.sourceUrl);
      if(u.protocol!=="https:") errors.push("non-https source "+row.id);
    }catch{ errors.push("bad source "+row.id); }
    if(row.evidenceLevel!=="job"&&row.skills.length>0)
      errors.push("unverified category skills "+row.id);
    if(!/^20\d{2}-\d{2}-\d{2}$/.test(row.observedAt))
      errors.push("bad observedAt "+row.id);
  }
  return errors;
}

/** Role families persist even without evidence, but only evidence-backed ones appear. */
export function listCareerDemandFamilies():CareerDemandFamily[]{
  return CAREER_FAMILIES.map(group=>{
    const signals=SIGNALS.filter(x=>x.roleFamily===group.id);
    const employers=Array.from(new Set(signals.map(x=>x.company))).sort((a,b)=>a.localeCompare(b,"zh"));
    const skillCodes=Array.from(new Set(signals.flatMap(x=>x.skills))).sort();
    return {
      ...group,signals,employers,skillCodes,
      observedJobExamples:signals.filter(x=>x.evidenceLevel==="job").length,
      taxonomyExamples:signals.filter(x=>x.evidenceLevel==="category").length,
    };
  }).filter(x=>x.signals.length>0);
}

export function searchCareerDemand(query="",family=""):CareerDemandFamily[]{
  const q=query.trim().toLocaleLowerCase("zh-CN").slice(0,100);
  return listCareerDemandFamilies().filter(group=>{
    if(family && family!==group.id) return false;
    if(!q)return true;
    const text=[group.name,group.summary,...group.ideas,
      ...group.signals.flatMap(x=>[x.company,x.roleTitle,...x.skills])].join(" ").toLocaleLowerCase("zh-CN");
    return text.includes(q);
  });
}

export function countCareerEvidence(){
  return {
    signals:SIGNALS.length,
    employers:new Set(SIGNALS.map(x=>x.company)).size,
    families:listCareerDemandFamilies().length,
    detailedJobs:SIGNALS.filter(x=>x.evidenceLevel==="job").length,
  };
}
