"use client";

import {useState} from "react";
import Link from "next/link";
import ReportPremiumPanel from "@/components/ReportPremiumPanel";
import type {Instrument} from "@/lib/measurement-center";
import {scoreInstrument} from "@/lib/measurement-center";
import styles from "@/app/assessment-center/measurement.module.css";

type Stage="intro"|"questions"|"review"|"report";

export default function MeasurementRunner({instrument}:{instrument:Instrument}){
  const [stage,setStage]=useState<Stage>("intro");
  const [adult,setAdult]=useState(false);
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const [flagged,setFlagged]=useState<Record<string,boolean>>({});
  const [index,setIndex]=useState(0);
  const item=instrument.items[index];
  const total=instrument.items.length;
  const done=instrument.items.filter(x=>answers[x.id]!==undefined).length;
  const marked=instrument.items.filter(x=>Boolean(flagged[x.id])).length;
  const firstOpen=instrument.items.findIndex(x=>answers[x.id]===undefined);
  const report=stage==="report"?scoreInstrument(instrument,answers):null;
  const restart=()=>{
    setAnswers({});
    setFlagged({});
    setIndex(0);
    setStage("intro");
    setAdult(false);
  };

  return <div className={styles.runner}>
    <header className={styles.runnerHeader+(stage==="intro"?"":" "+styles.compactHeader)}>
      <span className={styles.eyebrowDark}>SOCTHINK · 测评中心 / {instrument.version}</span>
      <h1>{instrument.title}</h1>
      <p>{instrument.subtitle}</p>
      {stage==="intro"&&<div className={styles.labels}>
        <span>{total} 题</span><span>预计 {instrument.duration.replace(/^约\s*/,"")}</span>
        <span>免费简要结果 · 完整报告可选付费</span><span>未验证中国常模</span>
      </div>}
    </header>

    {stage==="intro"&&<section className={styles.panel} aria-label="测评开始说明">
      <h2>测评说明</h2>
      <p className={styles.lead}>{instrument.methodology}</p>
      <div className={styles.examInstructions}>
        <span>逐题选择最符合自身的回答</span><span aria-hidden="true">·</span>
        <span>全部完成后显示结果</span><span aria-hidden="true">·</span><span>可返回修改</span>
      </div>
      <div className={styles.details}>
        <div><dt>测评类型</dt><dd>人格与职业兴趣自评 · 研究预览</dd></div>
        <div><dt>适用年龄</dt><dd>{instrument.audience}</dd></div>
        <div><dt>预计用时</dt><dd>{instrument.duration}，不设倒计时</dd></div>
      </div>
      <p className={styles.privacy}>作答阶段只在当前页面内计算；如主动购买详细报告，将按购买流程处理必要的答卷数据与权益。测评不能作为心理诊断、招聘筛选或人群排名。</p>
      <p className={styles.smallNote}>全部作答后可免费查看简要结果。完整报告内容及价格须以实际开放的商品页面为准。</p>
      <details className={styles.evidenceToggle}>
        <summary>查看题项出处、许可与测量局限</summary>
        <dl className={styles.details}>
          <div><dt>来源</dt><dd>{instrument.source}</dd></div>
          <div><dt>题项许可</dt><dd>{instrument.license}</dd></div>
          <div><dt>评分与验证</dt><dd>按题项方向计算各维度均分；中文本土信效度和常模尚未验证。</dd></div>
          <div><dt>使用边界</dt><dd>仅供个人探索，不用于医疗诊断、录取、雇佣或能力定级。</dd></div>
        </dl>
        <p className={styles.sourceLink}><a href={instrument.sourceUrl} target="_blank" rel="noopener noreferrer">查看原始来源 ↗</a> · <Link href="/assessment-center/methodology">测评技术档案</Link></p>
      </details>
      <label className={styles.consent}>
        <input type="checkbox" checked={adult} onChange={e=>setAdult(e.target.checked)}/>
        <span>我已年满18岁，理解这是未经中文本土验证的研究试测。</span>
      </label>
      <div className={styles.controls}>
        <button type="button" className={styles.primaryButton} disabled={!adult} onClick={()=>setStage("questions")}>开始测评</button>
      </div>
    </section>}

    {stage==="questions"&&<section className={styles.panel} aria-label="正式测评作答">
      <div className={styles.progressRow}>
        <strong>第 {index+1} 题 / 共 {total} 题</strong>
        <span aria-live="polite">已答 {done}/{total} · 待复查 {marked}</span>
        <button type="button" className={styles.reviewLink} onClick={()=>setStage("review")}>答题总览</button>
      </div>
      <div className={styles.progress} role="progressbar" aria-label="已完成题量" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <span style={{width:(done/total*100)+"%"}}/>
      </div>
      <div className={styles.questionHeading}>
        <p className={styles.prompt}>{instrument.prompt}</p>
        <button type="button" className={flagged[item.id]?styles.flagActive:styles.flagButton}
          aria-pressed={Boolean(flagged[item.id])}
          onClick={()=>setFlagged(prev=>({...prev,[item.id]:!prev[item.id]}))}>
          {flagged[item.id]?"★ 已标记待复查":"☆ 标记待复查"}
        </button>
      </div>
      <fieldset className={styles.question}>
        <legend>{item.text}</legend>
        <div className={styles.choices}>{instrument.options.map((label,i)=>{
          const value=i+1;
          return <label key={value} className={answers[item.id]===value?styles.choiceActive:styles.choice}>
            <input type="radio" name={"answer-"+item.id} value={value}
              checked={answers[item.id]===value}
              onChange={()=>setAnswers(prev=>({...prev,[item.id]:value}))}/>
            <span className={styles.choiceNum}>{String.fromCharCode(65+i)}</span>
            <span>{label}</span>
          </label>;
        })}</div>
      </fieldset>
      <details className={styles.answerNav}>
        <summary>答题卡 · 已答 {done}/{total} · 点击跳转题目</summary>
        <div className={styles.answerGrid} role="group" aria-label="选择题号">
          {instrument.items.map((q,i)=><button key={q.id} type="button" onClick={()=>setIndex(i)}
            aria-current={index===i?"step":undefined}
            aria-label={"第"+(i+1)+"题"+(answers[q.id]!==undefined?"，已答":"，未答")+(flagged[q.id]?"，已标记":"")}
            className={(answers[q.id]!==undefined?styles.answered:"")+(flagged[q.id]?" "+styles.marked:"")+(index===i?" "+styles.current:"")}>
            {i+1}
          </button>)}
        </div>
        <p className={styles.answerHint}>深蓝：当前题 · 浅蓝：已答 · 黄点：待复查。可以跳题，不会自动交卷。</p>
      </details>
      <div className={styles.controls}>
        <button type="button" className={styles.secondaryButton} disabled={index===0} onClick={()=>setIndex(x=>x-1)}>上一题</button>
        {index<total-1
          ?<button type="button" className={styles.primaryButton} onClick={()=>setIndex(x=>x+1)}>下一题</button>
          :<button type="button" className={styles.primaryButton}
              onClick={()=>setStage("review")}>检查答卷</button>}
      </div>
      {index===total-1&&done<total&&<p className={styles.smallNote}>仍有 {total-done} 题未完成，检查答卷后可跳转补答。</p>}
    </section>}

    {stage==="review"&&<section className={styles.panel} aria-label="交卷检查">
      <div className={styles.examReviewHeading}><span className={styles.eyebrowDark}>ANSWER REVIEW</span><h2>交卷检查</h2>
        <p>核对作答状态。黄色标记只用于提醒自己复查，不影响评分。</p></div>
      <div className={styles.examReviewStats} aria-label="答卷状态">
        <div><strong>{done}</strong><span>已答</span></div>
        <div><strong>{total-done}</strong><span>未答</span></div>
        <div><strong>{marked}</strong><span>待复查</span></div>
      </div>
      <div className={styles.answerGrid} role="group" aria-label="全部题目答题状态">
        {instrument.items.map((q,i)=><button key={q.id} type="button"
          onClick={()=>{setIndex(i);setStage("questions");}}
          className={(answers[q.id]!==undefined?styles.answered:"")+(flagged[q.id]?" "+styles.marked:"")}
          aria-label={"返回第"+(i+1)+"题"+(answers[q.id]!==undefined?"，已答":"，未答")+(flagged[q.id]?"，待复查":"")}>{i+1}</button>)}
      </div>
      {done<total&&<p role="status" className={styles.examReviewWarning}>尚有 {total-done} 道题未作答；请补完后再提交测评。</p>}
      {done===total&&marked>0&&<p className={styles.examReviewWarning}>有 {marked} 道题被标记为待复查。可以返回检查，或确认保留当前答案并提交。</p>}
      {done===total&&marked===0&&<p className={styles.examReviewReady}>全部题目已完成，可以提交并查看免费简要结果。</p>}
      <div className={styles.controls}>
        <button type="button" className={styles.secondaryButton}
          onClick={()=>{setIndex(firstOpen>=0?firstOpen:Math.min(index,total-1));setStage("questions");}}>
          {firstOpen>=0?"返回未答题":"返回检查"}
        </button>
        <button type="button" className={styles.primaryButton} disabled={done!==total}
          onClick={()=>setStage("report")}>确认提交并查看结果</button>
      </div>
    </section>}

    {stage==="report"&&report&&<section className={styles.panel}>
      <div className={styles.reportTitle}><div><span className={styles.eyebrowDark}>SOCTHINK · FREE SUMMARY</span><h2>你的免费简要结果</h2></div><span className={styles.previewBadge}>无标准化常模</span></div>
      <p className={styles.lead}>你的 {instrument.items.length} 道回答均已纳入评分。以下是本次问卷中<strong>相对较常赞同或感兴趣的两类描述</strong>，按既定反向计分规则计算。它们并不代表优势排名、智商或中国同龄人的水平。</p>
      <div className={styles.scoreList}>{[...report.dimensions].sort((a,b)=>b.mean-a.mean).slice(0,2).map(d=><div key={d.id} className={styles.score}>
        <div className={styles.scoreTop}><strong>{d.name}</strong><span>{d.mean.toFixed(2)} <small>/ 5</small></span></div>
        <div className={styles.scoreTrack}><span style={{width:((d.mean-1)/4*100)+"%"}}/></div>
        <p>{d.description}</p>
      </div>)}</div>
      <p className={styles.smallNote}>这是问卷内部的描述性排序，不是常模分数。若多个维度分数接近或相同，排序不代表存在真实差异。完整维度解释与逐题证据属于可选择购买的详细报告服务。</p>
      <div className={styles.reportFoot}>
        <strong>真实来源与验证边界</strong>
        <p>来源：{instrument.source}。题项许可：{instrument.license}。评分版本：{report.version}。当前中文版本未完成本土信效度与常模验证，因此不得用于心理诊断、职业录用或能力定级。</p>
        <p><a href={instrument.sourceUrl} target="_blank" rel="noopener noreferrer">查看原始资料</a> · <Link href="/assessment-center/methodology">阅读技术档案</Link></p>
      </div>
      <ReportPremiumPanel instrumentId={instrument.id} answers={answers}/>
      <div className={styles.controls}><button type="button" className={styles.secondaryButton} onClick={restart}>重新试测</button></div>
    </section>}
  </div>;
}
