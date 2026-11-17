"use client";

import {useEffect, useState} from "react";
import QRCode from "qrcode";
import {
  INVITATION_LINK_FIELD, INVITATION_TEMPLATES, INVITATION_TEMPLATE_KEYS,
  type InvitationTemplateKey, renderInvitationTemplate, validateInvitationTemplate,
} from "./class-invitation-copy";
import styles from "./ClassInvitationPanel.module.css";

type Invitation = {enabled:boolean;url:string|null;message_template?:string|null;template_key?:InvitationTemplateKey;discoverable?:boolean;listing_intro?:string};
type InvitationFormat = "link" | "qr";
const API = "/english/pronunciation/classroom-api";

function roundedPanel(ctx: CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function wrapPosterText(ctx:CanvasRenderingContext2D,text:string,width:number):string[]{
  const lines:string[]=[];
  for(const row of text.split("\n")){
    if(!row.trim()){lines.push("");continue;}
    let current="";
    for(const char of row){
      if(current && ctx.measureText(current+char).width>width){
        lines.push(current);
        current=char;
      }else{current+=char;}
    }
    if(current)lines.push(current);
  }
  return lines;
}

/** High-resolution canvas image with the *edited* wording and real signed QR. */
async function invitationPoster(qrDataUrl:string,className:string,message:string):Promise<string>{
  const canvas=document.createElement("canvas");
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("浏览器不支持制作邀请海报");
  ctx.font='25px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
  const lines=wrapPosterText(ctx,message,708);
  const textHeight=lines.reduce((total,line)=>total+(line?41:17),0);
  const qrY=475+textHeight+20;
  canvas.width=900;
  canvas.height=qrY+535;
  const g=ctx.createLinearGradient(0,0,900,canvas.height);
  g.addColorStop(0,"#e9f7ee");g.addColorStop(1,"#f4faf6");
  ctx.fillStyle=g;ctx.fillRect(0,0,900,canvas.height);

  ctx.fillStyle="#155e49";roundedPanel(ctx,36,34,828,306,34);ctx.fill();
  ctx.fillStyle="#bce9cd";ctx.font="700 24px sans-serif";
  ctx.fillText("SOC THINK  ·  ENGLISH CLASSROOM",84,105);
  ctx.fillStyle="#fff";ctx.font='700 43px "Noto Sans CJK SC",sans-serif';
  const heading=wrapPosterText(ctx,className,728);
  heading.slice(0,3).forEach((line,i)=>ctx.fillText(line,84,180+i*60));
  ctx.fillStyle="#dcf7e7";ctx.font="28px sans-serif";
  ctx.fillText("英语跟读训练  ·  班级专属邀请",84,312);

  ctx.fillStyle="#fff";roundedPanel(ctx,36,367,828,canvas.height-405,34);ctx.fill();
  ctx.fillStyle="#335748";ctx.font='25px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
  let y=454;
  for(const line of lines){
    if(line){ctx.fillText(line,90,y);y+=41;}
    else y+=17;
  }

  const qr=new Image();
  await new Promise<void>((resolve,reject)=>{
    qr.onload=()=>resolve();
    qr.onerror=()=>reject(Error("二维码图片加载失败"));
    qr.src=qrDataUrl;
  });
  ctx.fillStyle="#eaf7ee";roundedPanel(ctx,271,qrY-3,358,358,25);ctx.fill();
  ctx.drawImage(qr,291,qrY+17,318,318);
  ctx.textAlign="center";ctx.fillStyle="#205c42";ctx.font="700 29px sans-serif";
  ctx.fillText("微信扫一扫 · 申请加入班级",450,qrY+404);
  ctx.font="23px sans-serif";ctx.fillStyle="#56816c";
  ctx.fillText("填写学生姓名后，等待老师审核通过",450,qrY+449);
  ctx.textAlign="start";ctx.font="22px sans-serif";ctx.fillStyle="#608674";
  ctx.fillText("socthink.cn  ·  英语跟读课堂",75,canvas.height-31);
  return canvas.toDataURL("image/png");
}

function downloadPoster(image:string,className:string){
  const link=document.createElement("a");
  link.href=image;
  link.download=className.replace(/[\\/:*?"<>|]/g,"-")+"-班级邀请.png";
  document.body.appendChild(link);link.click();link.remove();
}

export default function ClassInvitationPanel({tenant,classId,className}:{
 tenant:string;classId:string;className:string
}){
  const [entry,setEntry]=useState<Invitation|null>(null);
  const [format,setFormat]=useState<InvitationFormat>("link");
  const [style,setStyle]=useState<InvitationTemplateKey>("warm");
  const [draft,setDraft]=useState(INVITATION_TEMPLATES.warm.text);
  const [savedStyle,setSavedStyle]=useState<InvitationTemplateKey>("warm");
  const [savedDraft,setSavedDraft]=useState(INVITATION_TEMPLATES.warm.text);
  const [loaded,setLoaded]=useState(false);
  const [posterData,setPosterData]=useState<{key:string;image:string}|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [listingIntro,setListingIntro]=useState("");
  const base=API+"/tenants/"+tenant+"/classes/"+classId+"/invitation";

  useEffect(()=>{
    let live=true;
    fetch(base,{credentials:"same-origin",cache:"no-store"}).then(async response=>{
      const value=await response.json() as Invitation&{error?:string};
      if(!response.ok)throw Error(value.error||"班级邀请读取失败");
      if(!live)return;
      const key=INVITATION_TEMPLATE_KEYS.includes(value.template_key as InvitationTemplateKey)
        ?value.template_key as InvitationTemplateKey:"warm";
      const text=typeof value.message_template==="string" &&
        validateInvitationTemplate(value.message_template)
        ?value.message_template:INVITATION_TEMPLATES[key].text;
      setEntry(value);setStyle(key);setSavedStyle(key);
      setDraft(text);setSavedDraft(text);setListingIntro(value.listing_intro||"");setLoaded(true);
    }).catch(reason=>{if(live)setError(reason instanceof Error?reason.message:"无法读取班级邀请");});
    return()=>{live=false;};
  },[base]);

  const link=entry?.enabled?entry.url:null;
  const valid=validateInvitationTemplate(draft);
  const dirty=draft!==savedDraft||style!==savedStyle;
  const message=link&&valid?renderInvitationTemplate(draft,className,link):"";
  const posterKey=link&&valid?link+"|"+className+"|"+draft:"";
  const poster=posterData?.key===posterKey?posterData.image:"";

  useEffect(()=>{
    let live=true;
    if(format==="qr" && entry?.enabled && entry.url && validateInvitationTemplate(draft)){
      const requestUrl=entry.url;
      const key=requestUrl+"|"+className+"|"+draft;
      void QRCode.toDataURL(requestUrl,{width:480,margin:2,errorCorrectionLevel:"M"})
        .then(qr=>invitationPoster(qr,className,renderInvitationTemplate(draft,className,requestUrl,true)))
        .then(image=>{if(live)setPosterData({key,image});})
        .catch(reason=>{if(live)setError(reason instanceof Error?reason.message:"二维码海报生成失败");});
    }
    return()=>{live=false;};
  },[format,entry?.enabled,entry?.url,className,draft]);

  async function change(action:"rotate"|"disable"){
    if(busy)return;
    if(action==="rotate"&&entry?.enabled&&
      !window.confirm("重新生成后，原有链接和二维码都会立即失效，已入班学生不受影响。确定继续？"))return;
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch(base+"/"+action,{method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},body:"{}"});
      const value=await response.json();
      if(!response.ok)throw Error(value.error||"邀请码更新失败");
      setEntry(previous=>({...previous,...value}));
      setNotice(action==="rotate"?"新的有效邀请已生成；旧链接和二维码已失效":"班级邀请已停用");
    }catch(reason){setError(reason instanceof Error?reason.message:"操作失败");}
    finally{setBusy(false);}
  }

  async function publishClass(publish:boolean){
    if(busy)return;
    if(publish&&([...listingIntro.trim()].length<20||[...listingIntro.trim()].length>220)){
      setError("公开招生介绍请填写 20—220 字，说明教学内容和学习方式");
      return;
    }
    if(!publish&&!window.confirm("停止公开招生？老师已经发出的原邀请链接不会失效。"))return;
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch(base+"/discovery",{
        method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({publish,introduction:listingIntro.trim()})
      });
      const body=await response.json();
      if(!response.ok||body.saved!==true)throw Error(body.error||"招生设置保存失败");
      setEntry(previous=>previous?{...previous,discoverable:Boolean(body.discoverable),listing_intro:body.listing_intro||""}:previous);
      setNotice(publish?"已公开招生，学生可以在找老师页面发现这个班级":"已停止公开招生，原班级和私发邀请不受影响");
    }catch(reason){setError(reason instanceof Error?reason.message:"无法修改招生设置");}
    finally{setBusy(false);}
  }

  async function save(){
    if(busy||!valid)return;
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch(base+"/copy",{method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({template_key:style,message_template:draft})});
      const value=await response.json();
      if(!response.ok||value.saved!==true)throw Error(value.error||"文案保存失败");
      setSavedDraft(draft);setSavedStyle(style);
      setNotice("邀请文案已保存到班级，重新登录或换设备也能继续使用");
    }catch(reason){setError(reason instanceof Error?reason.message:"文案保存失败");}
    finally{setBusy(false);}
  }

  async function copy(value:string,success:string){
    try{await navigator.clipboard.writeText(value);setError("");setNotice(success);}
    catch{setError("复制失败。可以打开下方预览并手动长按复制。");}
  }

  async function shareText(){
    if(!message)return;
    if(typeof navigator.share==="function"){
      try{
        await navigator.share({title:className+" · 英语跟读班级邀请",text:message});
        setNotice("已打开手机分享菜单，选择微信或联系人即可转发");
        return;
      }catch(reason){
        if(reason instanceof Error && reason.name==="AbortError")return;
      }
    }
    await copy(message,"邀请文案已复制，粘贴到微信群即可发送");
  }

  function chooseTemplate(key:InvitationTemplateKey){
    if(dirty&&!window.confirm("切换模板会覆盖当前未保存的修改，是否继续？"))return;
    setStyle(key);setDraft(INVITATION_TEMPLATES[key].text);
    setNotice("已切换模板，可以修改后保存、复制或分享");setError("");
  }

  async function sharePoster(){
    if(!poster)return;
    try{
      const blob=await(await fetch(poster)).blob();
      const file=new File([blob],className+"-邀请.png",{type:"image/png"});
      if(typeof navigator.share==="function" &&
        typeof navigator.canShare==="function"&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:className+" · 入班邀请"});
        setNotice("已打开系统图片分享");
        return;
      }
      downloadPoster(poster,className);
      setNotice("已保存图片。请从手机相册或下载文件中发送到微信。");
    }catch(reason){
      if(reason instanceof Error && reason.name==="AbortError")return;
      setError("分享未完成，请长按邀请海报保存图片后发送。");
    }
  }

  return <section className={styles.shell} aria-label="邀请学生加入班级">
    <div className={styles.header}>
      <div>
        <span className={styles.kicker}>SOC THINK · CLASS INVITATION</span>
        <h3>邀请同学加入「{className}」</h3>
        <p>先选文案模板，老师可以修改；再选链接或二维码发送到微信群。</p>
      </div>
      <span className={styles.status}>{link?"邀请已启用":"尚未启用"}</span>
    </div>
    {link&&loaded?<>
      <div className={styles.editor}>
        <label htmlFor={"invite-template-"+classId}>邀请文案模板</label>
        <select id={"invite-template-"+classId} aria-label="邀请文案模板" value={style}
          onChange={event=>chooseTemplate(event.target.value as InvitationTemplateKey)}>
          {INVITATION_TEMPLATE_KEYS.map(key=><option key={key} value={key}>
            {INVITATION_TEMPLATES[key].label}
          </option>)}
        </select>
        <label htmlFor={"invite-copy-"+classId}>编辑邀请文案</label>
        <p className={styles.tip}>可自由修改内容。保留 <strong>{INVITATION_LINK_FIELD}</strong> 一次，发送时会自动换成当前有效链接；班级名称和老师称呼也会自动填写。</p>
        <textarea id={"invite-copy-"+classId} aria-label="编辑邀请文案" className={styles.message}
          value={draft} onChange={event=>{setDraft(event.target.value);setNotice("");}}
          maxLength={2000}/>
        {!valid?<p role="alert" className={styles.error}>文案需为 35—1400 字，并包含且仅包含一次 {INVITATION_LINK_FIELD}。</p>:null}
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={()=>void save()}
            disabled={busy||!valid||!dirty}>{busy?"正在保存…":dirty?"保存修改":"文案已保存"}</button>
          <button type="button" onClick={()=>chooseTemplate(style)}>恢复当前模板</button>
          <span className={styles.saveState} role="status">{dirty?"有修改尚未保存":"使用已保存的邀请文案"}</span>
        </div>
      </div>
      <div className={styles.switcher} role="group" aria-label="选择班级邀请方式">
        <button type="button" className={format==="link"?styles.selected:""}
          aria-pressed={format==="link"} onClick={()=>setFormat("link")}>🔗 链接邀请</button>
        <button type="button" className={format==="qr"?styles.selected:""}
          aria-pressed={format==="qr"} onClick={()=>setFormat("qr")}>▦ 二维码海报</button>
      </div>
      <div className={styles.content}>
        {format==="link"?<>
          <p className={styles.modeHint}>适合微信群和私聊：复制完整导语、加入步骤及班级专属链接，无需自己拼接。</p>
          <div className={styles.actions}>
            <button className={styles.primary} type="button" disabled={!valid}
              onClick={()=>void shareText()}>分享邀请 / 复制群公告</button>
            <button type="button" disabled={!valid}
              onClick={()=>void copy(message,"完整邀请文案已复制，直接粘贴到微信群即可")}>复制完整邀请文案</button>
            <button type="button" onClick={()=>void copy(link,"班级专属链接已复制")}>只复制链接</button>
            <a href={link} target="_blank" rel="noopener noreferrer">预览学生入口</a>
          </div>
          <details className={styles.preview} open>
            <summary>发送预览（包含真实入班链接）</summary>
            <textarea aria-label="完整班级邀请预览" className={styles.previewMessage}
              readOnly value={message} onFocus={event=>event.currentTarget.select()}/>
          </details>
        </>:<>
          <p className={styles.modeHint}>海报使用上方已编辑文案及同一真实入班地址，适合手机长按保存、微信群发图和线下扫码。</p>
          {poster?<img className={styles.poster} src={poster}
            alt={className+"的完整班级邀请海报，包含介绍、加入步骤与可扫码二维码"}/>:
            <div className={styles.posterPending} role="status">{valid?"正在生成二维码邀请海报…":"请先修正文案中的邀请链接占位符"}</div>}
          <div className={styles.actions}>
            <button className={styles.primary} type="button" disabled={!poster}
              onClick={()=>void sharePoster()}>分享 / 保存邀请海报</button>
            <button type="button" disabled={!poster}
              onClick={()=>{if(poster)downloadPoster(poster,className);}}>下载 PNG 图片</button>
            <button type="button" disabled={!valid}
              onClick={()=>void copy(message,"配套邀请文字已复制，可与海报一同发送")}>复制配套文案</button>
          </div>
          <p className={styles.tip}>微信内若不支持系统图片分享，可长按上方海报保存到手机相册，再发送到班级群。</p>
        </>}
      </div>
      <section className={styles.discovery} aria-labelledby={"discovery-title-"+classId}>
        <div className={styles.discoveryHeader}>
          <div><h4 id={"discovery-title-"+classId}>公开招生 · 让学生找到你</h4>
            <p>默认不公开。只有你主动发布的班级才进入 SOC THINK 找老师目录；学生仍需微信登录和老师审核。</p></div>
          <span className={styles.discoveryStatus}>{entry?.discoverable?"正在公开招生":"仅限私发邀请"}</span>
        </div>
        <label htmlFor={"discovery-intro-"+classId}>班级介绍（公开后展示）</label>
        <textarea id={"discovery-intro-"+classId} className={styles.discoveryIntro} aria-label="公开班级介绍"
          placeholder="介绍课程目标、适合的练习内容和教师指导方式。请不要填写学生姓名、私人联系方式或未开通的收费承诺。"
          maxLength={220} value={listingIntro} onChange={event=>setListingIntro(event.target.value)}/>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={busy}
            onClick={()=>void publishClass(true)}>{entry?.discoverable?"更新招生介绍":"公开招生"}</button>
          {entry?.discoverable?<button type="button" disabled={busy}
            onClick={()=>void publishClass(false)}>停止公开招生</button>:null}
          <a href="/teachers" target="_blank" rel="noopener noreferrer">查看找老师目录</a>
        </div>
        <p className={styles.tip}>公开目录目前支持真实入班申请，不包含尚未开通的付费订单。以后有收费课程时，须通过主站统一支付与权益核验。</p>
      </section>
      <details className={styles.manage}>
        <summary>邀请链接管理（更换 / 停用）</summary>
        <p>更换邀请码会同时使旧链接与旧二维码失效，但已入班学生不受影响。</p>
        <div className={styles.actions}>
          <button type="button" disabled={busy} onClick={()=>void change("rotate")}>重新生成邀请</button>
          <button type="button" disabled={busy} onClick={()=>void change("disable")}>停用邀请</button>
        </div>
      </details>
    </>:loaded?<div className={styles.empty}>
      <p>生成邀请后，可以选择模板、自由编辑并用链接或二维码两种方式发送。</p>
      <button className={styles.primary} type="button" disabled={busy}
        onClick={()=>void change("rotate")}>生成本班邀请</button>
    </div>:<p className={styles.empty}>正在读取班级邀请…</p>}
    {error?<p role="alert" className={styles.error}>{error}</p>:null}
    {notice?<p role="status" className={styles.notice}>{notice}</p>:null}
  </section>;
}
