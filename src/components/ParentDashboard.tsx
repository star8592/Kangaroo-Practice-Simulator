"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { studentAvatarEmoji } from "@/lib/student-avatar";
import styles from "./ParentDashboard.module.css";

type AttentionItem = { milestone:{id:string;sessionId:string;start:string;titleZh:string}; event:{titleZh:string}; priority:string; daysUntil:number; reasonZh:string };

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
  attention?: { doNow: AttentionItem | null; next: AttentionItem[]; hiddenCount: number };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [pinStudent, setPinStudent] = useState<Student | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [showBind, setShowBind] = useState(false);

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
    fetch("/api/family/learner",{cache:"no-store"})
      .then(async r => r.ok ? r.json() : null)
      .then(x => {if(!cancelled && x)setActiveStudentId(x.activeStudentId||null)})
      .catch(()=>{});
    fetch("/api/family/students", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "加载失败");
        return data.students || [];
      })
      .then((students) => {
        if (!cancelled) {setRows(students);setLoading(false);}
      })
      .catch((e) => {
        if (!cancelled) {setError(e instanceof Error ? e.message : String(e));setLoading(false);}
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function selectLearner(studentId: string | null) {
    setBusy(true);
    setError("");
    try {
      const response=await fetch("/api/family/learner",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({studentId}),
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"切换失败");
      // Full navigation is needed to commit the new HttpOnly student cookie.
      window.location.assign("/arithmetic");
    }catch(e){
      setError(e instanceof Error?e.message:"切换失败，请重试");
      setBusy(false);
    }
  }

  async function bindStudent(event: FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);setError("");
    const formData=new FormData(event.currentTarget);
    try{
      const response=await fetch("/api/family/students/bind",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({username:formData.get("username"),pin:formData.get("pin")}),
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"关联失败");
      setShowBind(false);
      await load();
      await selectLearner(data.student.id);
    }catch(e){
      setError(e instanceof Error?e.message:"关联失败，请重试");
    }finally{setBusy(false)}
  }

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
      setNotice("孩子档案已经建立，正在进入孩子的计算训练。");
      await load();
      await selectLearner(data.student.id);
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
      <section className={styles.welcome} aria-label="家庭学习快捷入口">
        <div className={styles.welcomeCopy}>
          <span className={styles.welcomeEyebrow}>SOC THINK · 我的家庭</span>
          <h1>今天，我们练一点数学。</h1>
          <p>微信已经登录。选择孩子就能开始练习；第一次体验也不用建立账号或记住密码。</p>
          <div className={styles.welcomeActions}>
            <a href="/arithmetic" className={styles.welcomePrimary}>开始计算训练 <span aria-hidden="true">→</span></a>
            <Link href="/events" className={styles.welcomeSecondary}>看看数学赛事</Link>
          </div>
          <small>未选择孩子时使用独立家庭体验档案；为每个孩子建立档案后，训练与成绩就能分别记录。</small>
        </div>
        <div className={styles.welcomeVisual} aria-hidden="true">
          <div className={styles.mathTile}>12 <span>+</span> 8 <b>= 20</b></div>
          <div className={styles.mathDot}>π</div>
          <div className={styles.mathTip}>每天进步一点点</div>
        </div>
      </section>
      {rows.length > 0 && <section className={styles.learnerChooser} aria-label="选择今天练习的孩子">
        <div className={styles.learnerChooserHead}>
          <div><span className={styles.kicker}>今天谁来学习？</span><h2>点一下孩子的头像，直接开始</h2></div>
          <button type="button" className={styles.familyFallback} disabled={busy} onClick={()=>void selectLearner(null)}>先用家庭体验档案</button>
        </div>
        <div className={styles.learnerOptions}>
          {rows.filter(student=>student.active).map(student=><button type="button" key={student.id}
            className={styles.learnerOption} disabled={busy} onClick={()=>void selectLearner(student.id)}
            aria-label={"以"+student.name+"的身份开始计算训练"}>
            <span className={styles.learnerAvatar} aria-hidden="true">{studentAvatarEmoji(student.avatarKey)}</span>
            <span className={styles.learnerInfo}><strong>{student.name}</strong><small>{student.grade} 年级 · {student.summary.arithmeticSessions} 轮计算</small></span>
            <span className={styles.learnerArrow} aria-hidden="true">→</span>
            {activeStudentId===student.id && <span className={styles.learnerActive}>正在使用</span>}
          </button>)}
        </div>
        <p>每个孩子保留自己的正式训练记录；切换只影响当前浏览器，不会覆盖其他孩子的成绩。</p>
      </section>}
      <nav className={styles.quickPaths} aria-label="家庭学习服务">
        <a href="/arithmetic"><span className={styles.quickIcon}>✦</span><strong>数学训练</strong><small>选年级 · 立即练</small></a>
        <Link href="/competitions"><span className={styles.quickIcon}>◎</span><strong>竞赛模拟</strong><small>赛制和试卷</small></Link>
        <Link href="/events"><span className={styles.quickIcon}>▤</span><strong>赛事管家</strong><small>全球赛事 · 重要提醒</small></Link>
      </nav>
      <section className={styles.heading}>
        <div>
          <span className={styles.kicker}>学习档案管理</span>
          <h2>孩子的成长记录</h2>
          <p>新增孩子只需要昵称和年级；已有学生账号可以直接关联，保留原来成绩。</p>
        </div>
        <button className="secondary-button" onClick={() => setShow((value) => !value)}>
          {show ? "收起" : "+ 建立孩子档案（可稍后）"}
        </button>
      </section>

      {error && <div className="warning-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      {show && (
        <form className={styles.createForm} onSubmit={create} aria-label="添加孩子">
          <label><span>孩子怎么称呼？</span><input name="name" required maxLength={50} placeholder="例如：小可乐" /></label>
          <label><span>孩子上几年级？</span><input name="grade" type="number" min="1" max="13" required placeholder="例如：2" /></label>
          <details className={styles.learnerAdvanced}>
            <summary>更多资料（可稍后填写）</summary>
            <input name="school" maxLength={80} placeholder="学校（可选）" />
            <input name="username" placeholder="独立登录名（可选）" />
            <input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,12}" placeholder="独立登录 PIN（可选，4–12 位）" />
          </details>
          <button className="primary-button" disabled={busy}>
            {busy ? "正在建立…" : "建立档案并开始练习"}
          </button>
        </form>
      )}

      <section className={styles.bindExisting}>
        <button type="button" className="secondary-button" onClick={()=>setShowBind(x=>!x)}>{showBind?"取消关联":"已有学生账号？关联原来的成绩"}</button>
        {showBind && <form onSubmit={bindStudent} className={styles.bindForm} aria-label="关联已有学生账号">
          <p>只在第一次关联时输入原账号和 PIN。关联后家长微信登录，就能选择这个孩子继续原有的数学训练和模拟记录。</p>
          <label><span>原学生账号 / 准考证号</span><input name="username" required autoComplete="username" maxLength={128} /></label>
          <label><span>原学生 PIN</span><input name="pin" type="password" required pattern="[0-9]{4,12}" inputMode="numeric" autoComplete="current-password"/></label>
          <button className="primary-button" disabled={busy}>{busy?"正在核验…":"验证并关联"}</button>
        </form>}
      </section>

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

              {student.attention?.doNow && <div className={styles.attentionBox}>
                <span>现在最重要</span>
                <strong>{student.attention.doNow.milestone.titleZh}</strong>
                <small>{student.attention.doNow.event.titleZh} · {student.attention.doNow.reasonZh}</small>
                <div className={styles.enrollmentActions}>
                  <button onClick={async()=>{await fetch("/api/academic-events/enrollment",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({studentId:student.id,sessionId:student.attention!.doNow!.milestone.sessionId,state:"registered"})});await load()}}>已报名</button>
                  <button onClick={async()=>{await fetch("/api/academic-events/enrollment",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({studentId:student.id,sessionId:student.attention!.doNow!.milestone.sessionId,state:"planned"})});await load()}}>计划参加</button>
                  <button onClick={async()=>{await fetch("/api/academic-events/enrollment",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({studentId:student.id,sessionId:student.attention!.doNow!.milestone.sessionId,state:"closed"})});await load()}}>不参加</button>
                </div>
              </div>}

              <div className={styles.kpiGrid}>
                <article>
                  <span>正式模拟</span>
                  <strong>{summary.examAttempts}</strong>
                  <small>{summary.totalQuestions} 道题</small>
                </article>
                <article>
                  <span>累计正确率</span>
                  <strong>{summary.accuracy === null ? "—" : `${Math.round(summary.accuracy * 100)}%`}</strong>
                  <small>计算 {summary.arithmeticSessions} 轮</small>
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

        {loading && <div className={styles.empty} role="status">正在读取学习记录…</div>}
        {!loading && rows.length === 0 && (
          <div className={styles.empty}>
            <strong>还没有绑定孩子档案，也没关系。</strong>
            <p>先从上方的「开始计算训练」体验数学练习；需要分开保存多个孩子的成长报告时，再建立各自档案。</p>
            <button className="secondary-button" type="button" onClick={() => setShow(true)}>建立孩子档案</button>
          </div>
        )}
      </div>
    </div>
  );
}