/** Fixed provider registry. No user-defined endpoint allowed. */
export type Provider="ollama"|"qwen"|"mimo"|"deepseek"|"openai";
export type Config={primary:Provider;backup:Provider|null};
const names:readonly Provider[]=["ollama","qwen","mimo","deepseek","openai"];
const keyName={qwen:"DASHSCOPE_API_KEY",mimo:"MIMO_API_KEY",deepseek:"DEEPSEEK_API_KEY",openai:"OPENAI_API_KEY"};
export const providerLabels:Record<Provider,string>={ollama:"本机 Ollama",qwen:"通义千问",mimo:"小米 MiMo",deepseek:"DeepSeek",openai:"OpenAI"};
const urls:Record<Provider,string>={
 ollama:"http://127.0.0.1:11434/api/chat",
 qwen:"https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
 mimo:"https://api.xiaomimimo.com/v1/chat/completions",
 deepseek:"https://api.deepseek.com/chat/completions",
 openai:"https://api.openai.com/v1/chat/completions",
};
const defaults:Record<Provider,string>={ollama:"qwen3:4b-instruct-2507-q4_K_M",qwen:"qwen3.8-flash",mimo:"mimo-v2.6-flash",deepseek:"deepseek-flash",openai:"gpt-4.1-mini"};
type Env=Record<string,string|undefined>;
function getProvider(s:string|undefined):Provider|null{return names.find(n=>n===s)||null}
export function configured(p:Provider,e:Env=process.env){return p==="ollama"||Boolean(e[keyName[p]]?.trim())}
export function getConfig(e:Env=process.env):Config|null{
 if(e.SOCTHINK_INTERVIEW_AI_ENABLED!=="1")return null;
 const primary=getProvider(e.SOCTHINK_INTERVIEW_AI_PROVIDER);
 if(!primary||!configured(primary,e))return null;
 const backup=getProvider(e.SOCTHINK_INTERVIEW_AI_BACKUP_PROVIDER);
 return {primary,backup:backup&&backup!==primary&&configured(backup,e)?backup:null};
}
export function modelTimeout(kind:"primary"|"backup",e:Env=process.env){
 const k=kind==="primary"?"SOCTHINK_INTERVIEW_AI_PRIMARY_TIMEOUT_MS":"SOCTHINK_INTERVIEW_AI_BACKUP_TIMEOUT_MS";
 const n=Number(e[k]);
 return n>=1000&&n<=12000?n:kind==="primary"?4500:3500;
}
export type Message={role:"system"|"user";content:string};
export async function callModel(p:Provider,messages:Message[],timeout:number,e:Env=process.env,request:typeof fetch=fetch){
 const model=p===e.SOCTHINK_INTERVIEW_AI_PROVIDER?e.SOCTHINK_INTERVIEW_AI_MODEL||defaults[p]:e.SOCTHINK_INTERVIEW_AI_BACKUP_MODEL||defaults[p];
 const headers:Record<string,string>={"Content-Type":"application/json"};
 if(p!=="ollama"){
  const key=e[keyName[p]];
  if(!key)throw new Error("MISSING_PROVIDER_CONFIG");
  headers.Authorization="Bearer "+key;
 }
 const body=p==="ollama"
  ?{model,messages,stream:false,think:false,format:"json",options:{temperature:0.1,num_predict:260}}
  :p==="mimo"
   ?{model,messages,stream:false,response_format:{type:"json_object"},max_completion_tokens:320,thinking:{type:"disabled"}}
   :{model,messages,stream:false,response_format:{type:"json_object"},max_tokens:260};
 const start=Date.now();
 const res=await request(urls[p],{method:"POST",headers,body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
 if(!res.ok)throw new Error("PROVIDER_ERROR");
 const txt=await res.text();
 if(txt.length>16000)throw new Error("OVERSIZE");
 const data=JSON.parse(txt);
 const content=p==="ollama"?data?.message?.content:data?.choices?.[0]?.message?.content;
 if(typeof content!=="string"||content.length>4500)throw new Error("INVALID_MODEL_CONTENT");
 return {content,provider:p,latencyMs:Date.now()-start};
}

/** The primary and secondary providers are never called in parallel: bound spend and latency. */
export async function withModelBackup<T>(
 config:Config,messages:Message[],parse:(s:string)=>T|null,
 caller:typeof callModel=callModel
):Promise<{result:T;provider:Provider;latencyMs:number;viaBackup:boolean}|null>{
 const choices=[config.primary,...(config.backup?[config.backup]:[])];
 for(let i=0;i<choices.length;i++){
  try{
   const response=await caller(choices[i],messages,modelTimeout(i===0?"primary":"backup"));
   const parsed=parse(response.content);
   if(parsed)return {result:parsed,provider:response.provider,latencyMs:response.latencyMs,viaBackup:i>0};
  }catch{/* Expected: unavailable, timeout, invalid JSON; try the next approved provider. */}
 }
 return null;
}
