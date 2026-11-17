"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import styles from "./FocusedWordPractice.module.css";

const API="/english/pronunciation/api/follow-along/items/";
const MAX_WORD_MS=4200;
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
 const [stage,setStage]=useState<"idle"|"recording"|"scoring">("idle");
 const [result,setResult]=useState<number|null>(null);
 const [feedback,setFeedback]=useState("选择一个需要纠正的词，仅录这一个词约四秒。");
 const [attempts,setAttempts]=useState(0);
 const [ownUrl,setOwnUrl]=useState("");
 const micRef=useRef<MediaStream|null>(null);
 const recRef=useRef<MediaRecorder|null>(null);
 const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const ownUrlRef=useRef("");
 const mountedRef=useRef(true);
 const requestRef=useRef<AbortController|null>(null);

 function releaseUrl(){
  if(ownUrlRef.current){URL.revokeObjectURL(ownUrlRef.current);ownUrlRef.current="";}
  setOwnUrl("");
 }
 function stopRecording(){
  if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null;}
  if(recRef.current?.state==="recording")recRef.current.stop();
 }
 function cleanup(){
  if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null;}
  requestRef.current?.abort();requestRef.current=null;
  if(recRef.current?.state==="recording"){recRef.current.onstop=null;recRef.current.stop();}
  recRef.current=null;
  micRef.current?.getTracks().forEach(t=>t.stop());micRef.current=null;
  if(ownUrlRef.current){URL.revokeObjectURL(ownUrlRef.current);ownUrlRef.current="";}
 }
 useEffect(()=>{
  mountedRef.current=true;
  return ()=>{mountedRef.current=false;cleanup();};
 },[]);
 const busy=stage!=="idle";
 function choose(next:string){
  if(busy)return;
  setWord(next);setResult(null);setFeedback("重点练习 "+next+"，先听一遍，再只读这个词。");
  releaseUrl();
 }
 function listen(){
  if(busy||!word)return;
  onPlay?.();
  if(!("speechSynthesis" in window)){
   setFeedback("设备暂不支持单词合成语音，请听整句参考音。");return;
  }
  window.speechSynthesis.cancel();
  const voice=new SpeechSynthesisUtterance(word);
  voice.lang="en-US";voice.rate=.78;voice.volume=1;
  voice.onerror=()=>{if(mountedRef.current)setFeedback("浏览器单词试听暂不可用，请回听原声。");};
  window.speechSynthesis.speak(voice);
  setFeedback("试听为设备合成单词声音，不是 Rust 评分参考音轨。");
 }
 async function record(){
  if(busy||!word||!candidates.includes(word)||!/^[-a-z0-9]{2,120}$/.test(itemId))return;
  setResult(null);setFeedback("正在等待麦克风授权…");
  releaseUrl();onPlay?.();window.speechSynthesis?.cancel();
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)
    throw Error("这个浏览器不支持录音");
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
   if(!mountedRef.current){stream.getTracks().forEach(t=>t.stop());return;}
   micRef.current=stream;
   const rec=recorderFor(stream),chunks:BlobPart[]=[];
   recRef.current=rec;
   const selected=word;
   rec.ondataavailable=event=>{if(event.data.size>0)chunks.push(event.data);};
   rec.onerror=()=>{if(mountedRef.current)setFeedback("录音设备异常，未发送评分。");};
   rec.onstop=async()=>{
    if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null;}
    stream.getTracks().forEach(t=>t.stop());micRef.current=null;recRef.current=null;
    if(!mountedRef.current)return;
    const blob=new Blob(chunks,{type:rec.mimeType||"audio/webm"});
    if(blob.size<1024||blob.size>6*1024*1024){
     setStage("idle");setFeedback("单词录音太短或超出大小限制，请重试。");return;
    }
    const url=URL.createObjectURL(blob);
    ownUrlRef.current=url;setOwnUrl(url);setAttempts(x=>x+1);
    setStage("scoring");setFeedback("已经录好，正在请求 Rust 单词评分…");
    const controller=new AbortController();requestRef.current=controller;
    try{
     const response=await fetch(API+encodeURIComponent(itemId)+"/score-word/"+encodeURIComponent(selected),{
      method:"POST",headers:{"content-type":blob.type},body:blob,signal:controller.signal,
     });
     if(!response.ok)throw Error("评分接口 HTTP "+response.status);
     const data=await response.json() as {score?:unknown};
     if(typeof data.score!=="number"||!Number.isFinite(data.score)||data.score<0||data.score>100)
      throw Error("Rust 未返回有效的单词评分");
     if(mountedRef.current){setResult(data.score);setFeedback("实验参考分已返回。请结合原声与自己的录音反复回听。");}
    }catch(e){
     if(mountedRef.current){
      setResult(null);
      setFeedback(e instanceof Error?"单词评分暂不可用："+e.message:"评分暂不可用，请回听录音。");
     }
    }finally{
     if(requestRef.current===controller)requestRef.current=null;
     if(mountedRef.current)setStage("idle");
    }
   };
   rec.start(200);setStage("recording");
   setFeedback("正在录音，只读 "+selected+"；4.2 秒后自动结束并送往本站实验评分服务。");
   timerRef.current=setTimeout(stopRecording,MAX_WORD_MS);
  }catch(e){
   micRef.current?.getTracks().forEach(t=>t.stop());micRef.current=null;
   recRef.current=null;setStage("idle");
   setFeedback(e instanceof Error?e.message:"无法使用麦克风");
  }
 }
 return <section className={styles.panel} data-testid="native-focused-word" aria-label="单词重点纠音">
  <div className={styles.header}>
   <h3>一个词，专注纠音</h3>
   <span>{suggested?"根据 Rust 评分优先建议":"手动选择重点词"}</span>
  </div>
  <p className={styles.instructions}>可以选择任意句中单词。单词试听、录音、回听和真实 Rust 单词评分是独立的，不会覆盖整句评分。</p>
  <div className={styles.words} role="group" aria-label="选择重点单词">
   {candidates.map((candidate,i)=><button type="button" key={candidate+"-"+i}
    className={candidate===word?styles.selected:styles.word}
    aria-pressed={candidate===word} disabled={busy} onClick={()=>choose(candidate)}>{candidate}</button>)}
  </div>
  <div className={styles.actions}>
   <button type="button" disabled={busy||!word} onClick={listen}>▶ 听 {word||"单词"} 示范</button>
   {stage==="recording"
    ?<button type="button" className={styles.stop} onClick={stopRecording}>停止单词录音</button>
    :<button type="button" className={styles.primary} disabled={busy||!word} onClick={()=>void record()}>
      {stage==="scoring"?"单词评分中…":"录这个词并评分"}
     </button>}
  </div>
  <p className={styles.feedback} role="status">{feedback}</p>
  {result!==null?<p className={styles.score}>第 {attempts} 次 · Rust 实验参考分 <strong>{Math.round(result)}</strong> / 100（非考试成绩）</p>:null}
  {ownUrl?<audio src={ownUrl} controls preload="metadata" aria-label="我的单词录音回听" className={styles.audio}/>:null}
  <p className={styles.disclosure}>这次单词录音仅在主动点击按钮并授权麦克风后开始，4.2 秒自动停止并上传至原 Rust 评分接口。评分不等于母语者审核结果。</p>
 </section>;
}
