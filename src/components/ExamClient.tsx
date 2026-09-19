"use client";

import { useEffect,useMemo,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ExamProfile,PublicQuestion } from "@/lib/types";
import type { PublicStudent } from "@/lib/auth";

type Event={type:string;questionId?:string;at:number;value?:string};
type Lang="zh"|"en";
type SectionLock={sectionIndex:number;startedAt:number;lockedAt:number;answers:Record<string,string>};
type ActiveSession={
  id:string;examId:string;startedAt:number;expiresAt:number;
  sectionIndex?:number;sectionStartedAt?:number;sectionLocks?:SectionLock[];sectionDrafts?:Record<string,{answers:Record<string,string>;updatedAt:number}>;
};
type StoredState={
  sessionId:string;examId:string;answers:Record<string,string>;flagged:Record<string,boolean>;
  events:Event[];index:number;lang:Lang;savedAt?:number;
};

const UI={
 zh:{
  remaining:"剩余时间",submit:"交卷",answered:"已答",marked:"标记",points:"分",previous:"← 上一题",next:"下一题 →",
  confirm:"确认交卷？",completed:"已完成",unanswered:"未作答",markedCount:"已标记",questionUnit:"题",
  warning:"仍有未作答题目。空题不扣分，可以返回检查。",back:"返回检查",grading:"正在评分…",confirmSubmit:"确认提交",
  loadError:"题库加载失败",loading:"正在装载考试…",officialOriginal:"官方原题",candidate:"考生信息确认",
  start:"确认信息并开始考试",resume:"继续未完成考试",lockSection:"结束本部分",sectionLocked:"本部分已锁定",
  startNext:"开始下一部分",submitLocked:"提交已锁定答案"
 },
 en:{
  remaining:"Time left",submit:"Submit",answered:"answered",marked:"Flag",points:"pts",previous:"← Previous",next:"Next →",
  confirm:"Submit exam?",completed:"Completed",unanswered:"unanswered",markedCount:"flagged",questionUnit:"questions",
  warning:"Some questions are unanswered. Blank answers are not penalized; you can return to review them.",back:"Back to review",
  grading:"Grading…",confirmSubmit:"Submit now",loadError:"Unable to load exam",loading:"Loading exam…",officialOriginal:"Official problem",
  candidate:"Candidate confirmation",start:"Confirm and start",resume:"Resume active exam",lockSection:"Finish this part",
  sectionLocked:"This part is locked",startNext:"Start next part",submitLocked:"Submit locked answers"
 }
} as const;

export default function ExamClient({examId,user}:{examId:string;user:PublicStudent}){
 const router=useRouter();
 const[questions,setQuestions]=useState<PublicQuestion[]>([]);
 const[profile,setProfile]=useState<ExamProfile|null>(null);
 const[index,setIndex]=useState(0);
 const[answers,setAnswers]=useState<Record<string,string>>({});
 const[flagged,setFlagged]=useState<Record<string,boolean>>({});
 const[seconds,setSeconds]=useState(0);
 const[lang,setLang]=useState<Lang>("zh");
 const[events,setEvents]=useState<Event[]>([]);
 const[started,setStarted]=useState(false);
 const[startedAt,setStartedAt]=useState(0);
 const[sessionId,setSessionId]=useState("");
 const[resumeSession,setResumeSession]=useState<ActiveSession|null>(null);
 const[starting,setStarting]=useState(false);
 const[submitting,setSubmitting]=useState(false);
 const[showSubmit,setShowSubmit]=useState(false);
 const[error,setError]=useState("");
 const[sectionIndex,setSectionIndex]=useState(0);
 const[sectionStartedAt,setSectionStartedAt]=useState(0);
 const sectionLockRef=useRef(false);

 const storageKey=`math-competition-active-${examId}`;
 const legacyStorageKey=`kangaroo-active-${examId}`;

 useEffect(()=>{
  Promise.all([
   fetch(`/api/exams/${encodeURIComponent(examId)}`).then(r=>r.json()),
   fetch(`/api/exam-sessions?examId=${encodeURIComponent(examId)}`).then(r=>r.json()).catch(()=>({session:null}))
  ]).then(([data,s])=>{
   if(data.error)throw new Error(data.error);
   setQuestions(data.questions);setProfile(data.profile);
   const firstSection=data.profile.timingSections?.[0];
   setSeconds(firstSection?.durationSeconds??data.profile.durationSeconds);
   setLang(data.profile.language==="en"?"en":"zh");
   if(s?.session)setResumeSession(s.session);
  }).catch(e=>setError(String(e.message||e)));
 },[examId]);

 const timingSections=profile?.timingSections||[];
 const split=timingSections.length>0;
 const section=split&&sectionIndex<timingSections.length?timingSections[sectionIndex]:null;

 useEffect(()=>{
  if(!profile||!started||submitting||profile.timingMode==="untimed")return;
  if(split&&!sectionStartedAt)return;
  const base=split?sectionStartedAt:startedAt;
  const duration=split?(section?.durationSeconds??0):profile.durationSeconds;
  if(!base||!duration)return;
  const tick=()=>{
   const left=Math.max(0,duration-Math.floor((Date.now()-base)/1000));
   setSeconds(left);
   if(left<=0){
    if(split)void lockCurrentSection(true);
    else void submitExam(true);
   }
  };
  tick();const t=setInterval(tick,1000);return()=>clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[profile,started,submitting,startedAt,sectionStartedAt,sectionIndex,answers]);

 useEffect(()=>{
  if(!started||!questions[index])return;
  const onVisibility=()=>{
   const qid=questions[index]?.id;if(!qid)return;
   setEvents(e=>[...e,{type:document.hidden?"visibility_hidden":"visibility_visible",questionId:qid,at:Date.now()}]);
  };
  document.addEventListener("visibilitychange",onVisibility);
  return()=>document.removeEventListener("visibilitychange",onVisibility);
 },[started,index,questions]);

 useEffect(()=>{
  if(!started||!sessionId)return;
  const state:StoredState={sessionId,examId,answers,flagged,events,index,lang,savedAt:Date.now()};
  try{localStorage.setItem(storageKey,JSON.stringify(state))}catch{}
 },[started,sessionId,examId,answers,flagged,events,index,lang,storageKey]);

 useEffect(()=>{
  if(!started||!split||!sectionStartedAt||!sessionId||submitting||sectionIndex>=timingSections.length)return;
  const t=setTimeout(()=>{
   void fetch("/api/exam-sessions",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({examId,sessionId,action:"save-section",sectionIndex,answers})}).catch(()=>{});
  },180);
  return()=>clearTimeout(t);
 },[started,split,sectionStartedAt,sessionId,submitting,sectionIndex,timingSections.length,answers,examId]);

 const q=questions[index],ui=UI[lang];
 const sectionStart=section?section.questionStart-1:0;
 const sectionEnd=section?section.questionEnd-1:Math.max(0,questions.length-1);
 const activeRows=split&&section?questions.slice(sectionStart,sectionEnd+1):questions;
 const answeredInActive=activeRows.filter(x=>Boolean(answers[x.id])).length;
 const remainingInActive=activeRows.length-answeredInActive;
 const totalAnswered=questions.filter(x=>Boolean(answers[x.id])).length;
 const minutes=String(Math.floor(seconds/60)).padStart(2,"0"),secs=String(seconds%60).padStart(2,"0");
 const progress=questions.length?((index+1)/questions.length)*100:0;
 const pointBand=useMemo(()=>q?.points===3?"easy":q?.points===4?"medium":"hard",[q]);

 async function beginExam(){
  if(!profile||!questions[0]||starting)return;
  setStarting(true);setError("");
  try{
   const res=await fetch("/api/exam-sessions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({examId})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"无法开始考试");
   const session=data.session as ActiveSession;
   setSessionId(session.id);setStartedAt(session.startedAt);

   const serverSection=split?(session.sectionIndex??0):0;
   const serverSectionStarted=split?(session.sectionStartedAt??0):0;
   setSectionIndex(serverSection);setSectionStartedAt(serverSectionStarted);
   const serverSaved:Record<string,string>={};
   for(const lock of session.sectionLocks||[])Object.assign(serverSaved,lock.answers||{});
   if(split)Object.assign(serverSaved,session.sectionDrafts?.[String(serverSection)]?.answers||{});

   let restored=false;
   try{
    const raw=localStorage.getItem(storageKey)||localStorage.getItem(legacyStorageKey);
    if(raw){
     const saved=JSON.parse(raw) as StoredState;
     if(saved.sessionId===session.id&&saved.examId===examId){
      let i=Math.max(0,Math.min(questions.length-1,saved.index||0));
      if(split&&serverSection<timingSections.length){
       const sec=timingSections[serverSection],lo=sec.questionStart-1,hi=sec.questionEnd-1;
       i=Math.max(lo,Math.min(hi,i));
      }
      setAnswers({...saved.answers,...serverSaved});setFlagged(saved.flagged||{});setIndex(i);setLang(saved.lang||lang);
      const oldEvents=[...(saved.events||[])],qid=questions[i]?.id;
      const lastEnter=[...oldEvents].reverse().find(e=>e.questionId===qid&&e.type==="question_enter");
      const lastLeave=[...oldEvents].reverse().find(e=>e.questionId===qid&&e.type==="question_leave");
      if(lastEnter&&(!lastLeave||lastLeave.at<lastEnter.at))oldEvents.push({type:"question_leave",questionId:qid,at:Math.max(lastEnter.at,saved.savedAt||lastEnter.at)});
      const now=Date.now();
      setEvents([...oldEvents,{type:"exam_resume",questionId:qid,at:now},...(serverSectionStarted?[{type:"question_enter",questionId:qid,at:now} as Event]:[])]);
      restored=true;
      try{localStorage.removeItem(legacyStorageKey)}catch{}
     }
    }
   }catch{}

   if(!restored){
    const i=split&&serverSection<timingSections.length?timingSections[serverSection].questionStart-1:0;
    if(Object.keys(serverSaved).length)setAnswers(serverSaved);
    setIndex(i);
    setEvents([{type:"exam_start",at:session.startedAt},...(serverSectionStarted&&questions[i]?[{type:"question_enter",questionId:questions[i].id,at:Date.now()} as Event]:[])]);
   }

   if(profile.timingMode==="untimed")setSeconds(0);
   else if(split&&serverSection<timingSections.length){
    const sec=timingSections[serverSection];
    setSeconds(serverSectionStarted?Math.max(0,sec.durationSeconds-Math.floor((Date.now()-serverSectionStarted)/1000)):sec.durationSeconds);
   }else setSeconds(Math.max(0,profile.durationSeconds-Math.floor((Date.now()-session.startedAt)/1000)));

   setResumeSession(null);setStarted(true);
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setStarting(false)}
 }

 function choose(key:string){if(!q)return;setAnswers(a=>({...a,[q.id]:key}));setEvents(e=>[...e,{type:"answer_selected",questionId:q.id,at:Date.now(),value:key}])}
 function enterInteger(value:string){if(!q)return;const cleaned=value.replace(/\D/g,"").slice(0,3);setAnswers(a=>({...a,[q.id]:cleaned}));setEvents(e=>[...e,{type:"integer_input",questionId:q.id,at:Date.now(),value:cleaned}])}
 function go(next:number){
  if(!q)return;
  const lo=split&&section?sectionStart:0,hi=split&&section?sectionEnd:questions.length-1;
  const ni=Math.max(lo,Math.min(hi,next));if(ni===index)return;
  const now=Date.now(),target=questions[ni];
  setEvents(e=>[...e,{type:"question_leave",questionId:q.id,at:now},{type:"question_enter",questionId:target.id,at:now}]);setIndex(ni);
 }
 function toggleFlag(){if(!q)return;const type=flagged[q.id]?"unflagged":"flagged";setFlagged(f=>({...f,[q.id]:!f[q.id]}));setEvents(e=>[...e,{type,questionId:q.id,at:Date.now()}])}
 function switchLang(){if(!q)return;const next=lang==="zh"?"en":"zh";setLang(next);setEvents(e=>[...e,{type:"language_switch",questionId:q.id,at:Date.now(),value:next}])}

 async function startCurrentSection(){
  if(!profile||!sessionId||!split||sectionIndex>=timingSections.length||starting)return;
  setStarting(true);setError("");
  try{
   const res=await fetch("/api/exam-sessions",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({examId,sessionId,action:"start-section",sectionIndex})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"无法开始下一部分");
   const at=Number(data.session?.sectionStartedAt)||Date.now(),sec=timingSections[sectionIndex],i=sec.questionStart-1;
   setSectionStartedAt(at);setSeconds(sec.durationSeconds);setIndex(i);
   setEvents(e=>[...e,{type:"section_start",questionId:questions[i]?.id,at,value:String(sectionIndex)},{type:"question_enter",questionId:questions[i]?.id,at}]);
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setStarting(false)}
 }

 async function lockCurrentSection(auto=false){
  if(!profile||!sessionId||!split||!section||sectionLockRef.current)return;
  sectionLockRef.current=true;setSubmitting(true);setShowSubmit(false);
  const now=Date.now(),lockEvent:Event={type:auto?"section_auto_lock":"section_lock",questionId:q?.id,at:now,value:String(sectionIndex)};
  try{
   const res=await fetch("/api/exam-sessions",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({examId,sessionId,action:"lock-section",sectionIndex,answers})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"无法锁定当前部分");
   if(data.finalSection){
    setEvents(e=>[...e,lockEvent]);setSectionStartedAt(0);
    await submitExam(auto,[lockEvent]);
   }else{
    const next=Number(data.session?.sectionIndex??sectionIndex+1),sec=timingSections[next];
    setEvents(e=>[...e,lockEvent]);setSectionIndex(next);setSectionStartedAt(0);
    if(sec){setIndex(sec.questionStart-1);setSeconds(sec.durationSeconds)}
    setSubmitting(false);
   }
  }catch(e){setError(e instanceof Error?e.message:String(e));setSubmitting(false)}
  finally{sectionLockRef.current=false}
 }

 async function submitExam(auto=false,extraEvents:Event[]=[]){
  if((submitting&&!extraEvents.length)||!profile||!sessionId)return;
  setSubmitting(true);setShowSubmit(false);
  const now=Date.now(),finalEvents=[...events,...extraEvents,...(q?[{type:"question_leave",questionId:q.id,at:now} as Event]:[]),{type:auto?"auto_submit":"submit",at:now} as Event];
  try{
   const res=await fetch("/api/grade",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({examId,sessionId,answers,lang,events:finalEvents})});
   const grade=await res.json();if(!res.ok)throw new Error(grade.error||(lang==="zh"?"评分失败":"Grading failed"));
   localStorage.setItem("math-competition-last-attempt",JSON.stringify({examId,profile,lang,grade,answers,events:finalEvents,submittedAt:grade.submittedAt||now,elapsedSeconds:grade.elapsedSeconds??(profile.durationSeconds-seconds),questions}));
   localStorage.removeItem(storageKey);localStorage.removeItem(legacyStorageKey);router.push("/result");
  }catch(e){setError(e instanceof Error?e.message:String(e));setSubmitting(false)}
 }

 if(error)return <div className="center-card"><h2>{ui.loadError}</h2><p>{error}</p></div>;
 if(!profile||!q)return <div className="center-card"><div className="loader"/><p>{ui.loading}</p></div>;

 const title=lang==="zh"?(profile.nameZh||profile.name):(profile.nameEn||profile.name);
 const grades=lang==="zh"?(profile.gradesZh||profile.grades):(profile.gradesEn||profile.grades);
 const formatLabel=lang==="zh"?(profile.formatLabelZh||""):(profile.formatLabelEn||"");
 const rulesSummary=lang==="zh"?(profile.rulesSummaryZh||""):(profile.rulesSummaryEn||"");
 const timeLabel=split
  ? timingSections.map(s=>`${lang==="zh"?s.labelZh:s.labelEn} ${Math.round(s.durationSeconds/60)} ${lang==="zh"?"分钟":"min"}`).join(" + ")
  : profile.timingMode==="untimed"?(lang==="zh"?"不限时":"Untimed")
   :profile.timingMode==="recommended"?(lang==="zh"?`建议 ${Math.round(profile.durationSeconds/60)} 分钟`:`Suggested ${Math.round(profile.durationSeconds/60)} min`)
   :`${Math.round(profile.durationSeconds/60)} ${lang==="zh"?"分钟":"min"}`;

 if(!started)return <div className="report-shell"><section className="candidate-card">
  <span className="eyebrow">CANDIDATE CHECK-IN</span><h1>{ui.candidate}</h1>
  <div className="candidate-grid"><div><span>姓名</span><strong>{user.name}</strong></div><div><span>准考证号</span><strong>{user.candidateNo}</strong></div><div><span>年级</span><strong>{user.grade} 年级</strong></div><div><span>试卷</span><strong>{title}</strong></div><div><span>题量</span><strong>{profile.questionCount} 题</strong></div><div><span>考试时间</span><strong>{timeLabel}</strong></div>{formatLabel&&<div><span>赛制模板</span><strong>{formatLabel}</strong></div>}</div>
  {rulesSummary&&<div className="candidate-rules"><strong>{lang==="zh"?"赛制说明":"Format rules"}</strong><p>{rulesSummary}</p></div>}
  <div className="candidate-notice">{profile.paperType==="practice"
   ?(lang==="zh"?"这是 MAA 官方专项训练，不限时；结果作为专项练习数据保存，不计入正式模拟次数或正式模拟综合指标。":"This is an official MAA practice set and is untimed. Practice data is saved separately from formal mock-exam metrics.")
   :split?(lang==="zh"?"这是分段计时赛制。第一部分锁定后不可返回；中间休息不计入作答时间，点击开始下一部分后才重新计时。":"This exam uses section timing. Once Part 1 is locked it cannot be revisited. The break is not counted; Part 2 starts only when you explicitly begin it.")
   :profile.timingMode==="recommended"?(lang==="zh"?"这是一套官方样题，原文件未注明正式限时；本站计时仅作为训练建议。":"This is an official sample; the source does not state an official time limit. The site timer is for practice only.")
   :(lang==="zh"?"点击开始后由服务器记录正式开考时间。刷新或重新进入页面不会重置计时；未完成考试可以继续。":"The server records the official start time. Refreshing does not reset the timer; unfinished exams can be resumed.")}</div>
  <button className="primary-button candidate-start" disabled={starting} onClick={()=>void beginExam()}>{starting?"正在进入…":resumeSession?ui.resume:ui.start}</button>
 </section></div>;

 if(split&&!sectionStartedAt){
  const allLocked=sectionIndex>=timingSections.length;
  const next=allLocked?null:timingSections[sectionIndex],previous=timingSections[Math.max(0,sectionIndex-1)];
  return <div className="report-shell"><section className="candidate-card section-break-card">
   <span className="eyebrow">AIME SECTION CONTROL</span>
   <h1>{allLocked?(lang==="zh"?"两部分均已锁定":"Both parts are locked"):ui.sectionLocked}</h1>
   <div className="candidate-rules"><strong>{allLocked?(lang==="zh"?"可以提交成绩":"Ready to submit"):(lang==="zh"?`${previous?.labelZh||"上一部分"}已保存`:`${previous?.labelEn||"Previous part"} saved`)}</strong>
    <p>{allLocked
     ?(lang==="zh"?"服务器将只使用两个已锁定部分的答案评分。":"The server will grade only the two locked answer snapshots.")
     :(lang==="zh"?`已锁定的题目不能再修改。现在可以短暂休息；休息不计时。准备好后开始${next?.labelZh}，共 ${next?next.questionEnd-next.questionStart+1:0} 题、${next?Math.round(next.durationSeconds/60):0} 分钟。`:`Locked answers can no longer be changed. Take the short untimed break, then start ${next?.labelEn}: ${next?next.questionEnd-next.questionStart+1:0} questions in ${next?Math.round(next.durationSeconds/60):0} minutes.`)}</p>
   </div>
   <button className="primary-button candidate-start" disabled={starting||submitting} onClick={()=>allLocked?void submitExam(false):void startCurrentSection()}>{submitting?ui.grading:allLocked?ui.submitLocked:ui.startNext}</button>
  </section></div>;
 }

 const stem=lang==="en"&&q.stemEn?q.stemEn:q.stem,choices=lang==="en"&&q.choicesEn?.length?q.choicesEn:q.choices;
 const hasBilingual=Boolean(q.stemEn||q.choicesEn?.length),visualAsset=lang==="en"?(q.assetUrlEn||q.assetUrl):(q.assetUrlZh||q.assetUrl);
 const concept=q.concept==="official_original"?ui.officialOriginal:q.concept,isInteger=q.answerMode==="integer";
 const sectionLabel=split&&section?(lang==="zh"?section.labelZh:section.labelEn):"";
 const timerLabel=split&&section?`${sectionLabel} · ${ui.remaining}`:ui.remaining;
 const submitLabel=split&&section?`${ui.lockSection} · ${sectionLabel}`:ui.submit;

 return <div className="exam-shell">
  <header className="exam-topbar"><div><span className="exam-kicker">{title}</span><strong>{user.name} · {user.candidateNo} · {grades}</strong></div>
   <div className={profile.timingMode==="untimed"?"timer":seconds<600?"timer danger":"timer"}><span>{profile.timingMode==="untimed"?(profile.paperType==="practice"?(lang==="zh"?"训练模式":"Practice mode"):(lang==="zh"?"样题模式":"Sample mode")):timerLabel}</span><strong>{profile.timingMode==="untimed"?(lang==="zh"?"不限时":"UNTIMED"):`${minutes}:${secs}`}</strong></div>
   <button className="ghost-button" onClick={()=>setShowSubmit(true)}>{submitLabel}</button>
  </header>
  <div className="exam-progress"><span style={{width:`${progress}%`}}/></div>
  <div className="exam-layout"><aside className="question-nav"><div className="nav-summary"><strong>{split?answeredInActive:totalAnswered}</strong><span>/ {split?activeRows.length:questions.length} {ui.answered}</span></div>
   <div className="number-grid">{questions.map((item,i)=>{const inCurrent=!split||!section||(i>=sectionStart&&i<=sectionEnd);return <button key={item.id} disabled={!inCurrent} onClick={()=>go(i)} className={[i===index?"current":"",answers[item.id]?"answered":"",flagged[item.id]?"flagged":"",!inCurrent?"section-locked":""].join(" ")}>{i+1}</button>})}</div>
   <div className="legend"><span><i className="dot answered"/>{ui.answered}</span><span><i className="dot flag"/>{ui.marked}</span>{split&&<span>🔒 {lang==="zh"?"已锁部分":"Locked part"}</span>}</div>
  </aside>
  <section className="question-card"><div className="question-meta"><div><span className="q-number">Question {index+1}</span><span className={`point-badge ${pointBand}`}>{q.points} {ui.points}</span>{sectionLabel&&<span className="section-chip">{sectionLabel}</span>}</div>
   <div className="question-tools">{hasBilingual&&<button onClick={switchLang}>{lang==="zh"?"EN":"中"}</button>}<button onClick={toggleFlag}>{flagged[q.id]?`★ ${ui.marked}`:`☆ ${ui.marked}`}</button></div></div>
   <div className="concept-label">{concept}</div><h1 className="question-stem">{stem}</h1>
   {visualAsset&&<Image className="question-asset" src={visualAsset} alt={lang==="zh"?"题目图示":"Question diagram"} width={900} height={500} unoptimized/>}
   {isInteger?<div className="integer-answer-box"><label>{lang==="zh"?"整数答案（0–999）":"Integer answer (0–999)"}</label><input inputMode="numeric" pattern="[0-9]*" maxLength={3} value={answers[q.id]||""} onChange={e=>enterInteger(e.target.value)} placeholder="0–999" /></div>
    :<div className="choice-list">{choices.map(c=><button key={c.key} onClick={()=>choose(c.key)} className={answers[q.id]===c.key?"choice selected":"choice"}><span className="choice-key">{c.key}</span><span>{c.label}</span></button>)}</div>}
   <footer className="question-footer"><button className="secondary-button" disabled={index===(split?sectionStart:0)} onClick={()=>go(index-1)}>{ui.previous}</button><div className="question-counter">{index+1} / {questions.length}</div><button className="primary-button" disabled={index===(split?sectionEnd:questions.length-1)} onClick={()=>go(index+1)}>{ui.next}</button></footer>
  </section></div>

  {showSubmit&&<div className="modal-backdrop"><div className="submit-modal"><div className="modal-icon">✓</div>
   <h2>{split&&section?(lang==="zh"?`确认结束${section.labelZh}？`:`Finish ${section.labelEn}?`):ui.confirm}</h2>
   <p>{ui.completed} <strong>{split?answeredInActive:totalAnswered}</strong> {ui.questionUnit}, {ui.unanswered} <strong>{split?remainingInActive:questions.length-totalAnswered}</strong>, {ui.markedCount} <strong>{Object.values(flagged).filter(Boolean).length}</strong>.</p>
   {split?<div className="warning-box">{lang==="zh"?"锁定后不能再返回或修改本部分答案。":"After locking, you cannot return to or change answers in this part."}</div>:remainingInActive>0&&<div className="warning-box">{ui.warning}</div>}
   <div className="modal-actions"><button className="secondary-button" onClick={()=>setShowSubmit(false)}>{ui.back}</button><button className="primary-button" disabled={submitting} onClick={()=>split?void lockCurrentSection(false):void submitExam(false)}>{submitting?ui.grading:(split?(lang==="zh"?"锁定本部分":"Lock this part"):ui.confirmSubmit)}</button></div>
  </div></div>}
 </div>;
}
