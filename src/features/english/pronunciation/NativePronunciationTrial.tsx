"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import styles from "./NativePronunciationTrial.module.css";
import SyncedAudioOverlay from "./SyncedAudioOverlay";
import FocusedWordPractice from "./FocusedWordPractice";

type Sentence={
 id:string;title:string;level:string;topic:string;sentence:string;
 translation:string;audio_available:boolean;audio_url:string|null;
 voice_profile:string;disclosure:string;content_origin:string;
};
type Catalog={
 items:Sentence[];scoring_status:"connected"|"not_connected";scoring_message:string;
};
type ScoreResponse={
 score:number;transcribe?:string;
 differences?:{words_with_errors?:string[];word_error_rate?:number};
};
const API="/english/pronunciation/api";
const CUE="/english/pronunciation/app/audio/ui/ready-ding-single.wav";
const SILENCE_STOP_MS=1750;
const NO_SPEECH_TIMEOUT_MS=15000;
const MAX_RECORD_MS=45000;

function audioSrc(url:string|null):string{
 if(!url||!/^\/app\/audio\/[a-zA-Z0-9/_-]+\.(?:mp3|wav)$/.test(url)||url.includes(".."))
  return "";
 return "/english/pronunciation"+url;
}
function getWords(sentence:string){
 return sentence.split(/(\s+)/).filter(Boolean);
}
function createRecorder(stream:MediaStream):MediaRecorder{
 const types=["audio/webm;codecs=opus","audio/webm","audio/mp4"];
 const supported=types.find(type=>MediaRecorder.isTypeSupported(type));
 return new MediaRecorder(stream,supported?{mimeType:supported}:undefined);
}

export default function NativePronunciationTrial(){
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [loadError,setLoadError]=useState("");
 const [currentIndex,setCurrentIndex]=useState(0);
 const [speed,setSpeed]=useState(1);
 const [status,setStatus]=useState("正在连接现有 Rust 句子目录…");
 const [stage,setStage]=useState<"idle"|"reference"|"cue"|"recording"|"scoring">("idle");
 const [score,setScore]=useState<ScoreResponse|null>(null);
 const [error,setError]=useState("");
 const [wordHint,setWordHint]=useState("");
 const [elapsed,setElapsed]=useState(0);
 const [recorded,setRecorded]=useState<Blob|null>(null);
 const [waveOpen,setWaveOpen]=useState(false);
 const [focusOpen,setFocusOpen]=useState(false);
 const audioRef=useRef<HTMLAudioElement|null>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const recorderRef=useRef<MediaRecorder|null>(null);
 const audioContextRef=useRef<AudioContext|null>(null);
 const rafRef=useRef<number|undefined>(undefined);
 const startTimeRef=useRef(0);
 const startedTalkingRef=useRef(false);
 const lastTalkingRef=useRef(0);
 const mountedRef=useRef(true);

 useEffect(()=>{
  mountedRef.current=true;
  const controller=new AbortController();
  fetch(API+"/follow-along/items",{cache:"no-store",signal:controller.signal})
   .then(async r=>{
    if(!r.ok)throw Error("Rust 语料服务返回 HTTP "+r.status);
    return r.json() as Promise<Catalog>;
   }).then(d=>{
    if(!Array.isArray(d.items)||d.items.length===0)throw Error("暂无可以练习的句子");
    const valid=d.items.filter(item=>/^[a-z0-9-]+$/.test(item.id)&&item.sentence&&audioSrc(item.audio_url));
    if(!valid.length)throw Error("没有通过音源校验的句子");
    setCatalog({...d,items:valid});
    setStatus("请选择一句，试听示范，再开始跟读");
   }).catch(e=>{
    if(controller.signal.aborted)return;
    setLoadError(e instanceof Error?e.message:"暂时无法载入语料");
    setStatus("Rust 语料服务暂时不可用");
   });
  const playbackAudio=audioRef.current;
  return ()=>{
   mountedRef.current=false;
   controller.abort();
   if(rafRef.current!==undefined)cancelAnimationFrame(rafRef.current);
   if(recorderRef.current?.state==="recording")recorderRef.current.stop();
   streamRef.current?.getTracks().forEach(track=>track.stop());
   void audioContextRef.current?.close();
   playbackAudio?.pause();
  };
 },[]);
 const current=catalog?.items[currentIndex];
 const previewSrc=useMemo(()=>audioSrc(current?.audio_url??null),[current?.audio_url]);
 const busy=stage!=="idle";
 function selectIndex(index:number){
  if(!catalog||busy||index<0||index>=catalog.items.length)return;
  setCurrentIndex(index);setScore(null);setError("");setWordHint("");
  setRecorded(null);setWaveOpen(false);setFocusOpen(false);
  setStatus("示范音 → 叮提示 → 自动朗读 → Rust 评分");
 }
 async function playReference(){
  if(!audioRef.current||!previewSrc||busy)return;
  setError("");
  audioRef.current.pause();audioRef.current.currentTime=0;
  audioRef.current.playbackRate=speed;
  try{await audioRef.current.play();setStatus("播放示范音");}
  catch{setError("音频播放被浏览器拦截；请点击页面后重试");}
 }
 function playWord(word:string){
  if(busy||typeof window==="undefined"||!window.speechSynthesis)return;
  const clean=word.replace(/[^a-zA-Z'-]/g,"");
  if(!clean)return;
  window.speechSynthesis.cancel();
  const speech=new SpeechSynthesisUtterance(clean);
  speech.lang="en-US";speech.rate=speed;
  window.speechSynthesis.speak(speech);
  setWordHint(clean+"：单词试听使用设备语音，不作为标准评分音源");
 }
 function clearCapture(){
  if(rafRef.current!==undefined){cancelAnimationFrame(rafRef.current);rafRef.current=undefined;}
  streamRef.current?.getTracks().forEach(track=>track.stop());
  streamRef.current=null;
  if(audioContextRef.current){void audioContextRef.current.close();audioContextRef.current=null;}
 }
 async function sendToRust(itemId:string,blob:Blob){
  setStage("scoring");setStatus("录音已结束，正在等待 Rust 返回真实评分");
  try{
   const response=await fetch(API+"/follow-along/items/"+encodeURIComponent(itemId)+"/score",{
    method:"POST",headers:{"content-type":blob.type||"audio/webm"},body:blob,
   });
   if(!response.ok){
    const raw=await response.text();
    throw Error("评分服务返回 HTTP "+response.status+(raw.length<200?"："+raw:""));
   }
   const result=await response.json() as ScoreResponse;
   if(typeof result.score!=="number"||!Number.isFinite(result.score)
      ||result.score<0||result.score>100)
    throw Error("服务端没有提供 0—100 范围内的有效评分");
   if(mountedRef.current){setScore(result);setStatus("Rust 真实评分已返回");}
  }catch(e){
   if(mountedRef.current){
    setError(e instanceof Error?e.message:"真实评分暂不可用");
    setStatus("未生成分数；请稍后重试");
   }
  }finally{
   if(mountedRef.current)setStage("idle");
  }
 }
 function stopRecording(){
  const recorder=recorderRef.current;
  if(recorder?.state==="recording")recorder.stop();
 }

 async function beginPractice(){
  if(!current||!previewSrc||busy)return;
  setError("");setScore(null);setElapsed(0);setWordHint("");
  setRecorded(null);setWaveOpen(false);setFocusOpen(false);
  setStage("reference");
  const itemId=current.id;
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")
    throw Error("此浏览器暂不支持麦克风录音，请使用 Chrome 或 Edge");
   const stream=await navigator.mediaDevices.getUserMedia({
    audio:{echoCancellation:true,noiseSuppression:true,channelCount:1},
   });
   streamRef.current=stream;
   const player=audioRef.current;
   if(!player)throw Error("参考音频未就绪");
   player.pause();player.currentTime=0;player.playbackRate=speed;
   setStatus("第 1 步：听标准示范音");
   await new Promise<void>((resolve,reject)=>{
    player.onended=()=>{player.onended=null;player.onerror=null;resolve();};
    player.onerror=()=>{player.onended=null;player.onerror=null;reject(Error("标准示范音无法播放"));};
    void player.play().catch(reject);
   });
   setStage("cue");setStatus("第 2 步：叮声提示，即将自动开始录音");
   const cue=new Audio(CUE);
   await new Promise<void>((resolve,reject)=>{
    cue.onended=()=>resolve();
    cue.onerror=()=>reject(Error("提示音未就绪；未启动录音"));
    void cue.play().catch(reject);
   });
   const chunks:BlobPart[]=[];
   const recorder=createRecorder(stream);
   recorderRef.current=recorder;
   startedTalkingRef.current=false;
   lastTalkingRef.current=Date.now();
   startTimeRef.current=Date.now();
   recorder.ondataavailable=(ev)=>{if(ev.data.size)chunks.push(ev.data);};
   recorder.onerror=()=>setError("录音发生异常，请重新开始");
   recorder.onstop=()=>{
    clearCapture();
    recorderRef.current=null;
    if(!mountedRef.current)return;
    setElapsed(Math.round((Date.now()-startTimeRef.current)/1000));
    if(!startedTalkingRef.current){
     setStage("idle");setStatus("没有检测到清晰朗读");setError("请稍微靠近麦克风，重读一次");
     return;
    }
    const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});
    if(blob.size<1000||blob.size>6*1024*1024){
     setStage("idle");setError("录音数据不足或超过大小限制，请重试");return;
    }
    setRecorded(blob);
    void sendToRust(itemId,blob);
   };
   recorder.start(300);
   setStage("recording");setStatus("第 3 步：正在自动录音，停顿约 1.75 秒后自动结束");
   const ctx=new AudioContext();
   audioContextRef.current=ctx;
   const analyser=ctx.createAnalyser();
   analyser.fftSize=1024;
   ctx.createMediaStreamSource(stream).connect(analyser);
   const samples=new Uint8Array(analyser.fftSize);
   const watch=()=>{
    if(recorder.state!=="recording")return;
    analyser.getByteTimeDomainData(samples);
    let sum=0;
    for(const b of samples){const d=(b-128)/128;sum+=d*d;}
    const rms=Math.sqrt(sum/samples.length);
    const now=Date.now();
    if(rms>0.022){startedTalkingRef.current=true;lastTalkingRef.current=now;}
    if(now-startTimeRef.current>MAX_RECORD_MS
     ||(startedTalkingRef.current&&now-lastTalkingRef.current>SILENCE_STOP_MS)
     ||(!startedTalkingRef.current&&now-startTimeRef.current>NO_SPEECH_TIMEOUT_MS)){
     recorder.stop();return;
    }
    setElapsed(Math.floor((now-startTimeRef.current)/1000));
    rafRef.current=requestAnimationFrame(watch);
   };
   rafRef.current=requestAnimationFrame(watch);
  }catch(e){
   clearCapture();recorderRef.current=null;
   if(mountedRef.current){
    setStage("idle");
    setStatus("本次跟读没有完成");
    setError(e instanceof Error?e.message:"麦克风不可用");
   }
  }
 }
 const currentError=error||loadError;
 return <section className={styles.shell} aria-label="Next.js 原生发音跟读候选">
  <div className={styles.eyebrow}>ENGLISH · PRONUNCIATION <span>原生 Next.js 迁移候选</span></div>
  <header className={styles.hero}>
   <div>
    <h1>听一句，跟读一句</h1>
    <p>一个屏幕完成示范、提示、朗读和评分。读取正在运行的 Rust 服务，不新建题库或评分后端。</p>
   </div>
   <span className={styles.counter}>{catalog?.items.length??"—"} 句原创语料</span>
  </header>
  <div className={styles.stage} role="status" aria-live="polite">
   <span className={styles.statusDot}/>{status}
  </div>
  {currentError?<p className={styles.error} role="alert">{currentError}</p>:null}
  {current?<section className={styles.practice} aria-label="当前练习">
   <div className={styles.rail}>
    <span>{current.title} · {current.topic} · {current.level}</span>
    <span>{currentIndex+1} / {catalog?.items.length}</span>
   </div>
   <div className={styles.sentence} aria-label="按单词可分别试听">
    {getWords(current.sentence).map((token,i)=>/^\s+$/.test(token)
     ? <span key={i}>{token}</span>
     : <button type="button" key={i} className={styles.word} disabled={busy}
       onClick={()=>playWord(token)} title={"点按试听 "+token}>{token}</button>)}
   </div>
   <p className={styles.translation}>{current.translation}</p>
   {wordHint?<p className={styles.wordTip} role="status">{wordHint}</p>:null}
   <div className={styles.speed}>
    <label htmlFor="native-pronun-speed">示范速度</label>
    <select id="native-pronun-speed" value={speed} disabled={busy}
     onChange={event=>{const n=Number(event.target.value);setSpeed(n);if(audioRef.current)audioRef.current.playbackRate=n;}}>
     <option value={0.8}>0.8 × 慢速</option>
     <option value={1}>1.0 × 标准</option>
     <option value={1.15}>1.15 × 稍快</option>
    </select>
    <button type="button" onClick={()=>void playReference()} disabled={busy||!previewSrc}>试听示范</button>
   </div>
   <audio ref={audioRef} src={previewSrc||undefined} preload="none" controls
    aria-label="示范音频" className={styles.audio}/>
   <div className={styles.actions}>
    {stage==="recording"
     ?<button type="button" className={styles.stop} onClick={stopRecording}>
       停止并评分 · {elapsed} 秒
      </button>
     :<button type="button" className={styles.primary} disabled={busy||!previewSrc||catalog?.scoring_status!=="connected"}
       onClick={()=>void beginPractice()}>
       {busy?stage==="scoring"?"Rust 正在评分…":"跟读进行中…":"一键听音 → 跟读 → 评分"}
      </button>}
    <div className={styles.switch}>
     <button type="button" disabled={busy||currentIndex===0} onClick={()=>selectIndex(currentIndex-1)}>上一句</button>
     <button type="button" disabled={busy||currentIndex===(catalog?.items.length??1)-1} onClick={()=>selectIndex(currentIndex+1)}>下一句</button>
    </div>
   </div>
   {score?<section className={styles.result} aria-label="Rust 发音评分">
    <strong>{Math.round(score.score)} <small> / 100 · Rust 实验评分（非正式考试成绩）</small></strong>
    {score.transcribe?<p>识别结果：{score.transcribe}</p>:null}
    {score.differences?.words_with_errors?.length
     ?<p>优先纠音：<b>{score.differences.words_with_errors[0]}</b></p>:<p>评分由服务端生成；未返回明确的优先纠音词。</p>}
   </section>:null}
   {recorded?<section className={styles.reviewSection} aria-label="本人录音与参考示范对照">
    <button type="button" className={styles.reviewToggle} aria-expanded={waveOpen}
     onClick={()=>{setWaveOpen(x=>!x);if(focusOpen)setFocusOpen(false);}}>
     {waveOpen?"收起双轨波形与录音回听":"展开双轨波形与录音回听"} <span aria-hidden="true">{waveOpen?"−":"+"}</span>
    </button>
    {waveOpen?<SyncedAudioOverlay referenceUrl={previewSrc} studentBlob={recorded}
      onPlay={()=>{audioRef.current?.pause();window.speechSynthesis?.cancel();}}/>:null}
   </section>:null}
   {score?<section className={styles.reviewSection} aria-label="一个词重点纠音">
    <button type="button" className={styles.reviewToggle} aria-expanded={focusOpen}
     onClick={()=>{setFocusOpen(x=>!x);if(waveOpen)setWaveOpen(false);}}>
     {focusOpen?"收起重点纠音":"展开重点纠音 · "+(score.differences?.words_with_errors?.[0]||"自主选词")}
     <span aria-hidden="true">{focusOpen?"−":"+"}</span>
    </button>
    {focusOpen?<FocusedWordPractice key={current.id+"-"+score.score} itemId={current.id}
      sentence={current.sentence} suggested={score.differences?.words_with_errors?.[0]}
      onPlay={()=>{audioRef.current?.pause();window.speechSynthesis?.cancel();}}/>:null}
   </section>:null}
   <p className={styles.disclosure}>示范音：{current.voice_profile}。单词点读使用浏览器设备语音，不能当作标准参考音源。点击“一键听音 → 跟读 → 评分”并授权麦克风后，本次录音将在结束时自动发送至本站自托管实验评分服务；后端不可用时不会生成假分数。回听波形在浏览器本地解码，不另行上传；更换句子会清除页面中的上一次录音。</p>
   <details className={styles.provider}>
    <summary>实验评分的准确性与录音处理说明</summary>
    <p>{catalog?.scoring_message||"评分引擎的准确性和隐私处理以对应服务端公告为准。"}</p>
   </details>
  </section>:<section className={styles.practice}><p>{loadError?"无法连接 Rust 服务，未展示虚构语料。":"正在读取真实句子…"}</p></section>}
  <footer className={styles.footer}>
   <strong>迁移验收状态</strong>
   <p>本 Next.js 候选已接入真实 Rust 发音评分、双轨波形、分段回听和单词局部重练，仍需验证不同手机录音行为、评分稳定性及课堂作业。原 V3 的教师作业、详细记录与全功能版本在正式迁移验收前继续保留。</p>
   <a href="/english/pronunciation/app/practice-library">进入当前正式发音工作台</a>
  </footer>
 </section>;
}
