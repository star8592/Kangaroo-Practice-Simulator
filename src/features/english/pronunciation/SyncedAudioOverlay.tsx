"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import styles from "./SyncedAudioOverlay.module.css";

/** Actual decoded microphone and reference samples only. No generated waveform. */
type WaveData={
 reference:Float32Array;own:Float32Array;
 referenceHz:number;ownHz:number;
 referenceStart:number;ownStart:number;
 referenceSeconds:number;ownSeconds:number;axis:number;
};
const W=800,H=182,L=38,R=790,T=10,B=151,POINTS=360;
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

function onset(samples:Float32Array,hz:number):number{
 const n=Math.max(1,Math.round(hz*.02));
 let maximum=0;
 const levels:number[]=[];
 for(let i=0;i<samples.length;i+=n){
  let sum=0;
  const size=Math.min(n,samples.length-i);
  for(let j=i;j<i+size;j++)sum+=samples[j]*samples[j];
  const rms=Math.sqrt(sum/size);
  levels.push(rms);
  maximum=Math.max(maximum,rms);
 }
 if(maximum<.001)return 0;
 const limit=Math.max(.006,maximum*.08);
 for(let i=0;i<levels.length-2;i++){
  if(levels[i]>limit&&levels[i+1]>limit&&levels[i+2]>limit)
   return Math.max(0,i*n/hz-.04);
 }
 return 0;
}
function peak(samples:Float32Array,hz:number,start:number,end:number):number{
 const from=Math.max(0,Math.floor(start*hz));
 const to=Math.min(samples.length,Math.ceil(end*hz));
 if(to<=from)return 0;
 let value=0;
 const step=Math.max(1,Math.floor((to-from)/24));
 for(let i=from;i<to;i+=step)value=Math.max(value,Math.abs(samples[i]));
 return value;
}
function paint(canvas:HTMLCanvasElement,data:WaveData,from:number,to:number,shift:number):void{
 const ctx=canvas.getContext("2d");
 if(!ctx)return;
 ctx.clearRect(0,0,W,H);
 ctx.fillStyle="#f7faf8";ctx.fillRect(0,0,W,H);
 ctx.strokeStyle="#dbe6e0";ctx.lineWidth=1;
 ctx.font="11px system-ui";ctx.textAlign="center";
 const step=Math.max(1,Math.ceil(data.axis/8));
 for(let second=0;second<=data.axis;second+=step){
  const x=L+second/data.axis*(R-L);
  ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,B);ctx.stroke();
  ctx.fillStyle="#647b74";
  ctx.fillText(second+"s",x,H-8);
 }
 ctx.fillStyle="rgba(43,135,78,.15)";
 ctx.fillRect(L+from/data.axis*(R-L),T,(to-from)/data.axis*(R-L),B-T);
 const track=(samples:Float32Array,hz:number,onsetSeconds:number,offset:number,color:string)=>{
  const values=new Float32Array(POINTS);
  let max=.0001;
  for(let i=0;i<POINTS;i++){
   const t=onsetSeconds+i*data.axis/POINTS-offset;
   values[i]=peak(samples,hz,t,t+data.axis/POINTS);
   if(values[i]>max)max=values[i];
  }
  ctx.strokeStyle=color;ctx.lineWidth=1.3;ctx.globalAlpha=.9;ctx.beginPath();
  for(let i=0;i<POINTS;i++){
   const x=L+(i+.5)/POINTS*(R-L);
   const h=Math.max(.6,values[i]/max*(B-T)*.40);
   const mid=(T+B)/2;
   ctx.moveTo(x,mid-h);ctx.lineTo(x,mid+h);
  }
  ctx.stroke();ctx.globalAlpha=1;
 };
 track(data.reference,data.referenceHz,data.referenceStart,0,"#2779d3");
 track(data.own,data.ownHz,data.ownStart,shift,"#de7945");
 ctx.textAlign="right";ctx.fillStyle="#647b74";ctx.fillText(data.axis.toFixed(1)+"s",R,H-8);
}

export default function SyncedAudioOverlay({
 referenceUrl,studentBlob,onPlay,
}:{
 referenceUrl:string;studentBlob:Blob;onPlay?:()=>void;
}){
 const canvas=useRef<HTMLCanvasElement|null>(null);
 const refAudio=useRef<HTMLAudioElement|null>(null);
 const ownAudio=useRef<HTMLAudioElement|null>(null);
 const stopAt=useRef<number|null>(null);
 const pointerFrom=useRef<number|null>(null);
 const dataRef=useRef<WaveData|null>(null);
 const [notice,setNotice]=useState("正在读取示范与学生的真实录音…");
 const [ready,setReady]=useState(false);

 const [range,setRange]=useState<[number,number]>([0,1]);
 const [shift,setShift]=useState(0);
 const [playing,setPlaying]=useState<"reference"|"student"|null>(null);

 const pauseAll=useCallback(()=>{
  refAudio.current?.pause();ownAudio.current?.pause();
  stopAt.current=null;setPlaying(null);
 },[]);
 useEffect(()=>{
  const url=URL.createObjectURL(studentBlob);
  const player=ownAudio.current;
  if(player)player.src=url;
  return ()=>{
   if(player){player.pause();player.removeAttribute("src");player.load();}
   URL.revokeObjectURL(url);
  };
 },[studentBlob]);
 useEffect(()=>{
  const controller=new AbortController();
  let gone=false;
  let context:AudioContext|null=null;
  dataRef.current=null;
  const referencePlayer=refAudio.current;
  const studentPlayer=ownAudio.current;
  async function load(){
   try{
    if(studentBlob.size<100||studentBlob.size>6*1024*1024)
     throw Error("录音大小不符合安全要求");
    const response=await fetch(referenceUrl,{signal:controller.signal});
    if(!response.ok)throw Error("标准示范音暂不可用");
    if(Number(response.headers.get("content-length")||0)>15*1024*1024)
     throw Error("参考音频文件超出限制");
    const [referenceBytes,studentBytes]=await Promise.all([
     response.arrayBuffer(),studentBlob.arrayBuffer(),
    ]);
    if(referenceBytes.byteLength>15*1024*1024)throw Error("参考音频大小超出限制");
    context=new AudioContext();
    const [reference,own]=await Promise.all([
     context.decodeAudioData(referenceBytes),context.decodeAudioData(studentBytes),
    ]);
    if(gone)return;
    if(reference.duration<.15||reference.duration>45||own.duration<.15||own.duration>45)
     throw Error("两段音频的时长不在允许范围");
    const referenceStart=onset(reference.getChannelData(0),reference.sampleRate);
    const ownStart=onset(own.getChannelData(0),own.sampleRate);
    const axis=Math.min(45,Math.max(reference.duration-referenceStart,own.duration-ownStart+1.5)+.1);
    dataRef.current={
     reference:reference.getChannelData(0),own:own.getChannelData(0),
     referenceHz:reference.sampleRate,ownHz:own.sampleRate,referenceStart,ownStart,
     referenceSeconds:reference.duration,ownSeconds:own.duration,axis,
    };
    setRange([0,Math.min(1.1,axis)]);setShift(0);setReady(true);
    setNotice("已按真实起声时间对齐。蓝色是 AI 示范，橙色是你的录音；可以选片段并分别回听。");
   }catch(e){
    if(gone||controller.signal.aborted)return;
    setNotice("无法解码叠合音频：" +(e instanceof Error?e.message:"未知错误")+"。仍可回听你的录音。");
   }finally{if(context)void context.close().catch(()=>{});}
  }
  void load();
  return ()=>{gone=true;controller.abort();dataRef.current=null;referencePlayer?.pause();studentPlayer?.pause();};
 },[referenceUrl,studentBlob]);
 useEffect(()=>{
  if(ready&&canvas.current&&dataRef.current)
   paint(canvas.current,dataRef.current,range[0],range[1],shift);
 },[ready,range,shift]);

 function canvasTime(clientX:number):number{
  const box=canvas.current?.getBoundingClientRect();
  const data=dataRef.current;
  if(!box||!data)return 0;
  return clamp((((clientX-box.left)/box.width)*W-L)/(R-L),0,1)*data.axis;
 }
 function selectEnd(clientX:number){
  const started=pointerFrom.current;
  pointerFrom.current=null;
  if(started===null)return;
  const axis=dataRef.current?.axis??1;
  const end=canvasTime(clientX);
  let from=Math.min(started,end),to=Math.max(started,end);
  if(to-from<.35){from=clamp(from-.3,0,Math.max(0,axis-.7));to=Math.min(axis,from+.7);}
  setRange([from,to]);pauseAll();
 }
 function onTime(event:React.SyntheticEvent<HTMLAudioElement>){
  const audio=event.currentTarget;
  if(stopAt.current!==null&&audio.currentTime>=stopAt.current-.035)pauseAll();
 }
 async function play(track:"reference"|"student"){
  const data=dataRef.current;
  if(!data||!ready)return;
  pauseAll();onPlay?.();
  const audio=track==="reference"?refAudio.current:ownAudio.current;
  if(!audio)return;
  const offset=track==="reference"?0:shift;
  const first=track==="reference"?data.referenceStart:data.ownStart;
  const duration=track==="reference"?data.referenceSeconds:data.ownSeconds;
  const start=clamp(first+range[0]-offset,0,duration);
  const end=clamp(first+range[1]-offset,0,duration);
  if(end-start<.12){setNotice("这一段不在当前音轨范围内，请调整选区或橙色微移量。");return;}
  try{
   audio.currentTime=start;stopAt.current=end;setPlaying(track);
   await audio.play();
  }catch{
   pauseAll();setNotice("选段播放失败，可通过播放器完整回听。");
  }
 }
 return <section className={styles.panel} data-testid="native-synced-audio" aria-label="原声与本人录音真实波形对照">
  <header className={styles.header}>
   <strong>标准示范 × 我的声音</strong>
   <span><i className={styles.refKey}/> AI 示范 <i className={styles.ownKey}/> 我的录音</span>
  </header>
  <p className={styles.notice} role="status">{notice}</p>
  <canvas ref={canvas} width={W} height={H} className={styles.wave} role="img"
   aria-label="蓝色 AI 示范与橙色本人真实录音按秒对齐的双轨波形，拖动可选一段回听"
   onPointerDown={event=>{if(ready&&event.isPrimary)pointerFrom.current=canvasTime(event.clientX);}}
   onPointerUp={event=>{if(event.isPrimary)selectEnd(event.clientX);}}
   onPointerCancel={()=>{pointerFrom.current=null;}}
  />
  {ready?<div className={styles.controls}>
   <p>{range[0].toFixed(1)}–{range[1].toFixed(1)} 秒 · 在波形上拖选片段</p>
   <div className={styles.buttons}>
    <button type="button" aria-pressed={playing==="reference"} onClick={()=>void play("reference")}>▶ 听示范这一段</button>
    <button type="button" aria-pressed={playing==="student"} onClick={()=>void play("student")}>▶ 听我说的这一段</button>
   </div>
   <div className={styles.shift}>
    <label htmlFor="native-accent-wave-shift">微调橙色声波</label>
    <input id="native-accent-wave-shift" type="range" min={-1.5} max={1.5} step={.05}
     value={shift} onChange={event=>{pauseAll();setShift(Number(event.target.value));}}/>
    <button type="button" onClick={()=>{pauseAll();setShift(0);}}>归零</button>
   </div>
  </div>:null}
  <audio ref={refAudio} src={referenceUrl} preload="metadata" onTimeUpdate={onTime}
   onEnded={pauseAll} aria-label="参考示范分段音频"/>
  <audio ref={ownAudio} preload="metadata" controls
   onTimeUpdate={onTime} onEnded={pauseAll} className={styles.audio}
   aria-label="我的录音完整回放"/>
  <p className={styles.caution}>仅展示两段真实音频的采样波形；起声时间已对齐，没有变调或拉伸。波形重合度不是发音评分依据，评分只能由 Rust 服务返回。</p>
 </section>;
}
