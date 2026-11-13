"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./classroom.module.css";

type Teacher = {
  account_id: string; name: string; status: string;
  applied_at: string; reviewed_at?: string | null;
};
const API = "/english/pronunciation/classroom-api";

async function jsonResponse(url:string, init?:RequestInit) {
  const response = await fetch(url,{
    credentials:"same-origin",cache:"no-store",...init,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 404 || response.status === 503) throw new Error("课堂服务尚未部署完成，教师审批暂不可用");
    if (response.status === 401 || response.status === 403) throw new Error("请使用已绑定的站点所有者微信身份登录");
    throw new Error(body?.error || "请求失败");
  }
  return body;
}

export default function ClassroomAdminClient({ ownerBound, ownerEmailVerified, ownerContactEmail, emailDeliveryReady, siteOwner, legacyAdmin, wechatLoggedIn }: {
  ownerBound: boolean; ownerEmailVerified: boolean; ownerContactEmail: string; emailDeliveryReady: boolean;
  siteOwner: boolean; legacyAdmin: boolean; wechatLoggedIn: boolean;
}) {
  const [email,setEmail] = useState(ownerContactEmail);
  const [code,setCode] = useState("");
  const [step,setStep] = useState<"email"|"verify">("email");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [teachers,setTeachers] = useState<Teacher[]>([]);
  const [listError,setListError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const result = await jsonResponse(API + "/admin/teachers");
      setTeachers(Array.isArray(result?.requests) ? result.requests : []);
      setListError("");
    } catch (e) {setListError(e instanceof Error ? e.message : "课堂服务暂不可用");}
  },[]);
  useEffect(() => {
    if (!siteOwner) return;
    let active = true;
    jsonResponse(API + "/admin/teachers")
      .then(result => {
        if (!active) return;
        setTeachers(Array.isArray(result?.requests) ? result.requests : []);
        setListError("");
      })
      .catch(e => {
        if (active) setListError(e instanceof Error ? e.message : "课堂服务暂不可用");
      });
    return () => { active = false; };
  },[siteOwner]);

  async function bootstrap(action: "start"|"confirm"|"claim"|"email/start"|"email/confirm") {
    setBusy(true);setMessage("");
    try {
      const result=await jsonResponse("/api/admin/site-owner/" + action,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(action==="start" || action==="claim" || action==="email/start"?{email}:{email,code}),
      });
      if(result?.ok && (action==="start" || action==="email/start")) {
        setStep("verify");setMessage("验证码已发送到该邮箱，10 分钟内完成绑定");
      } else {
        setMessage("站点所有者绑定成功，即将更新后台权限");
        window.location.reload();
      }
    } catch (e) {setMessage(e instanceof Error ? e.message : "绑定失败");}
    finally {setBusy(false);}
  }
  async function decision(t:Teacher,approve:boolean) {
    if(!window.confirm("确认" + (approve?"批准":"撤销") + "教师「" + t.name + "」？"))return;
    setBusy(true);setMessage("");
    try {
      await jsonResponse(API + "/admin/teachers/" + encodeURIComponent(t.account_id) + "/decision",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({approve}),
      });
      setMessage("教师「" + t.name + "」权限已更新");
      await refresh();
    } catch(e) {setMessage(e instanceof Error ? e.message : "操作失败");}
    finally {setBusy(false);}
  }
  return <div className={styles.stack}>
    <section className={styles.panel}>
      <h2>网站所有者</h2>
      {siteOwner
        ? <><p className={styles.ok}>你的主站微信已通过所有者身份绑定。今后可使用该微信登录管理教师。</p>
            {!ownerEmailVerified && <p className={styles.warn}>绑定邮箱尚未通过验证码验证，仅作为联系地址，不能用于管理员登录或恢复权限。</p>}
            {!ownerEmailVerified && emailDeliveryReady && <div className={styles.form}>
              <p>当前联系邮箱：{ownerContactEmail}</p>
              {step==="verify" && <label>邮箱验证码<input type="text" inputMode="numeric" maxLength={6}
                value={code} onChange={e=>setCode(e.target.value)} placeholder="6 位验证码"/></label>}
              <button disabled={busy || (step==="verify" && code.length!==6)}
                onClick={()=>void bootstrap(step==="email"?"email/start":"email/confirm")}>
                {step==="email"?"验证已绑定邮箱":"完成邮箱验证"}</button>
            </div>}
          </>
        : ownerBound
          ? <p className={styles.warn}>网站已有所有者身份，请使用已绑定的微信登录。不会允许通过邮箱重复认领。</p>
          : <>
              <p>首次设置需要同时证明：现有管理员账号、本人微信登录、本人邮箱验证码。绑定一次即可。</p>
              <p className={styles.tip}>原管理员：{legacyAdmin?"已登录":"未登录"} · 微信身份：{wechatLoggedIn?"已登录":"未登录"}</p>
              {(!legacyAdmin || !wechatLoggedIn)
                ? <p className={styles.warn}>请先在本浏览器完成两项身份登录：
                  {!legacyAdmin && <a href="/admin/login">原管理员登录</a>}
                  {!legacyAdmin && !wechatLoggedIn && " · "}
                  {!wechatLoggedIn && <a href="/login?next=%2Fadmin%2Fclassroom">主站微信登录</a>}
                  ，再返回此页。</p>
                : <div className={styles.form}>
                    <label>所有者邮箱（验证码验证）<input type="email" autoComplete="email"
                      value={email} onChange={e=>setEmail(e.target.value)} placeholder="输入你控制的邮箱"/></label>
                    {step==="verify" &&
                      <label>邮箱验证码<input type="text" inputMode="numeric" maxLength={6}
                        value={code} onChange={e=>setCode(e.target.value)} placeholder="6 位数字验证码"/></label>}
                    <button type="button" disabled={busy || !email.trim() || (step==="verify" && code.length!==6)}
                      onClick={()=>void bootstrap(!emailDeliveryReady?"claim":step==="email"?"start":"confirm")}>
                      {busy?"正在验证…":!emailDeliveryReady?"管理员＋微信双重确认，立即开通":step==="email"?"向邮箱发送验证码":"验证并绑定为网站所有者"}</button>
                    {!emailDeliveryReady && <p className={styles.tip}>当前主站尚未启用邮箱发信。邮箱将记录为待验证联系地址，不作为权限凭据。</p>}
                  </div>}
            </>}
      {message && <p role="status" className={styles.tip}>{message}</p>}
    </section>
    <section className={styles.panel}>
      <div className={styles.titleRow}><div><h2>口音教练 · 教师申请</h2>
        <p>老师微信申请，你审核后即可建班、布置跟读作业并查看学生成绩。</p></div>
        <button type="button" disabled={!siteOwner || busy} onClick={()=>void refresh()}>刷新申请</button></div>
      {!siteOwner
        ? <p className={styles.tip}>完成站点所有者绑定后，才可审批教师。</p>
        : listError
          ? <p role="status" className={styles.warn}>{listError}</p>
          : teachers.length===0
            ? <p>暂无教师申请。</p>
            : <div className={styles.list}>{teachers.map(t=><div className={styles.teacher} key={t.account_id}>
                <div><strong>{t.name}</strong><p>状态：{t.status==="pending"?"待审批":t.status==="approved"?"已批准":"已撤销"}</p></div>
                <button type="button" disabled={busy} onClick={()=>void decision(t,t.status!=="approved")}>
                  {t.status==="approved"?"撤销教师资格":"批准为教师"}
                </button>
              </div>)}</div>}
    </section>
  </div>;
}
