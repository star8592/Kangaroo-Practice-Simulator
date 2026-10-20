"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_BRAND } from "@/lib/site-brand";
import styles from "./AuthExperience.module.css";
import WechatWebsiteQr from "./WechatWebsiteQr";

type LoginMode = "checking" | "loading" | "qr" | "unavailable" | "error" | "studentRequired";
const inWechat = () => typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);

// A failed or stalled network request must never leave the login spinner indefinitely.
async function fetchWithTimeout(url: string, init: RequestInit, milliseconds: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

type PreparedWechatQr = Promise<{ response?: Response; error?: unknown }>;

export default function UnifiedLoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("checking");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrAuthorizeUrl, setQrAuthorizeUrl] = useState("");
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileExternal, setMobileExternal] = useState(false);
  const [shareHint, setShareHint] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposed = useRef(false);
  const ticketRef = useRef("");
  const bootstrapRun = useRef(0);

  const stopPolling = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const destination = nextPath && nextPath !== "/login" ? nextPath : "/parent";
  const studentDestination = nextPath && nextPath !== "/login" ? nextPath : "/";
  const needsStudent = /^\/(?:exam\/|student(?:\/|$))/.test(destination);

  const poll = useCallback((ticket: string) => {
    stopPolling();
    if (disposed.current || ticketRef.current !== ticket) return;
    function schedule() {
      timer.current = setTimeout(() => { void check(); }, 1800);
    }
    async function check() {
      if (disposed.current || ticketRef.current !== ticket) return;
      try {
        const res = await fetch("/api/auth/parent/wechat/qr/status?ticket=" + encodeURIComponent(ticket), {
          cache: "no-store", credentials: "same-origin",
        });
        const body = await res.json();
        if (disposed.current || ticketRef.current !== ticket) return;
        if (body.status === "authenticated") {
          stopPolling();
          router.replace(destination);
          router.refresh();
          return;
        }
        if (body.status === "expired") {
          stopPolling();
          setMode("error");
          setMessage("二维码已过期，点击重新生成即可。");
          return;
        }
      } catch { /* A transient network error must not discard a valid ticket. */ }
      schedule();
    }
    schedule();
  }, [destination, router, stopPolling]);

  const startWechat = useCallback(async (prefetchedQr?: PreparedWechatQr) => {
    stopPolling();
    ticketRef.current = "";
    setMode("loading");
    setQrDataUrl("");
    setQrAuthorizeUrl("");
    setMessage("");
    try {
      if (inWechat()) {
        // WeChat's in-app OAuth uses an existing verified callback/state flow.
        window.location.replace("/api/auth/parent/wechat/start?next=" + encodeURIComponent(destination));
        return;
      }
      const qr = prefetchedQr
        ? await prefetchedQr
        : { response: await fetchWithTimeout("/api/auth/parent/wechat/qr", {
            method: "POST", cache: "no-store", credentials: "same-origin",
          }, 10_000) };
      if (qr.error) throw qr.error;
      if (!qr.response) throw new Error("二维码请求没有响应，请重试。");
      const response = qr.response;
      const result = await response.json();
      if (!response.ok || !result.ticket || (!result.qrDataUrl && !result.qrAuthorizeUrl)) {
        throw new Error(result.error || "微信扫码暂时不可用");
      }
      if (disposed.current) return;
      ticketRef.current = result.ticket;
      setQrDataUrl(result.qrDataUrl || "");
      setQrAuthorizeUrl(result.qrAuthorizeUrl || "");
      setMode("qr");
      poll(result.ticket);
    } catch (e) {
      if (disposed.current) return;
      setMode("unavailable");
      setMessage(e instanceof Error && e.name === "AbortError"
        ? "连接超时。请检查网络或代理连接后重新生成二维码。"
        : e instanceof Error ? e.message : "暂时无法连接微信，请重试");
    }
  }, [destination, poll, stopPolling]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setMobileExternal(/Android|iPhone|iPad|Mobile/i.test(window.navigator.userAgent) && !inWechat());
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    const currentRun = bootstrapRun;
    const run = ++currentRun.current;
    disposed.current = false;

    // Prepare the QR concurrently with auth checks instead of paying three
    // consecutive network round trips. An unused ticket expires automatically.
    const qrController = new AbortController();
    const qrTimeout = window.setTimeout(() => qrController.abort(), 10_000);
    const prefetchedQr: PreparedWechatQr | undefined = inWechat() ? undefined
      : fetch("/api/auth/parent/wechat/qr", {
          method: "POST", cache: "no-store", credentials: "same-origin",
          signal: qrController.signal,
        }).then(
          response => ({ response }),
          error => ({ error }),
        ).finally(() => window.clearTimeout(qrTimeout));

    void (async () => {
      try {
        // Individual failures must not block the other session check.
        const results = await Promise.allSettled([
          fetchWithTimeout("/api/auth/parent/me", {
            cache: "no-store", credentials: "same-origin",
          }, 6_000),
          fetchWithTimeout("/api/auth/me", {
            cache: "no-store", credentials: "same-origin",
          }, 6_000),
        ]);
        if (disposed.current || currentRun.current !== run) return;
        const parentOk = results[0].status === "fulfilled" && results[0].value.ok;
        const studentResponse = results[1].status === "fulfilled" ? results[1].value : null;
        const student = studentResponse?.ok ? (await studentResponse.json()).user : null;
        const genuineStudent = student && student.candidateNo !== "GUEST";
        if (needsStudent) {
          if (genuineStudent) {
            router.replace(studentDestination);
            router.refresh();
            return;
          }
          if (parentOk) {
            setMode("studentRequired");
            setMessage("微信家庭已登录。完整模拟和个人成长档案需要已有学生账号；可在下方继续登录，基础计算无需这一步。");
            return;
          }
        } else if (parentOk || genuineStudent) {
          router.replace(parentOk ? destination : studentDestination);
          router.refresh();
          return;
        }
      } catch { /* Login remains available when session checks fail. */ }
      if (!disposed.current && currentRun.current === run) void startWechat(prefetchedQr);
    })();
    return () => {
      disposed.current = true;
      qrController.abort();
      window.clearTimeout(qrTimeout);
      currentRun.current++;
      ticketRef.current = "";
      stopPolling();
    };
  }, [destination, studentDestination, needsStudent, router, startWechat, stopPolling]);

  async function sendToWechat() {
    const address = window.location.href;
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: "SOC THINK · 微信快速登录", url: address }); return; }
      catch (error) { if (error instanceof Error && error.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(address);
      setShareHint("链接已复制。发到微信聊天后点开，即可直接微信登录。");
    } catch {
      setShareHint("请复制浏览器地址栏中的网址，再到微信里打开。");
    }
  }

  async function studentLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "登录失败");
      router.replace(body.user?.role === "student" && body.user?.onboardingCompleted !== true
        ? "/student/settings?welcome=1" : studentDestination);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  return <main className={styles.unifiedShell}>
    <section className={styles.unifiedIntro}>
      <div className={styles.mark}>{SITE_BRAND.mark}</div>
      <span className={styles.formKicker}>SOC THINK · 数学成长平台</span>
      <h1>微信扫一扫，马上开始学习</h1>
      <p>第一次使用自动创建账号。无需选择学生或家长，也不用先填邮箱、密码、年级。</p>
      <div className={styles.unifiedSteps}>
        <span>微信扫码或微信内打开</span><span>自动建立学习身份</span><span>开始数学训练</span>
      </div>
      <Link className="secondary-button" href="/arithmetic">先看看数学训练 →</Link>
    </section>

    <section className={styles.unifiedLoginBox} aria-label="登录或注册">
      <h2>登录或注册</h2>
      <p>一个微信入口，登录与注册自动完成。</p>
      {mode === "checking" || mode === "loading"
        ? <div className={styles.unifiedLoading} role="status">正在准备微信登录…</div>
        : null}
      {mode === "qr" && (qrAuthorizeUrl || qrDataUrl)
        ? <div className={styles.unifiedQr}>
            {qrAuthorizeUrl
              ? <WechatWebsiteQr authorizeUrl={qrAuthorizeUrl} />
              : <Image src={qrDataUrl} width={260} height={260} unoptimized alt="使用手机微信扫描此二维码登录或注册"/>}
            <p>打开手机微信扫一扫，完成后电脑自动进入。</p>
          </div>
        : null}
      {mobileExternal && <div className={styles.unifiedMobileHint}>
        <strong>正在用手机浏览器打开？</strong>
        <p>无需用同一部手机扫描屏幕上的二维码，把本页分享到微信里打开，就能直接用微信身份进入。</p>
        <button type="button" className="secondary-button" onClick={() => void sendToWechat()}>分享到微信 / 复制链接</button>
        {shareHint && <small role="status">{shareHint}</small>}
      </div>}
      {message && <p className={styles.error} role="alert">{message}</p>}
      {(mode === "qr" || mode === "unavailable" || mode === "error") &&
        <button type="button" className="primary-button" onClick={() => void startWechat()}>
          {mode === "qr" ? "刷新微信二维码" : "重新连接微信"}
        </button>}
      <p className={styles.unifiedHelp}>这台电脑会记住登录状态；账号安全变化、退出登录或长时间未使用后才需要重新验证。</p>

      {mode === "studentRequired" && <Link className="secondary-button" href="/arithmetic">先去做数学训练</Link>}
      <details className={styles.unifiedOther} open={mode === "studentRequired" ? true : undefined}>
        <summary>其他登录方式（已有账号）</summary>
        <form onSubmit={studentLogin} className={styles.form}>
          <label className={styles.field}><span>已有学生账号 / 准考证号</span>
            <input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)}/></label>
          <label className={styles.field}><span>学生 PIN</span>
            <input type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={e => setPin(e.target.value)}/></label>
          <button type="submit" className="secondary-button" disabled={busy || !username.trim() || !pin}>
            {busy ? "正在登录…" : "使用已有学生账号"}
          </button>
        </form>
        <p><Link href="/parent/login">邮箱密码登录 / 找回密码</Link> · <Link href="/parent/register">邮箱注册</Link></p>
      </details>
    </section>
  </main>;
}
