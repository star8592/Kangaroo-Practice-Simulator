import Link from "next/link";
import styles from "../measurement.module.css";
export const metadata={
 title:"详细测评报告示例与交付范围｜智量测评中心",
 description:"看清楚SOCTHINK详细报告买的是什么：计分说明、维度解释、真实题项证据、行动计划与科学限制。示例仅使用虚构作答。",
 alternates:{canonical:"/assessment-center/report-preview"}
};
export default function ExampleReport(){
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="位置"><Link href="/assessment-center">智量测评中心</Link><span> / </span>详细报告样稿</nav>
  <header className={styles.hero}>
   <span className={styles.eyebrow}>EXAMPLE · TRANSPARENT DELIVERY</span>
   <h1>购买前，先看清楚报告是什么。</h1>
   <p>这里用虚构答案演示详细报告的版式与表达方式。真实报告将在完成试测后，根据个人作答与对应维度生成。示例不涉及真实人物或临床诊断。</p>
   <div className={styles.heroMeta}><span>示例数据</span><span>原始均值</span><span>可追溯证据</span><span>非标准化诊断</span></div>
  </header>
  <section className={styles.premiumDocument}>
   <header className={styles.premiumDocHead}><span className={styles.eyebrowDark}>SOCTHINK · EXAMPLE / NOT A REAL PERSON</span>
     <h2>大五人格深度自我探索报告</h2><p>演示章节 · 虚构作答 · 不产生对任何真实个人的判断</p>
     <div className={styles.premiumDocMeta}><span>量表：IPIP-50 中文研究译稿</span><span>示例维度：尽责性</span><span>示例数据：虚构</span><span>中文常模：未验证</span></div>
   </header>
   <section className={styles.premiumChapter}><span className={styles.eyebrowDark}>01 / RESULTS</span><h3>原始题项均值如何理解</h3>
    <p>假设示例的尽责性题组10题在正反向计分后，均值为 3.80 / 5。这表示该虚构作答在这组描述上相对倾向选择符合，而非“超过80%的人”，更不能直接推断职业成功概率。</p>
   </section>
   <section className={styles.premiumChapter}><span className={styles.eyebrowDark}>02 / EVIDENCE</span><h3>解释必须回到原题</h3>
    <article className={styles.premiumFactor}><div className={styles.premiumFactorHeading}><h4>尽责性 · 10题（示例）</h4><strong>3.80 / 5</strong></div>
     <p><b>解释：</b>这个维度涉及条理、任务执行、计划性和细节关注，是一种自我描述，不能替代学习成绩或工作绩效评估。</p>
     <div className={styles.premiumEvidence}><strong>虚构题项举例</strong><p>题目：“我做事会注意细节。” 示例回答4 / 5。实际购买后，每项证据都来自本人的真实回答和相应计分方向。</p></div>
     <p><b>实践观察：</b>尝试记录三个日常任务的计划与完成情况，比较自我描述和真实执行之间的差异。</p>
    </article>
   </section>
   <section className={styles.premiumChapter}><span className={styles.eyebrowDark}>03—05 / PROFESSIONAL DISCLOSURE</span><h3>完整报告还有什么</h3>
    <ol><li>全部五个（或六个）维度的原始得分与细化解释，不只展示最高两项。</li>
      <li>逐维度真实题项证据、需要避免的过度解读和现实情境核对。</li>
      <li>可执行的七天观察计划，记录行为而不是制造人格标签。</li>
      <li>答卷一致性提示、题项版权来源、计分方式、报告版本和未验证声明。</li>
      <li>已购账号可重新测评后生成同种报告；通过浏览器打印保存 PDF。</li></ol>
   </section>
   <div className={styles.reportFoot}><strong>重要限制</strong><p>此页为公开的虚构样稿，不是实际个人报告，更不是心理医疗诊断证书。完整报告的价格、付款和交付以网站真实已上架商品及服务端权益确认结果为准。</p></div>
  </section>
  <div className={styles.controls}><Link className={styles.tileLink} href="/assessment-center/ipip-big-five-50-cn-preview">免费完成大五人格研究试测 →</Link><Link className={styles.tileLink} href="/assessment-center/methodology">查阅全部技术资料 →</Link></div>
 </div>;
}
