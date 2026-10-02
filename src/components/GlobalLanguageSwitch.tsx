"use client";

import { useEffect } from "react";
import { setSiteLanguage,useSiteLanguage } from "@/lib/site-language";
import styles from "./GlobalLanguageSwitch.module.css";

export default function GlobalLanguageSwitch(){
 const lang=useSiteLanguage();
 useEffect(()=>{document.documentElement.lang=lang==="zh"?"zh-CN":"en"},[lang]);
 return <div className={styles.switcher} role="group" aria-label="语言 / Language">
  <button type="button" className={lang==="zh"?styles.active:""} aria-pressed={lang==="zh"} onClick={()=>setSiteLanguage("zh")}>中文</button>
  <button type="button" className={lang==="en"?styles.active:""} aria-pressed={lang==="en"} onClick={()=>setSiteLanguage("en")}>EN</button>
 </div>;
}
