"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./AuthExperience.module.css";

export default function ParentLoginClient() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  const [email, setEmail] = useState("");

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
            <p>把正式模拟、口算行为和阶段诊断放在同一个孩子档案里，减少零散记录带来的判断偏差。</p>
            <div className={styles.trustList}>
              <div className={styles.trustItem}><i>✓</i><span>孩子账号集中管理</span></div>
              <div className={styles.trustItem}><i>✓</i><span>诊断报告自动归档</span></div>
              <div className={styles.trustItem}><i>✓</i><span>邮箱验证与密码找回</span></div>
            </div>
          </div>
          <div className={styles.brandBottom}>Parent Learning Console</div>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.formInner}>
            <span className={styles.formKicker}>{reset ? "密码重置" : "家长登录"}</span>
            <h2>{reset ? "重新设置密码" : "进入家长中心"}</h2>
            <p className={styles.formLead}>{reset ? "输入邮件中的 6 位验证码，并设置新的登录密码。" : "使用已验证的邮箱与密码登录。"}</p>

            {!reset ? (
              <>
                <form onSubmit={submit} className={styles.form}>
                  <label className={styles.field}><span>邮箱</span><input name="email" type="email" required autoComplete="email" placeholder="name@example.com" /></label>
                  <label className={styles.field}><span>密码</span><input name="password" type="password" required autoComplete="current-password" placeholder="输入登录密码" /></label>
                  {error && <div className={resetDone ? styles.success : styles.error}>{error}</div>}
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
