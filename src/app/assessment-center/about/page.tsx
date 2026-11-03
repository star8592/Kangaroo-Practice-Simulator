import Link from "next/link";
import styles from "../measurement.module.css";
export const metadata={
 title:"关于 SOCTHINK 测评中心｜开发方、方法与专业边界",
 description:"了解 SOCTHINK 测评中心的自主开发背景、测评来源、质量证据、报告解读与适用边界。",
 alternates:{canonical:"/assessment-center/about"}
};
export default function AboutAssessmentCenter(){
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="位置"><Link href="/assessment-center">测评中心</Link><span> / </span>关于我们与测评依据</nav>
  <header className={styles.hero}>
   <span className={styles.eyebrow}>SOCTHINK · ASSESSMENT EXPLAINED</span>
   <h1>让每一次测评，都有依据可查。</h1>
   <p>SOCTHINK 独立开发在线能力训练与研究性测评。我们公开题目来源、计分规则、证据状态和使用限制，让结果经得起核对。</p>
  </header>
  <section className={styles.methodCard}>
   <h2>我们是谁，测评从哪里来</h2>
   <p>SOCTHINK 是本站测评产品的开发与运营品牌。题目分为自主原创任务和注明来源的研究性自评题项；部分训练题的分类参照公开的专业测评方法，但不意味着获得原测验出版机构的授权、认证或推荐。</p>
   <div className={styles.details}>
    <div><dt>网站公示主体</dt><dd>青梧未来（武汉）人工智能应用软件有限公司</dd></div>
    <div><dt>网站公示备案号</dt><dd>鄂ICP备2026004372号</dd></div>
    <div><dt>信息出处</dt><dd><a href="https://socthink.cn/assessment-center" target="_blank" rel="noopener noreferrer">SOCTHINK 测评中心页脚（网站自行公示）</a></dd></div>
    <div><dt>独立核验</dt><dd><a href="https://beian.miit.gov.cn/#/Integrated/index" target="_blank" rel="noopener noreferrer">工信部 ICP 备案查询入口</a>（以官方实时查询为准）</dd></div>
   </div>
   <p>以上公司名称和备案号取自本站公开页面页脚，尚不能代替工商注册信息或实时备案比对；专家参与、心理测量资质及第三方认证如无证据，不会虚构。</p>
  </section>
  <section className={styles.methodCard}>
   <h2>我们怎样把测评做专业</h2>
   <div className={styles.trustBriefGrid}>
    <div><strong>设计可追踪</strong><p>每项测评公开目标能力、题量、时间、适用年龄、版本、来源及计分规则。</p></div>
    <div><strong>结论有边界</strong><p>软件测试验证流程正确；信度、效度和常模必须由相应研究支持，不能用页面美观或算法通过来替代。</p></div>
    <div><strong>报告可复核</strong><p>分项成绩返回具体题项证据，建议明确对应表现和局限，不使用凭空生成的百分位与心理标签。</p></div>
   </div>
  </section>
  <section className={styles.methodCard}>
   <h2>采用哪些公开规范</h2>
   <p>我们的质量建设参考以下公开标准与指南。这里的“参考”是质量目标，不代表本平台已经通过这些机构的认证。</p>
   <div className={styles.sources}>
    <a href="https://ncme.org/resources/books/testing-standards/" target="_blank" rel="noopener noreferrer">AERA / APA / NCME 测评标准 ↗</a>
    <a href="https://www.intestcom.org/page/16" target="_blank" rel="noopener noreferrer">ITC 数字测评指南 ↗</a>
    <a href="https://www.iso.org/standard/74717.html" target="_blank" rel="noopener noreferrer">ISO 10667-2 服务要求 ↗</a>
   </div>
  </section>
  <section className={styles.methodCard}>
   <h2>用户能够核实什么</h2>
   <p>目前可逐项查询测评名称、版本、适用对象、来源与许可、评分公式、已完成的技术验收、尚未完成的测量学验证。未经验证的原创练习只提供本卷表现，不用于人才筛选、医疗诊断、智商认定或招生判断。</p>
   <div className={styles.controls}><Link className={styles.tileLink} href="/assessment-center/methodology">查看全部测评技术档案 →</Link><Link className={styles.tileLink} href="/assessment-center">返回测评中心 →</Link></div>
  </section>
 </div>;
}
