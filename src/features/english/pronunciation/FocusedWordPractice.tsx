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
function invalidateGeneration(ref:{current:number}){ref.current++;}
function recorderFor(stream:MediaStream):MediaRecorder{
 const mime=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(type=>MediaRecorder.isTypeSupported(type));
 return new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
}

export default function FocusedWordPractice({
 itemId,sentence,suggested,onPlay,speed=0.7,
}:{
 itemId:string;sentence:string;suggested?:string|null;onPlay?:()=>void;speed?:number;
}){
 const candidates=useMemo(()=>[...new Set(sentence.split(/\s+/).map(clean).filter(Boolean))],[sentence]);
 const initial=useMemo(()=>candidates.find(w=>w.toLowerCase()===clean(suggested||"").toLowerCase())||candidates[0]||"",[candidates,suggested]);
 const [word,setWord]=useState(initial);
 const [stage,setStage]=useState<Stage>("idle");
 const [result,setResult]=useState<number|null>(null);
 const [feedback,setFeedback]=useState("选一个词，先听发音，再自己读一次。");
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
   try{rec.stop();}catch{
    // A detached recorder may throw instead of emitting onstop.
    generationRef.current++;
    rec.onstop=null;rec.ondataavailable=null;rec.onerror=null;
    recRef.current=null;
    micRef.current?.getTracks().forEach(t=>t.stop());micRef.current=null;
    operationRef.current=false;
    setStage("idle");setFeedback("录音设备异常，未发送评分；此前录音已保留。");
   }
  }
 }
 useEffect(()=>{
  mountedRef.current=true;
  return ()=>{
   mountedRef.current=false;
   invalidateGeneration(generationRef);
   operationRef.current=false;
   if(timerRef.current!==null){clearTimeout(timerRef.current);timerRef.current=null;}
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
  };
 },[]);
 const busy=stage!=="idle";
 function choose(next:string){
  if(busy||operationRef.current||!candidates.includes(next)||next===word)return;
  generationRef.current++;
  window.speechSynthesis?.cancel();
  setWord(next);setResult(null);setAttempts(0);setListeningNote(null);
  setFeedback("我们来练 "+next+"。先点「听单词」，再自己读一遍。");
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
  voice.lang="en-US";voice.rate=speed;voice.volume=1;
  voice.onerror=()=>{if(mountedRef.current&&generationRef.current===generation)setFeedback("浏览器单词试听暂不可用，请回听原声。");};
  window.speechSynthesis.speak(voice);
  setFeedback("正在读 "+word+"。可以多听几遍，再试着自己读。");
 }
 function cancelPending(){
  if(stage!=="requesting")return;
  // Permission prompts cannot be revoked by the browser API. A late stream
  // is immediately stopped when its generation resolves.
  generationRef.current++;
  operationRef.current=false;
  setStage("idle");
  setFeedback("已取消，之前录好的声音还能听。");
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
    setStage("scoring");setFeedback("录好了，正在打分。也可以听听刚才的录音。");
    const controller=new AbortController();requestRef.current=controller;
    try{
     const response=await fetch(API+encodeURIComponent(itemId)+"/score-word/"+encodeURIComponent(selected),{
      method:"POST",headers:{"content-type":blob.type},body:blob,signal:controller.signal,
     });
     if(!response.ok)throw Error("评分接口 HTTP "+response.status);
     const data=await response.json() as {score?:unknown};
     if(typeof data.score!=="number"||!Number.isFinite(data.score)||data.score<0||data.score>100)
      throw Error("没有收到有效分数");
     if(active()){setResult(data.score);setFeedback("得分出来啦！再听听两次录音，看看有没有变化。");}
    }catch{
     if(active()){
      setResult(null);
      setFeedback("这次没能打分，先听听录音，再读一次。");
     }
    }finally{
     if(requestRef.current===controller)requestRef.current=null;
     if(active()){operationRef.current=false;setStage("idle");}
    }
   };
   rec.start(200);
   setStage("recording");
   setFeedback("正在录音，只读 "+selected+" 这个词。最长约四秒。");
   timerRef.current=setTimeout(stopRecording,MAX_WORD_MS);
  }catch(e){
   stream?.getTracks().forEach(t=>t.stop());
   if(!active())return;
   micRef.current=null;recRef.current=null;
   operationRef.current=false;setStage("idle");
   setFeedback(e instanceof DOMException&&e.name==="NotAllowedError"
    ?"没有获得麦克风权限，请允许录音后再试。"
    :"这次没能开始录音，请检查麦克风后重试。");
  }
 }
 return <section className={styles.panel} data-testid="native-focused-word" aria-label="单词重点纠音">
  <div className={styles.header}>
   <h3>单词再练一次</h3>
   <span>{suggested?"建议先练这个词":"你可以自己选词"}</span>
  </div>
  <p className={styles.instructions}>点一个词，听一遍，再录一次。也能对比自己前后两次的声音。</p>
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
  {result!==null?<p className={styles.score}>第 {attempts} 次 · 单词得分 <strong>{Math.round(result)}</strong> / 100 分</p>:null}
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
  <details className={styles.disclosure}><summary>录音和评分说明</summary><p>点击录音并允许使用麦克风后才开始录。最长约四秒。录音结束后发送本站评分服务；最近两次录音只在当前页面留存，换词或离开就清除。你觉得自己有进步是自我判断，不等于系统验证；分数仅供练习参考。</p></details>
 </section>;
}
