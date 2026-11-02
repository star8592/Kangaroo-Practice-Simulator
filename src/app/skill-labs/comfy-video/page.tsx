import Link from "next/link";
import type {Metadata} from "next";
import {COMFY_VIDEO_COURSE as course} from "@/lib/comfy-video-course";
import base from "@/app/assessment-center/measurement.module.css";
import s from "@/app/skill-labs/agent-foundations/frontier.module.css";

const canonical="/skill-labs/comfy-video";

export const metadata:Metadata={
 title:"ComfyUI AI视频制作实战教程｜工作流、模型依赖与成片验收｜SOC THINK",
 description:"完整8节原创中文ComfyUI AI视频工程课程，介绍文本/图像生成视频、API工作流、模型版本、成片质量与可复现交付，提供零依赖Python工作流和MP4检测工具。",
 alternates:{canonical},
 openGraph:{
  title:course.title,description:course.summary,
  type:"article",locale:"zh_CN",siteName:"SOC THINK",
  url:"https://socthink.cn"+canonical
 }
};

export default function ComfyVideoCoursePage(){
 const ld={
  "@context":"https://schema.org",
  "@type":"Course",
  name:course.title,
  description:course.summary,
  inLanguage:"zh-CN",
  provider:{"@type":"Organization",name:"SOC THINK",url:"https://socthink.cn"},
  isAccessibleForFree:true,
  url:"https://socthink.cn"+canonical,
  dateModified:course.updatedAt,
  educationalLevel:"初级至进阶"
 };
 return <main className={[base.shell,s.page].join(" ")}>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(ld).replace(/</g,"\\u003c")}}/>
  <nav className={base.breadcrumb} aria-label="位置"><Link href="/skill-labs">技能实训</Link><span>/</span><span>AI 视频工程</span></nav>
  <header className={s.hero}>
    <span className={s.eyebrow}>SOCTHINK ORIGINAL · VIDEO PRODUCTION LAB</span>
    <h1>{course.title}</h1>
    <p>{course.summary}</p>
    <div className={s.facts}>
      <span>8 个完整教学单元</span><span>{course.duration}</span>
      <span>零依赖 Python 检查工具</span><span>公开技术出处</span>
    </div>
    <div className={s.actions}>
      <a className={s.primary} href={course.download} download>下载原创验收工具 .py</a>
      <a className={s.secondary} href="#chapters">阅读完整教程</a>
    </div>
    <p className={s.disclosure}>当前完全免费。教程和检查工具属于第一阶段；使用专有模型真正生成视频，需要另行准备相应模型与硬件。本页不提供“点击即生成视频”的云计算服务，也不是 ComfyUI 官方课程或认证。</p>
  </header>
  <div className={s.overview}>
    <div><strong>适合学习</strong><p>AI 视频创作者、ComfyUI 实操学习者、准备提供视频制作服务的开发者</p></div>
    <div><strong>实验准备</strong><p>{course.prerequisite}</p></div>
    <div><strong>练习交付</strong><p>API 工作流审计报告、视频流参数、SHA-256、交付与复现说明</p></div>
  </div>
  <section id="chapters" className={s.courseMain} aria-labelledby="chapters-title">
    <div className={s.sectionHead}><span>FULL COURSE</span><h2 id="chapters-title">八个单元：从工作流到可验收成片</h2><p>重点不是收集模型和节点，而是得到真实可复现的媒体文件。</p></div>
    {course.lessons.map((lesson)=><article key={lesson.title} className={s.lesson}>
      <h3>{lesson.title}</h3>
      {lesson.text.map(p=><p key={p}>{p}</p>)}
      <div className={s.challenge}><strong>本单元实操</strong><span>{lesson.task}</span></div>
    </article>)}
  </section>
  <section className={s.run} aria-labelledby="run-title">
    <h2 id="run-title">真实工具：从 API JSON 到 MP4 验收报告</h2>
    <p>先下载检查器。默认不联网、不调用模型、不改写文件。工作流检查与视频交付检查可分别执行，也可组合执行。</p>
    <pre><code>{"python3 comfy_video_inspector.py --self-test\npython3 comfy_video_inspector.py --workflow your_api_workflow.json\npython3 comfy_video_inspector.py --video your_output.mp4\npython3 comfy_video_inspector.py --workflow your_api_workflow.json --model-root /path/to/ComfyUI/models --video your_output.mp4"}</code></pre>
    <p>使用视频检测功能建议安装 FFmpeg 提供的 ffprobe。工作流检查只覆盖结构、明显的模型文件缺失及保存节点，不等同于模型运行成功。检测输出为可机器读取的 JSON；你可以用它制作作品验收记录。</p>
    <a className={s.secondary} href={course.download} download>保存可执行 Python 检查器</a>
  </section>
  <section className={s.references} aria-labelledby="sources-title">
    <h2 id="sources-title">技术依据与版本记录</h2>
    <p>课程内容为 SOC THINK 独立编写，不出售第三方视频、受限模型权重或未经授权的翻译教材。</p>
    <ul>{course.references.map(ref=><li key={ref.url}><a href={ref.url} rel="noopener noreferrer" target="_blank">{ref.title}</a></li>)}</ul>
    <p className={s.updated}>原创课程 v{course.revision} · 更新于 {course.updatedAt}。具体模型、节点及商业使用条件应以原始项目当前版本核对。</p>
  </section>
  <nav className={s.bottom} aria-label="其他技能课程">
    <Link href="/skill-labs">返回技能课程目录</Link>
    <Link href="/skill-labs/webgpu-basics">继续学习 WebGPU 交互3D</Link>
  </nav>
 </main>;
}
