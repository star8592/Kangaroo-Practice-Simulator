"use client";

import { FormEvent, useEffect, useState } from "react";
import { studentAvatarEmoji } from "@/lib/student-avatar";

type Student = {
  id: string;
  username: string;
  candidateNo: string;
  name: string;
  grade: number;
  school?: string;
  avatarKey?: string;
  active: boolean;
  lastLoginAt?: number;
  summary: {
    examAttempts: number;
    totalQuestions: number;
    accuracy: number | null;
    arithmeticSessions: number;
    latestExamAt: number | null;
  };
};

function relativeTime(value?: number | null) {
  if (!value) return "暂无记录";
  const delta = Date.now() - value;
  const day = 86400000;
  if (delta < 60000) return "刚刚";
  if (delta < 3600000) return `${Math.max(1, Math.floor(delta / 60000))} 分钟前`;
  if (delta < day) return `${Math.max(1, Math.floor(delta / 3600000))} 小时前`;
  if (delta < day * 14) return `${Math.max(1, Math.floor(delta / day))} 天前`;
  return new Date(value).toLocaleDateString("zh-CN");
}

export default function ParentDashboard() {
  const [rows, setRows] = useState<Student[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [pinStudent, setPinStudent] = useState<Student | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/family/students", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "加载失败");
      setRows(data.students || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/family/students", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "加载失败");
        return data.students || [];
      })
      .then((students) => {
        if (!cancelled) setRows(students);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/family/students", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "创建失败");
      form.reset();
      setShow(false);
      setNotice("孩子账号已创建，可以把登录名和 PIN 告诉孩子。");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    setNotice("");
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/family/students", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          name: formData.get("name"),
          grade: Number(formData.get("grade")),
          school: formData.get("school"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败");
      setEditing(null);
      setNotice("孩子资料已更新。");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function resetPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pinStudent) return;
    setBusy(true);
    setError("");
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const pin = String(formData.get("pin") || "");
    const confirm = String(formData.get("confirm") || "");

    if (pin !== confirm) {
      setError("两次输入的新 PIN 不一致");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/family/students", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: pinStudent.id, pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "重置失败");
      setPinStudent(null);
      setNotice("学生 PIN 已重置；孩子其他设备上的旧会话会自动失效。");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-shell">
      <section className="section-heading">
        <div>
          <span className="eyebrow">FAMILY CENTER</span>
          <h1>家庭与孩子账号</h1>
          <p>创建和管理孩子账号，同时查看最近是否登录、做过几套模拟和口算训练。</p>
        </div>
        <button className="primary-button" onClick={() => setShow((value) => !value)}>
          {show ? "收起" : "+ 添加孩子"}
        </button>
      </section>

      {error && <div className="warning-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      {show && (
        <form className="student-create-form" onSubmit={create}>
          <input name="name" required maxLength={50} placeholder="孩子姓名 / 昵称" />
          <input name="username" placeholder="学生登录名（留空自动生成）" />
          <input name="grade" type="number" min="1" max="13" required placeholder="年级" />
          <input name="school" maxLength={80} placeholder="学校（可选）" />
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4,12}"
            required
            placeholder="学生 PIN（4–12 位数字）"
          />
          <button className="primary-button" disabled={busy}>
            {busy ? "创建中…" : "创建孩子账号"}
          </button>
        </form>
      )}

      {editing && (
        <form className="student-edit-form report-card" onSubmit={saveEdit}>
          <div>
            <span className="eyebrow">EDIT STUDENT</span>
            <h2>编辑 {editing.name}</h2>
            <p>{editing.username} · {editing.candidateNo}</p>
          </div>
          <label>
            <span>姓名 / 昵称</span>
            <input name="name" required maxLength={50} defaultValue={editing.name} />
          </label>
          <label>
            <span>年级</span>
            <input name="grade" type="number" min="1" max="13" required defaultValue={editing.grade} />
          </label>
          <label>
            <span>学校（可选）</span>
            <input name="school" maxLength={80} defaultValue={editing.school || ""} />
          </label>
          <div className="student-edit-actions">
            <button type="button" className="secondary-button" onClick={() => setEditing(null)}>取消</button>
            <button className="primary-button" disabled={busy}>保存资料</button>
          </div>
        </form>
      )}

      {pinStudent && (
        <form className="student-edit-form report-card" onSubmit={resetPin}>
          <div>
            <span className="eyebrow">RESET STUDENT PIN</span>
            <h2>重置 {pinStudent.name} 的 PIN</h2>
            <p>不需要知道旧 PIN。重置后，孩子其他设备上的旧登录会失效。</p>
          </div>
          <label>
            <span>新 PIN</span>
            <input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,12}" required />
          </label>
          <label>
            <span>再次输入新 PIN</span>
            <input name="confirm" type="password" inputMode="numeric" pattern="[0-9]{4,12}" required />
          </label>
          <div className="student-edit-actions">
            <button type="button" className="secondary-button" onClick={() => setPinStudent(null)}>取消</button>
            <button className="primary-button" disabled={busy}>确认重置</button>
          </div>
        </form>
      )}

      <div className="family-grid">
        {rows.map((student) => {
          const summary = student.summary;
          const activityAt = Math.max(
            student.lastLoginAt || 0,
            summary.latestExamAt || 0,
          ) || null;

          return (
            <article className="report-card" key={student.id}>
              <span className="eyebrow">STUDENT</span>
              <h2>{studentAvatarEmoji(student.avatarKey)} {student.name}</h2>
              <p>{student.grade} 年级{student.school ? " · " + student.school : ""}</p>

              <div className="student-kpi-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", margin: "16px 0" }}>
                <article>
                  <span>正式模拟</span>
                  <strong>{summary.examAttempts}</strong>
                  <small>{summary.totalQuestions} 道题</small>
                </article>
                <article>
                  <span>累计正确率</span>
                  <strong>{summary.accuracy === null ? "—" : `${Math.round(summary.accuracy * 100)}%`}</strong>
                  <small>口算 {summary.arithmeticSessions} 轮</small>
                </article>
              </div>

              <p>
                <b>最近活动：</b>{relativeTime(activityAt)}<br />
                <b>最近登录：</b>{relativeTime(student.lastLoginAt)}<br />
                <b>登录名：</b>{student.username}<br />
                <b>准考证号：</b>{student.candidateNo}
              </p>

              <div className="student-edit-actions">
                <button className="secondary-button" onClick={() => { setEditing(student); setPinStudent(null); }}>
                  编辑资料
                </button>
                <button className="secondary-button" onClick={() => { setPinStudent(student); setEditing(null); }}>
                  重置 PIN
                </button>
              </div>
            </article>
          );
        })}

        {rows.length === 0 && (
          <div className="empty-state">
            还没有孩子账号。点击“添加孩子”创建第一个学生档案。
          </div>
        )}
      </div>
    </div>
  );
}
