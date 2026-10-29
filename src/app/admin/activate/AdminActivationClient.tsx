"use client";
import { useEffect, useState, type FormEvent } from "react";
import styles from "./AdminActivationClient.module.css";

export default function AdminActivationClient() {
  const [token, setToken] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const invite = hash.get("invite") || "";
    // Fragment never reaches the server; remove it from visible history as well.
    window.history.replaceState(null, "", window.location.pathname);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (/^[0-9a-f]{64}$/.test(invite)) setToken(invite);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (pin.length < 12 || pin.length > 128) {
      setError("密码需要12至128个字符");
      return;
    }
    if (pin !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/activate", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, pin, confirm }),
      });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "激活失败");
      window.location.replace("/admin/feedback");
    } catch (e) {
      setError(e instanceof Error ? e.message : "激活暂时失败");
    } finally {
      setBusy(false);
      setPin("");
      setConfirm("");
    }
  }
  if (!loaded) return <p>正在验证邀请链接…</p>;
  if (!token) return <div role="alert" className={styles.invalid}>
    邀请链接不完整或已经失效。请使用管理员邀请邮件中的完整链接，勿转发给他人。
  </div>;
  return <form className={styles.form} onSubmit={activate}>
    <label>设置管理员密码（12–128个字符）
      <input required type="password" value={pin} autoComplete="new-password" minLength={12} maxLength={128}
        onChange={e => setPin(e.target.value)} placeholder="请设置新的强密码" /></label>
    <label>再次确认管理员密码
      <input required type="password" value={confirm} autoComplete="new-password" minLength={12} maxLength={128}
        onChange={e => setConfirm(e.target.value)} placeholder="再次输入新密码" /></label>
    <p className={styles.note}>该密码只在官方 HTTPS 网站设置，不通过聊天或邮件传输。激活后直接进入管理后台，旧测试管理员账号暂时保留以便回退。</p>
    <button disabled={busy || !pin || !confirm} type="submit">{busy ? "正在安全激活…" : "验证邮箱邀请并启用管理员账号"}</button>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </form>;
}
