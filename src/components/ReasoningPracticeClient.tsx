"use client";
import {useState} from "react";
import {REASONING_ITEMS,REASONING_DOMAINS,scoreReasoning} from "@/lib/reasoning-practice";
import styles from "@/app/assessment-center/measurement.module.css";
type Step="intro"|"questions"|"report";
export default function ReasoningPracticeClient(){
 const [step,setStep]=useState<Step>("intro");
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const [index,setIndex]=useState(0);
 const [accepted,setAccepted]=useState(false);
 const item=REASONING_ITEMS[index];
 const complete=REASONING_ITEMS.filter(x=>answers[x.id]!==undefined).length;
 const report=step==="report"?scoreReasoning(answers):null;
 const reset=()=>{setStep("intro");setIndex(0);setAnswers({});setAccepted(false);};
 return <div className={styles.runner}>
  <header className={styles.runnerHeader}>
    <span className={styles.eyebrowDark}>SOCTHINK · ORIGINAL TASK PRACTICE</span>
    <h1>认知推理任务练习 · 20题</h1>
    <p>数量规律、逻辑关系、方位空间与阅读信息判断。每题都有可核对答案与解释。</p>
    <div className={styles.labels}><span>免费体验</span><span>原创题库 v1</span><span>20题 · 四类任务</span><span>非标准化 IQ 测验</span></div>
  </header>
  {step==="intro"&&<section className={styles.panel}>
    <h2>这个练习能告诉你什么？</h2>
    <p className={styles.lead}>可以观察自己在20道明确任务上的作答正确率、错误题目与对应技能。它不能估算智商、推断智力水平，也不能代表全国同龄人排名或职业胜任力。</p>
    <div className={styles.exploration}><h3>四类任务</h3><ul>{REASONING_DOMAINS.map(d=><li key={d.id}><strong>{d.title}</strong>：{d.description}</li>)}</ul></div>
    <dl className={styles.details}>
      <div><dt>来源</dt><dd>SOCTHINK 原创教育任务，未使用受保护的标准 IQ 测验题目。</dd></div>
      <div><dt>评分</dt><dd>20题单选，每题1分；各类别各5题。原始正确率、原始题数，不按年龄换算或推断因子分数。</dd></div>
      <div><dt>用时</dt><dd>约8–12分钟，不设时限；浏览器、输入设备及阅读速度会影响表现。</dd></div>
      <div><dt>适用范围</dt><dd>当前研究练习暂面向18岁及以上成年人。只供教育练习，不用于选拔、医疗诊断或智商评定。</dd></div>
    </dl>
    <p className={styles.privacy}>本页面只在浏览器内存中处理你的选择，不向后台上传答卷。关闭或刷新后练习记录消失。</p>
    <label className={styles.consent}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> 我已年满18岁，并理解这是非标准化练习，不是 IQ 测验。</label>
    <div className={styles.controls}><button type="button" className={styles.primaryButton} disabled={!accepted} onClick={()=>setStep("questions")}>开始20题练习</button></div>
  </section>}
  {step==="questions"&&<section className={styles.panel}>
    <div className={styles.progressRow}><strong>第 {index+1} / {REASONING_ITEMS.length} 题 · {REASONING_DOMAINS.find(x=>x.id===item.domain)?.title}</strong><span>已答 {complete} / 20</span></div>
    <div className={styles.progress} role="progressbar" aria-label="已答题数" aria-valuemin={0} aria-valuemax={20} aria-valuenow={complete}><span style={{width:(complete/20*100)+"%"}}/></div>
    <fieldset className={styles.question}><legend>{item.stem}</legend><div className={styles.choices}>
     {item.options.map((option,i)=><label key={i} className={answers[item.id]===i?styles.choiceActive:styles.choice}>
       <input type="radio" name={"reason-"+item.id} value={i} checked={answers[item.id]===i} onChange={()=>setAnswers(prev=>({...prev,[item.id]:i}))}/>
       <span className={styles.choiceNum}>{String.fromCharCode(65+i)}</span><span>{option}</span>
      </label>)}
    </div></fieldset>
    <div className={styles.controls}>
      <button type="button" className={styles.secondaryButton} disabled={index===0} onClick={()=>setIndex(n=>n-1)}>上一题</button>
      {index<19?<button type="button" className={styles.primaryButton} disabled={answers[item.id]===undefined} onClick={()=>setIndex(n=>n+1)}>下一题</button>:
      <button type="button" className={styles.primaryButton} disabled={complete!==20} onClick={()=>setStep("report")}>交卷并查看解析</button>}
    </div>
    <p className={styles.smallNote}>交卷前可以返回修改答案；交卷后才显示正确答案与解析。</p>
  </section>}
  {step==="report"&&report&&<section className={styles.panel}>
    <div className={styles.reportTitle}><div><span className={styles.eyebrowDark}>TASK PERFORMANCE · {report.version}</span><h2>任务练习报告</h2></div><span className={styles.previewBadge}>原始得分</span></div>
    <p className={styles.lead}>完成20道题，答对 <strong>{report.correct} / {report.total}</strong> 道。以下只表示本次题集的实际正确数，不是标准化认知能力、智商或百分位。</p>
    <div className={styles.scoreList}>{report.dimensions.map(d=><div className={styles.score} key={d.id}>
      <div className={styles.scoreTop}><strong>{d.title}</strong><span>{d.correct} <small>/ {d.total}</small></span></div>
      <div className={styles.scoreTrack}><span style={{width:(d.correct/d.total*100)+"%"}}/></div>
      <p>{d.nextStep}</p>
    </div>)}</div>
    <div className={styles.exploration}><h3>逐题复盘</h3><p>所有题目均展示实际选项、正确选项和理由。错题是训练线索，不是稳定能力结论。</p>
      <ol className={styles.reviewList}>{report.items.map((r,i)=>{
        const q=REASONING_ITEMS.find(x=>x.id===r.id)!;
        return <li key={r.id} className={styles.reviewItem}>
          <strong>{r.correct?"正确":"需要复盘"} · 第 {i+1} 题 · {r.skill}</strong><p>{q.stem}</p>
          <p>你的选择：{q.options[r.chosen]} | 正确答案：{q.options[r.answer]}</p>
          <p>{r.reason}</p>
        </li>;
      })}</ol>
    </div>
    <div className={styles.reportFoot}><strong>解释边界</strong><p>原创非标准化教育题。四类任务各5题，不能代替经信效度研究、适龄常模与专业施测的认知测验。题量较小，熟悉程度、阅读速度与手机交互都可能影响结果。这里的全部分数只反映本次实际答题，不代表能力等级。</p></div>
    <div className={styles.controls}><button type="button" className={styles.secondaryButton} onClick={reset}>重新练习</button><button type="button" className={styles.primaryButton} onClick={()=>window.print()}>打印报告</button></div>
  </section>}
 </div>;
}
