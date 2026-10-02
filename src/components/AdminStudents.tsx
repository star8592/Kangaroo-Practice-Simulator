"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import styles from "./AdminStudents.module.css";

type Row = {
  id: string;
  username: string;
  candidateNo: string;
  name: string;
  grade: number;
  school?: string;
  active: boolean;
  summary: {
    examAttempts: number;
    totalQuestions: number;
    accuracy: number;
    blank: number;
    medianQuestionSeconds: number;
    arithmeticSessions: number;
    priority: string;
  };
};

export default function AdminStudents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [pinEditing, setPinEditing] = useState<Row | null>(null);

  const load = () => fetch("/api/admin/students")
    .then((response) => response.json().then((data) => {
      if (!response.ok) throw new Error(data.error);
      setRows(data.students || []);
    }))
    .catch((e) => setError(String(e.message || e)));

  useEffect(() => { load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      form.reset();
      setShowCreate(false);
      setNotice("学生账号已创建。");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setError("");
    const response = await fetch("/api/admin/students", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "更新失败");
      return false;
    }
    await load();
    return true;
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const ok = await patch(editing.id, {
      name: formData.get("name"),
      grade: Number(formData.get("grade")),
      school: formData.get("school"),
    });
    if (ok) {
      setEditing(null);
      setNotice("学生资料已更新。");
    }
    setBusy(false);
  }

  async function resetPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pinEditing) return;
    const formData = new FormData(event.currentTarget);
    const pin = String(formData.get("pin") || "");
    const confirm = String(formData.get("confirm") || "");
    if (pin !== confirm) {
      setError("两次输入的新 PIN 不一致");
      return;
    }
    setBusy(true);
    setNotice("");
    const ok = await patch(pinEditing.id, { pin });
    if (ok) {
      setPinEditing(null);
      setNotice(`${pinEditing.name} 的 PIN 已重置。`);
    }
    setBusy(false);
  }

  function toggle(row: Row) {
    if (window.confirm(`${row.active ? "停用" : "启用"} ${row.name} 的账号？`)) {
      void patch(row.id, { active: !row.active });
    }
  }

  return (
    <div className={`admin-shell ${styles.shell}`}>
      <section className={styles.heading}>
        <div>
          <span className={styles.kicker}>学生管理</span>
          <h1>学生账号与学习画像</h1>
          <p>统一管理学生身份、正式模拟、计算训练和行为画像。</p>
        </div>
        <button className="primary-button" onClick={() => setShowCreate((value) => !value)}>
          {showCreate ? "收起" : "+ 创建学生"}
        </button>
      </section>

      {error && <div className="warning-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      {showCreate && (
        <form className={styles.createForm} onSubmit={create}>
          <input name="name" required placeholder="学生姓名" />
          <input name="username" required placeholder="登录用户名" />
          <input name="candidateNo" required placeholder="准考证号" />
          <input name="grade" type="number" min="1" max="13" required placeholder="年级" />
          <input name="school" placeholder="学校（可选）" />
          <input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,12}" required placeholder="初始 PIN" />
          <button className="primary-button" disabled={busy}>{busy ? "创建中…" : "创建账号"}</button>
        </form>
      )}

      {editing && (
        <form className={`report-card ${styles.editForm}`} onSubmit={saveEdit}>
          <div className={styles.formIntro}>
            <span className={styles.kicker}>学生资料</span>
            <h2>编辑 {editing.name}</h2>
            <p>{editing.candidateNo} · 登录名 {editing.username}</p>
          </div>
          <label><span>姓名</span><input name="name" required defaultValue={editing.name} /></label>
          <label><span>年级</span><input name="grade" type="number" min="1" max="13" required defaultValue={editing.grade} /></label>
          <label><span>学校（可选）</span><input name="school" defaultValue={editing.school || ""} /></label>
          <div className={styles.formActions}>
            <button type="button" className="secondary-button" onClick={() => setEditing(null)}>取消</button>
            <button className="primary-button" disabled={busy}>保存资料</button>
          </div>
        </form>
      )}

      {pinEditing && (
        <form className={`report-card ${styles.pinForm}`} onSubmit={resetPin}>
          <div className={styles.formIntro}>
            <span className={styles.kicker}>账号安全</span>
            <h2>重置 {pinEditing.name} 的 PIN</h2>
            <p>重置后，学生其他设备上的旧登录会自动失效。</p>
          </div>
          <label><span>新 PIN</span><input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,12}" required /></label>
          <label><span>再次输入</span><input name="confirm" type="password" inputMode="numeric" pattern="[0-9]{4,12}" required /></label>
          <div className={styles.formActions}>
            <button type="button" className="secondary-button" onClick={() => setPinEditing(null)}>取消</button>
            <button className="primary-button" disabled={busy}>确认重置</button>
          </div>
        </form>
      )}

      <section className={styles.tableCard}>
        <div className={`${styles.row} ${styles.head}`}>
          <span>学生</span><span>年级</span><span>正式模拟</span><span>正确率</span><span>计算</span><span>建议 / 操作</span>
        </div>
        {rows.map((row) => (
          <div className={`${styles.row} ${row.active ? "" : styles.disabled}`} key={row.id}>
            <span className={styles.studentCell}>
              <b>{row.name}</b>
              <small>{row.candidateNo} · {row.username}{row.active ? "" : " · 已停用"}</small>
            </span>
            <span>{row.grade}</span>
            <span>{row.summary.examAttempts} 套<small>{row.summary.totalQuestions} 题</small></span>
            <span>{row.summary.totalQuestions ? `${Math.round(row.summary.accuracy * 100)}%` : "—"}<small>空 {row.summary.blank}</small></span>
            <span>{row.summary.arithmeticSessions} 轮<small>{row.summary.medianQuestionSeconds ? `正式题中位 ${row.summary.medianQuestionSeconds.toFixed(1)}s` : ""}</small></span>
            <span className={styles.operationCell}>
              <b>{row.summary.priority}</b>
              <span className={styles.rowActions}>
                <Link href={`/admin/students/${row.id}`}>详细画像</Link>
                <button onClick={() => { setEditing(row); setPinEditing(null); }}>编辑资料</button>
                <button onClick={() => { setPinEditing(row); setEditing(null); }}>重置 PIN</button>
                <button onClick={() => toggle(row)}>{row.active ? "停用" : "启用"}</button>
              </span>
            </span>
          </div>
        ))}
        {rows.length === 0 && <div className={styles.empty}>还没有学生账号。</div>}
      </section>
    </div>
  );
}
