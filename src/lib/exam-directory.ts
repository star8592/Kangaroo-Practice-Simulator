import {ASSESSMENT_DOMAINS, type AssessmentDomainId, type BilingualText} from "./assessment-platform";

/** Navigation topics do not represent a licensed question bank or a paid SKU. */
export type DirectoryTopic = Readonly<{
  id: string;
  title: BilingualText;
  status: "live" | "planned";
  /** Present only when the destination is genuinely usable. */
  href?: string;
}>;

export type ExamDirectoryGroup = Readonly<{
  domainId: AssessmentDomainId;
  topics: readonly DirectoryTopic[];
}>;

const topic = (id:string,zh:string,en:string,href?:string):DirectoryTopic =>
  ({id,title:{zh,en},status:href?"live":"planned",...(href?{href}:{})});

/**
 * One navigational hierarchy across homepage / assessments / mobile.
 * A heading is NOT a promise of available exams, pricing, papers or answers.
 * Topic-level readiness must be based on a working public route, not on plans.
 */
export const EXAM_DIRECTORY:readonly ExamDirectoryGroup[]=[
  {domainId:"school",topics:[
    topic("math-g1-g12","小学至高中计算训练","G1–G12 math practice","/arithmetic"),
    topic("print-math","数学练习卷打印","Printable math practice","/arithmetic/print"),
    topic("xiaoshengchu-math","小升初数学","Primary-to-middle school math"),
    topic("xiaoshengchu-chinese","小升初语文","Primary-to-middle school Chinese"),
    topic("xiaoshengchu-english","小升初英语","Primary-to-middle school English"),
    topic("primary-tests","小学期中期末","Primary school exams"),
    topic("middle-math","初中数学与物理","Middle school math & physics"),
    topic("high-science","高中物理与化学","High school physics & chemistry"),
    topic("zhongkao","中考学科考试","Senior high entrance examinations"),
    topic("gaokao","高考学科考试","University entrance examinations"),
  ]},
  {domainId:"math-competition",topics:[
    topic("kangaroo","袋鼠数学","Math Kangaroo","/competitions"),
    topic("australian-amc","澳洲 AMC","Australian AMC","/competitions"),
    topic("maa-amc","美国 AMC / AIME","US AMC / AIME","/competitions"),
    topic("cemc","加拿大 CEMC","Canadian CEMC","/competitions"),
    topic("seamo","SEAMO 新加坡数学","SEAMO","/competitions"),
    topic("ukmt","英国 UKMT","UKMT"),
    topic("international-olympiads","其他国际数学奥赛","Other international math contests"),
  ]},
  {domainId:"language",topics:[
    topic("ket-pet","剑桥 KET / PET","Cambridge KET / PET"),
    topic("ielts","雅思 IELTS","IELTS"),
    topic("toefl","托福 TOEFL","TOEFL"),
    topic("pte","PTE 学术英语","PTE Academic"),
    topic("cet","英语四级 / 六级","CET-4 / CET-6"),
    topic("gre-gmat","GRE / GMAT","GRE / GMAT"),
    topic("hsk","汉语水平考试 HSK","Chinese HSK"),
    topic("bec","BEC 商务英语","Business English BEC"),
  ]},
  {domainId:"university",topics:[
    topic("postgraduate-math","考研数学","Postgraduate mathematics"),
    topic("postgraduate-english","考研英语","Postgraduate English"),
    topic("postgraduate-politics","考研政治","Postgraduate politics"),
    topic("postgraduate-specialty","考研专业课","Postgraduate subject exams"),
    topic("university-subjects","大学课程与期末考试","University course exams"),
    topic("academic-skills","学术能力与研究方法","Academic research skills"),
    topic("university-english","大学专业英语","University academic English"),
  ]},
  {domainId:"career",topics:[
    topic("sql","SQL 数据库实操","SQL practical assessment"),
    topic("data-cleaning","数据清洗","Data cleaning"),
    topic("python","Python 编程","Python programming"),
    topic("analysis","数据分析与统计","Data analysis & statistics"),
    topic("excel","Excel 与办公技能","Spreadsheet & office skills"),
    topic("ai-application","AI 应用实操","Practical AI tools"),
    topic("job-interviews","岗位模拟面试","Job interview simulations"),
  ]},
  {domainId:"professional",topics:[
    topic("guokao","公务员国考 / 省考","Civil service examinations"),
    topic("public-institutions","事业单位招聘考试","Public institution recruitment"),
    topic("teacher-cert","教师资格证","Teaching qualifications"),
    topic("law-exam","国家统一法律职业资格考试","Legal professional qualification"),
    topic("cpa","注册会计师 / 财会资格","CPA & accounting"),
    topic("construction","建造师 / 工程资格","Construction and engineering"),
    topic("economics","经济师 / 金融资格","Economics & financial qualifications"),
    topic("medical","医疗卫生职业资格","Healthcare qualifications"),
    topic("securities","证券与基金从业资格","Securities and fund qualifications"),
  ]},
  {domainId:"interest",topics:[
    topic("career-interest","职业兴趣探索","Career interest exploration"),
    topic("aptitude","逻辑推理与基础能力","Reasoning and aptitude"),
    topic("learning-style","学习策略自评","Learning strategies"),
    topic("personality","人格与自我探索问卷","Personality self-reflection"),
    topic("comprehensive","综合能力测评","General aptitude assessment"),
  ]},
] as const;

export function validateExamDirectory():string[]{
  const problems:string[]=[];
  const known=new Map(ASSESSMENT_DOMAINS.map(x=>[x.id,x]));
  const groups=new Set<AssessmentDomainId>(),topics=new Set<string>();
  for(const group of EXAM_DIRECTORY){
    if(groups.has(group.domainId)) problems.push("duplicate-domain:"+group.domainId);
    groups.add(group.domainId);
    if(!known.has(group.domainId)) problems.push("unknown-domain:"+group.domainId);
    if(!group.topics.length) problems.push("empty-domain:"+group.domainId);
    for(const t of group.topics){
      if(topics.has(t.id)) problems.push("duplicate-topic:"+t.id);
      topics.add(t.id);
      if(!t.title.zh.trim()||!t.title.en.trim()) problems.push("missing-title:"+t.id);
      if(t.status==="planned"&&t.href) problems.push("planned-has-live-route:"+t.id);
      if(t.status==="live"&&(!t.href||!t.href.startsWith("/")||
        t.href.startsWith("//")||t.href.includes("..")||t.href.includes("?")))
        problems.push("invalid-live-route:"+t.id);
      if(known.get(group.domainId)?.readiness!=="live"&&t.status==="live")
        problems.push("unlaunched-domain-live-topic:"+t.id);
    }
  }
  for(const domain of ASSESSMENT_DOMAINS)
    if(!groups.has(domain.id)) problems.push("missing-domain:"+domain.id);
  return problems;
}
