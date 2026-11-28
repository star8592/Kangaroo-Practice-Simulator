"use client";
import {useEffect,useRef} from "react";
import {useRouter} from "next/navigation";
export function WuhanScoringPending({attemptId,state}:{attemptId:string;state:"queued"|"leased"}){
 const router=useRouter();
 const checks=useRef(0);
 useEffect(()=>{
  checks.current=0;
  const timer=window.setInterval(()=>{
   if(document.visibilityState==="visible"&&checks.current<30){checks.current++;router.refresh()}
  },10000);
  return ()=>window.clearInterval(timer);
 },[router,attemptId]);
 return <section data-site-shell="content" aria-live="polite">
  <h1>试卷正在评分</h1>
  <p>{state==="queued"?"已进入评分队列。":"正在处理录音及答案。"}</p>
  <p>无需停留在此页面。报告完成后可从原报告链接重新查看，不会显示未经核验的成绩。</p>
  <button type="button" onClick={()=>router.refresh()}>刷新评分状态</button>
  <p><a href="/account">返回个人中心</a></p>
 </section>
}
