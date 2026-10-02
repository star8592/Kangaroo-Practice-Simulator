"use client";
import { useEffect,useState } from "react";
import styles from "./GlobalLanguageSwitch.module.css";

type Lang="zh"|"en";
const STORAGE_KEY="socthink.lang";
const EVENT_NAME="socthink:language-change";

function readLang():Lang{
 if(typeof window==="undefined")return"zh";
 const saved=window.localStorage.getItem(STORAGE_KEY);
 return saved==="en"?"en":"zh";
}
function findLegacyButton(next:Lang){
 return [...document.querySelectorAll<HTMLButtonElement>("button.secondary-button")].find(button=>{
  const text=button.textContent?.trim();
  return next==="en"?text==="EN":text==="中";
 });
}
function syncLegacyHomepage(next:Lang){
 const button=findLegacyButton(next);
 if(button){button.click();button.style.display="none";}
 const opposite=findLegacyButton(next==="zh"?"en":"zh");
 if(opposite)opposite.style.display="none";
}
function applyLang(next:Lang){
 window.localStorage.setItem(STORAGE_KEY,next);
 document.cookie=`socthink_lang=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
 document.documentElement.lang=next==="zh"?"zh-CN":"en";
 window.dispatchEvent(new CustomEvent(EVENT_NAME,{detail:{lang:next}}));
 syncLegacyHomepage(next);
}

export default function GlobalLanguageSwitch(){
 const [lang,setLang]=useState<Lang>("zh");
 useEffect(()=>{
  const initial=readLang();setLang(initial);document.documentElement.lang=initial==="zh"?"zh-CN":"en";
  requestAnimationFrame(()=>syncLegacyHomepage(initial));
  const sync=(event:Event)=>{const next=(event as CustomEvent<{lang?:Lang}>).detail?.lang;if(next==="zh"||next==="en")setLang(next)};
  window.addEventListener(EVENT_NAME,sync);return()=>window.removeEventListener(EVENT_NAME,sync);
 },[]);
 const choose=(next:Lang)=>{if(next===lang)return;setLang(next);applyLang(next)};
 return <div className={styles.switcher} role="group" aria-label="语言 / Language">
  <button type="button" className={lang==="zh"?styles.active:""} aria-pressed={lang==="zh"} onClick={()=>choose("zh")}>中文</button>
  <button type="button" className={lang==="en"?styles.active:""} aria-pressed={lang==="en"} onClick={()=>choose("en")}>EN</button>
 </div>;
}

export { EVENT_NAME,STORAGE_KEY,type Lang };
