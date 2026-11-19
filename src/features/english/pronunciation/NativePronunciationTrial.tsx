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
// Original reference tracks with a pre-rendered 0.3x pitch-preserved variant.
// Unknown future items automatically use browser playbackRate instead.
const SLOW_03_IDS=new Set([
 "octopus-flexibility","octopus-remarkable-abilities","octopus-learn-from-experience",
 "bees-rich-patch","bees-short-dance","bees-direction-and-distance",
 "trees-cooler-pavement","trees-leaves-and-water","trees-slow-rainwater",
]);
const cleanWord=(word:string)=>word.replace(/[^a-zA-Z'-]/g,"");

function audioSrc(url:string|null):string{
 if(!url||!/^\/app\/audio\/[a-zA-Z0-9/_-]+\.(?:mp3|wav)$/.test(url)||url.includes(".."))
  return "";
 return "/english/pronunciation"+url;
}
function getWords(sentence:string){
 return sentence.split(/(\s+)/).filter(Boolean);
}
function invalidateGeneration(ref:{current:number}){ref.current++;}
function createRecorder(stream:MediaStream):MediaRecorder{
 const types=["audio/webm;codecs=opus","audio/webm","audio/mp4"];
 const supported=types.find(type=>MediaRecorder.isTypeSupported(type));
 return new MediaRecorder(stream,supported?{mimeType:supported}:undefined);
}

export default function NativePronunciationTrial(){
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [loadError,setLoadError]=useState("");
 const [currentIndex,setCurrentIndex]=useState(0);
 const [speed,setSpeed]=useState(0.7);
 const [slowTrackFailed,setSlowTrackFailed]=useState(false);
 const [activeWord,setActiveWord]=useState("");
 const [status,setStatus]=useState("正在打开练习…");
 const [stage,setStage]=useState<"idle"|"requesting"|"reference"|"cue"|"recording"|"scoring">("idle");
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
 const operationRef=useRef(false);
 const generationRef=useRef(0);
 const requestRef=useRef<AbortController|null>(null);

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
   }).catch(()=>{
    if(controller.signal.aborted)return;
    setLoadError("练习暂时打不开，请刷新页面再试一次。");
    setStatus("暂时无法打开练习");
   });
  const playbackAudio=audioRef.current;
  return ()=>{
   mountedRef.current=false;
   invalidateGeneration(generationRef);
   operationRef.current=false;
   controller.abort();
   requestRef.current?.abort();requestRef.current=null;
   if(rafRef.current!==undefined)cancelAnimationFrame(rafRef.current);
   const recorder=recorderRef.current;
   if(recorder){
    recorder.onstop=null;recorder.ondataavailable=null;recorder.onerror=null;
    if(recorder.state==="recording")try{recorder.stop();}catch{/* Detached device. */}
   }
   streamRef.current?.getTracks().forEach(track=>track.stop());
   void audioContextRef.current?.close();
   playbackAudio?.pause();
   if(playbackAudio){playbackAudio.onended=null;playbackAudio.onerror=null;}
  };
 },[]);
 const current=catalog?.items[currentIndex];
 const previewSrc=useMemo(()=>audioSrc(current?.audio_url??null),[current?.audio_url]);
 const useSlowTrack=speed===0.3&&Boolean(current?.id&&SLOW_03_IDS.has(current.id))&&!slowTrackFailed;
 const referenceSrc=useSlowTrack&&current?"/english/pronunciation/next-lab/audio/slow-03/"+current.id+".mp3":previewSrc;
 const referenceRate=useSlowTrack?1:speed;
 useEffect(()=>{
  const player=audioRef.current;
  if(player){player.preservesPitch=true;player.defaultPlaybackRate=referenceRate;player.playbackRate=referenceRate;}
 },[referenceRate,referenceSrc]);
 const busy=stage!=="idle";
 const suggestedWord=score?.differences?.words_with_errors?.find(candidate=>
  getWords(current?.sentence||"").some(token=>cleanWord(token).toLowerCase()===cleanWord(candidate).toLowerCase()));
 function selectIndex(index:number){
  if(!catalog||busy||index<0||index>=catalog.items.length)return;
  audioRef.current?.pause();window.speechSynthesis?.cancel();
  setCurrentIndex(index);setScore(null);setError("");setWordHint("");setActiveWord("");
  setSlowTrackFailed(false);
  setRecorded(null);setWaveOpen(false);setFocusOpen(false);
  setStatus("先听示范，也可以点任何一个单词单独听。");
 }
 async function playReference(){
  if(!audioRef.current||!previewSrc||busy)return;
  setError("");
  window.speechSynthesis?.cancel();setActiveWord("");
  audioRef.current.pause();audioRef.current.currentTime=0;
  audioRef.current.preservesPitch=true;
  audioRef.current.playbackRate=referenceRate;
  try{await audioRef.current.play();setStatus(speed===0.3?"正在播放极慢速示范，可以反复听。":"正在播放示范，可以反复听。");}
  catch{setError("音频没能播放，轻点「听整句」再试一次。");}
 }
 function playWord(word:string){
  if(busy||typeof window==="undefined")return;
  const clean=cleanWord(word);
  if(!clean)return;
  audioRef.current?.pause();
  if(!window.speechSynthesis||typeof SpeechSynthesisUtterance==="undefined"){
   setWordHint("这台设备暂不支持单词点读，请先听整句。");return;
  }
  window.speechSynthesis.cancel();
  setActiveWord(clean);
  const speech=new SpeechSynthesisUtterance(clean);
  speech.lang="en-US";speech.rate=speed;
  speech.onerror=()=>{if(mountedRef.current)setWordHint("这个单词暂时没有播放出来，请再点一次。");};
  window.speechSynthesis.speak(speech);
  setWordHint("正在读 "+clean+"。可以反复点，也可以点下一个词。");
 }
 function clearCapture(){
  if(rafRef.current!==undefined){cancelAnimationFrame(rafRef.current);rafRef.current=undefined;}
  streamRef.current?.getTracks().forEach(track=>track.stop());
  streamRef.current=null;
  if(audioContextRef.current){void audioContextRef.current.close();audioContextRef.current=null;}
 }
 async function sendToRust(itemId:string,blob:Blob,generation:number){
  const active=()=>mountedRef.current&&generationRef.current===generation;
  if(!active())return;
  setStage("scoring");setStatus("录好了，正在给你打分…");
  const controller=new AbortController();requestRef.current=controller;
  try{
   const response=await fetch(API+"/follow-along/items/"+encodeURIComponent(itemId)+"/score",{
    method:"POST",headers:{"content-type":blob.type||"audio/webm"},body:blob,
    signal:controller.signal,
   });
   if(!response.ok){
    const raw=await response.text();
    throw Error("评分服务返回 HTTP "+response.status+(raw.length<200?"："+raw:""));
   }
   const result=await response.json() as ScoreResponse;
   if(typeof result.score!=="number"||!Number.isFinite(result.score)
      ||result.score<0||result.score>100)
    throw Error("服务端没有提供 0—100 范围内的有效评分");
   if(active()){setScore(result);setStatus("打分完成！看一看这次得了多少分。");}
  }catch{
   if(active()){
    setError("这次没有打出分数，请再读一次。你的录音没有被算作零分。");
    setStatus("没有打出分数，可以重新跟读。");
   }
  }finally{
   if(requestRef.current===controller)requestRef.current=null;
   if(active()){operationRef.current=false;setStage("idle");}
  }
 }
 function cancelPending(){
  if(stage!=="requesting")return;
  invalidateGeneration(generationRef);
  operationRef.current=false;
  clearCapture();
  setStage("idle");setStatus("已取消等待麦克风授权；未开始录音，也未发送评分");
 }
 function stopRecording(){
  const recorder=recorderRef.current;
  if(recorder?.state==="recording"){
   try{recorder.stop();}catch{
    invalidateGeneration(generationRef);
    operationRef.current=false;
    clearCapture();recorderRef.current=null;
    setStage("idle");setError("录音设备异常，未发送评分，请重试");
   }
  }
 }

 async function beginPractice(){
  if(!current||!previewSrc||busy||operationRef.current)return;
  operationRef.current=true; // Lock synchronously before permission prompt can yield.
  const generation=++generationRef.current;
  const active=()=>mountedRef.current&&generationRef.current===generation;
  setError("");setScore(null);setElapsed(0);setWordHint("");setActiveWord("");
  audioRef.current?.pause();window.speechSynthesis?.cancel();
  setRecorded(null);setWaveOpen(false);setFocusOpen(false);
  setStage("requesting");setStatus("正在等待麦克风授权，可取消本次等待");
  const itemId=current.id;
  let pendingStream:MediaStream|null=null;
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")
    throw Error("此浏览器暂不支持麦克风录音，请使用 Chrome 或 Edge");
   pendingStream=await navigator.mediaDevices.getUserMedia({
    audio:{echoCancellation:true,noiseSuppression:true,channelCount:1},
   });
   if(!active()){pendingStream.getTracks().forEach(track=>track.stop());return;}
   const stream=pendingStream;
   streamRef.current=stream;
   setStage("reference");
   const player=audioRef.current;
   if(!player)throw Error("示范音没准备好，请再试一次");
   player.pause();player.currentTime=0;player.preservesPitch=true;player.playbackRate=referenceRate;
   setStatus("第 1 步：先听清楚这一句");
   await new Promise<void>((resolve,reject)=>{
    player.onended=()=>{player.onended=null;player.onerror=null;resolve();};
    player.onerror=()=>{player.onended=null;player.onerror=null;reject(Error("标准示范音无法播放"));};
    void player.play().catch(reject);
   });
   if(!active())return;
   setStage("cue");setStatus("第 2 步：提示音后开始跟读");
   const cue=new Audio(CUE);
   await new Promise<void>((resolve,reject)=>{
    cue.onended=()=>resolve();
    cue.onerror=()=>reject(Error("提示音未就绪；未启动录音"));
    void cue.play().catch(reject);
   });
   if(!active())return;
   const chunks:BlobPart[]=[];
   const recorder=createRecorder(stream);
   recorderRef.current=recorder;
   startedTalkingRef.current=false;
   lastTalkingRef.current=Date.now();
   startTimeRef.current=Date.now();
   let recorderError=false;
   recorder.ondataavailable=(ev)=>{if(active()&&ev.data.size)chunks.push(ev.data);};
   recorder.onerror=()=>{
    recorderError=true;
    if(active())setError("录音发生异常，未发送评分，请重新开始");
    if(recorder.state==="recording")try{recorder.stop();}catch{/* Already detached. */}
   };
   recorder.onstop=()=>{
    // A stale recorder must never clear the newer generation's stream.
    if(!active()){stream.getTracks().forEach(track=>track.stop());return;}
    clearCapture();
    if(recorderRef.current===recorder)recorderRef.current=null;
    if(recorderError){
     operationRef.current=false;setStage("idle");
     setStatus("录音设备异常，未生成评分");return;
    }
    setElapsed(Math.round((Date.now()-startTimeRef.current)/1000));
    if(!startedTalkingRef.current){
     operationRef.current=false;
     setStage("idle");setStatus("没有检测到清晰朗读");setError("请稍微靠近麦克风，重读一次");
     return;
    }
    const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});
    if(blob.size<1000||blob.size>6*1024*1024){
     operationRef.current=false;
     setStage("idle");setError("录音数据不足或超过大小限制，请重试");return;
    }
    setRecorded(blob);
    void sendToRust(itemId,blob,generation);
   };
   recorder.start(300);
   setStage("recording");setStatus("第 3 步：轮到你读啦。读完稍作停顿就会自动结束。");
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
   pendingStream?.getTracks().forEach(track=>track.stop());
   if(!active())return;
   invalidateGeneration(generationRef);
   const recorder=recorderRef.current;
   if(recorder){
    recorder.onstop=null;recorder.ondataavailable=null;recorder.onerror=null;
    if(recorder.state==="recording")try{recorder.stop();}catch{/* Device failed. */}
   }
   clearCapture();recorderRef.current=null;
   operationRef.current=false;
   if(mountedRef.current){
    setStage("idle");
    setStatus("本次跟读没有完成");
    setError(e instanceof DOMException&&e.name==="NotAllowedError"
     ?"没有获得麦克风权限，请允许使用麦克风后再试。"
     :"这次没能录音，请检查麦克风后重试。");
   }
  }
 }
 const currentError=error||loadError;
 return <section className={styles.shell} aria-label="英语逐句跟读">
  <div className={styles.eyebrow}>ENGLISH · PRONUNCIATION <span>基础跟读</span></div>
  <header className={styles.hero}>
   <div>
    <h1>听一句，跟读一句</h1>
    <p>听不清就放慢，单词不会就点它。听一句、读一句、拿到分数，再练一次。</p>
   </div>
   <span className={styles.counter}>{catalog?.items.length??"—"} 句练习</span>
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
   <p className={styles.wordGuide}>每个英文单词都能点，点一下就读给你听</p>
   <div className={styles.sentence} aria-label="点击任意单词听发音">
    {getWords(current.sentence).map((token,i)=>/^\s+$/.test(token)
     ? <span key={i}>{token}</span>
     : <button type="button" key={i} className={cleanWord(token)===activeWord?styles.wordActive:styles.word} disabled={busy}
       onClick={()=>playWord(token)} title={"点一下听 "+token}>{token}</button>)}
   </div>
   <p className={styles.translation}>{current.translation}</p>
   {wordHint?<p className={styles.wordTip} role="status">{wordHint}</p>:null}
   <div className={styles.speed}>
    <label htmlFor="native-pronun-speed">听整句的速度</label>
    <select id="native-pronun-speed" value={speed} disabled={busy}
     onChange={event=>{const n=Number(event.target.value);audioRef.current?.pause();window.speechSynthesis?.cancel();setActiveWord("");setSpeed(n);}}>
     <option value={0.3}>0.3 × 极慢</option>
     <option value={0.5}>0.5 × 很慢</option>
     <option value={0.7}>0.7 × 慢速</option>
     <option value={0.85}>0.85 × 稍慢</option>
     <option value={1}>1.0 × 正常</option>
     <option value={1.15}>1.15 × 稍快</option>
    </select>
    <button type="button" onClick={()=>void playReference()} disabled={busy||!previewSrc}>▶ 听整句</button>
   </div>
   <audio ref={audioRef} src={referenceSrc||undefined} preload="none" controls
    aria-label="整句示范音频" className={styles.audio}
    onError={()=>{if(useSlowTrack){setSlowTrackFailed(true);setStatus("已改用设备的极慢速播放，再点「听整句」即可。");}}}/>
   <div className={styles.actions}>
    {stage==="recording"
     ?<button type="button" className={styles.stop} onClick={stopRecording}>
       停止并评分 · {elapsed} 秒
      </button>
     :stage==="requesting"
      ?<button type="button" className={styles.stop} onClick={cancelPending}>取消等待麦克风</button>
     :<button type="button" className={styles.primary} disabled={busy||!previewSrc||catalog?.scoring_status!=="connected"}
       onClick={()=>void beginPractice()}>
       {busy?stage==="scoring"?"正在打分…":"跟读进行中…":"一键听音 → 跟读 → 评分"}
      </button>}
    <div className={styles.switch}>
     <button type="button" disabled={busy||currentIndex===0} onClick={()=>selectIndex(currentIndex-1)}>上一句</button>
     <button type="button" disabled={busy||currentIndex===(catalog?.items.length??1)-1} onClick={()=>selectIndex(currentIndex+1)}>下一句</button>
    </div>
   </div>
   {score?<section className={styles.result} aria-label="本次得分">
    <p className={styles.resultLabel}>本次得分</p>
    <strong>{Math.round(score.score)} <small>/ 100 分</small></strong>
    {suggestedWord
     ?<p className={styles.practiceTip}>下一步：试着练好 <b>{suggestedWord}</b>。点这个词听一遍，再读整句。</p>
     :<p className={styles.practiceTip}>继续加油！可以再听一遍示范，试试把整句读得更清楚。</p>}
    {score.transcribe?<details className={styles.scoreDetails}><summary>看看我刚才读了什么</summary><p>{score.transcribe}</p></details>:null}
   </section>:null}
   {recorded?<section className={styles.reviewSection} aria-label="本人录音与参考示范对照">
    <button type="button" className={styles.reviewToggle} aria-expanded={waveOpen}
     onClick={()=>{setWaveOpen(x=>!x);if(focusOpen)setFocusOpen(false);}}>
     {waveOpen?"收起我的录音对照":"听听我的录音对照"} <span aria-hidden="true">{waveOpen?"−":"+"}</span>
    </button>
    {waveOpen?<SyncedAudioOverlay referenceUrl={previewSrc} studentBlob={recorded}
      onPlay={()=>{audioRef.current?.pause();window.speechSynthesis?.cancel();}}/>:null}
   </section>:null}
   {score?<section className={styles.reviewSection} aria-label="一个词重点纠音">
    <button type="button" className={styles.reviewToggle} aria-expanded={focusOpen}
     onClick={()=>{setFocusOpen(x=>!x);if(waveOpen)setWaveOpen(false);}}>
     {focusOpen?"收起单词练习":"只练一个词 · "+(suggestedWord||"自己选词")}
     <span aria-hidden="true">{focusOpen?"−":"+"}</span>
    </button>
    {focusOpen?<FocusedWordPractice key={current.id+"-"+score.score} itemId={current.id}
      sentence={current.sentence} suggested={suggestedWord} speed={speed}
      onPlay={()=>{audioRef.current?.pause();window.speechSynthesis?.cancel();}}/>:null}
   </section>:null}
   <details className={styles.provider}>
    <summary>录音、示范音和评分说明</summary>
    <p>整句示范音：{current.voice_profile}。0.3 倍速优先使用预先处理的保音高音轨；如果音轨暂时不可用，自动回退到设备变速播放。单词点读使用设备语音，可能与整句发音人不同。</p>
    <p>只有你点击跟读并授权麦克风后才录音。结束后将录音发送到本站评分服务；评分失败不会生成分数。录音回听在本页处理，换句会清除上一句临时录音。</p>
    <p>{catalog?.scoring_message||"评分仅供练习参考，并非正式考试成绩。"}</p>
   </details>
  </section>:<section className={styles.practice}><p>{loadError?"无法连接 Rust 服务，未展示虚构语料。":"正在读取真实句子…"}</p></section>}
  <footer className={styles.footer}>
   <details>
    <summary>其他练习与教师入口</summary>
    <p>原有课堂、学习历史与完整发音工作台仍然保留。</p>
    <a href="/english/pronunciation/next-lab/assignments">我的作业</a>
    <a href="/english/pronunciation/next-lab/classroom">课堂与学习记录</a>
    <a href="/english/pronunciation/app/practice-library">原有发音工作台</a>
   </details>
  </footer>
 </section>;
}
