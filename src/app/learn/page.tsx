import Link from "next/link";
import styles from "@/app/assessment-center/measurement.module.css";

export const metadata={
  title:"学习与实训｜面向岗位的技能学习｜SOC THINK",
  description:"从真实岗位要求出发，学习 AI Agent、SQL、软件工程和 WebGPU。阅读免费导学、运行真实实验，并进入相应岗位模拟。",
  alternates:{canonical:"/learn"},
};

const COURSES=[
 {id:"agent",kind:"AI / Agent",name:"AI Agent 工程",summary:"工具调用、任务流程与可验证的工程实践。已有六节原创中文课程和代码实验。",href:"/skill-labs/agent-foundations",related:"/career/exams/agent-engineering-paper-2026q4-v1",action:"配套岗位笔试"},
 {id:"sql",kind:"Data / SQL",name:"SQL 数据分析实训",summary:"在浏览器中真正执行 SQL，验证查询结果，了解订单、客户与经营分析。",href:"/skill-labs/sql-lab",related:"/career",action:"查看相关岗位"},
 {id:"code",kind:"Engineering",name:"JavaScript 编程实操",summary:"执行真实代码任务和测试，训练日常业务编程及错误处理。",href:"/skill-labs/code-lab",related:"/skill-labs/engineering-mock",action:"综合编程模拟"},
 {id:"books",kind:"Open resources",name:"技术资料与中文导学",summary:"查找已核验的原著、官方文档及来源链接；尊重上游许可，不把第三方原视频包装为自有课程。",href:"/skill-labs/books",related:"/career",action:"选择岗位"},
] as const;
export default function LearnHome(){
 return <div className={styles.shell}>
  <header className={styles.hero}>
   <span className={styles.eyebrow}>SOC THINK / CAREER LEARNING</span>
   <h1>学会岗位真正需要的技能</h1>
   <p>找到一个方向，先看免费资料，再完成可以实际运行的练习。学习和实训都可以连接到岗位笔试与面试。</p>
   <div className={styles.heroMeta}><span>原始来源可查</span><span>练习可运行</span><span>按岗位继续</span></div>
  </header>
  <div className={styles.sectionHeading}><div><span className={styles.eyebrowDark}>CURRENTLY AVAILABLE</span><h2>目前可用的学习入口</h2></div></div>
  <div className={styles.grid}>{COURSES.map(course=><article key={course.id} className={styles.tile}>
    <div className={styles.tileTop}><span className={styles.tileNumber}>{course.kind}</span><span className={styles.previewBadge}>可访问</span></div>
    <h3>{course.name}</h3><p>{course.summary}</p>
    <Link className={styles.tileLink} href={course.href}>进入学习与实训 <span aria-hidden="true">→</span></Link>
    <Link href={course.related}>{course.action} →</Link>
  </article>)}</div>
  <p>本页只展示已有实际入口。新抓取的 X/GitHub 项目只有完成来源、许可证、运行和教学质量核验后才会进入公开课程。</p>
 </div>;
}
