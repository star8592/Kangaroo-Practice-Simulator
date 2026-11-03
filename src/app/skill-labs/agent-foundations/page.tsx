import Link from "next/link";
import type {Metadata} from "next";
import {AGENT_FOUNDATIONS_COURSE as course} from "@/lib/frontier-agent-course";
import m from "@/app/assessment-center/measurement.module.css";
import s from "./frontier.module.css";

const canonical = "/skill-labs/agent-foundations";

export const metadata:Metadata = {
  title: "AI Agent 工程实战教程：工具调用、权限与独立验收｜SOC THINK",
  description: "免费原创中文Agent工程教程：6节完整讲解与可运行Python源码，学习工具schema、越权拒绝、真实执行轨迹与独立验收。含实验任务和明确技术来源。",
  alternates: {canonical},
  openGraph: {
    type:"article", title:course.title,
    description:course.summary,url:"https://socthink.cn"+canonical,
    locale:"zh_CN",siteName:"SOC THINK"
  }
};

export default function AgentFoundationsPage(){
  const ld={
    "@context":"https://schema.org",
    "@type":"Course",
    name:course.title,
    description:course.summary,
    inLanguage:"zh-CN",
    url:"https://socthink.cn"+canonical,
    provider:{"@type":"Organization",name:"SOC THINK",url:"https://socthink.cn"},
    isAccessibleForFree:true,
    educationalLevel:"初级至进阶",
    dateModified:course.updatedAt
  };
  return <div className={[m.shell,s.page].join(" ")}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(ld).replace(/</g,"\\u003c")}}/>
    <nav className={m.breadcrumb} aria-label="位置">
      <Link href="/skill-labs">技能实训</Link><span>/</span><span>Agent工程</span>
    </nav>
    <header className={s.hero}>
      <span className={s.eyebrow}>原创中文工程实训 · 免费完整开放</span>
      <h1>{course.title}</h1>
      <p>{course.summary}</p>
      <div className={s.facts}>
        <span>6节课程</span><span>{course.duration}</span><span>可运行源码</span><span>版本 {course.revision}</span>
      </div>
      <div className={s.actions}>
        <a className={s.primary} href={course.sourceFile} download>下载原创 Python 实验源码</a>
        <a className={s.secondary} href="#chapters">阅读完整课程</a>
      </div>
      <p className={s.disclosure}>这是 SOC THINK 自研入门实训，并非官方认证；源码模拟工具调用，不冒充已连接真实大模型。当前完全免费，不涉及付款。</p>
    </header>
    <div className={s.overview}>
      <div><strong>适合人群</strong><p>{course.audience}</p></div>
      <div><strong>先修要求</strong><p>{course.prerequisite}</p></div>
      <div><strong>学完交付</strong><p>能复现工具调用实验，提交测试日志与自己的安全改进方案。</p></div>
    </div>
    <section id="chapters" aria-labelledby="chapters-title" className={s.courseMain}>
      <div className={s.sectionHead}><span>LEARNING PATH</span><h2 id="chapters-title">完整课程与实操</h2><p>每一节都有概念、工程边界和一个可以动手检验的问题。</p></div>
      {course.lessons.map(lesson=><article key={lesson.title} className={s.lesson}>
        <h3>{lesson.title}</h3>
        {lesson.paragraphs.map(p=><p key={p}>{p}</p>)}
        <div className={s.challenge}><strong>本节实践</strong><span>{lesson.challenge}</span></div>
      </article>)}
    </section>
    <section className={s.run} aria-labelledby="run-title">
      <h2 id="run-title">先运行，再修改</h2>
      <p>实验源码只依赖 Python 标准库。复制以下命令（下载后在文件所在目录执行）：</p>
      <pre><code>python3 agent_tool_contract_lab.py --self-test{"\n"}python3 agent_tool_contract_lab.py --demo</code></pre>
      <p>自测结束会显示 7 个固定场景的通过或失败记录；运行结果由实际执行决定，不预先伪造性能数据。</p>
      <a href={course.sourceFile} download className={s.secondary}>保存实验源码 .py</a>
    </section>
    <section className={s.references} aria-labelledby="references-title">
      <h2 id="references-title">技术依据与更新</h2>
      <p>这是一门自主编写的课程。技术定义参考下面的官方文档和开放评测资料，未复制或转售第三方完整课程。</p>
      <ul>{course.references.map(ref=><li key={ref.url}><a href={ref.url} rel="noopener noreferrer" target="_blank">{ref.title}</a></li>)}</ul>
      <p className={s.updated}>内容版本 {course.revision} · 最近实质整理 {course.updatedAt} · 适用于 Python 3.10+</p>
    </section>
    <nav className={s.bottom} aria-label="继续学习">
      <Link href="/career/exams/agent-engineering-paper-2026q4-v1">参加 Agent 工程师正式模拟笔试（24题）</Link>
      <Link href="/skill-labs">浏览其他真实技能实训</Link>
      <Link href="/career">查看职业技能与岗位模拟考试</Link>
    </nav>
  </div>;
}
