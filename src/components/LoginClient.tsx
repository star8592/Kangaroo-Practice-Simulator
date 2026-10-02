"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_BRAND } from "@/lib/site-brand";
import styles from "./AuthExperience.module.css";

export default function LoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "登录失败");
      const destination = data.user?.role === "student" && data.user?.onboardingCompleted !== true
        ? "/student/settings?welcome=1"
        : nextPath;
      router.replace(destination);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className={styles.shell}>
      <section className={styles.frame}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <div className={styles.mark}>{SITE_BRAND.mark}</div>
            <span className={styles.brandEyebrow}>学生学习系统</span>
            <h1>{SITE_BRAND.loginTitleZh}<span>{SITE_BRAND.loginSubtitleZh}</span></h1>
            <p>从竞赛模拟、计算训练到错因分析，每一次练习都会进入同一份长期学习档案。</p>
            <div className={styles.trustList}>
              <div className={styles.trustItem}><i>✓</i><span>训练记录持续积累</span></div>
              <div className={styles.trustItem}><i>✓</i><span>个人数据独立建模</span></div>
              <div className={styles.trustItem}><i>✓</i><span>不提前展示正确答案</span></div>
            </div>
          </div>
          <div className={styles.brandBottom}>国际数学竞赛训练中心</div>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.formInner}>
            <span className={styles.formKicker}>学生登录</span>
            <h2>进入我的学习档案</h2>
            <p className={styles.formLead}>使用学生账号或准考证号，以及个人 PIN 登录。</p>

            <form className={styles.form} onSubmit={submit}>
              <label className={styles.field}>
                <span>学生账号 / 准考证号</span>
                <input autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="输入账号或准考证号" />
              </label>
              <label className={styles.field}>
                <span>学生 PIN</span>
                <input type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="输入 PIN" />
              </label>
              {error && <div className={styles.error}>{error}</div>}
              <button className={`primary-button ${styles.primaryAction}`} disabled={!username.trim() || !pin || busy}>
                {busy ? "正在验证…" : "登录学生系统"}
              </button>
            </form>

            <div className={styles.note}>
              <span className={styles.noteIcon}>⌁</span>
              <div><b>账号安全</b><span>PIN 使用 scrypt 哈希保存；登录会话使用 HttpOnly 签名 Cookie。</span></div>
            </div>

            <div className={styles.switchBox}>
              <span className={styles.switchTitle}>家长入口</span>
              <p className={styles.switchText}>家长使用已验证邮箱管理孩子账号、查看诊断报告和找回密码。</p>
              <div className={styles.switchActions}>
                <Link className="secondary-button" href="/parent/login">家长登录</Link>
                <Link className="secondary-button" href="/parent/register">邮箱注册</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
