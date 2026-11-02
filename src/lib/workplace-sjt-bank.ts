/**
 * Original practice scenarios. These strategy keys have not been obtained
 * through a subject-matter expert panel, criterion validation or norming.
 * Never use them for personnel selection or claim a standardized SJT result.
 */
export type SjtSkill = Readonly<{id:string;name:string;practice:string}>;
export type SjtOption = Readonly<{text:string;points:0|1|2|3}>;
export type SjtItem = Readonly<{id:string;skill:string;scenario:string;options:readonly SjtOption[];rationale:string}>;
export const SJT_VERSION="workplace-sjt-original-20261102-v1";
export const SJT_SKILLS:readonly SjtSkill[]=[
 {id:"communication",name:"沟通与澄清",practice:"将需求、负责人、期限和验收标准写成双方认可的简短记录。"},
 {id:"coordination",name:"协作与冲突",practice:"先分别听取事实，再围绕共同目标提出可验证的折中方案。"},
 {id:"quality",name:"质量与风险",practice:"先隔离可能扩大的损失，保存证据并按影响级别汇报。"},
 {id:"prioritization",name:"任务与交付",practice:"把紧急程度、重要性、依赖关系和风险纳入优先级判断。"},
];
type OriginalScenario=readonly [string,string,string,string,string,string];
const original:Readonly<Record<string,readonly OriginalScenario[]>>={
 communication:[
 ["你收到一句“尽快把数据弄好”，但不知道统计范围。","向发起人确认时间范围、数据口径和交付截止时间后再处理。","先用现有口径做一版草稿，同时明确列出需要对方确认的假设。","直接按上次项目口径完成并在交付时说明。","仅回复“收到”，暂不处理也不追问。","未知口径会改变数字含义；先澄清或显式记录假设，避免把错误结果当成事实。"],
 ["同事反馈你提交的图表“看着不对”，没有给出细节。","请对方指出具体指标、样本或异常区间，并一起核对原始数据。","独立重算主要指标，再把复核过程发给对方确认。","仅调整颜色、比例等视觉样式后重新提交。","告诉对方图表是系统自动生成的，因此不用调整。","问题尚未定位；需要把模糊意见转成可核对的指标或证据。"],
 ["跨部门会议形成决议，但双方对交付人理解不同。","会后立刻书面确认每项任务、负责人、期限与验收标准。","把自己的理解发到群里，并请相关负责人补充异议。","先安排团队按本部门理解执行，等待有人提出异议。","认为会议中已经讨论过，不再做任何记录。","口头共识不足以避免责任歧义；明确责任和验收点可减少返工。"],
 ["客户说系统“总是很慢”，但监控没有显著异常。","询问具体页面、时间、操作步骤和发生频率，结合日志定位。","先抽样复现几个常用流程并记录耗时，再请求客户确认。","立即扩大所有服务器资源，期待问题自然缓解。","因为监控无异常，直接回复系统不存在问题。","用户感知和聚合监控可能不一致；应获取可复现的时间与操作证据。"],
 ["你发现向团队发出的进度邮件里有一项日期写错。","及时发更正，明确哪一项日期错误、正确日期及是否影响决策。","私下逐个通知关键相关方并在后续汇报中修正。","等下一次例会再口头说一下日期变化。","删除原邮件并假设大家不会按错误日期安排工作。","错误信息可能已被他人采用；主动、可追溯的更正降低连锁损失。"],
 ["技术人员与业务人员对“完成”一词理解不同。","共同列出交付功能、验收示例和不包含的范围，并请双方确认。","建议先演示一个样例，再对剩余范围做补充说明。","继续使用各部门原有的完成定义，由上线后反馈来决定。","要求双方只采用技术团队的说法，避免增加讨论。","完成标准必须可操作且经双方确认，才能避免上线与验收争议。"],
 ],
 coordination:[
 ["两个团队同时需要唯一一套测试环境。","确认各自截止时间与影响范围，协商时段并记录资源安排。","先让最临近截止的团队使用，随后再调整另一团队的计划。","由先发送请求的团队一直使用到结束。","不参与协调，直到其中一个团队主动放弃。","共享资源应依据业务影响和明确排期，而非先到先得或等待冲突升级。"],
 ["同事在讨论中公开指出你方案中的缺陷。","请对方展示证据，确认问题严重性，并与其共同修订方案。","会后单独核对问题并给出修正版，会议上先记录质疑。","立即解释自己过去采用过类似方案，要求大家先信任经验。","把对方的批评视为冒犯并停止参与讨论。","分歧的价值在于发现缺陷；以证据和改进为中心更稳妥。"],
 ["项目延期风险可能由上下游共同造成。","召集上下游核实依赖、责任与恢复计划，向负责人同步风险。","先协助下游调整可控环节，再提出跨团队协助请求。","直接让下游加班弥补时间，而不检查上游依赖。","只在最终期限到达后汇报延期。","跨部门延期需要共同事实与调整方案；单方转嫁责任会掩盖依赖。"],
 ["新人第一次独立执行任务，交付结果不符合要求。","对照具体要求指出差距，演示一处正确方法，再约定复查时间。","给新人一份可操作的检查清单，允许其自行修正。","直接接手所有任务，以保证短期交付速度。","在团队群中公开批评新人缺乏能力。","带教应兼顾可复现标准、及时反馈与学习机会。"],
 ["团队对两种实施方案争执很久，暂无统一结论。","定义共同评价指标，收集关键风险，开展可逆的小范围验证。","请负责人根据当前可用证据限时决定，并保留复盘窗口。","让支持人数较多的一方直接获胜，不再比较约束。","继续开会直到所有人完全同意，每次都不设决策截止点。","无法靠争论解决的分歧应转为指标、试验和明确决策责任。"],
 ["你接替离职同事的任务，发现交接文档不完整。","核查仓库、历史记录与相关人，列出未知项和影响后再承诺交付。","先完成已知的低风险部分，同时登记缺失的关键材料。","按自己的猜测填补缺失内容，并当成已确认事实。","因为交接有缺陷而暂停一切工作且不通知相关方。","接手任务时应把未知和假设可视化，避免让未经确认的信息进入交付。"],
 ],
 quality:[
 ["上线前测试发现少量订单金额与账本不一致。","暂停受影响的资金链路，定位口径差异并保留原始证据。","先隔离异常订单，同时继续验证未受影响的非资金功能。","只在后台增加一次金额四舍五入后继续上线。","由于异常比例小，直接删除对应测试记录。","涉及资金正确性的异常不能靠展示层修改或忽略；应限制影响并复核。"],
 ["生产系统频繁出现短暂错误，但自动重试通常成功。","核对错误率、重试负载和影响范围，必要时限流并定位根因。","先增加针对错误来源的监控和重试预算，再安排复现。","无限提高重试次数，以减少用户看到的错误。","只统计最终成功率，不记录中间故障。","自动重试可能放大负载与掩盖故障；须结合重试预算和根因诊断。"],
 ["你发现一份客户报告包含别人的姓名。","停止传播该报告，按隐私事件流程核查受影响范围并修正来源。","立即通知负责人并撤下当前下载入口，随后复核生成链路。","只修改 PDF 展示姓名，不检查是否包含其他跨用户数据。","认为是个别拼写错误，继续让客户下载。","跨用户内容可能是权限或数据隔离问题，需隔离、通知和追根溯源。"],
 ["开发者提议跳过质量回归，以赶上宣传发布日期。","评估变更风险与必测路径；无法保证基本安全时推迟相关功能发布。","缩小交付范围，优先完成关键回归后再上线安全部分。","保留全部改动，仅在上线后观察异常再处理。","口头要求每位用户自行承担新版风险。","应通过减少发布范围满足时限，不能用未经验证的核心风险换取进度。"],
 ["一批进口物料的证书与仓库标签批次不一致。","暂时隔离该批次，核对证书、标签和供应链追溯记录。","联系供应商索取批次证明，同时暂停该批物料的关键使用。","让仓库把标签改成证书编号以便数量一致。","因为外观正常，直接投入生产并忽略批次差异。","批次错配影响追溯与质量责任，不能用换标签掩盖。"],
 ["你要用一个异常指标向管理层报告项目成功。","披露指标异常和可能偏差，同时给出可复算的正常口径。","说明该指标需要补充核验，再并列展示其他可靠指标。","直接删除异常记录，保留结果更漂亮的部分。","只引用最好的一个数据点，不提其它指标。","报告要保留异常与不确定性，避免选择性呈现导致误判。"],
 ],
 prioritization:[
 ["两个项目同一天截止，一个影响正在运行的付费功能。","先评估付费功能的风险与用户损失，与负责人重新安排两项交付。","临时集中处理付费异常，同时明确另一项目的延期计划。","平均分配时间，不论两者损失与依赖差异。","为了不惹争议，按收到任务的先后顺序执行。","排序要看实际损失、依赖与可恢复性，并同步计划变化。"],
 ["你发现计划中的关键接口依赖第三方，交付日期可能不保。","及时验证对方接口与备选方案，调整关键路径并同步风险。","给第三方设置明确回复期限，同时推进不依赖该接口的模块。","到预定联调当天再联系第三方确认能否交付。","假定第三方一定会按时提供接口，不更新任何时间表。","关键外部依赖应前置验证并制定可替代路径。"],
 ["团队收到一个高曝光但价值不明的新功能需求。","对照当前目标估算收益、成本与机会成本，先用小实验验证需求。","提出最小可逆版本，明确停止条件后试行。","因为讨论热烈，立刻挪走全部正在做的任务。","拒绝讨论任何新需求，保持计划绝不调整。","曝光度不是实际价值，需要小范围证据和取舍标准。"],
 ["项目尾声出现一项低概率但高损失的安全风险。","评估风险上限并优先缓解可能造成不可逆损失的部分。","增加隔离和监控措施，明确风险负责人与紧急回退路径。","因为出现概率低，直接把风险移到下季度待办。","只在发布说明里写一条免责声明，不改变系统。","风险优先级应结合损失严重性与不可逆程度。"],
 ["一项流程优化预计能省十小时，但实施要影响五个部门。","估算真实节约时间、迁移成本与各部门约束，先小范围试行。","挑一个愿意参加的团队验证，再决定是否扩大。","直接要求五个部门同日切换以快速达到最大节约。","仅依据最初估算宣布已经节约了五十小时。","跨部门收益必须扣除迁移成本并以实际结果验证。"],
 ["你有一项临时客户请求，会打断正在处理的重要故障。","评估请求紧急程度，说明当前故障影响并安排明确响应时间。","请同事协助分流客户请求，自己继续排查关键故障。","立即中断故障排查以优先回应最新出现的消息。","完全不回复客户，也不给任何后续响应承诺。","外部请求应快速分级和反馈，避免使高损失问题进一步扩大。"],
 ],
};
export const SJT_ITEMS:readonly SjtItem[]=SJT_SKILLS.flatMap((skill,skillIndex)=>
 original[skill.id].map((row,index)=>{
  const [scenario,best,partial,weak,poor,rationale]=row;
  const source:SjtOption[]=[
   {text:best,points:3},{text:partial,points:2},
   {text:weak,points:1},{text:poor,points:0}
  ];
  const offset=(index+skillIndex)%4;
  return {id:"sjt-"+skill.id+"-"+(index+1),skill:skill.id,scenario,
   options:[...source.slice(offset),...source.slice(0,offset)],rationale};
 }));
export type SjtResult=Readonly<{
 correct:number;max:number;dimensions:readonly (SjtSkill & {points:number;max:number})[];
 review:readonly {id:string;chosen:string;reference:string;points:number;rationale:string}[];
}>;
export function scoreSjt(answers:Readonly<Record<string,number>>):SjtResult|null{
 if(SJT_ITEMS.some(item=>!Object.hasOwn(answers,item.id)))return null;
 const idSet=new Set(SJT_ITEMS.map(x=>x.id));
 for(const [id,value] of Object.entries(answers))if(!idSet.has(id)||!Number.isInteger(value)||value<0||value>3)throw new Error("INVALID_SJT_RESPONSE");
 const dimensions=SJT_SKILLS.map(skill=>{
  const items=SJT_ITEMS.filter(x=>x.skill===skill.id);
  return {...skill,points:items.reduce((sum,item)=>sum+item.options[answers[item.id]].points,0),max:items.length*3};
 });
 const review=SJT_ITEMS.map(item=>({
  id:item.id,chosen:item.options[answers[item.id]].text,
  reference:item.options.find(o=>o.points===3)!.text,
  points:item.options[answers[item.id]].points,rationale:item.rationale
 }));
 return {correct:review.filter(x=>x.points===3).length,max:SJT_ITEMS.length,
  dimensions,review};
}
export function validateSjtBank():string[]{
 const issues:string[]=[];
 if(SJT_ITEMS.length!==24)issues.push("COUNT");
 if(new Set(SJT_ITEMS.map(x=>x.id)).size!==24)issues.push("DUPLICATE");
 for(const s of SJT_SKILLS)if(SJT_ITEMS.filter(x=>x.skill===s.id).length!==6)issues.push("SKILL:"+s.id);
 for(const q of SJT_ITEMS){
  if(!q.scenario||!q.rationale||q.options.length!==4 ||
   q.options.map(o=>o.points).toSorted().join(",")!=="0,1,2,3" ||
   new Set(q.options.map(o=>o.text)).size!==4)issues.push("OPTIONS:"+q.id);
 }
 if(new Set(SJT_ITEMS.map(q=>q.options.findIndex(o=>o.points===3))).size!==4)issues.push("POSITION_BALANCE");
 return issues;
}
