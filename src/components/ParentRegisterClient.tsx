"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./AuthExperience.module.css";

export default function ParentRegisterClient() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/parent/status")
      .then(async (response) => (await response.json()).registrationEnabled === true)
      .then(setRegistrationEnabled)
      .catch(() => setRegistrationEnabled(false));
  }, []);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const body = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      acceptedTerms: formData.get("acceptedTerms") === "on",
      guardianConfirmed: formData.get("guardianConfirmed") === "on",
    };
    try {
      const response = await fetch("/api/auth/parent/register/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "发送验证码失败");
      setEmail(String(body.email || ""));
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/parent/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: formData.get("code") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "验证失败");
      router.replace("/parent");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.shell}>
      <section className={styles.frame}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <div className={styles.mark}>家</div>
            <span className={styles.brandEyebrow}>建立家庭档案</span>
            <h1>一个账号管理孩子的长期学习记录<span>先验证邮箱，再建立孩子档案</span></h1>
            <p>家长账号用于创建与管理孩子账号、查看阶段诊断报告，并承担账号恢复与安全管理。</p>
            <div className={styles.trustList}>
              <div className={styles.trustItem}><i>1</i><span>填写家长信息</span></div>
              <div className={styles.trustItem}><i>2</i><span>完成邮箱验证</span></div>
              <div className={styles.trustItem}><i>3</i><span>创建孩子账号</span></div>
            </div>
          </div>
          <div className={styles.brandBottom}>家庭安全注册</div>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.formInner}>
            <span className={styles.formKicker}>{step === "form" ? "家长注册" : "邮箱验证"}</span>
            <h2>{step === "form" ? "创建家长账号" : "验证你的邮箱"}</h2>
            <p className={styles.formLead}>{step === "form" ? "填写基本信息并确认监护关系。" : "输入发送到注册邮箱的 6 位验证码。"}</p>

            {registrationEnabled === false && step === "form" && (
              <div className={styles.warning}>邮箱注册服务正在配置中。现有学生账号仍可正常登录使用。</div>
            )}

            {step === "form" ? (
              <form onSubmit={start} className={styles.form}>
                <label className={styles.field}><span>家长姓名</span><input name="name" required maxLength={60} placeholder="填写真实姓名或常用称呼" /></label>
                <label className={styles.field}><span>邮箱</span><input name="email" type="email" required autoComplete="email" placeholder="name@example.com" /></label>
                <label className={styles.field}><span>密码</span><input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="至少 8 位" /></label>
                <label className={styles.checkLine}><input name="guardianConfirmed" type="checkbox" required /><span>我确认自己是该学生的监护人或成年负责人</span></label>
                <label className={styles.checkLine}><input name="acceptedTerms" type="checkbox" required /><span>我同意 <Link href="/terms" target="_blank">用户协议</Link> 和 <Link href="/privacy" target="_blank">隐私政策</Link></span></label>
                {error && <div className={styles.error}>{error}</div>}
                <button className={`primary-button ${styles.primaryAction}`} disabled={busy || registrationEnabled !== true}>
                  {registrationEnabled === null ? "正在检查邮箱服务…" : busy ? "正在发送…" : "发送邮箱验证码"}
                </button>
              </form>
            ) : (
              <form onSubmit={verify} className={styles.form}>
                <p className={styles.verifyEmail}>验证码已发送到 <b>{email}</b>，10 分钟内有效。</p>
                <label className={styles.field}><span>6 位验证码</span><input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus placeholder="000000" /></label>
                {error && <div className={styles.error}>{error}</div>}
                <button className={`primary-button ${styles.primaryAction}`} disabled={busy}>{busy ? "正在验证…" : "验证并创建账号"}</button>
                <button type="button" className="secondary-button" onClick={() => setStep("form")}>返回修改邮箱</button>
              </form>
            )}

            <div className={styles.authLinks}>
              <span>已有家长账号？ <Link href="/parent/login">直接登录</Link></span>
              <span>学生本人？ <Link href="/login">学生 PIN 登录</Link></span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
