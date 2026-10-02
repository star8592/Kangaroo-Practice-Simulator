"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./StudentProfileClient.module.css";
import { useSiteLanguage } from "@/lib/site-language";
import { DEFAULT_STUDENT_AVATAR,STUDENT_AVATARS,studentAvatarEmoji } from "@/lib/student-avatar";

type Student = {id:string;username:string;candidateNo:string;name:string;grade:number;school?:string;avatarKey?:string;onboardingCompleted?:boolean};

const UI={
 zh:{back:"← 返回学习报告",first:"第一次使用",confirm:"先确认一下你的资料",confirmDesc:"选头像、确认姓名和年级，保存后就可以开始训练。",profile:"个人资料",title:"我的学习档案",desc:"这些信息会用于考试、计算打印、学习报告和年级推荐。",preview:"当前学生资料预览",student:"学生档案",grade:"年级",basic:"基本信息",setup:"设置学生资料",setupDesc:"姓名可以填写真实姓名，也可以填写平时使用的昵称。",avatar:"选择头像",name:"姓名 / 昵称",namePlaceholder:"例如：可乐",school:"学校（可选）",optional:"可不填写",username:"登录名",candidate:"准考证号",meta:"登录名和准考证号用于识别账号，学生本人不能在这里修改。",cancel:"取消",saving:"保存中…",save:"保存资料",saved:"资料已保存，新的姓名、年级和头像已经生效。",saveFail:"保存失败",security:"账号安全",pinSub:"修改学生 PIN",expand:"展开",pinDesc:"需要先输入当前 PIN。修改后，其他设备上的旧登录会自动失效。",currentPin:"当前 PIN",newPin:"新 PIN（4–12 位数字）",confirmPin:"再次输入新 PIN",pinFormat:"新 PIN 必须为 4–12 位数字",pinMismatch:"两次输入的新 PIN 不一致",pinFail:"修改 PIN 失败",pinSaved:"PIN 已修改，当前设备保持登录，其他旧会话已失效。",pinBusy:"修改中…",pinSave:"修改 PIN"},
 en:{back:"← Back to learning report",first:"FIRST TIME",confirm:"Confirm your student profile",confirmDesc:"Choose an avatar, confirm your name and grade, then save to start training.",profile:"PROFILE",title:"My learning profile",desc:"These details are used for exams, printable calculation practice, learning reports and grade recommendations.",preview:"Current student profile preview",student:"Student profile",grade:"Grade",basic:"BASIC INFO",setup:"Student details",setupDesc:"Use your real name or the nickname you normally use.",avatar:"Choose avatar",name:"Name / nickname",namePlaceholder:"e.g. Alex",school:"School (optional)",optional:"Optional",username:"Login name",candidate:"Candidate ID",meta:"Login name and candidate ID identify the account and cannot be changed here by the student.",cancel:"Cancel",saving:"Saving…",save:"Save profile",saved:"Profile saved. Your name, grade and avatar are now updated.",saveFail:"Failed to save profile",security:"Account security",pinSub:"Change student PIN",expand:"Open",pinDesc:"Enter your current PIN first. After changing it, old sessions on other devices will be invalidated.",currentPin:"Current PIN",newPin:"New PIN (4–12 digits)",confirmPin:"Enter new PIN again",pinFormat:"New PIN must contain 4–12 digits",pinMismatch:"The two new PIN entries do not match",pinFail:"Failed to change PIN",pinSaved:"PIN changed. This device remains signed in; other old sessions are invalidated.",pinBusy:"Updating…",pinSave:"Change PIN"},
} as const;

export default function StudentProfileClient({ user, welcome = false }: { user: Student; welcome?: boolean }) {
  const router = useRouter();
  const lang=useSiteLanguage(),ui=UI[lang];
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
    event.preventDefault();setBusy(true);setMessage("");setError("");
    try {
      const response = await fetch("/api/auth/me", {method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({ name, grade, school, avatarKey })});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || ui.saveFail);
      setName(data.user.name);setGrade(data.user.grade);setSchool(data.user.school || "");setAvatarKey(data.user.avatarKey || DEFAULT_STUDENT_AVATAR);setMessage(ui.saved);
      window.dispatchEvent(new Event("student-profile-updated"));router.refresh();
    } catch (e) {setError(e instanceof Error ? e.message : String(e));} finally {setBusy(false);}
  }

  async function changePin(event: FormEvent) {
    event.preventDefault();setPinMessage("");setPinError("");
    if (!/^\d{4,12}$/.test(newPin)) {setPinError(ui.pinFormat);return;}
    if (newPin !== confirmPin) {setPinError(ui.pinMismatch);return;}
    setPinBusy(true);
    try {
      const response = await fetch("/api/auth/pin", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ currentPin, newPin })});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || ui.pinFail);
      setCurrentPin("");setNewPin("");setConfirmPin("");setPinMessage(ui.pinSaved);
    } catch (e) {setPinError(e instanceof Error ? e.message : String(e));} finally {setPinBusy(false);}
  }

  return <div className={`student-shell ${styles.shell}`}>
    <div className={styles.backRow}><Link className={styles.backLink} href="/student">{ui.back}</Link></div>
    {welcome && !user.onboardingCompleted && <section className={styles.welcomeNote}><span>{ui.first}</span><div><strong>{ui.confirm}</strong><p>{ui.confirmDesc}</p></div></section>}
    <section className={`student-hero ${styles.hero}`}><div className={styles.heroCopy}><span className="eyebrow">{ui.profile}</span><h1>{ui.title}</h1><p>{ui.desc}</p></div><div className={styles.profilePreview} aria-label={ui.preview}><span className={styles.previewAvatar}>{studentAvatarEmoji(avatarKey)}</span><div><strong>{name || ui.student}</strong><small>{lang==="zh"?`${grade} ${ui.grade}`:`${ui.grade} ${grade}`}{school ? ` · ${school}` : ""}</small></div></div></section>

    <section className={`report-card ${styles.profileCard}`}><form className={styles.profileForm} onSubmit={save}>
      <header className={styles.sectionHead}><div><span className={styles.kicker}>{ui.basic}</span><h2>{ui.setup}</h2><p>{ui.setupDesc}</p></div></header>
      <div className={styles.avatarPicker}><span className={styles.label}>{ui.avatar}</span><div className={styles.avatarGrid}>{STUDENT_AVATARS.map((avatar) => <button key={avatar.key} type="button" onClick={() => setAvatarKey(avatar.key)} aria-pressed={avatarKey === avatar.key} className={`${styles.avatarOption} ${avatarKey === avatar.key ? styles.selected : ""}`}><span>{avatar.emoji}</span><small>{avatar.label}</small></button>)}</div></div>
      <div className={styles.fields}>
        <label><span>{ui.name}</span><input required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder={ui.namePlaceholder}/></label>
        <label><span>{ui.grade}</span><input required type="number" min={1} max={13} value={grade} onChange={(e) => setGrade(Number(e.target.value))}/></label>
        <label><span>{ui.school}</span><input maxLength={80} value={school} onChange={(e) => setSchool(e.target.value)} placeholder={ui.optional}/></label>
      </div>
      <div className={styles.accountMeta}><div><span>{ui.username}</span><strong>{user.username}</strong></div><div><span>{ui.candidate}</span><strong>{user.candidateNo}</strong></div><p>{ui.meta}</p></div>
      {error && <div className="login-error">{error}</div>}{message && <div className={styles.successMessage}>{message}</div>}
      <div className={`student-edit-actions ${styles.actions}`}><Link className="secondary-button" href="/student">{ui.cancel}</Link><button className="primary-button" disabled={busy || !name.trim() || grade < 1 || grade > 13}>{busy ? ui.saving : ui.save}</button></div>
    </form></section>

    <details className={styles.securityPanel}><summary><div><span className={styles.securityIcon}>🔒</span><div><strong>{ui.security}</strong><small>{ui.pinSub}</small></div></div><span className={styles.securityAction}>{ui.expand}</span></summary>
      <form className={styles.securityForm} onSubmit={changePin}><p>{ui.pinDesc}</p><div className={styles.pinFields}>
        <label><span>{ui.currentPin}</span><input type="password" inputMode="numeric" autoComplete="current-password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 12))} required/></label>
        <label><span>{ui.newPin}</span><input type="password" inputMode="numeric" autoComplete="new-password" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 12))} required/></label>
        <label><span>{ui.confirmPin}</span><input type="password" inputMode="numeric" autoComplete="new-password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 12))} required/></label>
      </div>{pinError && <div className="login-error">{pinError}</div>}{pinMessage && <div className={styles.successMessage}>{pinMessage}</div>}<div className={styles.securityButtons}><button className="primary-button" disabled={pinBusy || !currentPin || !newPin || !confirmPin}>{pinBusy ? ui.pinBusy : ui.pinSave}</button></div></form>
    </details>
  </div>;
}
