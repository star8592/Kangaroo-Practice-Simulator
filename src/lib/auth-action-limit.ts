type Bucket={count:number;start:number};
const buckets=new Map<string,Bucket>();
export function allowAuthAction(key:string,limit:number,windowMs:number,now=Date.now()){
  const b=buckets.get(key);
  if(!b||now-b.start>=windowMs){buckets.set(key,{count:1,start:now});return{allowed:true,retryAfterSeconds:0}}
  if(b.count>=limit)return{allowed:false,retryAfterSeconds:Math.max(1,Math.ceil((windowMs-(now-b.start))/1000))};
  b.count++;return{allowed:true,retryAfterSeconds:0};
}
