"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./StudentProfileClient.module.css";
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
  onboardingCompleted?: boolean;
};

export default function StudentProfileClient({ user, welcome = false }: { user: Student; welcome?: boolean }) {
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
      setMessage("资料已保存，新的姓名、年级和头像已经生效。");
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
      setPinMessage("PIN 已修改，当前设备保持登录，其他旧会话已失效。");
    } catch (e) {
      setPinError(e instanceof Error ? e.message : String(e));
    } finally {
      setPinBusy(false);
    }
  }

  return (
    <div className={`student-shell ${styles.shell}`}>
      <div className={styles.backRow}>
        <Link className={styles.backLink} href="/student">← 返回学习报告</Link>
      </div>

      {welcome && !user.onboardingCompleted && (
        <section className={styles.welcomeNote}>
          <span>第一次使用</span>
          <div>
            <strong>先确认一下你的资料</strong>
            <p>选头像、确认姓名和年级，保存后就可以开始训练。</p>
          </div>
        </section>
      )}

      <section className={`student-hero ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <span className="eyebrow">个人资料</span>
          <h1>我的学习档案</h1>
          <p>这些信息会用于考试、口算打印、学习报告和年级推荐。</p>
        </div>
        <div className={styles.profilePreview} aria-label="当前学生资料预览">
          <span className={styles.previewAvatar}>{studentAvatarEmoji(avatarKey)}</span>
          <div>
            <strong>{name || "学生档案"}</strong>
            <small>{grade} 年级{school ? ` · ${school}` : ""}</small>
          </div>
        </div>
      </section>

      <section className={`report-card ${styles.profileCard}`}>
        <form className={styles.profileForm} onSubmit={save}>
          <header className={styles.sectionHead}>
            <div>
              <span className={styles.kicker}>基本信息</span>
              <h2>设置学生资料</h2>
              <p>姓名可以填写真实姓名，也可以填写平时使用的昵称。</p>
            </div>
          </header>

          <div className={styles.avatarPicker}>
            <span className={styles.label}>选择头像</span>
            <div className={styles.avatarGrid}>
              {STUDENT_AVATARS.map((avatar) => (
                <button
                  key={avatar.key}
                  type="button"
                  onClick={() => setAvatarKey(avatar.key)}
                  aria-pressed={avatarKey === avatar.key}
                  className={`${styles.avatarOption} ${avatarKey === avatar.key ? styles.selected : ""}`}
                >
                  <span>{avatar.emoji}</span>
                  <small>{avatar.label}</small>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fields}>
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
          </div>

          <div className={styles.accountMeta}>
            <div>
              <span>登录名</span>
              <strong>{user.username}</strong>
            </div>
            <div>
              <span>准考证号</span>
              <strong>{user.candidateNo}</strong>
            </div>
            <p>登录名和准考证号用于识别账号，学生本人不能在这里修改。</p>
          </div>

          {error && <div className="login-error">{error}</div>}
          {message && <div className={styles.successMessage}>{message}</div>}

          <div className={`student-edit-actions ${styles.actions}`}>
            <Link className="secondary-button" href="/student">取消</Link>
            <button
              className="primary-button"
              disabled={busy || !name.trim() || grade < 1 || grade > 13}
            >
              {busy ? "保存中…" : "保存资料"}
            </button>
          </div>
        </form>
      </section>

      <details className={styles.securityPanel}>
        <summary>
          <div>
            <span className={styles.securityIcon}>🔒</span>
            <div>
              <strong>账号安全</strong>
              <small>修改学生 PIN</small>
            </div>
          </div>
          <span className={styles.securityAction}>展开</span>
        </summary>

        <form className={styles.securityForm} onSubmit={changePin}>
          <p>需要先输入当前 PIN。修改后，其他设备上的旧登录会自动失效。</p>
          <div className={styles.pinFields}>
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
          </div>

          {pinError && <div className="login-error">{pinError}</div>}
          {pinMessage && <div className={styles.successMessage}>{pinMessage}</div>}

          <div className={styles.securityButtons}>
            <button
              className="primary-button"
              disabled={pinBusy || !currentPin || !newPin || !confirmPin}
            >
              {pinBusy ? "修改中…" : "修改 PIN"}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
