"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import styles from "./FocusedWordPractice.module.css";

const API="/english/pronunciation/api/follow-along/items/";
const MAX_WORD_MS=4200;
type Stage="idle"|"requesting"|"recording"|"scoring";
type ListeningNote="clearer"|"similar"|"again"|null;
const listeningLabels:Record<Exclude<ListeningNote,null>,string>={
 clearer:"我听起来这次更清楚",
 similar:"两次听起来差不多",
 again:"我还想继续练习",
};
const clean=(word:string)=>word.replace(/[^a-zA-Z'-]/g,"");
function recorderFor(stream:MediaStream):MediaRecorder{
 const mime=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(type=>MediaRecorder.isTypeSupported(type));
 return new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
}

export default function FocusedWordPractice({
 itemId,sentence,suggested,onPlay,
}:{
 itemId:string;sentence:string;suggested?:string|null;onPlay?:()=>void;
}){
 const candidates=useMemo(()=>[...new Set(sentence.split(/\s+/).map(clean).filter(Boolean))],[sentence]);
 const initial=useMemo(()=>candidates.find(w=>w.toLowerCase()===clean(suggested||"").toLowerCase())||candidates[0]||"",[candidates,suggested]);
 const [word,setWord]=useState(initial);
 const [stage,setStage]=useState<Stage>("idle");
 const [result,setResult]=useState<number|null>(null);
 const [feedback,setFeedback]=useState("选择一个需要纠正的词，仅录这一个词约四秒。");
 const [attempts,setAttempts]=useState(0);
 const [ownUrl,setOwnUrl]=useState("");
 const [priorUrl,setPriorUrl]=useState("");
 const [listeningNote,setListeningNote]=useState<ListeningNote>(null);
 const micRef=useRef<MediaStream|null>(null);
 const recRef=useRef<MediaRecorder|null>(null);
 const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const ownUrlRef=useRef("");
 const priorUrlRef=useRef("");
 const mountedRef=useRef(true);
 const requestRef=useRef<AbortController|null>(null);
 // Every async permission, recorder or scoring callback belongs to one generation.
 const generationRef=useRef(0);
 const operationRef=useRef(false);

 function clearTimer(){
  if(timerRef.current!==null){clearTimeout(timerRef.current);timerRef.current=null;}
 }
 function releaseUrls(){
  if(ownUrlRef.current)URL.revokeObjectURL(ownUrlRef.current);
  if(priorUrlRef.current)URL.revokeObjectURL(priorUrlRef.current);
  ownUrlRef.current="";priorUrlRef.current="";
  setOwnUrl("");setPriorUrl("");
 }
 function stopRecording(){
  clearTimer();
  const rec=recRef.current;
  if(rec?.state==="recording"){
   try{rec.stop();}catch{setFeedback("录音设备异常，未发送评分。");}
  }
 }
 function cleanup(){
  generationRef.current++;
  operationRef.current=false;
  clearTimer();
  requestRef.current?.abort();requestRef.current=null;
  const rec=recRef.current;recRef.current=null;
  if(rec){
   rec.onstop=null;rec.ondataavailable=null;rec.onerror=null;
   if(rec.state==="recording")try{rec.stop();}catch{/* Device already detached. */}
  }
  micRef.current?.getTracks().forEach(t=>t.stop());micRef.current=null;
  if(ownUrlRef.current)URL.revokeObjectURL(ownUrlRef.current);
  if(priorUrlRef.current)URL.revokeObjectURL(priorUrlRef.current);
  ownUrlRef.current="";priorUrlRef.current="";
 }
 useEffect(()=>{
  mountedRef.current=true;
  return ()=>{mountedRef.current=false;cleanup();};
 },[]);
 const busy=stage!=="idle";
 function choose(next:string){
  if(busy||operationRef.current||!candidates.includes(next)||next===word)return;
  generationRef.current++;
  window.speechSynthesis?.cancel();
  setWord(next);setResult(null);setAttempts(0);setListeningNote(null);
  setFeedback("重点练习 "+next+"，先听一遍，再只读这个词。");
  releaseUrls();
 }
 function listen(){
  if(busy||operationRef.current||!word)return;
  onPlay?.();
  if(!("speechSynthesis" in window)){
   setFeedback("设备暂不支持单词合成语音，请听整句参考音。");return;
  }
  window.speechSynthesis.cancel();
  const generation=generationRef.current;
  const voice=new SpeechSynthesisUtterance(word);
  voice.lang="en-US";voice.rate=.78;voice.volume=1;
  voice.onerror=()=>{if(mountedRef.current&&generationRef.current===generation)setFeedback("浏览器单词试听暂不可用，请回听原声。");};
  window.speechSynthesis.speak(voice);
  setFeedback("试听为设备合成单词声音，不是 Rust 评分参考音轨。");
 }
 function cancelPending(){
  if(stage!=="requesting")return;
  // Permission prompts cannot be revoked by the browser API. A late stream
  // is immediately stopped when its generation resolves.
  generationRef.current++;
  operationRef.current=false;
  setStage("idle");
  setFeedback("已取消本次录音；此前的录音仍可回听。");
 }
 async function record(){
  if(operationRef.current||stage!=="idle"||!word||!candidates.includes(word)||!/^[-a-z0-9]{2,120}$/.test(itemId))return;
  operationRef.current=true; // Synchronous lock before getUserMedia can yield.
  const generation=++generationRef.current;
  const selected=word;
  const active=()=>mountedRef.current&&generationRef.current===generation;
  setResult(null);setListeningNote(null);
  setStage("requesting");setFeedback("正在等待麦克风授权…");
  onPlay?.();window.speechSynthesis?.cancel();
  let stream:MediaStream|null=null;
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)
    throw Error("这个浏览器不支持录音");
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
   if(!active()){stream.getTracks().forEach(t=>t.stop());return;}
   micRef.current=stream;
   const rec=recorderFor(stream),chunks:BlobPart[]=[];
   recRef.current=rec;
   let recorderError=false;
   rec.ondataavailable=event=>{if(active()&&event.data.size>0)chunks.push(event.data);};
   rec.onerror=()=>{
    recorderError=true;
    if(active())setFeedback("录音设备异常，未发送评分。");
    if(rec.state==="recording")try{rec.stop();}catch{/* onstop may already be queued. */}
   };
   rec.onstop=async()=>{
    clearTimer();
    stream?.getTracks().forEach(t=>t.stop());
    if(recRef.current===rec){recRef.current=null;micRef.current=null;}
    if(!active())return;
    if(recorderError){
     operationRef.current=false;setStage("idle");
     setFeedback("录音设备异常，未发送评分；此前的录音仍可回听。");return;
    }
    const blob=new Blob(chunks,{type:rec.mimeType||"audio/webm"});
    if(blob.size<1024||blob.size>6*1024*1024){
     operationRef.current=false;setStage("idle");
     setFeedback("单词录音太短或超出大小限制，请重试。此前录音已保留。");return;
    }
    // Two newest genuine microphone recordings: A=previous, B=current.
    // Rotate only after a valid recording. Failed attempts never erase B.
    const url=URL.createObjectURL(blob);
    if(priorUrlRef.current)URL.revokeObjectURL(priorUrlRef.current);
    priorUrlRef.current=ownUrlRef.current;
    ownUrlRef.current=url;
    setPriorUrl(priorUrlRef.current);setOwnUrl(url);
    setAttempts(x=>x+1);
    setListeningNote(null);
    setStage("scoring");setFeedback("已录好，可回听；正在请求 Rust 单词评分…");
    const controller=new AbortController();requestRef.current=controller;
    try{
     const response=await fetch(API+encodeURIComponent(itemId)+"/score-word/"+encodeURIComponent(selected),{
      method:"POST",headers:{"content-type":blob.type},body:blob,signal:controller.signal,
     });
     if(!response.ok)throw Error("评分接口 HTTP "+response.status);
     const data=await response.json() as {score?:unknown};
     if(typeof data.score!=="number"||!Number.isFinite(data.score)||data.score<0||data.score>100)
      throw Error("Rust 未返回有效的单词评分");
     if(active()){setResult(data.score);setFeedback("Rust 实验参考分已返回。请先听 A/B 录音，再判断自己的变化。");}
    }catch(e){
     if(active()){
      setResult(null);
      setFeedback(e instanceof Error?"单词评分暂不可用："+e.message:"评分暂不可用，请回听录音。");
     }
    }finally{
     if(requestRef.current===controller)requestRef.current=null;
     if(active()){operationRef.current=false;setStage("idle");}
    }
   };
   rec.start(200);
   setStage("recording");
   setFeedback("正在录音，只读 "+selected+"；4.2 秒后自动结束并送往本站实验评分服务。");
   timerRef.current=setTimeout(stopRecording,MAX_WORD_MS);
  }catch(e){
   stream?.getTracks().forEach(t=>t.stop());
   if(!active())return;
   micRef.current=null;recRef.current=null;
   operationRef.current=false;setStage("idle");
   setFeedback(e instanceof Error?e.message:"无法使用麦克风");
  }
 }
 return <section className={styles.panel} data-testid="native-focused-word" aria-label="单词重点纠音">
  <div className={styles.header}>
   <h3>一个词，专注纠音</h3>
   <span>{suggested?"根据 Rust 评分优先建议":"手动选择重点词"}</span>
  </div>
  <p className={styles.instructions}>可以选择任意句中单词。单词试听、真实录音 A/B 回听和 Rust 实验评分彼此独立，不会覆盖整句评分。</p>
  <div className={styles.words} role="group" aria-label="选择重点单词">
   {candidates.map((candidate,i)=><button type="button" key={candidate+"-"+i}
    className={candidate===word?styles.selected:styles.word}
    aria-pressed={candidate===word} disabled={busy} onClick={()=>choose(candidate)}>{candidate}</button>)}
  </div>
  <div className={styles.actions}>
   <button type="button" disabled={busy||!word} onClick={listen}>▶ 听 {word||"单词"} 示范</button>
   {stage==="recording"
    ?<button type="button" className={styles.stop} onClick={stopRecording}>停止单词录音</button>
    :stage==="requesting"
     ?<button type="button" className={styles.stop} onClick={cancelPending}>取消等待麦克风</button>
     :<button type="button" className={styles.primary} disabled={busy||!word} onClick={()=>void record()}>
       {stage==="scoring"?"单词评分中…":"录这个词并评分"}
      </button>}
  </div>
  <p className={styles.feedback} role="status">{feedback}</p>
  {result!==null?<p className={styles.score}>第 {attempts} 次 · Rust 实验参考分 <strong>{Math.round(result)}</strong> / 100（非考试成绩）</p>:null}
  {ownUrl?<div className={styles.compare} aria-label="单词录音 A/B 听辨">
   <div className={styles.recordingCard}>
    <strong>{priorUrl?"A · 上一次真实录音":"本次真实录音"}</strong>
    {priorUrl?<audio src={priorUrl} controls preload="metadata" aria-label="上一次单词录音（A）" className={styles.audio}/>:<p>再录一次，即可对照前后两次真实录音。</p>}
   </div>
   <div className={styles.recordingCard}>
    <strong>{priorUrl?"B · 这一次真实录音":"我的单词录音"}</strong>
    <audio src={ownUrl} controls preload="metadata" aria-label="我的单词录音回听" className={styles.audio}/>
   </div>
   {priorUrl?<div className={styles.selfCheck} role="group" aria-label="自己的听辨反馈">
    <p>先听 A，再听 B。你自己觉得呢？</p>
    <div className={styles.listeningOptions}>
     {(Object.keys(listeningLabels) as Exclude<ListeningNote,null>[]).map(option=><button
      type="button" key={option} className={listeningNote===option?styles.chosenNote:styles.note}
      aria-pressed={listeningNote===option} onClick={()=>setListeningNote(option)}>
      {listeningLabels[option]}</button>)}
    </div>
    {listeningNote?<p role="status">我的听感：{listeningLabels[listeningNote]}。这是自我判断，并非 AI 验证的发音进步。</p>:null}
   </div>:null}
  </div>:null}
  <p className={styles.disclosure}>仅主动点击并授权麦克风后开始录音；最长 4.2 秒，录音结束后发送至原 Rust 评分接口。仅在本页内保留同一单词最近两次录音，换词或离开页面即释放，不持久化 A/B 反馈。自我听辨不等于模型判分，实验评分也不等于正式考试成绩。</p>
 </section>;
}
