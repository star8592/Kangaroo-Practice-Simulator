import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

type EmailKind="verify-email"|"reset-password";
const DIR=path.join(process.cwd(),"private","users");
const OUTBOX=path.join(DIR,"email-outbox.jsonl");

function provider(){
  const p=(process.env.AUTH_EMAIL_PROVIDER||"").trim().toLowerCase();
  if(p)return p;
  return process.env.NODE_ENV==="production"?"disabled":"outbox";
}
export function authEmailStatus(){
  const p=provider();
  const smtpReady=p==="smtp"&&Boolean(process.env.SMTP_HOST?.trim()&&process.env.SMTP_USER?.trim()&&process.env.SMTP_PASS?.trim());
  const resendReady=p==="resend"&&Boolean(process.env.RESEND_API_KEY?.trim());
  const outboxReady=p==="outbox"&&process.env.NODE_ENV!=="production";
  const productionReady=smtpReady||resendReady;
  return{provider:p,enabled:productionReady||outboxReady,productionReady};
}

function subject(kind:EmailKind){return kind==="verify-email"?"Socthink 邮箱验证码":"Socthink 重置密码验证码"}
function textBody(kind:EmailKind,code:string){
  const action=kind==="verify-email"?"完成家长账号邮箱验证":"重置家长账号密码";
  return "验证码："+code+"\n\n请使用此验证码"+action+"。验证码 10 分钟内有效，请勿转发。\n\n如果不是你本人操作，请忽略此邮件。";
}
function htmlBody(kind:EmailKind,code:string){
  const action=kind==="verify-email"?"完成家长账号邮箱验证":"重置家长账号密码";
  return '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px"><h2>Socthink 数学训练</h2><p>请使用以下验证码'+action+'：</p><div style="font-size:34px;font-weight:800;letter-spacing:8px;padding:16px 0">'+code+'</div><p>验证码 <b>10 分钟</b>内有效，请勿转发。</p><p style="color:#777">如果不是你本人操作，请忽略此邮件。</p></div>';
}

export async function sendAuthCode(input:{to:string;code:string;kind:EmailKind}){
  const p=provider(),from=process.env.AUTH_FROM_EMAIL||"Socthink <no-reply@socthink.cn>";
  if(p==="disabled")throw new Error("邮箱服务尚未配置");
  if(p==="outbox"){
    if(process.env.NODE_ENV==="production")throw new Error("生产环境禁止使用本地 outbox 邮件模式");
    fs.mkdirSync(DIR,{recursive:true});fs.appendFileSync(OUTBOX,JSON.stringify({at:Date.now(),to:input.to,kind:input.kind,code:input.code})+"\n");
    return;
  }
  if(p==="resend"){
    const key=process.env.RESEND_API_KEY;if(!key)throw new Error("RESEND_API_KEY 未配置");
    const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({from,to:[input.to],subject:subject(input.kind),text:textBody(input.kind,input.code),html:htmlBody(input.kind,input.code)})});
    if(!r.ok)throw new Error("邮件发送失败");return;
  }
  if(p==="smtp"){
    const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS,port=Number(process.env.SMTP_PORT||465),secure=(process.env.SMTP_SECURE||String(port===465)).toLowerCase()!=="false";
    if(!host||!user||!pass)throw new Error("SMTP 配置不完整");
    const tx=nodemailer.createTransport({host,port,secure,auth:{user,pass}});
    await tx.sendMail({from,to:input.to,subject:subject(input.kind),text:textBody(input.kind,input.code),html:htmlBody(input.kind,input.code)});
    return;
  }
  throw new Error("不支持的邮箱 provider");
}