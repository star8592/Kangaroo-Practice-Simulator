/**
 * Client-only interview context matching.
 * Intentionally lexical: never describe this as AI understanding, a hiring score,
 * or evidence that a skill is present/absent in the candidate.
 */
export type InterviewJobContext={
 targetRole:string;
 jobDescription:string;
 experienceSummary:string;
};
export const EMPTY_INTERVIEW_JOB_CONTEXT:InterviewJobContext={
 targetRole:"",jobDescription:"",experienceSummary:"",
};
export const INTERVIEW_JOB_LIMITS={
 targetRole:80,jobDescription:4000,experienceSummary:1800,
} as const;

type Term={label:string;pattern:RegExp};
const CAMPUS_TERMS:readonly Term[]=[
 {label:"TypeScript",pattern:/\btypescript\b/i},
 {label:"JavaScript",pattern:/\bjavascript\b/i},
 {label:"React",pattern:/\breact\b/i},
 {label:"Vue",pattern:/\bvue(?:\.js)?\b/i},
 {label:"Java",pattern:/\bjava\b/i},
 {label:"Python",pattern:/\bpython\b/i},
 {label:"Node.js",pattern:/\bnode(?:\.js|js)?\b/i},
 {label:"SQL",pattern:/\bsql\b/i},
 {label:"Redis",pattern:/\bredis\b/i},
 {label:"MySQL",pattern:/\bmysql\b/i},
 {label:"PostgreSQL",pattern:/\bpostgres(?:ql)?\b/i},
 {label:"Linux",pattern:/\blinux\b/i},
 {label:"Docker",pattern:/\bdocker\b/i},
 {label:"Kubernetes",pattern:/\b(?:kubernetes|k8s)\b/i},
 {label:"Git",pattern:/\bgit\b/i},
 {label:"CI/CD",pattern:/\bci\s*\/\s*cd\b/i},
 {label:"MCP",pattern:/\bmcp\b/i},
 {label:"AI Agent",pattern:/\b(?:ai\s+agent|llm\s+agent)\b/i},
 {label:"单元测试",pattern:/单元测试/u},
 {label:"接口开发",pattern:/接口开发|接口设计|API开发/u},
 {label:"性能优化",pattern:/性能优化/u},
 {label:"数据结构",pattern:/数据结构/u},
 {label:"算法设计",pattern:/算法设计|算法能力/u},
 {label:"微服务",pattern:/微服务/u},
];
const PROCUREMENT_TERMS:readonly Term[]=[
 {label:"供应商开发",pattern:/供应商开发|供应商准入/u},
 {label:"供应商管理",pattern:/供应商管理|供应商绩效/u},
 {label:"商务谈判",pattern:/商务谈判|采购谈判/u},
 {label:"采购成本",pattern:/采购成本|成本控制|降本/u},
 {label:"交期管理",pattern:/交期|按时交付|交付周期/u},
 {label:"库存管理",pattern:/库存管理|库存周转/u},
 {label:"供应链风险",pattern:/供应链风险|断供|供应风险/u},
 {label:"质量管理",pattern:/质量管理|质量体系|来料质量/u},
 {label:"合同管理",pattern:/合同管理|合同条款/u},
 {label:"招投标",pattern:/招投标|招标|投标/u},
 {label:"账期管理",pattern:/账期|应付账款/u},
 {label:"ERP",pattern:/\berp\b/i},
 {label:"SAP",pattern:/\bsap\b/i},
 {label:"Excel",pattern:/\bexcel\b/i},
 {label:"数据分析",pattern:/数据分析|数据建模/u},
 {label:"TCO",pattern:/\btco\b|总拥有成本/iu},
];

function getTerms(profileId:string):readonly Term[]{
 return profileId==="campus-software"?CAMPUS_TERMS:profileId==="social-procurement"?PROCUREMENT_TERMS:[];
}
export function isInterviewJobContext(value:unknown):value is InterviewJobContext{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 return (Object.keys(INTERVIEW_JOB_LIMITS) as Array<keyof InterviewJobContext>).every(
  k=>typeof v[k]==="string"&&(v[k] as string).length<=INTERVIEW_JOB_LIMITS[k]
 );
}
export function analyzeInterviewJobContext(profileId:string,context:InterviewJobContext){
 const terms=getTerms(profileId).filter(t=>t.pattern.test(context.jobDescription)).slice(0,10);
 return {
  signals:terms.map(t=>t.label),
  mentioned:terms.filter(t=>t.pattern.test(context.experienceSummary)).map(t=>t.label),
  notMentioned:terms.filter(t=>!t.pattern.test(context.experienceSummary)).map(t=>t.label),
 };
}
const FOCUS_PROMPTS=[
 "请举一个你真实做过的相关项目或任务，没有实践经历可以如实说明准备情况。",
 "请解释你亲自负责的实现或业务决策，以及如何核对结果。",
 "请说明遇到相关故障或交付风险时，你最先验证哪项事实。",
 "请谈谈与团队或合作方意见不同时，你会用什么证据推进解决。",
 "请说清这项要求与你的目标岗位如何匹配，以及下一步准备。",
] as const;

/** Append a verifiable JD-specific probe to the existing transparent rule follow-up. */
export function buildJobFocusedFollowup(
 profileId:string,questionIndex:number,baseFollowup:string,answer:string,context:InterviewJobContext
):string{
 const terms=getTerms(profileId).filter(t=>t.pattern.test(context.jobDescription)).slice(0,10);
 if(!terms.length)return baseFollowup;
 const term=terms[Math.max(0,questionIndex)%terms.length];
 const inSummary=term.pattern.test(context.experienceSummary);
 const inAnswer=term.pattern.test(answer);
 const evidenceNote=inSummary
  ?"你在经历摘要中也提到了它，请指出对应的真实证据。"
  :inAnswer?"你刚才提到了它，请补充可核对的细节。"
  :"如果尚无相关经历，请直接说明，不必编造。";
 return `${baseFollowup} 你提供的招聘描述涉及「${term.label}」。${FOCUS_PROMPTS[Math.max(0,questionIndex)%FOCUS_PROMPTS.length]}${evidenceNote}`;
}
