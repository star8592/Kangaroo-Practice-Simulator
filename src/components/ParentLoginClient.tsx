"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./AuthExperience.module.css";

export default function ParentLoginClient() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  const [email, setEmail] = useState("");
  const [wechatBusy, setWechatBusy] = useState(false);
  const [wechatQrData, setWechatQrData] = useState("");
  const [wechatQrStatus, setWechatQrStatus] = useState("");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  function stopWechatPolling() {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = null;
  }

  function pollWechatLogin(ticket: string) {
    stopWechatPolling();
    pollTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/auth/parent/wechat/qr/status?ticket=${encodeURIComponent(ticket)}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (data.status === "authenticated") {
          setWechatQrStatus("登录成功，正在进入家长中心…");
          setWechatBusy(false);
          router.replace("/parent");
          router.refresh();
          return;
        }
        if (data.status === "expired") {
          setWechatQrStatus("二维码已过期，请重新生成。");
          setWechatBusy(false);
          return;
        }
        pollWechatLogin(ticket);
      } catch {
        pollWechatLogin(ticket);
      }
    }, 1800);
  }

  async function startWechatLogin() {
    setError("");
    setWechatQrStatus("");

    if (/MicroMessenger/i.test(window.navigator.userAgent)) {
      window.location.replace("/api/auth/parent/wechat/start");
      return;
    }

    setWechatBusy(true);
    stopWechatPolling();
    try {
      const response = await fetch("/api/auth/parent/wechat/qr", {
        method: "POST",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.ticket || !data.qrDataUrl) {
        throw new Error(data.error || "微信二维码生成失败");
      }
      setWechatQrData(data.qrDataUrl);
      setWechatQrStatus("请用手机微信扫码。首次扫码会自动创建家长账号。");
      pollWechatLogin(data.ticket);
    } catch (e) {
      setWechatBusy(false);
      setWechatQrData("");
      setError(e instanceof Error ? e.message : "微信登录暂时不可用");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/parent/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "登录失败");
      router.replace("/parent");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function forgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const mail = String(formData.get("email") || "");
    try {
      const response = await fetch("/api/auth/parent/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: mail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "发送失败");
      setEmail(mail);
      setReset(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/parent/password/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: formData.get("code"), password: formData.get("password") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "重置失败");
      setReset(false);
      setError("密码已重置，请使用新密码登录。");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const resetDone = error.startsWith("密码已重置");

  return (
    <div className={styles.shell}>
      <section className={styles.frame}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <div className={styles.mark}>家</div>
            <span className={styles.brandEyebrow}>家长中心</span>
            <h1>看见孩子真正的学习变化<span>账号、训练与诊断统一管理</span></h1>
            <p>把正式模拟、计算行为和阶段诊断放在同一个孩子档案里，减少零散记录带来的判断偏差。</p>
            <div className={styles.trustList}>
              <div className={styles.trustItem}><i>✓</i><span>孩子账号集中管理</span></div>
              <div className={styles.trustItem}><i>✓</i><span>诊断报告自动归档</span></div>
              <div className={styles.trustItem}><i>✓</i><span>微信扫码即可注册和登录</span></div>
            </div>
          </div>
          <div className={styles.brandBottom}>家长学习中心</div>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.formInner}>
            <span className={styles.formKicker}>{reset ? "密码重置" : "家长登录"}</span>
            <h2>{reset ? "重新设置密码" : "进入家长中心"}</h2>
            <p className={styles.formLead}>{reset ? "输入邮件中的 6 位验证码，并设置新的登录密码。" : "微信扫码即可注册或登录，也可以继续使用已验证的邮箱与密码。"}</p>

            {!reset ? (
              <>
                <button
                  type="button"
                  onClick={startWechatLogin}
                  className={`primary-button ${styles.primaryAction}`}
                  disabled={wechatBusy}
                >
                  {wechatBusy ? "正在等待微信扫码…" : "微信扫码 / 快捷登录 / 注册"}
                </button>

                {wechatQrData && (
                  <div style={{marginTop:16,textAlign:"center",padding:16,border:"1px solid #e2e8f0",borderRadius:18,background:"#f8fafc"}}>
                    <Image
                      src={wechatQrData}
                      alt="微信扫码登录二维码"
                      width={240}
                      height={240}
                      unoptimized
                      style={{display:"block",width:240,height:240,maxWidth:"100%",margin:"0 auto",borderRadius:12,background:"#fff"}}
                    />
                    <p style={{margin:"12px 0 0",fontSize:13,lineHeight:1.7,color:"#64748b"}}>{wechatQrStatus}</p>
                    {!wechatBusy && (
                      <button
                        type="button"
                        className="secondary-button"
                        style={{marginTop:10}}
                        onClick={startWechatLogin}
                      >
                        重新生成二维码
                      </button>
                    )}
                  </div>
                )}

                {error && <div className={resetDone ? styles.success : styles.error}>{error}</div>}

                <div style={{display:"flex",alignItems:"center",gap:12,margin:"18px 0",color:"#94a3b8",fontSize:12}}><span style={{height:1,background:"#e2e8f0",flex:1}}/><span>或使用邮箱</span><span style={{height:1,background:"#e2e8f0",flex:1}}/></div>
                <form onSubmit={submit} className={styles.form}>
                  <label className={styles.field}><span>邮箱</span><input name="email" type="email" required autoComplete="email" placeholder="name@example.com" /></label>
                  <label className={styles.field}><span>密码</span><input name="password" type="password" required autoComplete="current-password" placeholder="输入登录密码" /></label>
                  <button className={`primary-button ${styles.primaryAction}`} disabled={busy}>{busy ? "正在登录…" : "登录家长中心"}</button>
                </form>
                <form onSubmit={forgot} className={styles.forgotForm}>
                  <input name="email" type="email" required placeholder="忘记密码？输入注册邮箱" />
                  <button className="secondary-button" disabled={busy}>发送重置码</button>
                </form>
              </>
            ) : (
              <form onSubmit={doReset} className={styles.form}>
                <p className={styles.verifyEmail}>重置验证码已发送到 <b>{email}</b>。</p>
                <label className={styles.field}><span>6 位验证码</span><input name="code" inputMode="numeric" pattern="[0-9]{6}" required autoFocus placeholder="000000" /></label>
                <label className={styles.field}><span>新密码</span><input name="password" type="password" minLength={8} required placeholder="至少 8 位" /></label>
                {error && <div className={styles.error}>{error}</div>}
                <button className={`primary-button ${styles.primaryAction}`} disabled={busy}>{busy ? "正在重置…" : "重置密码"}</button>
              </form>
            )}

            <div className={styles.authLinks}>
              <span>还没有账号？ <Link href="/parent/register">邮箱注册</Link></span>
              <span>学生本人？ <Link href="/login">学生 PIN 登录</Link></span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
