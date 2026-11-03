/** SOC THINK's read-only public discovery projection.
 * Composes the existing authoritative registries without creating a second CMS,
 * SKU store, payment ledger, or question database. Server import only: the
 * formal-exam adapter is intentionally not shipped to a browser bundle.
 */
import { TECH_BOOKS } from "@/lib/tech-books";
import { CAREER_ORIGINAL_GUIDES } from "@/lib/career-original-guides";
import { CAREER_FORMAL_PAPERS } from "@/lib/career-formal-bank";
import { ASSESSMENT_EVIDENCE } from "@/lib/assessment-evidence";
import { EXAM_DIRECTORY } from "@/lib/exam-directory";
import { AGENT_FOUNDATIONS_COURSE } from "@/lib/frontier-agent-course";
import { WEBGPU_COURSE } from "@/lib/webgpu-course";
import agentExam from "../../data/career/formal_exam_agent_20261103.json";

export type DiscoveryKind = "考试" | "试卷" | "职业岗位" | "技能" | "技术书" | "岗位资料" | "测评" | "商城";
export type DiscoveryEntry = Readonly<{
  id: string; title: string; summary: string; kind: DiscoveryKind;
  href: string; keywords?: string; updatedAt?: string;
}>;
export type HomepageUpdate = Readonly<{
  id: string; date: string; title: string; summary: string; kind: string; href: string;
}>;

/** A site-wide catalog release date, not a fabricated per-book publication date. */
export const BOOK_CATALOG_RELEASED_AT = "2026-11-03";

/** Only public, genuinely reachable destinations. No placeholders or paywall claims. */
export function publicDiscoveryEntries(): DiscoveryEntry[] {
  const entries: DiscoveryEntry[] = [
    { id:"hub-exams",kind:"考试",title:"全部考试与模拟",summary:"按考试类别查找可用模拟与练习",href:"/assessments",keywords:"考试 数学 校内 竞赛" },
    { id:"hub-resources",kind:"试卷",title:"试卷与训练资料",summary:"筛选已可用于在线训练的试卷",href:"/resources",keywords:"真题 数学 资料 试卷" },
    { id:"hub-career",kind:"职业岗位",title:"职业岗位与模拟笔试",summary:"按岗位找模拟笔试与免费原创资料",href:"/career",keywords:"招聘 校招 社招 岗位 面试" },
    { id:"hub-skills",kind:"技能",title:"技能实训中心",summary:"SQL、编程、AI Agent、3D 等实训",href:"/skill-labs",keywords:"学习 代码 技术 项目" },
    { id:"hub-shop",kind:"商城",title:"数字资料商城",summary:"核对实际在架的原创数字资料与交付方式",href:"/shop",keywords:"购买 下载 资料 商城 商品" },
    { id:"hub-assessments",kind:"测评",title:"专业能力与研究测评",summary:"逻辑能力训练、职业兴趣与研究性量表",href:"/assessment-center",keywords:"测评 心理 性格 能力 逻辑" },
    { id:"hub-events",kind:"考试",title:"考试日程与赛事管理",summary:"数学赛事信息及个人考试规划",href:"/exam-planner",keywords:"赛历 赛事 报名 日程" },
    { id:"lab-agent",kind:"技能",title:AGENT_FOUNDATIONS_COURSE.title,summary:AGENT_FOUNDATIONS_COURSE.summary,
      href:"/skill-labs/agent-foundations",keywords:"Python MCP LLM Agent 智能体 工具调用",updatedAt:AGENT_FOUNDATIONS_COURSE.updatedAt },
    { id:"lab-webgpu",kind:"技能",title:WEBGPU_COURSE.title,summary:WEBGPU_COURSE.description,
      href:"/skill-labs/webgpu-basics",keywords:"Three.js WebGPU 3D 渲染 游戏",updatedAt:WEBGPU_COURSE.updatedAt },
    { id:"lab-sql",kind:"技能",title:"SQL 数据工程实训",summary:"浏览器内真实 SQL 执行与结果核验",
      href:"/skill-labs/sql-lab",keywords:"数据库 查询 SQL 数据分析" },
    { id:"lab-code",kind:"技能",title:"JavaScript 编程实训",summary:"编写代码并通过真实输入运行检验",
      href:"/skill-labs/code-lab",keywords:"前端 后端 JavaScript 编程" },
    { id:"lab-3d",kind:"技能",title:"软件工程师综合编程模拟",summary:"限时编程模拟与独立代码执行判分",
      href:"/skill-labs/engineering-mock",keywords:"软件工程 编程 笔试" },
  ];
  entries.push({id:"hub-career-interview",kind:"职业岗位",title:"岗位模拟面试",
    summary:"按真实岗位进行结构化模拟与回答训练",href:"/career/interviews",
    keywords:"面试 校招 社招 职业 招聘"});
  for (const book of TECH_BOOKS) {
    entries.push({
      id:"book-"+book.slug,kind:"技术书",title:book.title,
      summary:book.introduction,href:"/skill-labs/books/"+book.slug,
      keywords:[book.author,book.reason,book.topic].join(" "),updatedAt:BOOK_CATALOG_RELEASED_AT,
    });
  }
  for (const guide of CAREER_ORIGINAL_GUIDES) {
    if (guide.deliveryState !== "free-original-material") continue;
    entries.push({
      id:"guide-"+guide.id,kind:"岗位资料",title:guide.title,summary:guide.summary,
      href:"/career/guides/"+guide.id,keywords:guide.audience,updatedAt:guide.updatedAt,
    });
  }
  for (const paper of CAREER_FORMAL_PAPERS) {
    if (paper.deliveryState !== "free-live-preview") continue;
    entries.push({
      id:"career-exam-"+paper.id,kind:"职业岗位",title:paper.title,
      summary:"原创完整岗位模拟笔试 · "+paper.questions.length+"题 · "+paper.durationMinutes+"分钟",
      href:"/career/exams/"+paper.id,keywords:paper.context,
      ...(paper.id===agentExam.id ? {updatedAt:agentExam.authoredAt} : {}),
    });
  }
  for (const assessment of ASSESSMENT_EVIDENCE) {
    entries.push({
      id:"assessment-"+assessment.id,kind:"测评",title:assessment.name,
      summary:assessment.category+" · "+assessment.audience,
      href:assessment.path,keywords:[assessment.category,assessment.source].join(" "),
    });
  }
  for (const group of EXAM_DIRECTORY) {
    for (const topic of group.topics) {
      if (topic.status!=="live" || !topic.href) continue;
      entries.push({
        id:"topic-"+topic.id,kind:"考试",title:topic.title.zh,
        summary:topic.title.en,href:topic.href,
        keywords:topic.id.replaceAll("-"," "),
      });
    }
  }
  return entries;
}

export function matchDiscoveryEntries(entries:readonly DiscoveryEntry[], rawQuery:string):DiscoveryEntry[] {
  const q=rawQuery.trim().toLocaleLowerCase();
  if(!q)return [];
  return entries.map(item=>{
    const title=item.title.toLocaleLowerCase();
    const text=[item.summary,item.keywords??"",item.kind].join(" ").toLocaleLowerCase();
    const score=title===q?5:title.startsWith(q)?4:title.includes(q)?3:text.includes(q)?1:0;
    return {item,score};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title,"zh-CN"))
    .map(row=>row.item);
}

export function homepageUpdates():HomepageUpdate[] {
  const exam=CAREER_FORMAL_PAPERS.find(p=>p.id===agentExam.id&&p.deliveryState==="free-live-preview");
  const entries:HomepageUpdate[]=[
    {id:"books",date:BOOK_CATALOG_RELEASED_AT,kind:"技术书库",
      title:"技术书库上线："+TECH_BOOKS.length+" 本精选书籍",
      summary:"官方阅读来源、原创导读与相关实训",href:"/skill-labs/books"},
    {id:"agent-course",date:AGENT_FOUNDATIONS_COURSE.updatedAt,kind:"技能课程",
      title:AGENT_FOUNDATIONS_COURSE.title,summary:"6 节原创课程与可运行 Python 项目",
      href:"/skill-labs/agent-foundations"},
    {id:"webgpu-course",date:WEBGPU_COURSE.updatedAt,kind:"3D 实训",
      title:WEBGPU_COURSE.title,summary:"8 个学习单元、交互场景及完整源码",
      href:"/skill-labs/webgpu-basics"},
    ...CAREER_ORIGINAL_GUIDES.filter(g=>g.deliveryState==="free-original-material").map(guide=>({
      id:"guide-"+guide.id,date:guide.updatedAt,kind:"岗位资料",title:guide.title,
      summary:"完整原创教程 · 免费阅读与下载",href:"/career/guides/"+guide.id,
    })),
  ];
  if(exam)entries.push({
    id:"agent-exam",date:agentExam.authoredAt,kind:"模拟笔试",
    title:exam.title,summary:exam.questions.length+" 题完整原创模拟 · "+exam.durationMinutes+" 分钟",
    href:"/career/exams/"+exam.id,
  });
  return entries.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).slice(0,6);
}

export function homepageCounts(){
 return {
  books:TECH_BOOKS.length,
  formalPapers:CAREER_FORMAL_PAPERS.filter(p=>p.deliveryState==="free-live-preview").length,
  assessments:ASSESSMENT_EVIDENCE.length,
  guides:CAREER_ORIGINAL_GUIDES.filter(g=>g.deliveryState==="free-original-material").length,
 };
}
