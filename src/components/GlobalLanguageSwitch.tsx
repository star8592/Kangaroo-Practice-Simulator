"use client";
import { useEffect,useState } from "react";

type Lang="zh"|"en";
const STORAGE_KEY="socthink.lang";
const EVENT_NAME="socthink:language-change";

function readLang():Lang{
 if(typeof window==="undefined")return"zh";
 const saved=window.localStorage.getItem(STORAGE_KEY);
 return saved==="en"?"en":"zh";
}
function applyLang(next:Lang){
 window.localStorage.setItem(STORAGE_KEY,next);
 document.cookie=`socthink_lang=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
 document.documentElement.lang=next==="zh"?"zh-CN":"en";
 window.dispatchEvent(new CustomEvent(EVENT_NAME,{detail:{lang:next}}));
 // Temporary bridge for the homepage's legacy local language state.
 // This disappears once HomeClient is migrated to the shared language store.
 const legacy=[...document.querySelectorAll<HTMLButtonElement>("button.secondary-button")].find(button=>{
  const text=button.textContent?.trim();
  return next==="en"?text==="EN":text==="中";
 });
 legacy?.click();
}

export default function GlobalLanguageSwitch(){
 const [lang,setLang]=useState<Lang>("zh");
 useEffect(()=>{
  const initial=readLang();setLang(initial);document.documentElement.lang=initial==="zh"?"zh-CN":"en";
  const sync=(event:Event)=>{const next=(event as CustomEvent<{lang?:Lang}>).detail?.lang;if(next==="zh"||next==="en")setLang(next)};
  window.addEventListener(EVENT_NAME,sync);return()=>window.removeEventListener(EVENT_NAME,sync);
 },[]);
 const choose=(next:Lang)=>{setLang(next);applyLang(next)};
 return <div className="global-language-switch" role="group" aria-label="语言 / Language">
  <button type="button" className={lang==="zh"?"active":""} aria-pressed={lang==="zh"} onClick={()=>choose("zh")}>中文</button>
  <button type="button" className={lang==="en"?"active":""} aria-pressed={lang==="en"} onClick={()=>choose("en")}>EN</button>
 </div>;
}

export { EVENT_NAME,STORAGE_KEY,type Lang };
