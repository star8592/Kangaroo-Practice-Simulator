"use client";

import {useEffect, useState} from "react";
import QRCode from "qrcode";
import {
  classInvitationMessage,
  INVITATION_CLOSING,
  INVITATION_GREETING,
  INVITATION_OVERVIEW,
  INVITATION_STEPS,
} from "./class-invitation-copy";
import styles from "./ClassInvitationPanel.module.css";

type Invitation = {enabled: boolean; url: string | null};
type InvitationFormat = "link" | "qr";
const API = "/english/pronunciation/classroom-api";

function roundedPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapDraw(ctx: CanvasRenderingContext2D, message: string, x: number, y: number, width: number, lineHeight: number): number {
  let line = "";
  for (const char of message) {
    if (ctx.measureText(line + char).width > width && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = char;
    } else {
      line += char;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

async function invitationPoster(qrDataUrl: string, className: string): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法绘制邀请海报");
  const gradient = ctx.createLinearGradient(0, 0, 900, 1600);
  gradient.addColorStop(0, "#eff9f2");
  gradient.addColorStop(1, "#e9f1eb");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 900, 1600);

  ctx.fillStyle = "#155e49";
  roundedPanel(ctx, 40, 40, 820, 322, 34);
  ctx.fill();
  ctx.fillStyle = "#b8e6cb";
  ctx.font = "700 26px sans-serif";
  ctx.fillText("SOC THINK  ·  ENGLISH CLASSROOM", 88, 111);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 48px sans-serif";
  const titleEnd = wrapDraw(ctx, className, 88, 194, 730, 65);
  ctx.fillStyle = "#e3f5e9";
  ctx.font = "29px sans-serif";
  ctx.fillText("英语跟读训练 · 班级专属邀请", 88, Math.min(titleEnd + 25, 326));

  ctx.fillStyle = "#ffffff";
  roundedPanel(ctx, 40, 386, 820, 1130, 34);
  ctx.fill();
  ctx.fillStyle = "#174f3c";
  ctx.font = "700 33px sans-serif";
  ctx.fillText(INVITATION_GREETING, 92, 465);
  ctx.fillStyle = "#375c4e";
  ctx.font = "26px sans-serif";
  const bottom = wrapDraw(ctx, INVITATION_OVERVIEW, 92, 521, 716, 44);
  const headingY = Math.max(bottom + 28, 650);
  ctx.fillStyle = "#174f3c";
  ctx.font = "700 30px sans-serif";
  ctx.fillText("加入方式", 92, headingY);
  ctx.font = "25px sans-serif";
  INVITATION_STEPS.forEach((step, index) => {
    ctx.fillStyle = "#2e7555";
    ctx.font = "700 27px sans-serif";
    ctx.fillText(String(index + 1).padStart(2, "0"), 94, headingY + 57 + index * 58);
    ctx.fillStyle = "#3d5c50";
    ctx.font = "25px sans-serif";
    ctx.fillText(step, 147, headingY + 57 + index * 58);
  });

  const qr = new Image();
  await new Promise<void>((resolve, reject) => {
    qr.onload = () => resolve();
    qr.onerror = () => reject(new Error("二维码图像加载失败"));
    qr.src = qrDataUrl;
  });
  const qrY = Math.max(905, headingY + 257);
  ctx.fillStyle = "#f0f8f2";
  roundedPanel(ctx, 273, qrY - 8, 354, 354, 24);
  ctx.fill();
  ctx.drawImage(qr, 292, qrY + 11, 316, 316);
  ctx.fillStyle = "#174f3c";
  ctx.font = "700 29px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("微信扫一扫 · 申请加入班级", 450, qrY + 404);
  ctx.fillStyle = "#507162";
  ctx.font = "23px sans-serif";
  ctx.fillText("由老师审核通过后，即可开始跟读练习", 450, qrY + 447);
  ctx.textAlign = "start";
  ctx.fillStyle = "#2f6c50";
  ctx.font = "23px sans-serif";
  ctx.fillText(INVITATION_CLOSING, 91, 1481);
  ctx.fillStyle = "#6a8a78";
  ctx.font = "22px sans-serif";
  ctx.fillText("socthink.cn  ·  英语跟读课堂", 70, 1572);
  return canvas.toDataURL("image/png");
}

function downloadPoster(poster: string, className: string) {
  const link = document.createElement("a");
  link.href = poster;
  link.download = className.replace(/[\\/:*?"<>|]/g, "-") + "-班级邀请海报.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function ClassInvitationPanel({
  tenant, classId, className,
}: {
  tenant: string; classId: string; className: string;
}) {
  const [entry, setEntry] = useState<Invitation | null>(null);
  const [posterData, setPosterData] = useState<{url: string; image: string} | null>(null);
  const [format, setFormat] = useState<InvitationFormat>("link");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const base = API + "/tenants/" + tenant + "/classes/" + classId + "/invitation";

  useEffect(() => {
    let live = true;
    fetch(base, {credentials: "same-origin", cache: "no-store"}).then(async response => {
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "邀请码读取失败");
      if (live) setEntry(value);
    }).catch(reason => {
      if (live) setError(reason instanceof Error ? reason.message : "无法读取班级邀请");
    });
    return () => {live = false;};
  }, [base]);

  useEffect(() => {
    let live = true;
    if (entry?.enabled && entry.url) {
      void QRCode.toDataURL(entry.url, {width: 460, margin: 2, errorCorrectionLevel: "M"})
        .then(async dataUrl => {
          const image = await invitationPoster(dataUrl, className);
          if (live && entry.url) setPosterData({url: entry.url, image});
        })
        .catch(reason => {
          if (live) setError(reason instanceof Error ? reason.message : "邀请海报生成失败");
        });
    }
    return () => {live = false;};
  }, [entry?.enabled, entry?.url, className]);

  async function change(action: "rotate" | "disable") {
    if (busy) return;
    if (action === "rotate" && entry?.enabled &&
      !window.confirm("重新生成后，原来的邀请链接和二维码都会立即失效。确定继续？")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(base + "/" + action, {
        method: "POST", credentials: "same-origin",
        headers: {"Content-Type": "application/json"}, body: "{}",
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "更新失败");
      setEntry(value);
      setNotice(action === "rotate" ? "新邀请已生成，旧链接及旧海报已失效" : "班级邀请已停用");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(success);
      setError("");
    } catch {
      setError("浏览器不允许自动复制。请长按下方文字选中复制，或使用系统分享。");
    }
  }

  async function sharePoster() {
    if (!poster) return;
    try {
      const blob = await (await fetch(poster)).blob();
      const file = new File([blob], "英语跟读班级邀请.png", {type: "image/png"});
      if (typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" && navigator.canShare({files: [file]})) {
        await navigator.share({files: [file], title: className + " · 入班邀请"});
        setNotice("已打开系统图片分享");
        return;
      }
      downloadPoster(poster, className);
      setNotice("已保存海报。可从图片或下载文件中转发到微信。");
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") return;
      setError("系统分享未完成，请长按海报保存图片后发送到微信。");
    }
  }

  const link = entry?.enabled ? entry.url : null;
  const poster = link && posterData?.url === link ? posterData.image : "";
  const invitation = link ? classInvitationMessage(className, link) : "";
  return <section className={styles.shell} aria-label="邀请学生加入班级">
    <div className={styles.header}>
      <div>
        <span className={styles.kicker}>CLASS INVITATION · 班级邀请</span>
        <h3>邀请同学加入「{className}」</h3>
        <p>一份正式邀请，两种发送方式。学生微信登录申请入班，老师审核后开始学习。</p>
      </div>
      <span className={styles.status}>{link ? "邀请已启用" : "尚未启用"}</span>
    </div>
    {link ? <>
      <div className={styles.switcher} role="group" aria-label="选择班级邀请方式">
        <button type="button" className={format === "link" ? styles.selected : ""} aria-pressed={format === "link"} onClick={() => setFormat("link")}>🔗 链接邀请</button>
        <button type="button" className={format === "qr" ? styles.selected : ""} aria-pressed={format === "qr"} onClick={() => setFormat("qr")}>▦ 二维码海报</button>
      </div>
      <div className={styles.content}>
        {format === "link" ? <>
          <p className={styles.modeHint}>适合微信群、私聊：一键复制完整邀请文案，包含介绍、加入步骤和专属链接。</p>
          <textarea className={styles.message} aria-label="完整班级邀请文案" value={invitation} readOnly onFocus={event => event.currentTarget.select()} />
          <div className={styles.actions}>
            <button className={styles.primary} type="button" onClick={() => void copy(invitation, "完整邀请文案已复制，可直接粘贴到微信群")}>复制完整邀请文案</button>
            <button type="button" onClick={() => void copy(link, "班级专属链接已复制")}>只复制链接</button>
            <a href={link} target="_blank" rel="noopener noreferrer">预览学生入口</a>
          </div>
        </> : <>
          <p className={styles.modeHint}>适合微信群图片、朋友圈或线下扫码。海报带有相同的介绍、加入步骤和真实班级二维码。</p>
          {poster ? <img className={styles.poster} src={poster} alt={className + "的完整班级邀请海报，包含介绍、加入步骤与可扫码二维码"} /> :
            <div className={styles.posterPending} role="status">{"正在生成二维码邀请海报…"}</div>}
          <div className={styles.actions}>
            <button className={styles.primary} type="button" disabled={!poster} onClick={() => void sharePoster()}>分享 / 保存邀请海报</button>
            <button type="button" disabled={!poster} onClick={() => {if (poster) downloadPoster(poster, className);}}>下载 PNG 图片</button>
            <button type="button" onClick={() => void copy(invitation, "邀请文字已复制，可和海报一起发送")}>复制配套邀请文案</button>
          </div>
          <p className={styles.tip}>手机微信内可尝试长按上方海报保存，再发送给学生或家长。</p>
        </>}
      </div>
      <details className={styles.manage}>
        <summary>邀请链接管理（更换 / 停用）</summary>
        <p>更换邀请码将同时使以前发出的链接和二维码失效。已入班学生不受影响。</p>
        <div className={styles.actions}>
          <button type="button" disabled={busy} onClick={() => void change("rotate")}>重新生成邀请</button>
          <button type="button" disabled={busy} onClick={() => void change("disable")}>停用邀请</button>
        </div>
      </details>
    </> : <div className={styles.empty}>
      <p>创建邀请后即可使用链接和二维码两种方式邀请学生。</p>
      <button className={styles.primary} type="button" disabled={busy} onClick={() => void change("rotate")}>生成本班邀请</button>
    </div>}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
  </section>;
}
