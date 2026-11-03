import {CAREER_ROLES,getCareerRole} from "./career-role-taxonomy";

/**
 * Small, verified product-to-role mapping. This is not an exhaustive job
 * taxonomy, learning CMS, or employment recommendation model.
 *
 * No answer-bearing exam bank may be imported into this CLIENT-SAFE registry.
 * Exact live resource/assessment existence is verified by server-side tests.
 * Each live item points to an existing public URL. 'planned' items are
 * explicitly non-clickable, and may not be sold or described as delivered.
 */
export type CareerPathStage="learn"|"lab"|"formal-exam"|"interview"|"resource";
export type CareerPathStep=Readonly<{
 id:string;stage:CareerPathStage;name:string;detail:string;
 href:string|null;status:"live"|"planned";audience:"both"|"campus"|"social";
 note?:string;
}>;
export type CareerPath=Readonly<{
 slug:string;title:string;subtitle:string;
 audience:string;recommendedFor:readonly string[];roleIds:readonly string[];
 outcomes:readonly string[];requirements:string;
 steps:readonly CareerPathStep[];
 sourceLinks:readonly {label:string;url:string;note:string}[];
 caveat:string;
}>;

export const CAREER_PATHS:readonly CareerPath[]=[
 {
 slug:"ai-agent-engineer",title:"AI Agent 应用工程",subtitle:"从 Python 工具调用到 Agent 项目与岗位模拟",
 audience:"校招开发岗、AI 应用开发和希望转岗 Agent 工程的人群",
 recommendedFor:["大模型应用工程师","智能体开发工程师"],
 roleIds:["intelligence-01-03","intelligence-01-04"],
 requirements:"建议具备 Python 基础及 API/JSON 基本概念；无需自称已具备模型研究经验。",
 outcomes:["解释模型调用、工具 Schema、权限边界的区别","运行并修改 Python 工具调用实验，保留真实日志","完成 24 题 Agent 应用工程岗位模拟并复盘薄弱知识点"],
 steps:[
  {id:"agent-learn",stage:"learn",name:"原创中文 Agent 工程课",detail:"六节教程：工具、权限、执行轨迹、错误处理与独立验收。",href:"/skill-labs/agent-foundations",status:"live",audience:"both"},
  {id:"agent-lab",stage:"lab",name:"运行可复验的 Agent 工具实验",detail:"下载 Python 原始实验源码，执行 self-test 和 demo，记录日志并修改一条失败处理逻辑。",href:"/skill-labs/agent-foundations#run-title",status:"live",audience:"both"},
  {id:"agent-exam",stage:"formal-exam",name:"AI Agent 工程 24 题正式模拟",detail:"45 分钟，100 分；原创岗位情境题，交卷后逐题复盘。",href:"/career/exams/agent-engineering-paper-2026q4-v1",status:"live",audience:"both"},
  {id:"agent-interview",stage:"interview",name:"校招软件项目结构化面试",detail:"可练项目真实性、工程排障、团队协作；这是通用软件研发面试，非专门的 Agent 面试。",href:"/career/interviews/campus-software",status:"live",audience:"campus",note:"专属 AI Agent 语义面试尚未发布。"},
 ],
 sourceLinks:[
  {label:"micrograd · 反向传播与自动微分",url:"https://github.com/karpathy/micrograd",note:"上游代码与原始讲解；不等于本站课程。"},
  {label:"nn-zero-to-hero · 神经网络视频与笔记",url:"https://github.com/karpathy/nn-zero-to-hero",note:"从原始视频和 Notebook 学原理。"},
  {label:"nanochat · 语言模型训练与交互",url:"https://github.com/karpathy/nanochat",note:"用于扩展理解，不要求完成大型模型训练。"},
  {label:"Model Context Protocol 官方文档",url:"https://modelcontextprotocol.io/docs/getting-started/intro",note:"工具与上下文互操作协议的官方入口。"},
 ],
 caveat:"当前课程以受控模拟实验为主，不宣称接入真实大模型服务。面试仅提供通用软件研发练习，不能替代雇主面试或保证录用。",
 },
 {
 slug:"data-analyst-sql",title:"数据分析与 SQL 实训",subtitle:"先在浏览器真实执行查询，再学习解释业务结果",
 audience:"数据分析、商业分析、BI 和希望从运营转入数据岗的人群",
 recommendedFor:["数据分析师","商业分析师","BI分析师"],
 roleIds:["intelligence-02-01","intelligence-02-04","intelligence-02-05"],
 requirements:"建议掌握基本表格操作与初等数学；从 SELECT、过滤、聚合开始。",
 outcomes:["能写出可执行 SQL 查询并检查结果","能说明 SQL 结果的单位、筛选范围和业务含义","能够识别哪些数据分析能力尚需项目或正式岗位模拟证明"],
 steps:[
  {id:"data-learn",stage:"resource",name:"Python 数据科学原著索引",detail:"提供原著资料、中文版导学及来源，不冒充本站原创整本书。",href:"/skill-labs/books/python-data-science-handbook",status:"live",audience:"both"},
  {id:"data-lab",stage:"lab",name:"浏览器 SQL 真执行训练",detail:"真实 SQLite 查询和判分；用运行结果而不是单纯的选择题证明基本 SQL 能力。",href:"/skill-labs/sql-lab",status:"live",audience:"both"},
  {id:"data-exam",stage:"formal-exam",name:"数据分析岗位完整专业模拟卷",detail:"需要补足统计推断、可解释性和数据质量等正式模块；目前不能将 SQL 练习冒充标准模拟卷。",href:null,status:"planned",audience:"both"},
  {id:"data-interview",stage:"interview",name:"数据分析岗位结构化面试",detail:"需要根据具体岗位职责形成数据解释与业务追问题本。",href:null,status:"planned",audience:"both"},
 ],
 sourceLinks:[
  {label:"Python Data Science Handbook",url:"https://jakevdp.github.io/PythonDataScienceHandbook/",note:"开放原著与示例资料。"},
  {label:"SQLite 官方 SELECT 文档",url:"https://www.sqlite.org/lang_select.html",note:"SQL 语法与行为的权威参考。"},
 ],
 caveat:"SQL 实操已经开放，但尚无经过验收的数据分析专项正式笔试或专项 AI 面试；它们不会显示为可购买服务。",
 },
 {
 slug:"commerce-operations",title:"商品运营与经营分析",subtitle:"从 GMV、退款率和广告贡献到完整岗位模拟",
 audience:"电商运营、商品运营、增长分析及计划转入商业运营的人群",
 recommendedFor:["商品运营专员","零售经营分析师","电商运营专员"],
 roleIds:["product-ops-02-01","product-ops-02-09","product-ops-02-02"],
 requirements:"建议能进行比例、加减乘除和基本 Excel 计算；无需编程基础。",
 outcomes:["区分 GMV、退款后收入、贡献与简化 ROI","独立计算渠道预算案例并解释约束条件","完成 24 题标准运营岗位模拟并复盘"],
 steps:[
  {id:"ops-learn",stage:"learn",name:"原创商品运营 ROI 完整教程",detail:"有假设、有计算案例、有参考答案，可免费阅读与下载。",href:"/career/guides/retail-campaign-roi-handbook",status:"live",audience:"both"},
  {id:"ops-lab",stage:"lab",name:"渠道分析手工复算练习",detail:"基于教程内原创合成数据完成退款后收入、贡献和 ROI 计算；目前为可复算练习，不是在线代码判分。",href:"/career/guides/retail-campaign-roi-handbook",status:"live",audience:"both"},
  {id:"ops-exam",stage:"formal-exam",name:"商品运营岗位 24 题正式模拟",detail:"45 分钟，100 分；覆盖经营指标、ROI、运营场景和决策。",href:"/career/exams/operations-paper-2026q4-v1",status:"live",audience:"both"},
  {id:"ops-interview",stage:"interview",name:"运营岗位案例追问面试",detail:"需基于业务案例编制可核对的结构化题本；尚未验收，不提供假入口。",href:null,status:"planned",audience:"both"},
 ],
 sourceLinks:[
  {label:"岗位研究与来源",url:"https://socthink.cn/career#career-evidence",note:"本站非随机公开招聘样本，不能代表全行业需求。"},
 ],
 caveat:"教程数据是明确标注的原创合成案例。简化广告 ROI 不等于会计利润，也不能证明广告具有因果增量。",
 },
 {
 slug:"software-engineer",title:"软件研发与工程实操",subtitle:"写代码、执行自动测试、完成计时编程与结构化面试",
 audience:"软件工程校招、实习求职者和准备转岗的软件开发人员",
 recommendedFor:["前端开发工程师","Java开发工程师","Python开发工程师"],
 roleIds:["digital-01-02","digital-01-01","digital-01-03"],
 requirements:"需要有基本 JavaScript 编程能力；其他语言岗位可练习通用工程思路，但不能代替语言专项面试。",
 outcomes:["运行并调试可判分的编程练习","完成 60 分钟六题编程模拟并查看评分","在结构化面试中讲清项目贡献与工程判断"],
 steps:[
  {id:"software-learn",stage:"resource",name:"技术书库与真实文档",detail:"官方原著入口和已审核的导学资料，用于补足软件工程基础。",href:"/skill-labs/books",status:"live",audience:"both"},
  {id:"software-lab",stage:"lab",name:"JavaScript 真实编程实操",detail:"六项可执行编程任务；通过代码测试检查，而非只选择答案。",href:"/skill-labs/code-lab",status:"live",audience:"both"},
  {id:"software-exam",stage:"formal-exam",name:"六题 60 分钟编程模拟",detail:"实际编程模拟，限时、自动测试与评分；这是完整代码实操，不是通用24题笔试。",href:"/skill-labs/engineering-mock",status:"live",audience:"both"},
  {id:"software-interview",stage:"interview",name:"校招软件研发五轮面试",detail:"项目深挖、技术排障、团队协作及追问；由回答特征选择追问，不是 AI 语义评分。",href:"/career/interviews/campus-software",status:"live",audience:"campus"},
 ],
 sourceLinks:[
  {label:"MDN JavaScript 官方参考",url:"https://developer.mozilla.org/zh-CN/docs/Web/JavaScript",note:"语法与语言行为的主要参考。"},
 ],
 caveat:"当前项目侧重 JavaScript 和通用工程能力，不将它宣传为 Java/Python 专项官方招聘卷。",
 },
] as const;

export function getCareerPath(slug:string):CareerPath|undefined {
 return CAREER_PATHS.find(p=>p.slug===slug);
}
export function careerPathForRole(roleId:string):CareerPath|undefined {
 return CAREER_PATHS.find(p=>p.roleIds.includes(roleId));
}
export function validateCareerPaths():string[]{
 const issues:string[]=[];
 const ids=new Set<string>(),links=new Set<string>();

 for(const path of CAREER_PATHS){
  if(ids.has(path.slug))issues.push("duplicate-path:"+path.slug);
  ids.add(path.slug);
  if(!/^[a-z0-9-]+$/.test(path.slug)||path.steps.length<3||path.outcomes.length<2)issues.push("invalid-path:"+path.slug);
  for(const id of path.roleIds){
   if(!getCareerRole(id))issues.push("unknown-role:"+id);
   if(links.has(id))issues.push("role-mapped-twice:"+id);
   links.add(id);
  }
  for(const s of path.steps){
   if(s.status==="planned"&&s.href!==null)issues.push("planned-with-link:"+path.slug+"/"+s.id);
   if(s.status==="live"&&(!s.href||!s.href.startsWith("/")||s.href.includes("//")||s.href.includes("?")))
    issues.push("invalid-live-link:"+path.slug+"/"+s.id);
  }
  for(const source of path.sourceLinks){
   try {if(new URL(source.url).protocol!=="https:")issues.push("insecure-source:"+path.slug);}
   catch {issues.push("broken-source:"+path.slug);}
  }
 }
 if(CAREER_ROLES.length<100)issues.push("taxonomy-not-loaded");
 return issues;
}
