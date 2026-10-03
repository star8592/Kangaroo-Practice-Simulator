"use client";

import { useSyncExternalStore } from "react";

export type SiteLang="zh"|"en";
export const SITE_LANGUAGE_STORAGE_KEY="socthink.lang";
export const SITE_LANGUAGE_EVENT="socthink:language-change";

function readStoredLanguage():SiteLang{
 if(typeof window==="undefined")return"zh";
 return window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY)==="en"?"en":"zh";
}

function subscribe(callback:()=>void){
 if(typeof window==="undefined")return()=>{};
 const onStorage=(event:StorageEvent)=>{if(event.key===SITE_LANGUAGE_STORAGE_KEY)callback()};
 window.addEventListener(SITE_LANGUAGE_EVENT,callback);
 window.addEventListener("storage",onStorage);
 return()=>{window.removeEventListener(SITE_LANGUAGE_EVENT,callback);window.removeEventListener("storage",onStorage)};
}

export function useSiteLanguage():SiteLang{
 return useSyncExternalStore(subscribe,readStoredLanguage,()=>"zh");
}

export function setSiteLanguage(next:SiteLang){
 if(typeof window==="undefined")return;
 window.localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY,next);
 document.cookie=`socthink_lang=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
 document.documentElement.lang=next==="zh"?"zh-CN":"en";
 window.dispatchEvent(new Event(SITE_LANGUAGE_EVENT));
}
