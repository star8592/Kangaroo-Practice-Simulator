// Only local isolated development. Not a production feature switch.
export function voucherPreviewEnabled(env:NodeJS.ProcessEnv=process.env){
 if(env.NODE_ENV==="production"||env.SOCTHINK_VOUCHER_PREVIEW!=="1")return false;
 try{
  const db=new URL(env.SOCTHINK_BILLING_DATABASE_URL??"");
  const origin=new URL(env.SOCTHINK_PUBLIC_ORIGIN??"");
  return ["127.0.0.1","localhost"].includes(db.hostname)&&db.pathname.endsWith("_ci")&&
   ["127.0.0.1","localhost"].includes(origin.hostname)&&
   /^[a-f0-9]{64}$/i.test(env.SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY??"");
 }catch{return false;}
}
