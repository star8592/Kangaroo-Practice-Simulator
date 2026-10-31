import type {AssessmentDomainId} from "./assessment-platform";

/**
 * Read-only editorial summaries of checked primary-source exam rules.
 * This registry is NOT an exam bank, a product catalog, a licensed source file
 * archive, or proof that we have permission to sell third-party questions.
 *
 * Exact year/cycle is part of identity: a 2026 exam cannot be promoted as a
 * confirmed 2027 examination. Source URLs lead to the publisher's document.
 */
export type ExamGuide = Readonly<{
  id:string;
  topicId:string;
  domainId:AssessmentDomainId;
  title:string;
  cycle:string;
  checkedAt:string;
  revision:number;
  summary:string;
  structure:readonly string[];
  timeAndScoring:readonly string[];
  scopeNote:string;
  sourceTitle:string;
  sourceUrl:string;
  issuer:string;
  sourceCategory:"official-organizer"|"official-government-republication";
  itemAvailability:"rules-only";
  paperWindow:"2024-2026";
}>;

export const EXAM_GUIDES:readonly ExamGuide[]=[
  {
    id:"toefl-ibt-2026",topicId:"toefl",domainId:"language",
    title:"托福 TOEFL iBT（2026 年新版）",cycle:"2026-01-21 起",
    checkedAt:"2026-10-31",revision:1,
    summary:"2026 年改版后的 TOEFL iBT 仍覆盖阅读、听力、写作、口语，阅读与听力按新版多阶段自适应机制组织；不能用旧版题型和旧分制伪装新版考试。",
    structure:[
      "阅读：Complete the Words、Read in Daily Life、Read an Academic Passage。",
      "听力：简短应答、会话、公告、学术讲座。",
      "写作：Build a Sentence、Write an Email、Write for an Academic Discussion。",
      "口语：Listen and Repeat、Take an Interview。"
    ],
    timeAndScoring:[
      "官方说明考试总时长约 2 小时；自适应题量和实际耗时可能变化。",
      "2026 年 1 月 21 日起采用 1–6 分段分数和总分；过渡期仍报告可比的 0–120 总分。"
    ],
    scopeNote:"本页是规则解读，不是 ETS 官方真题、报名入口或已上线的仿真托福试卷。",
    sourceTitle:"ETS — TOEFL iBT Test Content and Structure",
    sourceUrl:"https://www.ets.org/toefl/test-takers/ibt/about/content.html",
    issuer:"ETS",sourceCategory:"official-organizer",
    itemAvailability:"rules-only",paperWindow:"2024-2026"
  },
  {
    id:"ielts-academic-2026",topicId:"ielts",domainId:"language",
    title:"雅思 IELTS Academic",cycle:"截至 2026-10-31 官方现行说明",
    checkedAt:"2026-10-31",revision:1,
    summary:"雅思学术类考试包括听、读、写、说四个部分，需区分 Academic 与 General Training；听力和口语相同，但阅读、写作的任务不同。",
    structure:[
      "听力：约 30 分钟。",
      "学术类阅读：60 分钟。",
      "学术类写作：60 分钟。",
      "口语：11–14 分钟。"
    ],
    timeAndScoring:["官方总时长约 2 小时 45 分钟；各场次与地区的具体安排以主办方通知为准。"],
    scopeNote:"当前只有格式指南；无商业转载授权的官方样题不会作为本站付费数字试卷售卖。",
    sourceTitle:"IELTS — IELTS Academic test format and sections",
    sourceUrl:"https://www.ielts.org/take-a-test/test-types/ielts-academic-test",
    issuer:"IELTS",sourceCategory:"official-organizer",
    itemAvailability:"rules-only",paperWindow:"2024-2026"
  },
  {
    id:"postgraduate-2027",topicId:"postgraduate-math",domainId:"university",
    title:"2027 年全国硕士研究生招生考试",cycle:"2027 招生年度（2026 年初试）",
    checkedAt:"2026-10-31",revision:1,
    summary:"硕士研究生招生分初试和复试，不同学科和专业学位考试科目数量、满分不同。选择模板前必须进一步确认报考专业、统考科目和招生单位要求。",
    structure:[
      "常见初试为四个科目单元：思想政治、外国语、业务课（一）、业务课（二），通常满分 100、100、150、150。",
      "部分学科及专业学位使用三单元：100、100、300；部分管理类专业学位使用两单元：200、100。",
      "复试由招生单位组织，可包含笔试、面试或实践考核；不能将全国统考模板代替具体院校自命题。"
    ],
    timeAndScoring:[
      "教育部公布的 2027 年研考初试日期为 2026 年 12 月 19—20 日。",
      "2026 年 10 月 15—24 日为网上报名时段；报名窗口现已结束，不应显示为可报名。"
    ],
    scopeNote:"公开招生管理规定可供规则研究；具体专业目录、自命题试卷和复试安排须核对招生单位原始公告。",
    sourceTitle:"教育部 — 2027 年全国硕士研究生招生工作管理规定",
    sourceUrl:"https://www.moe.gov.cn/srcsite/A15/moe_778/s3261/202609/t20260923_1451734.html",
    issuer:"中华人民共和国教育部",sourceCategory:"official-organizer",
    itemAvailability:"rules-only",paperWindow:"2024-2026"
  },
  {
    id:"legal-profession-2026",topicId:"law-exam",domainId:"professional",
    title:"2026 年国家统一法律职业资格考试",cycle:"2026 考试年度",
    checkedAt:"2026-10-31",revision:1,
    summary:"法考分客观题考试和主观题考试两个阶段；客观题为机考、两张试卷，不可与主观题的独立机考答题规则混用。",
    structure:[
      "客观题试卷一、试卷二各 100 题，每卷 150 分；每卷单选题 50 题，每题 1 分，另外 50 题为多选和不定项选择，每题 2 分。",
      "客观题两卷总分 300 分，闭卷机考，考试按批次组织。",
      "主观题考试以案例分析、法律文书等综合作答方式为主；须另配主观题评分规程，不能用选择题自动判分冒充。"
    ],
    timeAndScoring:[
      "2026 年客观题批次日期是 9 月 12—13 日，每卷 180 分钟。",
      "2026 年主观题考试于 10 月 18 日举行，考试 240 分钟；本年度上述场次均已结束。"
    ],
    scopeNote:"具体客观题考试报名地、考区和主观题要求以司法部、当地司法行政机关正式公告为准；不提供官方题卷复制品。",
    sourceTitle:"司法部 — 2026 年国家统一法律职业资格考试公告",
    sourceUrl:"https://www.moj.gov.cn/jgsz/jgszzsdw/zsdwgjsfkszx/gjsfkszxdt/202606/t20260611_536383.html",
    issuer:"中华人民共和国司法部",sourceCategory:"official-organizer",
    itemAvailability:"rules-only",paperWindow:"2024-2026"
  },
  {
    id:"civil-service-2027",topicId:"guokao",domainId:"professional",
    title:"2027 年度国家公务员考试",cycle:"2027 招录年度（2026 年笔试）",
    checkedAt:"2026-10-31",revision:1,
    summary:"根据国家公务员局发布的 2027 年度招考公告，公共笔试包含行政职业能力测验、申论；根据职位类别分为中央省级综合管理、市县综合管理、行政执法三类试卷。部分职位另需专业科目或非通用语考试。",
    structure:[
      "公共科目：行政职业能力测验为客观题，申论为主观题，满分均为 100 分。",
      "公共笔试试卷按职位类别分为三类；专业岗位按公告加考相关科目。",
      "8 个非通用语职位及部分金融监管、证券监管、公安职位安排独立专业科目考试。"
    ],
    timeAndScoring:[
      "网上报名 2026 年 10 月 15—24 日（已结束）；通过资格审查者 2026 年 11 月 1—6 日报名确认及缴费。",
      "准考证打印：2026 年 11 月 23 日至 11 月 29 日 15:00。",
      "公共科目笔试：2026 年 11 月 29 日 9:00—11:00 行测；14:00—17:00 申论。特定专业科目笔试：11 月 28 日 14:00—16:00。",
      "笔试成绩预计 2027 年 1 月发布，具体日期另行公告；面试时间依招录机关公告而非固定推断。"
    ],
    scopeNote:"本记录为 2027 招录年度的正式公告摘要，不能把 2026 年考期与 2027 年考期混淆；报名、准考证及面试细则请以官方专题网站和单位公告为准。",
    sourceTitle:"国家公务员局 — 中央机关及其直属机构 2027 年度考试录用公务员公告（税务总局上海税务局转载）",
    sourceUrl:"https://shanghai.chinatax.gov.cn/tax/xxgk/rsxx/202610/t481763.html",
    issuer:"国家公务员局（国家税务总局上海市税务局转载）",sourceCategory:"official-government-republication",
    itemAvailability:"rules-only",paperWindow:"2024-2026"
  }
];

export function examGuideById(id:string):ExamGuide|undefined{
  return EXAM_GUIDES.find(item=>item.id===id);
}

/** Verified official discovery links; they remain on the source website.
 * No copying, mirroring, sale or conversion of third-party questions here. */
export const OFFICIAL_STUDY_SOURCES:readonly Readonly<{
  topicId:string; title:string; url:string; cycle:string; form:"interactive-offsite"|"sample-questions"|"preparation";
  rights:"external-reference-only";checkedAt:string;
}>[]=[
  {topicId:"ielts",title:"IELTS Academic 官方样题与答案（原站使用）",
    url:"https://www.ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test",
    cycle:"官方现行样题",form:"sample-questions",rights:"external-reference-only",checkedAt:"2026-10-31"},
  {topicId:"toefl",title:"ETS TOEFL iBT 官方备考资源与免费样题",
    url:"https://www.ets.org/toefl/test-takers/ibt/prepare.htm.html",
    cycle:"2026 新版备考入口",form:"preparation",rights:"external-reference-only",checkedAt:"2026-10-31"},
  {topicId:"law-exam",title:"司法部 2026 客观题官方机考模拟系统公告",
    url:"https://legalinfo.moj.gov.cn/zhfxfzzx/fzzxyw/202608/t20260820_538736.html",
    cycle:"2026",form:"interactive-offsite",rights:"external-reference-only",checkedAt:"2026-10-31"},
  {topicId:"law-exam",title:"司法部 2026 主观题官方机考模拟系统公告",
    url:"https://legalinfo.moj.gov.cn/zhfxfzzx/fzzxyw/202609/t20260920_539941.html",
    cycle:"2026",form:"interactive-offsite",rights:"external-reference-only",checkedAt:"2026-10-31"},
];
