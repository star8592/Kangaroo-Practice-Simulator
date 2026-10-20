"use client";

import { useState, type FormEvent } from "react";
import styles from "./AdminOperations.module.css";

export default function AdminLoginClient() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: String(fields.get("username") || ""),
          pin: String(fields.get("pin") || ""),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "管理员登录失败");
      }
      window.location.assign("/admin");
    } catch (failure) {
      const pin = form.querySelector<HTMLInputElement>('input[name="pin"]');
      if (pin) pin.value = "";
      setError(failure instanceof Error ? failure.message : "管理员登录失败");
    } finally {
      setBusy(false);
    }
  }

  return <form className={styles.adminLogin} onSubmit={submit}>
    <label>管理员账号<input required maxLength={120} name="username" autoComplete="username" placeholder="管理员用户名" /></label>
    <label>管理员 PIN / 密码<input required minLength={6} maxLength={128} name="pin" type="password" autoComplete="current-password" placeholder="仅管理员凭据" /></label>
    {error && <p role="alert" className={styles.loginError}>{error}</p>}
    <button type="submit" disabled={busy}>{busy ? "正在验证…" : "安全登录管理后台"}</button>
    <small>仅已建立的管理员账号可登录。普通微信家长、学生或游客账号不具有后台权限。会话最长有效 8 小时。</small>
  </form>;
}
