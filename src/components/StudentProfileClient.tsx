"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Student = {
  id: string;
  username: string;
  candidateNo: string;
  name: string;
  grade: number;
  school?: string;
};

export default function StudentProfileClient({ user }: { user: Student }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [grade, setGrade] = useState(user.grade);
  const [school, setSchool] = useState(user.school || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, grade, school }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败");
      setName(data.user.name);
      setGrade(data.user.grade);
      setSchool(data.user.school || "");
      setMessage("资料已保存。新的姓名和年级会用于后续训练与报告。");
      window.dispatchEvent(new Event("student-profile-updated"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
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
          <h1>我的资料</h1>
          <p>这里的信息用于考试、口算打印、学习报告和年级推荐。</p>
        </div>
        <div className="readiness-ring" aria-hidden="true">
          <strong>{(name.trim()[0] || "我").toUpperCase()}</strong>
          <span>{grade} 年级</span>
          <small>学生档案</small>
        </div>
      </section>

      <section className="report-card" style={{ maxWidth: 760, margin: "22px auto 0" }}>
        <form className="student-edit-form" onSubmit={save}>
          <div>
            <span className="eyebrow">EDIT PROFILE</span>
            <h2>设置自己的显示资料</h2>
            <p>姓名可以填写真实姓名，也可以填写平时使用的昵称。</p>
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
    </div>
  );
}
