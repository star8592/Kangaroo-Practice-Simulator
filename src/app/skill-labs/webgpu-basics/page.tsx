import Link from "next/link";
import type {Metadata} from "next";
import {WEBGPU_COURSE as course} from "@/lib/webgpu-course";
import WebGpuOrbitLab from "@/components/WebGpuOrbitLab";
import base from "@/app/assessment-center/measurement.module.css";
import s from "./webgpu.module.css";

const path="/skill-labs/webgpu-basics";
export const metadata:Metadata={
  title:"Three.js WebGPU中文教程｜交互式3D与跨设备性能实战｜SOC THINK",
  description:"8单元原创Three.js WebGPU中文实战教程：在线3D交互、WebGPU/WebGL2后端检测、InstancedMesh性能对照，附可运行Vite源码项目下载。",
  alternates:{canonical:path},
  openGraph:{type:"article",title:course.title,description:course.description,siteName:"SOC THINK",url:"https://socthink.cn"+path,locale:"zh_CN"}
};

export default function WebGpuCoursePage(){
  const ld={
    "@context":"https://schema.org","@type":"Course",
    name:course.title,description:course.description,inLanguage:"zh-CN",
    provider:{"@type":"Organization",name:"SOC THINK",url:"https://socthink.cn"},
    url:"https://socthink.cn"+path,isAccessibleForFree:true,
    dateModified:course.updatedAt,educationalLevel:"入门与进阶"
  };
  return <div className={[base.shell,s.page].join(" ")}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(ld).replace(/</g,"\\u003c")}}/>
    <nav className={base.breadcrumb} aria-label="位置"><Link href="/skill-labs">技能实训</Link><span>/</span><span>WebGPU交互3D</span></nav>
    <header className={s.hero}>
      <div className={s.eyebrow}>3D ENGINEERING · 免费完整课程 · 原创项目</div>
      <h1>{course.title}</h1>
      <p>{course.description}</p>
      <div className={s.info}><span>8个教学单元</span><span>真实可交互场景</span><span>Vite源码工程</span><span>Three.js r186</span></div>
      <div className={s.actions}>
        <a className={s.download} href={course.downloadable} download>下载完整源工程 ZIP</a>
        <a className={s.outline} href="#interactive">打开交互实验</a>
      </div>
      <p className={s.notice}>本课程是 SOC THINK 独立原创教材，不是 Three.js 官方授权课程或行业认证。本课程与源码目前免费，后端是否使用 WebGPU 以实际检测为准。</p>
    </header>
    <section className={s.about} aria-label="课程规格">
      <div><b>适用对象</b><p>网页开发者、交互视觉设计师、3D技术学习者</p></div>
      <div><b>先修知识</b><p>{course.prerequisite}</p></div>
      <div><b>建议学习时间</b><p>{course.duration}</p></div>
    </section>
    <div id="interactive"><WebGpuOrbitLab/></div>
    <section className={s.course} aria-labelledby="course-title">
      <div className={s.chapterHeading}><span>FULL COURSE</span><h2 id="course-title">从渲染基础到跨设备交付</h2></div>
      {course.topics.map(t=><article key={t.title} className={s.lesson}>
        <h3>{t.title}</h3>
        {t.paragraphs.map(p=><p key={p}>{p}</p>)}
        <div className={s.challenge}><strong>实操任务</strong><span>{t.task}</span></div>
      </article>)}
    </section>
    <section className={s.project}>
      <h2>下载后自己改一个真实作品</h2>
      <p>源码压缩包包含可独立启动的 Vite + Three.js 工程，附环境说明和性能测试模板。安装依赖后运行 <code>npm run dev</code>，在本地浏览器交互和修改。</p>
      <a className={s.download} href={course.downloadable} download>下载完整工程（ZIP）</a>
      <p className={s.notice}>本站没有用静态图片冒充实时3D。项目练习评分是教学参考，不代表任何企业正式招聘考试。</p>
    </section>
    <section className={s.sources} aria-labelledby="sources-title">
      <h2 id="sources-title">技术依据与可追溯来源</h2>
      <ul>{course.sources.map(x=><li key={x.href}><a href={x.href} target="_blank" rel="noopener noreferrer">{x.title}</a></li>)}</ul>
      <p>课程原创版本 {course.version} · 更新于 {course.updatedAt}。官方 WebGPURenderer 仍处于演进阶段，阅读后应以当前文档和真实设备复验。</p>
    </section>
    <nav className={s.bottom}><Link href="/skill-labs">返回技能实训目录</Link><Link href="/skill-labs/agent-foundations">继续学习 AI Agent 工程</Link></nav>
  </div>;
}
