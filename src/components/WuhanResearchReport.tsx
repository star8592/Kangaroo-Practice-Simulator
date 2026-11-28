import styles from "./WuhanResearchReport.module.css";
import { practiceRow, practiceSummary } from "../lib/wuhan-practice-summary";
type Obj=Record<string,unknown>;
const obj=(v:unknown):Obj=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Obj:{};
const str=(v:unknown)=>typeof v==="string"?v:"";
const count=(v:unknown)=>typeof v==="number"&&Number.isInteger(v)&&v>=0?v:null;
const arr=(v:unknown)=>Array.isArray(v)?v:[];
const kinds:Record<string,string>={choice:"听后选择",answer:"听后应答",read:"模仿朗读",retell:"听后转述"};
const states:Record<string,string>={correct:"选择正确",incorrect:"选择错误",not_submitted:"未作答",unanswered:"未作答",pending:"待提交",reference_match:"参考内容匹配（待复核）",known_mismatch:"已知内容不符（待复核）",partial_reference:"部分内容匹配（待复核）",reference_text_matched:"双识别文本匹配（非发音评分）",reference_text_differs:"双识别文本存在差异",asr_disagreement:"两种识别结果不一致",needs_review:"待核查，不评分"};
function edits(value:unknown){
 return arr(value).map(obj).filter(x=>["substitution","deletion","insertion"].includes(str(x.operation)));
}
function Differences({title,value}:{title:string,value:unknown}){
 const rows=edits(value);
 return <div><h4>{title}</h4>{rows.length?<ul>{rows.map((e,i)=><li key={i}>{e.operation==="deletion"?"识别稿缺少":e.operation==="insertion"?"识别稿额外出现":"识别稿替换"}：{str(e.expected)||"—"} → {str(e.recognized)||"—"}</li>)}</ul>:<p>没有记录到文本差异。</p>}</div>;
}
export function WuhanResearchReport({report}:{report:unknown}){
 const r=obj(report),items=arr(r.items);
 // Never turn malformed or paid report payloads into research results.
 if(r.report_status!=="research"||r.billable!==false||r.official_score!==false||r.total_score!==null||r.finalized!==true||items.length!==18||!/^WH(0[1-9]|10)$/.test(str(r.paper_id)))return <p role="alert">报告格式不受支持，无法显示。</p>;
 const correct=items.filter(v=>obj(v).kind==="choice"&&obj(v).state==="correct").length;
 const wrong=items.filter(v=>obj(v).kind==="choice"&&obj(v).state==="incorrect").length;
 const blank=items.filter(v=>["not_submitted","unanswered"].includes(str(obj(v).state))).length;
 const practice=practiceSummary(items);
 return <section className={styles.report} data-site-shell="content" aria-labelledby="research-report-title">
  <p className={styles.eyebrow}>内部研究报告 · 不扣次 · 不提供正式考试成绩</p>
  <h1 id="research-report-title">武汉英语听说 · {str(r.paper_id)} 诊断报告</h1>
  <p className={styles.disclosure}>这是识别证据与候选判定，不是官方成绩。模型分歧不等于学生读错。未作答不会产生口语分数。</p>
  <div className={styles.summary}><div><span>选择正确</span><strong>{correct}/8</strong></div><div><span>选择错误</span><strong>{wrong}</strong></div><div><span>未作答（含静音）</span><strong>{blank}</strong></div></div>
  {practice.hasMachineEvidence&&<section className={styles.practice} aria-labelledby="practice-title" data-machine-practice-summary="true">
   <h2 id="practice-title">听后应答 · 内容练习点</h2>
   <p>仅比较双识别与当前机器参考规则明确判定的短答内容，不是发音分、官方分或整卷总分。</p>
   {practice.points?<p className={styles.practiceScore}><strong>{practice.points.earned}/{practice.points.possible}</strong> 已判定短答的内容练习点</p>:<p>当前不汇总练习点。</p>}
   <p>明确内容判定：{practice.decided}/{practice.total}题；待核查：{practice.counts.uncertain}题；未提交：{practice.counts.blank}题；无有效答音：{practice.counts.silence}题。</p>
   {(practice.counts.legacy>0||practice.counts.invalid>0)&&<p>旧版或不完整练习证据：{practice.counts.legacy+practice.counts.invalid}题，不参与合计。</p>}
   {practice.mixedRevision&&<p>存在不同机器规则版本，暂不合并练习点。</p>}
   <p>未判定和未作答不计入已判定题的分母，不能据此推算全卷正确率。</p>
  </section>}
  {items.map((value,i)=>{
   const t=obj(value),c=obj(t.candidate),d=obj(c.diagnosis),timing=obj(d.timing),state=str(t.state);
   const shortPractice=practiceRow(t);
   const spans=arr(d.replay_word_spans).map(obj).filter(w=>count(w.start_ms)!==null&&count(w.end_ms)!==null&&Number(w.end_ms)>Number(w.start_ms)&&Number(w.end_ms)<=Number(timing.duration_ms));
   return <article key={i} className={styles.task} data-report-task={str(t.task_id)}>
    <div className={styles.heading}><h2>第{i+1}题 · {kinds[str(t.kind)]||"题目"}</h2><span>{states[state]||"待核查"}</span></div>
    {t.kind==="choice"&&count(c.selected_option)!==null&&Number(c.selected_option)<26&&<p>本人选择：{String.fromCharCode(65+Number(c.selected_option))}</p>}
    {shortPractice?.kind==="match"&&<p>机器内容练习点：1/1（参考内容匹配）</p>}
    {shortPractice?.kind==="mismatch"&&<p>机器内容练习点：0/1（已知内容不符）</p>}
    {shortPractice?.kind==="silence"&&<p>未识别到有效答音，不计入已判定练习点。</p>}
    {shortPractice?.kind==="uncertain"&&<p>机器证据不足，暂不判分。</p>}
    {str(c.evidence_quote)&&<p>识别内容：{str(c.evidence_quote)}</p>}
    {str(c.secondary_evidence_quote)&&str(c.secondary_evidence_quote)!==str(c.evidence_quote)&&<p>第二识别结果：{str(c.secondary_evidence_quote)}</p>}
    {str(d.primary_text)&&str(d.secondary_text)&&<details className={styles.details} open={state==="asr_disagreement"}><summary>逐词识别证据</summary>
      <p><strong>Whisper：</strong>{str(d.primary_text)}</p><p><strong>Parakeet：</strong>{str(d.secondary_text)}</p>
      <div className={styles.columns}><Differences title="Whisper 文本差异" value={d.primary_text_edits}/><Differences title="Parakeet 文本差异" value={d.secondary_text_edits}/></div>
      {state==="asr_disagreement"&&<p className={styles.disclosure}>识别模型存在分歧，不自动扣分或定位错误读音。</p>}
      {spans.length>0&&<><h4>可供人工听辨的时间位置</h4><div className={styles.words}>{spans.map((w,i)=><div key={i}><strong>{str(w.word)}</strong><small>{(Number(w.start_ms)/1000).toFixed(2)}–{(Number(w.end_ms)/1000).toFixed(2)}秒</small></div>)}</div><p>此归档不保存原始录音，不能在这里播放片段；时间位置不是发音评分。</p></>}
    </details>}
    {count(timing.duration_ms)!==null&&<p>录音时长 {(Number(timing.duration_ms)/1000).toFixed(2)} 秒；语音活动检测 {(Number(timing.speech_ms)/1000).toFixed(2)} 秒。仅供回听分析。</p>}
   </article>;
  })}
  <p className={styles.footer}>报告版本：{str(r.rubric_sha256).slice(0,12)} · 研究证据摘要：{str(r.report_evidence_sha256).slice(0,12)}</p>
 </section>;
}
