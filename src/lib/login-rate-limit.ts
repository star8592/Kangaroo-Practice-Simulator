type Entry={failures:number;firstAt:number;blockedUntil:number};
const entries=new Map<string,Entry>();
const WINDOW_MS=10*60*1000,MAX_FAILURES=5,BLOCK_MS=15*60*1000;
function prune(now:number){for(const[k,v]of entries){if(v.blockedUntil<now&&now-v.firstAt>WINDOW_MS)entries.delete(k)}}
export function loginKey(account:string,ip:string){return `${ip.trim().slice(0,80)}|${account.trim().toLowerCase().slice(0,120)}`}
export function checkLoginLimit(key:string,now=Date.now()){prune(now);const e=entries.get(key);if(!e)return{allowed:true,retryAfterSeconds:0};if(e.blockedUntil>now)return{allowed:false,retryAfterSeconds:Math.max(1,Math.ceil((e.blockedUntil-now)/1000))};if(now-e.firstAt>WINDOW_MS){entries.delete(key);return{allowed:true,retryAfterSeconds:0}}return{allowed:true,retryAfterSeconds:0}}
export function recordLoginFailure(key:string,now=Date.now()){const old=entries.get(key);const e=!old||now-old.firstAt>WINDOW_MS?{failures:0,firstAt:now,blockedUntil:0}:{...old};e.failures++;if(e.failures>=MAX_FAILURES)e.blockedUntil=now+BLOCK_MS;entries.set(key,e);return e}
export function clearLoginFailures(key:string){entries.delete(key)}
