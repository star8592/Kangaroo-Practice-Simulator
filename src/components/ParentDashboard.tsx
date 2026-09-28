"use client";

import { FormEvent, useEffect, useState } from "react";
import { studentAvatarEmoji } from "@/lib/student-avatar";
import styles from "./ParentDashboard.module.css";

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
  recentReports: Array<{
    attemptId: string;
    examId: string;
    examName: string;
    submittedAt: number;
    scorePct: number;
    accuracy: number;
  }>;
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
    <div className={`admin-shell ${styles.shell}`}>
      <section className={styles.heading}>
        <div>
          <span className={styles.kicker}>家庭中心</span>
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
        <form className={styles.createForm} onSubmit={create}>
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
        <form className={`report-card ${styles.formCard}`} onSubmit={saveEdit}>
          <div>
            <span className={styles.kicker}>学生资料</span>
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
          <div className={styles.actions}>
            <button type="button" className="secondary-button" onClick={() => setEditing(null)}>取消</button>
            <button className="primary-button" disabled={busy}>保存资料</button>
          </div>
        </form>
      )}

      {pinStudent && (
        <form className={`report-card ${styles.formCard}`} onSubmit={resetPin}>
          <div>
            <span className={styles.kicker}>账号安全</span>
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
          <div className={styles.actions}>
            <button type="button" className="secondary-button" onClick={() => setPinStudent(null)}>取消</button>
            <button className="primary-button" disabled={busy}>确认重置</button>
          </div>
        </form>
      )}

      <div className={styles.familyGrid}>
        {rows.map((student) => {
          const summary = student.summary;
          const activityAt = Math.max(
            student.lastLoginAt || 0,
            summary.latestExamAt || 0,
          ) || null;

          return (
            <article className={`report-card ${styles.studentCard}`} key={student.id}>
              <span className={styles.kicker}>学生档案</span>
              <h2>{studentAvatarEmoji(student.avatarKey)} {student.name}</h2>
              <p>{student.grade} 年级{student.school ? " · " + student.school : ""}</p>

              <div className={styles.kpiGrid}>
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

              {student.recentReports?.length > 0 && (
                <div className={styles.reportList}>
                  <div className={styles.reportListHead}>
                    <strong>最近考试</strong>
                    <span>点击查看单次诊断</span>
                  </div>
                  {student.recentReports.slice(0, 3).map((report) => (
                    <a className={styles.reportRow} key={report.attemptId} href={`/parent/report/${student.id}/${report.attemptId}`}>
                      <span>
                        <b>{report.examName}</b>
                        <small>{new Date(report.submittedAt).toLocaleDateString("zh-CN")}</small>
                      </span>
                      <strong>{Math.round(report.scorePct * 100)}%</strong>
                      <em>诊断 →</em>
                    </a>
                  ))}
                </div>
              )}

              <div className={styles.studentMeta}>
                <div><span>最近活动</span><strong>{relativeTime(activityAt)}</strong></div>
                <div><span>最近登录</span><strong>{relativeTime(student.lastLoginAt)}</strong></div>
                <div><span>登录名</span><strong>{student.username}</strong></div>
                <div><span>准考证号</span><strong>{student.candidateNo}</strong></div>
              </div>

              <div className={styles.actions}>
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
          <div className={styles.empty}>
            还没有孩子账号。点击“添加孩子”创建第一个学生档案。
          </div>
        )}
      </div>
    </div>
  );
}