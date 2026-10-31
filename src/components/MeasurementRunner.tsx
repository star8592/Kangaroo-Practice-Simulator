"use client";
import {useState} from "react";
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
      <div className={styles.labels}><span>免费试测</span><span>未验证中国常模</span><span>{instrument.items.length} 题</span><span>{instrument.duration}</span></div>
    </header>
    {stage==="intro"&&<section className={styles.panel}>
      <h2>开始前请了解</h2>
      <p className={styles.lead}>{instrument.methodology}</p>
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
      <div className={styles.reportTitle}><div><span className={styles.eyebrowDark}>PERSONAL EXPLORATION REPORT</span><h2>你的探索报告</h2></div><span className={styles.previewBadge}>非标准化结果</span></div>
      <p className={styles.lead}>下面显示你在当前问卷中各维度的<strong>反向计分后平均分（1–5）</strong>。不是全国百分位，不表示智商、岗位能力高低或人格优劣。</p>
      <div className={styles.scoreList}>{report.dimensions.map(d=><div key={d.id} className={styles.score}>
        <div className={styles.scoreTop}><strong>{d.name}</strong><span>{d.mean.toFixed(2)} <small>/ 5</small></span></div>
        <div className={styles.scoreTrack}><span style={{width:((d.mean-1)/4*100)+"%"}}/></div>
        <p>{d.description}</p>
      </div>)}</div>
      {instrument.id.startsWith("career")&&<div className={styles.exploration}>
        <h3>值得优先尝试的活动方向</h3>
        <p>这是你在本问卷内部的兴趣排序，分数接近或相同不代表存在确定差异；不能直接等同于职业推荐。</p>
        <ol>{[...report.dimensions].sort((a,b)=>b.mean-a.mean).slice(0,3).map(d=><li key={d.id}><strong>{d.name}</strong>：{d.nextStep}</li>)}</ol>
      </div>}
      {instrument.id.startsWith("ipip")&&<div className={styles.exploration}>
        <h3>下一步如何理解结果</h3>
        <p>大五特质没有统一的“越高越好”。把每一项看成自我描述，而不是与别人竞争的成绩。</p>
        <ol>{report.dimensions.map(d=><li key={d.id}><strong>{d.name}</strong>：{d.nextStep}</li>)}</ol>
      </div>}
      <div className={styles.reportFoot}><strong>测评说明</strong><p>来源：{instrument.source}。评分版本：{report.version}。中文试测尚未完成本土信效度研究及常模建立，因此不出具标准化结论。本报告只适用于个人探索，不供临床或雇佣决策使用。</p></div>
      <div className={styles.controls}><button type="button" className={styles.secondaryButton} onClick={restart}>重新试测</button><button type="button" className={styles.primaryButton} onClick={()=>window.print()}>打印本页报告</button></div>
    </section>}
  </div>;
}
