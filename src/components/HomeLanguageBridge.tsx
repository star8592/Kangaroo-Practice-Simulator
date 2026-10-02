"use client";

import { useEffect } from "react";
import HomeClient from "@/components/HomeClient";
import type { ExamProfile } from "@/lib/types";
import { useSiteLanguage } from "@/lib/site-language";

export default function HomeLanguageBridge({exams,today}:{exams:ExamProfile[];today:string}){
 const lang=useSiteLanguage();
 useEffect(()=>{
  const sync=()=>{
   const button=[...document.querySelectorAll<HTMLButtonElement>(".hero-card .hero-actions button.secondary-button")].find(x=>["EN","中"].includes(x.textContent?.trim()||""));
   if(!button)return;
   const current=button.textContent?.trim()==="EN"?"zh":"en";
   if(current!==lang)button.click();
   const holder=button.closest<HTMLElement>(".hero-actions");
   if(holder)holder.style.display="none";
  };
  const id=requestAnimationFrame(sync);
  return()=>cancelAnimationFrame(id);
 },[lang]);
 return <HomeClient exams={exams} today={today}/>;
}
