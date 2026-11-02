/**
 * SOCTHINK original interview practice blueprints.
 * Not employer official papers and not AI semantic scoring.
 */
export type InterviewCohort="campus"|"social";
export type InterviewEvidence={id:string;label:string;action:string};
export type InterviewQuestion={
 id:string;phase:string;prompt:string;goal:string;
 evidence:readonly [InterviewEvidence,InterviewEvidence,InterviewEvidence];
 followups:Readonly<{brief:string;ownership:string;outcome:string;depth:string}>;
};
export type InterviewProfile={
 id:string;cohort:InterviewCohort;title:string;role:string;
 subtitle:string;audience:string;description:string;sourceUrls:readonly string[];
 questions:readonly InterviewQuestion[];
};
const evidence=(id:string,label:string,action:string):InterviewEvidence=>({id,label,action});
export const INTERVIEW_PROFILES:readonly InterviewProfile[]=[
 {id:"campus-software",cohort:"campus",title:"校招 · 软件研发模拟面试",role:"软件研发应届岗",
  subtitle:"实习与项目 · 技术基础 · 协作表达",
  audience:"2026—2027届应届生及实习生；不要求虚构工作经历",
  description:"围绕真实做过的课程、实习或开源项目展开，每个主问题都有一次根据回答特征选择的追问。本站原创岗位练习，非任何企业官方题本。",
  sourceUrls:["https://career.huawei.com/cn/campus-recruitment","https://talent.baidu.com/jobs/list"],
  questions:[
   {id:"cs-intro",phase:"自我介绍",prompt:"请用1分钟说明你所学的方向、最有代表性的技术项目，以及为什么申请软件研发岗位。",goal:"用可核实的经历而非空泛形容词展示岗位匹配。",
    evidence:[evidence("focus","明确技术方向","指出熟悉的语言与应用领域"),evidence("project","提出具体项目","选择一个亲自完成的课程或实习项目"),evidence("match","解释岗位关联","说清项目技能如何对应目标研发职责")],
    followups:{brief:"你提到的项目叫什么？请先解释它解决的具体问题。",ownership:"这个项目里哪一段代码或设计是你亲自负责的？请举一个例子。",outcome:"项目有没有可核对的结果，例如运行通过的测试、性能变化或真实使用反馈？",depth:"如果面试官只记住你的一项能力，你希望是哪一项？用一个事实来说明。"}},
   {id:"cs-project",phase:"项目深挖",prompt:"选择一个你真正做过的项目，从需求、架构、关键实现、困难及结果五个方面讲述。",goal:"核查个人贡献和技术判断，而非背诵项目简介。",
    evidence:[evidence("scope","问题与约束","说明项目目标、规模和时间约束"),evidence("ownership","个人贡献","解释你负责的模块及关键技术取舍"),evidence("result","结果与验证","列出测试、数据或其他可核验证据")],
    followups:{brief:"请把这个项目拆成两三个核心模块，先解释你负责哪个。",ownership:"如果去掉你个人写的部分，项目会失去什么能力？",outcome:"你说项目完成了，具体用什么证据证明运行可靠？",depth:"请讲一个当时没选的技术方案，说明为什么放弃。"}},
   {id:"cs-debug",phase:"技术排障",prompt:"线上接口突然出现大量超时，你没有服务器权限和直接结论。请说明你会先核查哪些证据，以及如何逐步缩小问题范围。",goal:"展示实验、日志和因果判断的基本功，避免盲目改代码。",
    evidence:[evidence("observe","明确现象","询问时段、错误率、影响范围和变化点"),evidence("isolate","缩小范围","区分客户端、网关、应用、数据库与依赖"),evidence("verify","验证与回退","说明可复现实验、监控和恢复判断")],
    followups:{brief:"先给出第一条你想确认的监控指标和它能排除什么。",ownership:"假设团队多人协作，你会自己完成哪一步并通知谁？",outcome:"你准备凭什么判定故障已修复，而不是暂时不再报错？",depth:"若新版本与故障时间一致，你会直接回滚还是先查证？说出判断条件。"}},
   {id:"cs-collab",phase:"协作与冲突",prompt:"你和另一名同学或同事对一个接口方案有分歧，截止时间临近。请讲你会怎样处理，最好用真实经历说明。",goal:"展示澄清约束、用证据协商、明确责任并持续交付。",
    evidence:[evidence("context","界定冲突","描述双方各自的目标和约束"),evidence("decision","决策方法","用实验、风险或明确负责人推动决策"),evidence("close","复盘结果","说明如何确认方案实施、沟通与复盘")],
    followups:{brief:"冲突具体发生在哪项技术决定上？",ownership:"当时你本人采取了哪一项行动？",outcome:"最终采用了什么方案，怎么知道沟通有效？",depth:"如果证据证明对方方案更好，你怎样调整自己的意见？"}},
   {id:"cs-motivation",phase:"岗位适配与反问",prompt:"你为什么想加入所申请的研发团队？如果面试结束还有提问机会，你会向面试官问哪两个真正重要的问题？",goal:"区别对岗位的真实了解与背诵公司宣传。",
    evidence:[evidence("research","岗位研究","用具体公开JD或团队职责说明匹配"),evidence("growth","发展预期","提出与当前能力有关的学习计划"),evidence("questions","有效反问","询问交付、指导、考核和技术挑战")],
    followups:{brief:"请从岗位职责里选出一项你特别想做的工作，解释原因。",ownership:"你有哪些已经做过的准备而不只是未来打算？",outcome:"你会用什么结果判断入职三个月后确实有所成长？",depth:"如果岗位与你预期不同，你会向招聘方核实什么再决定？"}},
  ]},
 {id:"social-procurement",cohort:"social",title:"社招 · 采购与供应商管理模拟面试",role:"采购开发／供应商管理（有工作经验）",
  subtitle:"业务业绩 · 供应风险 · 商务谈判",
  audience:"已有采购、供应链或相关业务经历的求职者；重点追问自己负责的决策",
  description:"围绕采购成果、供应商评价、交期质量风险及跨部门协同展开。要求区分成本、总到货成本与实际利润。",
  sourceUrls:["https://zhaopin.meituan.com/","https://career.huawei.com/cn/"],
  questions:[
   {id:"sp-intro",phase:"经历概述",prompt:"请介绍最近一段采购或供应链工作：你负责的品类、供应规模、关键指标，以及你个人做过的一次改进。",goal:"以真实职责、可验证规模和具体改进取代泛泛年限。",
    evidence:[evidence("scope","职责范围","具体品类、供应商数量或业务规模"),evidence("metrics","基线指标","说明成本、交付或质量的原始口径"),evidence("change","个人贡献","列出亲自推动的变更与结果")],
    followups:{brief:"先明确你直接负责的采购范围，以及团队中其他人的职责。",ownership:"这次改进中你亲自谈判或决策了哪些事项？",outcome:"有无前后对比数据和统计时间窗口证明改善？",depth:"如果只用一个指标评价你的采购工作，你会选什么，为什么？"}},
   {id:"sp-supplier",phase:"供应商评价",prompt:"一家原有供应商价格较低但经常延期，新供应商报价高8%却承诺稳定交付。你如何评估并做出可向业务负责人解释的选择？",goal:"评估总成本、交付与质量风险，而非只看单价。",
    evidence:[evidence("cost","总成本计算","分解单价、运费、返工、缺货、库存和违约损失"),evidence("risk","风险证据","提出按时交付率、质量、产能与验证来源"),evidence("decision","验证方案","设计试单/双供与决策阈值")],
    followups:{brief:"除了单价，请至少列出两项可能改变结论的成本或风险。",ownership:"假如你是该品类负责人，你会首先向哪方核对什么数据？",outcome:"试单后用哪几项结果确认供应商真的更可靠？",depth:"如果降价带来很大的缺货风险，你怎样向财务解释取舍？"}},
   {id:"sp-negotiation",phase:"商务谈判",prompt:"核心供应商希望下季度提价12%，目前合同未到期。你会如何收集证据、设计备选方案并组织谈判？",goal:"展示准备、底线、合同约束及替代方案。",
    evidence:[evidence("facts","真实成本依据","原材料指数、合同条款与供应商财务证据"),evidence("options","备选方案","多供应商、规格调整、量价交换和BATNA"),evidence("compliance","合规与决策","授权边界、谈判记录与审批条件")],
    followups:{brief:"先解释供应商为什么要涨价，你如何验证理由？",ownership:"作为谈判负责人，你会设定哪些可接受的让步边界？",outcome:"谈判后你凭哪些指标判断采购价值改善？",depth:"如果对方以断供施压，你的替代供货方案什么时候启动？"}},
   {id:"sp-incident",phase:"供应链突发事件",prompt:"距离门店上新只剩5天，供应商通知关键物料延期10天。请说明前两小时和随后三天你分别怎么行动。",goal:"按影响、替代方案与决策节奏应对风险。",
    evidence:[evidence("impact","影响评估","确认订单、库存、缺货损失和交付承诺"),evidence("plan","应急措施","短期调拨、替代供应与分级履约方案"),evidence("stakeholders","沟通闭环","业务、仓储、法务和负责人同步并复盘")],
    followups:{brief:"请先说出你第一通电话会打给谁，以及需要取得什么数字。",ownership:"两小时内你本人会完成哪两项决策准备？",outcome:"你怎样核对紧急调拨是否真的降低了缺货风险？",depth:"若只有70%供货能按时到达，你如何确定优先保障哪批订单？"}},
   {id:"sp-reflection",phase:"业绩复盘与职业选择",prompt:"请讲一项你没达到预期的业务目标：原计划、实际偏差、个人责任、采取的修正，以及你为什么寻找下一份工作。",goal:"评估归因能力、诚信、复盘及职业判断，不要求夸大业绩。",
    evidence:[evidence("baseline","目标与实际","区分原目标、结果、时间和数据口径"),evidence("ownership","承担与改进","明确自己的错误及可以控制的变量"),evidence("career","换岗逻辑","实事求是描述下一岗位与能力成长的契合")],
    followups:{brief:"请讲出这个目标的具体衡量口径，而不是只说没达成。",ownership:"这件事中哪些问题在你控制范围内？",outcome:"纠偏后结果有无改善，是否能核验？",depth:"若在下一家公司再次出现类似偏差，你会提前建立什么监测机制？"}},
  ]},
];
export function getInterviewProfile(id:string):InterviewProfile|undefined{return INTERVIEW_PROFILES.find(p=>p.id===id);}
export type InterviewExchange={id:string;answer:string;followup:string;followupAnswer:string;selfChecked:readonly string[];followupMode?:"semantic"|"rule";followupEvidence?:string;followupReason?:string};
export function selectFollowup(q:InterviewQuestion,answer:string):{label:string;text:string}{
 const value=answer.trim();
 if(value.length<65)return {label:"需要补充背景",text:q.followups.brief};
 if(!/(?:本人|自己|亲自|由我|我(?:负责|独立|亲自|主要|承担|推动|设计|实现|处理|组织|在))/u.test(value))
  return {label:"核查个人贡献",text:q.followups.ownership};
 if(!/[0-9０-９]|百分之|指标|数据|证据|测试|验证|对比|客户反馈|完成率|错误率/.test(value))
  return {label:"核查结果证据",text:q.followups.outcome};
 return {label:"深入决策",text:q.followups.depth};
}
export function buildInterviewReview(profile:InterviewProfile,entries:Readonly<Record<string,InterviewExchange>>){
 const questions=profile.questions.map(q=>{
  const a=entries[q.id];
  const checked=new Set(a?.selfChecked??[]);
  const answered=Boolean(a?.answer.trim())&&Boolean(a?.followupAnswer.trim());
  const relevant=q.evidence.filter(e=>checked.has(e.id));
  const missing=q.evidence.filter(e=>!checked.has(e.id));
  return {id:q.id,phase:q.phase,answered,answer:a?.answer??"",followup:a?.followup??"",
   followupAnswer:a?.followupAnswer??"",followupMode:a?.followupMode??"rule",followupEvidence:a?.followupEvidence??"",followupReason:a?.followupReason??"",selfReviewed:relevant.map(e=>e.label),improvement:missing.map(e=>e.action)};
 });
 return {title:profile.title,questions,completed:questions.filter(q=>q.answered).length,
  total:questions.length,practicePoints:questions.flatMap(q=>q.improvement).slice(0,6)};
}
export function validateInterviewProfiles():string[]{
 const errors:string[]=[];
 for(const profile of INTERVIEW_PROFILES){
  if(profile.questions.length!==5)errors.push("FIVE_ROUNDS_REQUIRED:"+profile.id);
  if(profile.sourceUrls.length===0||profile.sourceUrls.some(u=>!u.startsWith("https://")))errors.push("SOURCE:"+profile.id);
  for(const q of profile.questions){
   if(q.evidence.length!==3||!q.prompt||!q.followups.brief||!q.followups.depth)errors.push("INVALID:"+q.id);
  }
 }
 return errors;
}
