"use client";
import {useState} from "react";
import Link from "next/link";
import ReportPremiumPanel from "@/components/ReportPremiumPanel";
import type {Instrument} from "@/lib/measurement-center";
import {scoreInstrument} from "@/lib/measurement-center";
import styles from "@/app/assessment-center/measurement.module.css";
type Stage="intro"|"questions"|"report";
export default function MeasurementRunner({instrument}:{instrument:Instrument}){
  const [stage,setStage]=useState<Stage>("intro");
  const [adult,setAdult]=useState(false);
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const [index,setIndex]=useState(0);
  const item=instrument.items[index];
  const done=instrument.items.filter(x=>answers[x.id]!==undefined).length;
  const report=stage==="report"?scoreInstrument(instrument,answers):null;
  const restart=()=>{setAnswers({});setIndex(0);setStage("intro");setAdult(false);};
  return <div className={styles.runner}>
    <header className={styles.runnerHeader}>
      <span className={styles.eyebrowDark}>RESEARCH PREVIEW · {instrument.version}</span>
      <h1>{instrument.title}</h1><p>{instrument.subtitle}</p>
      <div className={styles.labels}><span>免费完成 · 简要结果</span><span>详细报告单独付费</span><span>未验证中国常模</span><span>{instrument.items.length} 题</span><span>{instrument.duration}</span></div>
    </header>
    {stage==="intro"&&<section className={styles.panel}>
      <h2>开始前请了解</h2>
      <p className={styles.lead}>{instrument.methodology}</p>
      <p className={styles.smallNote}>每套量表有自己的题项来源和使用许可：<a href={instrument.sourceUrl} target="_blank" rel="noopener noreferrer">{instrument.source}</a>。问卷中含 {instrument.items.filter(q=>q.reverse).length} 道反向计分题。</p>
      <p className={styles.privacy}><strong>先答题，后决定是否购买：</strong>完成全部题目可免费查看简要结果；详细个人报告在真实商品正式上架后按页面公示价格单独购买，未授权付款时不开放付费按钮。完整报告包括维度解释、真实题项证据、生活实验与科学限制。</p>
      <p><Link href="/assessment-center/methodology">查看完整来源、计分规则及验证证据</Link></p>
      <dl className={styles.details}><div><dt>测评来源</dt><dd>{instrument.source}</dd></div>
        <div><dt>题项许可</dt><dd>{instrument.license}</dd></div>
        <div><dt>建议年龄</dt><dd>{instrument.audience}</dd></div>
        <div><dt>适用边界</dt><dd>仅供自我探索，不是标准化中国常模测评；不可用于医疗诊断、求职筛选、录取或能力定级。</dd></div>
      </dl>
      <p className={styles.privacy}>本试测在当前浏览器页面中计算结果，不向本站提交或持久化答卷；刷新后结果将消失。请勿输入姓名或其他个人敏感信息。</p>
      <label className={styles.consent}><input type="checkbox" checked={adult} onChange={e=>setAdult(e.target.checked)}/> 我已年满18岁，理解本测评属于未经中文本土验证的研究预览。</label>
      <div className={styles.controls}><button type="button" className={styles.primaryButton} disabled={!adult} onClick={()=>setStage("questions")}>同意并开始</button></div>
      <p className={styles.sourceLink}><a href={instrument.sourceUrl} target="_blank" rel="noopener noreferrer">查看原始来源与技术资料 ↗</a></p>
    </section>}
    {stage==="questions"&&<section className={styles.panel}>
      <div className={styles.progressRow}><strong>第 {index+1} / {instrument.items.length} 题</strong><span>已回答 {done} 题</span></div>
      <div className={styles.progress} role="progressbar" aria-label="作答进度" aria-valuemin={0} aria-valuemax={instrument.items.length} aria-valuenow={done}><span style={{width:(done/instrument.items.length*100)+"%"}}/></div>
      <p className={styles.prompt}>{instrument.prompt}</p>
      <fieldset className={styles.question}><legend>{item.text}</legend>
        <div className={styles.choices}>{instrument.options.map((label,i)=>{
          const value=i+1;
          return <label key={value} className={answers[item.id]===value?styles.choiceActive:styles.choice}>
            <input type="radio" name={"answer-"+item.id} value={value} checked={answers[item.id]===value}
              onChange={()=>setAnswers(prev=>({...prev,[item.id]:value}))}/>
            <span className={styles.choiceNum}>{value}</span><span>{label}</span>
          </label>;
        })}</div>
      </fieldset>
      <div className={styles.controls}>
        <button type="button" className={styles.secondaryButton} disabled={index===0} onClick={()=>setIndex(x=>x-1)}>上一题</button>
        {index<instrument.items.length-1?
          <button type="button" className={styles.primaryButton} disabled={answers[item.id]===undefined} onClick={()=>setIndex(x=>x+1)}>下一题</button>:
          <button type="button" className={styles.primaryButton} disabled={done!==instrument.items.length} onClick={()=>setStage("report")}>查看我的结果</button>}
      </div>
      <p className={styles.smallNote}>可以返回修改选择。所有题目完成后才会计分，不使用 AI 猜测漏答项。</p>
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
