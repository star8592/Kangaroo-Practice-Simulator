"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_STUDENT_AVATAR,
  STUDENT_AVATARS,
  studentAvatarEmoji,
} from "@/lib/student-avatar";

type Student = {
  id: string;
  username: string;
  candidateNo: string;
  name: string;
  grade: number;
  school?: string;
  avatarKey?: string;
};

export default function StudentProfileClient({ user }: { user: Student }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [grade, setGrade] = useState(user.grade);
  const [school, setSchool] = useState(user.school || "");
  const [avatarKey, setAvatarKey] = useState(user.avatarKey || DEFAULT_STUDENT_AVATAR);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMessage, setPinMessage] = useState("");
  const [pinError, setPinError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, grade, school, avatarKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败");
      setName(data.user.name);
      setGrade(data.user.grade);
      setSchool(data.user.school || "");
      setAvatarKey(data.user.avatarKey || DEFAULT_STUDENT_AVATAR);
      setMessage("资料已保存。新的姓名、年级和头像已经生效。");
      window.dispatchEvent(new Event("student-profile-updated"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function changePin(event: FormEvent) {
    event.preventDefault();
    setPinMessage("");
    setPinError("");
    if (!/^\d{4,12}$/.test(newPin)) {
      setPinError("新 PIN 必须为 4–12 位数字");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("两次输入的新 PIN 不一致");
      return;
    }

    setPinBusy(true);
    try {
      const response = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "修改 PIN 失败");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setPinMessage("PIN 已修改，当前设备仍保持登录，其他旧会话已失效。");
    } catch (e) {
      setPinError(e instanceof Error ? e.message : String(e));
    } finally {
      setPinBusy(false);
    }
  }

  return (
    <div className="student-shell">
      <div className="report-actions" style={{ justifyContent: "flex-start", marginTop: 0 }}>
        <Link className="secondary-button" href="/student">← 返回学习报告</Link>
      </div>

      <section className="student-hero">
        <div>
          <span className="eyebrow">MY PROFILE</span>
          <h1>{studentAvatarEmoji(avatarKey)} 我的资料</h1>
          <p>这里的信息用于考试、口算打印、学习报告和年级推荐。</p>
        </div>
        <div className="readiness-ring" aria-hidden="true">
          <strong style={{ fontSize: 44 }}>{studentAvatarEmoji(avatarKey)}</strong>
          <span>{grade} 年级</span>
          <small>{name || "学生档案"}</small>
        </div>
      </section>

      <section className="report-card" style={{ maxWidth: 760, margin: "22px auto 0" }}>
        <form className="student-edit-form" onSubmit={save}>
          <div>
            <span className="eyebrow">EDIT PROFILE</span>
            <h2>设置自己的显示资料</h2>
            <p>姓名可以填写真实姓名，也可以填写平时使用的昵称。</p>
          </div>

          <div>
            <span style={{ display: "block", fontWeight: 800, marginBottom: 8 }}>选择头像</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(105px,1fr))", gap: 10 }}>
              {STUDENT_AVATARS.map((avatar) => (
                <button
                  key={avatar.key}
                  type="button"
                  onClick={() => setAvatarKey(avatar.key)}
                  aria-pressed={avatarKey === avatar.key}
                  style={{
                    minHeight: 76,
                    borderRadius: 14,
                    border: avatarKey === avatar.key ? "2px solid var(--accent)" : "1px solid var(--line)",
                    background: avatarKey === avatar.key ? "#fff8f4" : "#fff",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  <span style={{ display: "block", fontSize: 30 }}>{avatar.emoji}</span>
                  <small>{avatar.label}</small>
                </button>
              ))}
            </div>
          </div>

          <label>
            <span>姓名 / 昵称</span>
            <input
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：可乐"
            />
          </label>

          <label>
            <span>年级</span>
            <input
              required
              type="number"
              min={1}
              max={13}
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
            />
          </label>

          <label>
            <span>学校（可选）</span>
            <input
              maxLength={80}
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="可不填写"
            />
          </label>

          <div className="login-data-note">
            <b>登录信息</b>
            <span>登录名：{user.username}</span>
            <span>准考证号：{user.candidateNo}</span>
            <span>这两项用于识别账号，学生本人不能在这里修改。</span>
          </div>

          {error && <div className="login-error">{error}</div>}
          {message && <div className="login-data-note"><b>保存成功</b><span>{message}</span></div>}

          <div className="student-edit-actions">
            <Link className="secondary-button" href="/student">取消</Link>
            <button
              className="primary-button"
              disabled={busy || !name.trim() || grade < 1 || grade > 13}
            >
              {busy ? "保存中…" : "保存我的资料"}
            </button>
          </div>
        </form>
      </section>

      <section className="report-card" style={{ maxWidth: 760, margin: "18px auto 0" }}>
        <form className="student-edit-form" onSubmit={changePin}>
          <div>
            <span className="eyebrow">ACCOUNT SECURITY</span>
            <h2>修改学生 PIN</h2>
            <p>需要先输入当前 PIN。修改后，其他设备上的旧登录会自动失效。</p>
          </div>

          <label>
            <span>当前 PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              required
            />
          </label>
          <label>
            <span>新 PIN（4–12 位数字）</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              required
            />
          </label>
          <label>
            <span>再次输入新 PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              required
            />
          </label>

          {pinError && <div className="login-error">{pinError}</div>}
          {pinMessage && <div className="login-data-note"><b>修改成功</b><span>{pinMessage}</span></div>}

          <div className="student-edit-actions">
            <button
              className="primary-button"
              disabled={pinBusy || !currentPin || !newPin || !confirmPin}
            >
              {pinBusy ? "修改中…" : "修改 PIN"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
