import {getInstrument,scoreInstrument,type FactorId,type Instrument} from "./measurement-center";

/** Curated statements, not LLM-generated diagnoses.
 * Use only after verified server entitlement in the report API.
 */
export type FactorGuidance={observation:string;strengthContext:string;counterContext:string;action:string;verification:string};
export const GUIDANCE:Record<FactorId,FactorGuidance>={
 R:{observation:"此维度考察对动手制作、工具与真实装置的兴趣描述。",strengthContext:"在修理、制作、设备调试等需要看见成果的任务里，这种兴趣可能为投入提供线索。",counterContext:"兴趣不是已经具备操作资质；实际技术能力需要通过独立实操和安全规范验证。",action:"选择一个无安全风险的小制作项目，完整记录步骤、遇到的问题和解决方法。",verification:"记录实际投入时间、完成感受和是否愿意再做一次。"},
 I:{observation:"此维度考察对分析信息、验证假设和寻找规律的兴趣描述。",strengthContext:"试着将问题拆成可检验的假设，并用可信数据逐个排查。",counterContext:"自评喜欢研究，不等于专业研究水平或科学推理表现已经得到验证。",action:"为一个生活问题写出两个竞争假设，寻找数据或可重复的观察检验它们。",verification:"回顾是否搜集了反例，而不是仅寻找支持原来想法的信息。"},
 A:{observation:"此维度考察对原创表达、文字、视觉和创意任务的兴趣。",strengthContext:"可以把想法外化成作品，通过外部反馈了解创作过程是否有持续吸引力。",counterContext:"喜欢创造不等于职业艺术能力，也不代表一定适合特定行业。",action:"用一种自己选择的媒介完成一件可分享的小作品，记录修改过程。",verification:"比较从构思、修改到完成的三个阶段，哪一步更能吸引自己。"},
 S:{observation:"此维度考察解释、倾听、支持与协作类活动的兴趣。",strengthContext:"通过实际的讲解、协作或用户访谈，观察自己是否愿意持续投入。",counterContext:"喜欢帮助人并不能证明沟通技巧成熟或适合所有服务岗位。",action:"尝试一次20分钟的同伴讲解或倾听任务，事后向对方核对理解程度。",verification:"记录对方实际得到的帮助与自己感受到的精力变化。"},
 E:{observation:"此维度考察组织资源、推动决定与提出方案的兴趣。",strengthContext:"可以通过小型项目验证自己是否享受组织、沟通和推动进展。",counterContext:"自评企业型兴趣不预测创业收入、管理绩效或领导职位。",action:"组织一次小型活动，明确目标、协作者、任务分配和复盘指标。",verification:"观察自己是否喜欢协调过程，以及任务是否真正按计划完成。"},
 C:{observation:"此维度考察清晰流程、记录整理与准确核对的兴趣。",strengthContext:"结构化任务适合用清单、核对表和版本记录来观察自己的偏好。",counterContext:"愿意整理资料不等于已具备财务审计、数据合规等专业能力。",action:"对一份非敏感资料建立分类规则，并邀请另一人按规则复现。",verification:"统计错误、重复和重新整理次数，而不是只看主观满意度。"},
 "BF-E":{observation:"外向性题项涉及主动沟通、群体参与与社交行为的日常描述。",strengthContext:"比较不同场景中的表达主动性，寻找最舒适且有效的协作方式。",counterContext:"外向与内向没有优劣之分，也不能由均值断定一个人的社交能力或心理状态。",action:"一周内分别记录两次独处和两次交流后的精力与体验。",verification:"观察哪些场景容易进入状态，避免把一个标签当作固定身份。"},
 "BF-A":{observation:"宜人性题项涉及同理心、协作态度与人际感受的自评。",strengthContext:"可以通过不同关系情境理解自己在倾听、拒绝与协商中的选择。",counterContext:"分数无法证明一个人的道德品质，也不表示对所有人或所有关系都如此。",action:"记录一次意见不一致的协作，并观察自己如何表达不同观点。",verification:"区分真诚倾听、礼貌表达与无原则附和。"},
 "BF-C":{observation:"尽责性题项涉及规划、条理、完成任务与细节习惯。",strengthContext:"可以把主观感受与实际任务完成记录做对照。",counterContext:"这里的自评均值不是工作业绩、学习成绩或执行功能的临床测量。",action:"选一个日常任务，以三次实际完成情况记录计划与执行的偏差。",verification:"用事实核对计划的可行性，而不是仅凭自我评价。"},
 "BF-ES":{observation:"情绪稳定性题项涉及压力、担忧及情绪波动的日常体验。",strengthContext:"在不同作息和压力环境下观察情绪变化及有效的自我调节做法。",counterContext:"这不是心理疾病或精神健康筛查；任何高低均值都不能用于诊断。",action:"一周内记录压力情境、睡眠与已使用的应对方法，避免给自己贴标签。",verification:"如持续出现明显痛苦或影响生活，应向有资质的专业人员求助，不依赖问卷结论。"},
 "BF-O":{observation:"智性与想象倾向题项涉及概念理解、创意、思考与语言表达。",strengthContext:"可以观察自己面对新观点、新任务时的好奇心和实际行为。",counterContext:"这一维度不是 IQ、学业表现、创造力产出或智力水平的证明。",action:"尝试一个陌生领域的短阅读或创作任务，并记录自己的探索路径。",verification:"区分喜欢新知识与是否真正学会，后者需要额外任务检验。"}
};
export type FullDimension={
 id:FactorId;name:string;mean:number;answered:number;reverseItems:number;
 signal:string;description:string;insight:string;opportunity:string;caution:string;
 experiment:string;check:string;
 examples:{text:string;response:number;reverse:boolean;keyedResponse:number}[];
};
export type DetailedReport={
 kind:"personal-exploration-report";instrumentId:string;title:string;version:string;generatedAt:string;
 source:string;sourceUrl:string;license:string;scoring:string;itemCount:number;
 dimensions:FullDimension[];consistencyNotes:string[];
 priorities:{title:string;action:string;check:string}[];
 restrictions:string[];
};
function signalForMean(mean:number):string{
 // These are descriptive response averages, not validated normed categories.
 if(mean>=3.75)return "本次对这类题项相对多表示符合/喜欢";
 if(mean<=2.25)return "本次对这类题项相对多表示不符合/不喜欢";
 return "本次对这类题项的回答偏向中间或存在差异";
}
export function buildDetailedReport(instrument:Instrument,answers:Readonly<Record<string,number>>,now=new Date()):DetailedReport{
 const summary=scoreInstrument(instrument,answers);
 if(!summary)throw new Error("INCOMPLETE_REPORT_ANSWERS");
 if(Object.keys(answers).length!==instrument.items.length)throw new Error("INVALID_REPORT_ANSWERS");
 const dimensions:FullDimension[]=summary.dimensions.map(s=>{
  const guidance=GUIDANCE[s.id];
  const items=instrument.items.filter(q=>q.factor===s.id);
  const sorted=items.map(q=>({text:q.text,response:answers[q.id],reverse:q.reverse,
   keyedResponse:q.reverse?6-answers[q.id]:answers[q.id]}))
   .sort((a,b)=>b.keyedResponse-a.keyedResponse);
  const top=sorted[0],low=sorted[sorted.length-1];
  return {id:s.id,name:s.name,mean:s.mean,answered:s.answered,
   reverseItems:items.filter(q=>q.reverse).length,
   signal:signalForMean(s.mean),description:s.description,
   insight:guidance.observation,opportunity:guidance.strengthContext,caution:guidance.counterContext,
   experiment:guidance.action,check:guidance.verification,
   examples:[top,...(top.text===low.text?[]:[low])]};
 });
 const values=Object.values(answers);
 const notes:string[]=[];
 if(new Set(values).size===1)notes.push("本次所有题目选用了同一个等级。可能是认真作答，也可能没有充分区分不同描述；建议结合实际经历核对。不能仅凭这一现象认定无效。");
 notes.push("本报告是一次自我描述快照，场景、语言理解与作答状态都可能影响结果。");
 notes.push("未经中文本土信效度、参照人群分布和测量误差估计验证，因此不提供百分位、常模等级或变化显著性判断。");
 const priorities=instrument.id.startsWith("career")
  ? [...dimensions].sort((a,b)=>b.mean-a.mean).slice(0,3).map(x=>({title:x.name,action:x.experiment,check:x.check}))
  : [...dimensions].sort((a,b)=>Math.abs(b.mean-3)-Math.abs(a.mean-3))
      .slice(0,3).map(x=>({title:x.name,action:x.experiment,check:x.check}));
 return {kind:"personal-exploration-report",instrumentId:instrument.id,title:instrument.title,
  version:instrument.version,generatedAt:now.toISOString(),source:instrument.source,
  sourceUrl:instrument.sourceUrl,license:instrument.license,scoring:instrument.methodology,
  itemCount:instrument.items.length,dimensions,consistencyNotes:notes,priorities,
  restrictions:["不能代替专业心理诊断、医疗意见、人才录用、教育选拔或正式心理测量报告。",
    "各维度是问卷内部的原始均值；并非与常模人群比较得出的水平，也不具有预测职业成功或学习成绩的证据。",
    "所有建议均属于自我观察及日常行动实验；不是根据诊断算法推断的个人能力。"]};
}
export function reportMeta(id:string){
 const item=getInstrument(id);
 if(!item)return null;
 return {id:item.id,title:item.title,version:item.version,source:item.source};
}
