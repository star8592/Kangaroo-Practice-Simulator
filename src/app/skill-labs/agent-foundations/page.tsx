import Link from "next/link";
import type {Metadata} from "next";
import {AGENT_FOUNDATIONS_COURSE as course} from "@/lib/frontier-agent-course";
import AgentProjectCourse from "@/components/AgentProjectCourse";
import m from "@/app/assessment-center/measurement.module.css";
import s from "./frontier.module.css";

const canonical = "/skill-labs/agent-foundations";

export const metadata:Metadata = {
  title: "AI Agent 项目制实战课程｜工单项目、工程测试与岗位面试｜SOC THINK",
  description: "原创 AI Agent 项目课程：六节免费基础课、六个工程实战模块、互动知识核对与可运行 Python 实验；带你理解权限、注入防护、幂等与故障降级。",
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
      <span className={s.eyebrow}>项目制职业课程 · 免费基础课及实战试学</span>
      <h1>AI Agent 项目制工程课程</h1>
      <p>从六节工程基础课进入六模块工单 Agent 项目：先学原理，再做判断、验证代码、解释错误，最后准备可复核的项目面试表达。</p>
      <div className={s.facts}>
        <span>6节免费基础课</span><span>6个项目实战模块</span><span>即时知识检查</span><span>Python 原创实验</span>
      </div>
      <div className={s.actions}>
        <a className={s.primary} href="#agent-project">开始项目课程</a>
        <a className={s.secondary} href="#chapters">先学免费基础课</a>
      </div>
      <p className={s.disclosure}>基础课和本页项目知识检查均可免费使用，不要求先付款。本页不提供招聘认证或自动代码评分；完整工程包及自动化作业报告尚未作为收费课程发布。</p>
    </header>
    <div className={s.overview}>
      <div><strong>适合人群</strong><p>{course.audience}</p></div>
      <div><strong>先修要求</strong><p>{course.prerequisite}</p></div>
      <div><strong>完成目标</strong><p>理解工具授权与输入校验；能解释工单 Agent 的24项真实单元测试，并准备项目复盘。</p></div>
    </div>
    <section id="chapters" aria-labelledby="chapters-title" className={s.courseMain}>
      <div className={s.sectionHead}><span>FOUNDATION · FREE</span><h2 id="chapters-title">第一阶段：六节免费工程基础</h2><p>先学习工具契约与真实执行验收；项目课程在下方，按你的进度自由进入。</p></div>
      {course.lessons.map(lesson=><article key={lesson.title} className={s.lesson}>
        <h3>{lesson.title}</h3>
        {lesson.paragraphs.map(p=><p key={p}>{p}</p>)}
        <div className={s.challenge}><strong>本节实践</strong><span>{lesson.challenge}</span></div>
      </article>)}
    </section>
    <AgentProjectCourse/>
    <section className={s.run} aria-labelledby="agent-code-work-title">
      <span className={s.eyebrow}>ENGINEERING CHECKPOINT · 真正执行代码</span>
      <h2 id="agent-code-work-title">工程作业：亲手写出 Agent 的关键逻辑</h2>
      <p>完成概念练习后，进入同一课程的代码作业。四项任务分别对应输入契约、混合意图、权限隔离与事件幂等，必须自己编写 JavaScript，使用 QuickJS WebAssembly 在独立浏览器 Worker 内运行并核对 16 组输入和输出。</p>
      <p><strong>语言边界：</strong>这里是 JavaScript 版关键业务逻辑练习；上方的 Python 工单项目仍需在本地按其测试说明单独运行。浏览器实操不能证明整套 Python 项目已完成，也不产生雇主认证。</p>
      <Link className={s.primary} href="/skill-labs/engineering/agent">开始真实代码作业 · 4项 / 16组测试</Link>
    </section>
    <section className={s.run} aria-labelledby="run-title">
      <h2 id="run-title">可免费下载的基础实验</h2>
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
