/**
 * SOCTHINK's single public assessment domain registry.
 * Never turn an unlaunched domain into an actionable product or payment CTA.
 * Existing math endpoints remain the authoritative assessment adapter until
 * the generic Assessment Core has proven parity.
 */
export const ASSESSMENT_FORMATS = [
  "single-choice","multiple-choice","numeric","symbolic","short-answer",
  "essay","listening","speaking","code","sql","sandbox","interview","scale",
] as const;
export type AssessmentFormat = typeof ASSESSMENT_FORMATS[number];
export type AssessmentDomainId =
  "school" | "math-competition" | "language" | "university" |
  "career" | "professional" | "interest";
export type DomainReadiness = "live" | "planned";
export type BilingualText = { zh: string; en: string };
export type AssessmentDomain = {
  id: AssessmentDomainId;
  name: BilingualText;
  summary: BilingualText;
  audience: BilingualText;
  readiness: DomainReadiness;
  formats: readonly AssessmentFormat[];
  /** Only genuinely running public paths. No placeholder links. */
  liveRoutes: readonly { href: string; title: BilingualText }[];
  nextProof: BilingualText;
};
export const ASSESSMENT_DOMAINS: readonly AssessmentDomain[] = [
  {
    id:"school",name:{zh:"中小学与升学",en:"School learning & admissions"},
    summary:{zh:"基础数学、逐题复盘与长期能力诊断；逐步拓展学科。",en:"Math fluency, review and learning diagnostics, expanding across subjects."},
    audience:{zh:"小学—高中学生与家长",en:"Students and families"},
    readiness:"live",formats:["single-choice","numeric","symbolic"],
    liveRoutes:[
      {href:"/arithmetic",title:{zh:"开始数学能力训练",en:"Start math practice"}},
      {href:"/arithmetic/print",title:{zh:"打印数学练习卷",en:"Printable math worksheets"}},
    ],
    nextProof:{zh:"复用同一考试、评分及报告协议，接入其他学科。",en:"Unify exam, grading and report contracts before expanding subjects."},
  },
  {
    id:"math-competition",name:{zh:"全球数学竞赛",en:"Math competitions"},
    summary:{zh:"国际数学赛事、样题、真题及模拟考试。",en:"International math competitions, samples, past papers and mock exams."},
    audience:{zh:"竞赛学生、家长与教师",en:"Math competitors and educators"},
    readiness:"live",formats:["single-choice","multiple-choice","numeric"],
    liveRoutes:[
      {href:"/competitions",title:{zh:"进入国际数学竞赛",en:"Explore math competitions"}},
      {href:"/events",title:{zh:"查看数学赛事与报名信息",en:"View math competition calendar"}},
    ],
    nextProof:{zh:"将已有试卷评分与解析无损接入统一测评协议。",en:"Validate parity against the shared assessment contracts."},
  },
  {
    id:"language",name:{zh:"语言与国际考试",en:"Language & international exams"},
    summary:{zh:"阅读、听力、口语、写作与国际标准化考试。",en:"Reading, listening, speaking, writing and standardized exams."},
    audience:{zh:"英语学习者及留学申请者",en:"Language learners and applicants"},
    readiness:"planned",formats:["single-choice","listening","speaking","essay"],
    liveRoutes:[],nextProof:{zh:"先验证合法来源与口语/写作评分，再开放真实样卷。",en:"Prove source rights and speaking/writing rubrics before launch."},
  },
  {
    id:"university",name:{zh:"大学与考研",en:"University & postgraduate"},
    summary:{zh:"课程、研究生升学、学术技能与专业入门能力测评。",en:"Coursework, postgraduate exams and academic readiness."},
    audience:{zh:"大学生与考研学生",en:"Undergraduates and postgraduate candidates"},
    readiness:"planned",formats:["single-choice","short-answer","essay","numeric"],
    liveRoutes:[],nextProof:{zh:"整理官方考纲与可合法发布的试题，验证学科评分。",en:"Validate syllabi, distribution rights and subject scoring."},
  },
  {
    id:"career",name:{zh:"职业技能与岗位实操",en:"Career skills & simulations"},
    summary:{zh:"Python、SQL、数据分析、AI 实操与模拟面试，强调能完成真实任务。",en:"Python, SQL, data and AI skills, job simulations and interviews."},
    audience:{zh:"大学毕业生、求职者和企业",en:"Graduates, applicants and employers"},
    readiness:"live",formats:["code","sql","sandbox","interview","short-answer","single-choice","multiple-choice","numeric"],
    liveRoutes:[{href:"/career",title:{zh:"查看企业岗位需求并免费体验采购实操",en:"Explore employer demand and try a free procurement case"}}],
    nextProof:{zh:"首个采购原创实操已经提供真实客观评分；其他岗位类型、持续成绩、付费权益仍在建设。",en:"One original procurement case now has deterministic grading; broader careers, persistent records, and paid access remain in development."},
  },
  {
    id:"professional",name:{zh:"职业资格与公职考试",en:"Professional qualifications"},
    summary:{zh:"资格考试、法规知识、专业实务与应试模拟。",en:"Qualification exams, regulatory topics and applied practice."},
    audience:{zh:"资格证考生与职业学习者",en:"Professional exam candidates"},
    readiness:"planned",formats:["single-choice","multiple-choice","short-answer"],
    liveRoutes:[],nextProof:{zh:"按最新官方考纲、题源权利和地区建立考试蓝图。",en:"Verify official syllabi, regional relevance and publication rights."},
  },
  {
    id:"interest",name:{zh:"人格、职业兴趣与能力探索",en:"Personality & career exploration"},
    summary:{zh:"免费研究试测已开放。中文量表信效度与常模尚未验证，暂不提供标准化结论。",en:"Free research previews are live; Chinese norms and validation are pending."},
    audience:{zh:"18岁及以上成人（当前研究试测）",en:"Adults 18+ (research previews)"},
    readiness:"live",formats:["scale","short-answer"],
    liveRoutes:[{href:"/assessment-center",title:{zh:"进入智量测评中心（研究预览）",en:"Explore research-preview assessments"}}],
    nextProof:{zh:"完成中文翻译核验、测量学研究与常模验证后再开放正式收费报告。",en:"Validate local translation, psychometrics and norms before any standardized paid report."},
  },
] as const;

export const LIVE_ASSESSMENT_DOMAINS = ASSESSMENT_DOMAINS.filter(x=>x.readiness==="live");
export const PLANNED_ASSESSMENT_DOMAINS = ASSESSMENT_DOMAINS.filter(x=>x.readiness==="planned");
export function getAssessmentDomain(id: string): AssessmentDomain|undefined {
  return ASSESSMENT_DOMAINS.find(x=>x.id===id);
}

/** Publicly accessible routes, regardless of learner authentication after entry. */
export function validateAssessmentCatalog(): string[] {
  const issues:string[]=[];
  const slugs=new Set<string>();
  for(const domain of ASSESSMENT_DOMAINS) {
    if(slugs.has(domain.id)) issues.push("duplicate domain: "+domain.id);
    slugs.add(domain.id);
    if(!domain.name.zh||!domain.name.en||!domain.summary.zh) issues.push("missing labels: "+domain.id);
    if(domain.readiness==="live"&&domain.liveRoutes.length===0)
      issues.push("live domain missing a real route: "+domain.id);
    if(domain.readiness==="planned"&&domain.liveRoutes.length>0)
      issues.push("planned domain exposes a live route: "+domain.id);
    for(const route of domain.liveRoutes) {
      if(!route.href.startsWith("/")||route.href.startsWith("//")||
        route.href.includes("..")||route.href.includes("?")||!route.title.zh)
        issues.push("unsafe route for "+domain.id+": "+route.href);
    }
  }
  return issues;
}
