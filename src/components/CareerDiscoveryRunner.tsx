"use client";
import {useMemo,useState} from "react";
import {
 getDiscoverySurvey,scoreDiscovery,type DiscoverySurvey
} from "@/lib/career-exploration-bank";
import {SJT_ITEMS,SJT_SKILLS,SJT_VERSION,scoreSjt} from "@/lib/workplace-sjt-bank";
import styles from "@/app/assessment-center/measurement.module.css";
type Stage="intro"|"questions"|"review"|"result";
type Props={instrumentId:"work-values-30"|"work-style-24"|"workplace-sjt-24"};
const SCALE=["非常不符合","比较不符合","说不清 / 一般","比较符合","非常符合"];
export default function CareerDiscoveryRunner({instrumentId}:Props){
 const isSjt=instrumentId==="workplace-sjt-24";
 const survey:DiscoverySurvey|undefined=getDiscoverySurvey(instrumentId);
 const questions=useMemo(()=>isSjt?
   SJT_ITEMS.map(q=>({id:q.id,group:SJT_SKILLS.find(s=>s.id===q.skill)!.name,
    stem:"在此情况下，你会优先采取哪一种行动？",context:q.scenario,
    choices:q.options.map(o=>o.text)})):
   survey!.items.map(q=>({id:q.id,group:survey!.areas.find(a=>a.id===q.area)!.name,
    stem:q.text,context:"",choices:SCALE})),[isSjt,survey]);
 const [stage,setStage]=useState<Stage>("intro");
 const [consented,setConsented]=useState(false);
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const [index,setIndex]=useState(0);
 const item=questions[index];
 const count=questions.filter(q=>Object.hasOwn(answers,q.id)).length;
 const complete=count===questions.length;
 const answerIndex=(id:string)=>!Object.hasOwn(answers,id)?-1:isSjt?answers[id]:answers[id]-1;
 const title=isSjt?"职场情境判断 · 24题":survey!.title;
 const subtitle=isSjt?
  "沟通、冲突、风险、交付四类原创情境。交卷后按参考策略逐题复盘。":
  survey!.intro;
 const version=isSjt?SJT_VERSION:survey!.version;
 const reset=()=>{setStage("intro");setConsented(false);setAnswers({});setIndex(0);};
 const surveyResult=!isSjt&&stage==="result"?scoreDiscovery(survey!,answers):null;
 const sjtResult=isSjt&&stage==="result"?scoreSjt(answers):null;
 const showReview=()=>setStage("review");
 return <div className={styles.runner}>
  <header className={styles.runnerHeader}>
   <span className={styles.eyebrowDark}>SOCTHINK · ORIGINAL CAREER ASSESSMENT</span>
   <h1>{title}</h1>
   <p>{subtitle}</p>
   <div className={styles.labels}>
    <span>免费</span><span>{questions.length}题</span>
    <span>约 {isSjt?"15–20":instrumentId==="work-values-30"?"7–10":"6–9"} 分钟</span>
    <span>{isSjt?"职场案例训练":"非标准化自我探索"}</span>
   </div>
  </header>
  {stage==="intro"&&<section className={styles.panel}>
    <h2>正式开始前</h2>
    <p className={styles.lead}>{isSjt?
      "本练习全部是原创工作案例，按预设的参考策略给出逐题解释。参考策略尚未经过独立岗位专家组评定，不是能用于实际招聘筛选的标准化SJT，也不能推算录取率。":
      "请根据真实想法或过去的工作经历作答。每个维度只显示本次回答的均值及具体行动建议，不提供中国常模、职业优劣排名、心理诊断。"}
    </p>
    <dl className={styles.details}>
     <div><dt>范围</dt><dd>{isSjt?"四类案例各6题；不同方案给出0–3参考策略分。":survey!.areas.map(a=>a.name).join("、")}</dd></div>
     <div><dt>出处</dt><dd>{isSjt?
      "SOCTHINK自编案例与参考策略；参考美国OPM公开的情境判断测试方法，不复制其试题。":
      survey!.reference}</dd></div>
     <div><dt>版本</dt><dd>{version}</dd></div>
     <div><dt>隐私</dt><dd>选项只保存在当前网页内存，不上传到服务器；刷新或离开页面会失去未交卷答案。</dd></div>
    </dl>
    <p className={styles.privacy}>本产品暂仅面向18岁及以上成年人作职业探索或备考训练。不是标准化心理诊断、招聘人才甄选或资格认证。</p>
    <label className={styles.consent}><input type="checkbox" checked={consented} onChange={e=>setConsented(e.target.checked)}/>
      我已年满18岁，理解这是免费非标准化探索/训练，而不是录用或心理诊断结论。
    </label>
    <div className={styles.controls}><button type="button" className={styles.primaryButton}
      disabled={!consented} onClick={()=>setStage("questions")}>确认入场 · 开始作答</button></div>
  </section>}
  {stage==="questions"&&<section className={styles.panel}>
    <div className={styles.progressRow}><strong>第 {index+1} / {questions.length} 题</strong><span>已答 {count} / {questions.length}</span></div>
    <div className={styles.progress} role="progressbar" aria-label="当前答题进度"
      aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={count}>
      <span style={{width:(count/questions.length*100)+"%"}}/></div>
    <p className={styles.prompt}>本题主题：{item.group}</p>
    {item.context&&<article className={styles.exploration} aria-label="职场情境"><h2>工作情境</h2><p>{item.context}</p></article>}
    <fieldset className={styles.question}><legend>{item.stem}</legend>
     <div className={styles.choices}>{item.choices.map((choice,i)=><label key={i}
       className={answerIndex(item.id)===i?styles.choiceActive:styles.choice}>
       <input type="radio" name={item.id} value={i} checked={answerIndex(item.id)===i}
        onChange={()=>setAnswers(prev=>({...prev,[item.id]:isSjt?i:i+1}))}/>
       <span className={styles.choiceNum}>{String.fromCharCode(65+i)}</span><span>{choice}</span>
     </label>)}</div>
    </fieldset>
    <div className={styles.controls}>
     <button type="button" className={styles.secondaryButton} disabled={index===0}
      onClick={()=>setIndex(i=>i-1)}>上一题</button>
     <button type="button" className={styles.secondaryButton} onClick={showReview}>答题总览</button>
     {index<questions.length-1?
      <button type="button" className={styles.primaryButton} onClick={()=>setIndex(i=>i+1)}>下一题</button>:
      <button type="button" className={styles.primaryButton} onClick={showReview}>检查答卷</button>}
    </div>
    <p className={styles.smallNote}>可以跳题、返回修改；交卷后才展示结果与参考答案，不会自动收费。</p>
  </section>}
  {stage==="review"&&<section className={styles.panel}>
    <h2>交卷检查</h2>
    <p className={styles.lead}>已答 {count} / {questions.length} 题，尚有 {questions.length-count} 题未答。完整作答后才能交卷。</p>
    <div className={styles.answerGrid} aria-label="答题卡">
     {questions.map((q,i)=><button type="button" key={q.id}
       aria-label={"返回第"+(i+1)+"题，"+(Object.hasOwn(answers,q.id)?"已答":"未答")}
       className={Object.hasOwn(answers,q.id)?styles.answered:undefined}
       onClick={()=>{setIndex(i);setStage("questions");}}>{i+1}</button>)}
    </div>
    <div className={styles.controls}>
     <button type="button" className={styles.secondaryButton} onClick={()=>setStage("questions")}>返回作答</button>
     <button type="button" className={styles.primaryButton} disabled={!complete}
      onClick={()=>setStage("result")}>确认交卷 · 查看报告</button>
    </div>
  </section>}
  {stage==="result"&&<section className={styles.panel}>
    <div className={styles.reportTitle}><div>
     <span className={styles.eyebrowDark}>ORIGINAL PRACTICE · {version}</span>
     <h2>{isSjt?"职场情境训练复盘":"你的工作探索结果"}</h2>
    </div><span className={styles.previewBadge}>免费基础报告</span></div>
    {surveyResult&&<>
     <p className={styles.lead}>{surveyResult.topAreas.length>0
      ?<>本次自评相对较高的主题：<strong>{surveyResult.topAreas.join("、")}</strong>。</>
      :<>本次各维度回答比较接近，<strong>没有明显突出的单一方向</strong>。</>}
      这不是就业倾向概率，也不是人群排名；不同维度没有正式的心理测量学比较依据。</p>
     <div className={styles.scoreList}>{surveyResult.areas.map(a=><div className={styles.score} key={a.id}>
       <div className={styles.scoreTop}><strong>{a.name}</strong><span>{a.mean.toFixed(2)} <small>/ 5（题项均值）</small></span></div>
       <div className={styles.scoreTrack}><span style={{width:(a.mean/5*100)+"%"}}/></div>
       <p>{a.meaning}</p><p>下一步：{a.action}</p>
     </div>)}</div>
    </>}
    {sjtResult&&<>
     <p className={styles.lead}>本次有 <strong>{sjtResult.correct} / {sjtResult.max}</strong> 题选择了预设的优先参考策略。这只是本站原创训练题中的一致情况，不是经过专家验证的胜任力分数。</p>
     <div className={styles.scoreList}>{sjtResult.dimensions.map(a=><div className={styles.score} key={a.id}>
       <div className={styles.scoreTop}><strong>{a.name}</strong><span>{a.points} <small>/ {a.max} 参考分</small></span></div>
       <div className={styles.scoreTrack}><span style={{width:(a.points/a.max*100)+"%"}}/></div>
       <p>继续练习：{a.practice}</p>
     </div>)}</div>
     <div className={styles.readingReview}><h3>逐题参考策略与说明</h3>
       <ol className={styles.reviewList}>{sjtResult.review.map((r,i)=><li className={styles.reviewItem} key={r.id}>
        <strong>第{i+1}题 · 训练参考 {r.points} / 3</strong>
        <p>{SJT_ITEMS[i].scenario}</p><p>你的选择：{r.chosen}</p>
        <p>本站建议的优先做法：{r.reference}</p><p>理由：{r.rationale}</p>
       </li>)}</ol>
     </div>
    </>}
    <div className={styles.reportFoot}><strong>使用边界</strong>
      <p>来源：SOCTHINK原创内容；版本：{version}。未建立中国人群常模、心理测量信效度或公平性数据。
      {isSjt?"参考策略未经过独立职业专家组盲审，不能用于招聘、晋升或人员评价。":"自我描述结果受情境和回答习惯影响，不等于稳定能力或某岗位的适合程度。"}
      答案仅在本次网页内存处理。</p>
    </div>
    <div className={styles.controls}>
     <button type="button" className={styles.secondaryButton} onClick={reset}>重新测评</button>
     <button type="button" className={styles.primaryButton} onClick={()=>window.print()}>打印结果</button>
    </div>
  </section>}
 </div>;
}
