"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setSiteLanguage,useSiteLanguage,type SiteLang } from "@/lib/site-language";
import styles from "./GlobalLanguageSwitch.module.css";

export default function GlobalLanguageSwitch(){
 const lang=useSiteLanguage();
 const router=useRouter();
 useEffect(()=>{document.documentElement.lang=lang==="zh"?"zh-CN":"en"},[lang]);
 const choose=(next:SiteLang)=>{
  if(next===lang)return;
  setSiteLanguage(next);
  router.refresh();
 };
 return <div className={styles.switcher} role="group" aria-label="语言 / Language">
  <button type="button" className={lang==="zh"?styles.active:""} aria-pressed={lang==="zh"} onClick={()=>choose("zh")}>中文</button>
  <button type="button" className={lang==="en"?styles.active:""} aria-pressed={lang==="en"} onClick={()=>choose("en")}>EN</button>
 </div>;
}
