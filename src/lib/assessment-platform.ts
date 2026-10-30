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
    id:"school",name:{zh:"K12 学业与能力",en:"School learning"},
    summary:{zh:"基础数学、逐题复盘与长期能力诊断；逐步拓展学科。",en:"Math fluency, review and learning diagnostics, expanding across subjects."},
    audience:{zh:"小学—高中学生与家长",en:"Students and families"},
    readiness:"live",formats:["single-choice","numeric","symbolic"],
    liveRoutes:[
      {href:"/arithmetic",title:{zh:"开始数学能力训练",en:"Start math practice"}},
      {href:"/arithmetic/print",title:{zh:"打印数学练习卷",en:"Printable math worksheets"}},
      {href:"/assessments/school/xiaoshengchu",title:{zh:"查小升初学校与试卷来源",en:"Find school admission exam sources"}},
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
      {href:"/events",title:{zh:"查看赛事与报名信息",en:"View competition calendar"}},
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
    id:"university",name:{zh:"大学与研究生考试",en:"University & postgraduate"},
    summary:{zh:"课程、研究生升学、学术技能与专业入门能力测评。",en:"Coursework, postgraduate exams and academic readiness."},
    audience:{zh:"大学生与考研学生",en:"Undergraduates and postgraduate candidates"},
    readiness:"planned",formats:["single-choice","short-answer","essay","numeric"],
    liveRoutes:[],nextProof:{zh:"整理官方考纲与可合法发布的试题，验证学科评分。",en:"Validate syllabi, distribution rights and subject scoring."},
  },
  {
    id:"career",name:{zh:"职业技能与岗位实操",en:"Career skills & simulations"},
    summary:{zh:"Python、SQL、数据分析、AI 实操与模拟面试，强调能完成真实任务。",en:"Python, SQL, data and AI skills, job simulations and interviews."},
    audience:{zh:"大学毕业生、求职者和企业",en:"Graduates, applicants and employers"},
    readiness:"planned",formats:["code","sql","sandbox","interview","short-answer"],
    liveRoutes:[],nextProof:{zh:"首先做通一场 SQL／数据清洗实操的真实测试与评分。",en:"Deliver one real SQL/data-cleaning task with executable scoring."},
  },
  {
    id:"professional",name:{zh:"职业资格与公职考试",en:"Professional qualifications"},
    summary:{zh:"资格考试、法规知识、专业实务与应试模拟。",en:"Qualification exams, regulatory topics and applied practice."},
    audience:{zh:"资格证考生与职业学习者",en:"Professional exam candidates"},
    readiness:"planned",formats:["single-choice","multiple-choice","short-answer"],
    liveRoutes:[],nextProof:{zh:"按最新官方考纲、题源权利和地区建立考试蓝图。",en:"Verify official syllabi, regional relevance and publication rights."},
  },
  {
    id:"interest",name:{zh:"职业兴趣与综合能力",en:"Interests & aptitude"},
    summary:{zh:"有适用性说明的兴趣与能力自我探索，不作临床诊断。",en:"Evidence-informed self-reflection, not clinical diagnosis."},
    audience:{zh:"学生、求职者与成长探索者",en:"Learners and career explorers"},
    readiness:"planned",formats:["scale","short-answer"],
    liveRoutes:[],nextProof:{zh:"确认量表的授权、信度、效度和适用年龄后开放。",en:"Verify licensing, reliability, validity and suitable ages."},
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
