import type { DiagnosticReport } from "@/lib/diagnostic-report";

const pct=(v:number)=>`${Math.round(v*100)}%`;
const sec=(v:number)=>v>=60?`${Math.floor(v/60)}分${Math.round(v%60)}秒`:`${Math.round(v)}秒`;
const date=(v:number)=>new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(v));
const score=(v:number)=>Number.isInteger(v)?String(v):v.toFixed(1).replace(/\.0$/,"");
function chunks<T>(rows:T[],size:number){const out:T[][]=[];for(let i=0;i<rows.length;i+=size)out.push(rows.slice(i,i+size));return out.length?out:[[]];}

function Header({report}:{report:DiagnosticReport}){return <div className="dr-topline"><div className="dr-brand"><div className="dr-mark">M</div><div className="dr-brand-copy"><strong>国际数学竞赛训练中心</strong><span>Math Competition Lab · Professional Diagnostic Report</span></div></div><div className="dr-docmeta"><div>{report.meta.reportId}</div><div>Report v{report.meta.reportVersion} · {date(report.meta.generatedAt)}</div></div></div>}
function Footer({report,page,total}:{report:DiagnosticReport;page:number;total:number}){return <div className="dr-footer"><span>{report.student.name} · {report.exam.name}</span><span>{report.meta.reportId} · {page}/{total}</span></div>}
function Page({report,page,total,children}:{report:DiagnosticReport;page:number;total:number;children:React.ReactNode}){return <section className="report-page"><Header report={report}/>{children}<Footer report={report} page={page} total={total}/></section>}
function SectionHead({title,desc}:{title:string;desc?:string}){return <div className="dr-section-head"><h2>{title}</h2>{desc&&<p>{desc}</p>}</div>}
function Bar({name,value,count,extra}:{name:string;value:number;count:number;extra?:string}){return <div className="dr-bar-row"><div className="name">{name}</div><div className="dr-bar"><i style={{width:`${Math.max(2,Math.round(value*100))}%`}}/></div><div className="value"><strong>{pct(value)}</strong><small>{extra||`${count}题`}</small></div></div>}

export default function DiagnosticReportView({report}:{report:DiagnosticReport}){
  const qPages=chunks(report.questions,18);
  const total=5+qPages.length;
  const topFindings=[...report.findings].sort((a,b)=>({priority:0,watch:1,strength:2}[a.kind]-{priority:0,watch:1,strength:2}[b.kind])).slice(0,3);
  let p=1;
  return <div className="diagnostic-report">
    <Page report={report} page={p++} total={total}>
      <div className="dr-kicker">Professional Learning Diagnostic</div>
      <h1 className="dr-title">数学竞赛学习诊断报告</h1>
      <p className="dr-subtitle">把一次考试从“分数”转换为可解释的能力证据、答题行为与下一阶段训练处方。结论按证据强度分级，不使用未经验证的常模排名。</p>
      <div className="dr-cover-band"><div><h2>{report.exam.name}</h2><div className="dr-person"><div><span>学生</span><strong>{report.student.name}</strong></div><div><span>年级</span><strong>{report.student.grade} 年级</strong></div><div><span>准考证号</span><strong>{report.student.candidateNo}</strong></div><div><span>学校</span><strong>{report.student.school||"—"}</strong></div><div><span>测评日期</span><strong>{date(report.meta.submittedAt)}</strong></div><div><span>数据基础</span><strong>{report.summary.confidenceLabel}</strong></div></div></div><div className="dr-score"><span className="label">本次得分率</span><span className="big">{pct(report.summary.scorePct)}</span><div className="raw">{score(report.summary.score)} / {score(report.summary.maxScore)} 分</div></div></div>
      <div className="dr-metrics"><div className="dr-metric"><span>题目正确率</span><strong>{pct(report.summary.accuracy)}</strong></div><div className="dr-metric"><span>完成率</span><strong>{pct(report.summary.completion)}</strong></div><div className="dr-metric"><span>考试用时</span><strong>{sec(report.summary.elapsedSeconds)}</strong></div><div className="dr-metric"><span>单题中位用时</span><strong>{sec(report.summary.medianQuestionSeconds)}</strong></div></div>
      <div className="dr-section"><SectionHead title="一页读懂本次考试" desc="优先呈现最影响下一步训练的三个信号"/><div className="dr-summary-list">{topFindings.map((f,i)=><div className="dr-summary-item" key={`${f.title}-${i}`}><div className="dr-index">{i+1}</div><div><h3>{f.title}</h3><p>{f.evidence}</p><p><strong>下一步：</strong>{f.action}</p></div><span className="dr-confidence">证据 {f.confidence}</span></div>)}</div></div>
      <div className="dr-section"><div className="dr-note"><strong>诊断可信度：{report.summary.confidenceLabel}</strong>　{report.summary.confidenceText}</div></div>
    </Page>

    <Page report={report} page={p++} total={total}>
      <div className="dr-kicker">Ability & Strategy Profile</div><h1 className="dr-title">能力结构与考试策略</h1><p className="dr-subtitle">把“会不会”与“怎么做”分开看。能力维度使用题目标签；策略维度使用真实作答时间、修改和未作答行为。</p>
      <div className="dr-grid-2 dr-section"><div className="dr-panel"><h3>能力维度</h3>{report.skills.slice(0,9).map(s=><Bar key={s.rawName} name={s.name} value={s.accuracy} count={s.count} extra={`${s.correct}/${s.count} · ${s.confidence}`}/>)}</div><div className="dr-panel"><h3>难度 / 题段表现</h3>{report.difficulty.map(d=><Bar key={d.label} name={d.label} value={d.accuracy} count={d.count} extra={`${d.correct}/${d.count}`}/>)}{report.difficulty.length===0&&<p className="dr-subtitle">当前试卷没有可比较的难度分层标签。</p>}</div></div>
      <div className="dr-section"><SectionHead title="考试过程分段" desc="用于观察后程掉速、时间分配与题目难度叠加效应"/><div className="dr-phase-grid">{report.phases.map(x=><div className="dr-phase" key={x.label}><span>{x.label}</span><strong>{pct(x.accuracy)}</strong><small>{x.correct}/{x.count} 正确 · 平均 {sec(x.avgSeconds)}/题</small></div>)}</div></div>
      <div className="dr-section"><SectionHead title="答题行为信号" desc="只描述可观察行为，不直接贴“粗心/畏难”等标签"/><div className="dr-behavior-grid"><div className="dr-behavior"><span>快速失分</span><strong>{report.behavior.rushedWrong}</strong><small>显著快于个人本卷典型用时的错题</small></div><div className="dr-behavior"><span>耗时失分</span><strong>{report.behavior.stuckWrong}</strong><small>投入较久仍未得分的题</small></div><div className="dr-behavior"><span>答案修改</span><strong>{report.behavior.answerChanges}</strong><small>{report.behavior.wrongToCorrect} 次带来得分 · {report.behavior.correctToWrong} 次导致失分</small></div><div className="dr-behavior"><span>未作答</span><strong>{report.behavior.unanswered}</strong><small>可用于判断时间回收空间</small></div><div className="dr-behavior"><span>正确但偏慢</span><strong>{report.behavior.slowCorrect}</strong><small>会做，但自动化程度仍可提升</small></div><div className="dr-behavior"><span>改答案题数</span><strong>{report.behavior.changedQuestions}</strong><small>观察复查策略是否有效</small></div><div className="dr-behavior"><span>切出考试页</span><strong>{report.behavior.tabAwayCount}</strong><small>仅作为环境数据，不作能力判断</small></div><div className="dr-behavior"><span>平均题时</span><strong>{sec(report.summary.avgQuestionSeconds)}</strong><small>总有效考试时长 / 题量</small></div></div></div>
      <div className="dr-section"><div className="dr-note">能力条只在样本量足够时形成稳定判断。单一能力维度少于 4 题时标记为“探索性”，应由后续测评验证。</div></div>
    </Page>

    <Page report={report} page={p++} total={total}>
      <div className="dr-kicker">Evidence-based Findings</div><h1 className="dr-title">诊断结论：证据 → 判断 → 行动</h1><p className="dr-subtitle">每条诊断都必须能追溯到具体行为或题目数据；没有证据的“性格判断”不进入正式报告。</p>
      <div className="dr-section">{report.findings.map((f,i)=><article className={`dr-finding ${f.kind}`} key={`${f.title}-${i}`}><div className="dr-finding-top"><h3>{f.title}</h3><span className="dr-chip">证据强度 · {f.confidence}</span></div><dl><dt>观察证据</dt><dd>{f.evidence}</dd><dt>训练含义</dt><dd>{f.action}</dd></dl></article>)}</div>
      <div className="dr-note">颜色只表示报告中的信息类型：绿色=相对稳定优势；红色=当前训练优先项；黄色=需要继续观察。它们不是对学生能力、性格或潜力的评级。</div>
    </Page>

    {qPages.map((rows,chunkIndex)=><Page report={report} page={p++} total={total} key={`q-${chunkIndex}`}>
      <div className="dr-kicker">Question-level Evidence</div><h1 className="dr-title">逐题诊断地图{qPages.length>1?` · ${chunkIndex+1}/${qPages.length}`:""}</h1><p className="dr-subtitle">逐题展示结果、用时和可观察行为模式。它是上页所有诊断结论的证据层。</p>
      <div className="dr-section"><table className="dr-table"><colgroup><col style={{width:"7%"}}/><col style={{width:"10%"}}/><col style={{width:"19%"}}/><col style={{width:"8%"}}/><col style={{width:"12%"}}/><col style={{width:"12%"}}/><col style={{width:"8%"}}/><col style={{width:"24%"}}/></colgroup><thead><tr><th>题号</th><th>结果</th><th>能力标签</th><th>分值</th><th>有效用时</th><th>首次作答</th><th>修改</th><th>行为模式</th></tr></thead><tbody>{rows.map(q=><tr key={q.no}><td className="num">Q{q.no}</td><td className={`dr-result ${q.result==="正确"?"ok":q.result==="错误"?"bad":"blank"}`}>{q.result}</td><td>{q.concept}</td><td>{q.points}</td><td>{sec(q.dwellSeconds)}</td><td>{q.firstAnswerSeconds===null?"—":sec(q.firstAnswerSeconds)}</td><td>{q.answerChanges}</td><td><span className="dr-pattern">{q.pattern}</span></td></tr>)}</tbody></table></div>
      <div className="dr-section"><div className="dr-note">“快速失分”“耗时失分”等标签是行为描述，不等同于错因结论。真正的概念错因仍需结合题目内容和复盘过程确认。</div></div>
    </Page>)}

    <Page report={report} page={p++} total={total}>
      <div className="dr-kicker">Personalized Prescription</div><h1 className="dr-title">未来 7–14 天训练处方</h1><p className="dr-subtitle">最多只给三个优先项。目标不是“做更多”，而是以最少训练量验证并修复最影响得分的机制。</p>
      <div className="dr-section dr-plan">{report.plan.map(x=><article className="dr-plan-item" key={x.priority}><div className="dr-plan-no">{x.priority}</div><div className="dr-plan-body"><h3>{x.title}</h3><dl><dt>为什么</dt><dd>{x.why}</dd><dt>怎么练</dt><dd>{x.prescription}</dd><dt>达标条件</dt><dd>{x.successCriterion}</dd></dl></div></article>)}</div>
      <div className="dr-section"><SectionHead title="家长支持建议" desc="把关注点从评价孩子，转向支持下一步行动"/><div className="dr-parent-list">{report.parentGuide.map((x,i)=><div className="dr-parent-item" key={i}><p>{x}</p></div>)}</div></div>
      <div className="dr-section"><div className="dr-note"><strong>建议复测：</strong>完成训练处方后，用同赛制但不同题目的完整计时卷验证。如果对应错误模式没有下降，就应重新诊断，而不是继续机械加量。</div></div>
    </Page>

    <Page report={report} page={p++} total={total}>
      <div className="dr-kicker">Growth Record & Methodology</div><h1 className="dr-title">成长记录与方法说明</h1><p className="dr-subtitle">单次成绩告诉我们“这一次发生了什么”；连续记录才告诉我们“是否真正发生了学习”。</p>
      <div className="dr-section"><SectionHead title="同类测评趋势" desc={report.trend.length>1?`最近 ${report.trend.length} 次同类考试`:"当前只有 1 次同类测评，先作为基线"}/><div className="dr-trend">{report.trend.map((x,i)=><div className="dr-trend-col" key={x.attemptId}><div className="dr-trend-value">{pct(x.scorePct)}</div><div className="dr-trend-bar" style={{height:`${Math.max(3,Math.round(x.scorePct*100))}%`}}/><div className="dr-trend-date">{date(x.submittedAt)}{i===report.trend.length-1?" · 本次":""}</div></div>)}</div></div>
      <div className="dr-section"><SectionHead title="诊断方法"/><div className="dr-method-grid"><div className="dr-method"><strong>1. 得分与正确率分开</strong><p>不同竞赛存在不同计分机制，因此报告同时保留原始得分率与题目正确率。</p></div><div className="dr-method"><strong>2. 单题有效时间</strong><p>依据进入/离开题目、页面可见性等事件估计有效作答时间，减少切屏对速度画像的干扰。</p></div><div className="dr-method"><strong>3. 行为模式不等于心理标签</strong><p>报告可以说“快速失分”或“反复修改”，但不凭一次考试断言“粗心、畏难、注意力差”。</p></div><div className="dr-method"><strong>4. 样本量决定结论强度</strong><p>能力维度题量越少，结论越应保守；后续同赛制测评用于确认或推翻当前判断。</p></div></div></div>
      <div className="dr-disclaimer"><strong>关于排名与常模：</strong>{report.benchmarkNote}<br/><br/><strong>报告版本：</strong>{report.meta.engineVersion} · 数据快照 {report.meta.attemptId}。本报告用于学习诊断与训练决策，不替代竞赛主办方官方成绩、学校评价或心理/医学评估。</div>
    </Page>
  </div>;
}
