"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { studentAvatarEmoji } from "@/lib/student-avatar";
import { useSiteLanguage } from "@/lib/site-language";
import styles from "./SiteHeader.module.css";

type StudentUser = {
  id?: string;
  name: string;
  candidateNo: string;
  avatarKey?: string;
  role?: "student" | "admin";
};

type ParentUser = {
  id?: string;
  name: string;
  email?: string;
  wechatId?: string;
  role: "parent";
};

type SessionState = {
  loaded: boolean;
  student: StudentUser | null;
  parent: ParentUser | null;
};

function Chevron() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7.5l5 5 5-5" /></svg>;
}

function MenuArrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4l6 6-6 6" /></svg>;
}

async function readSession<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    return (data?.user || null) as T | null;
  } catch {
    return null;
  }
}

export default function SessionNav() {
  const lang = useSiteLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionState>({
    loaded: false,
    student: null,
    parent: null,
  });

  const reloadSessions = useCallback(async () => {
    const [student, parent] = await Promise.all([
      readSession<StudentUser>("/api/auth/me"),
      readSession<ParentUser>("/api/auth/parent/me"),
    ]);
    setSessions({ loaded: true, student, parent });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void reloadSessions(), 0);
    window.addEventListener("student-profile-updated", reloadSessions);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("student-profile-updated", reloadSessions);
    };
  }, [reloadSessions, pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!sessions.loaded) {
    return <span className={styles.accountSkeleton} aria-label={lang === "zh" ? "正在读取账户" : "Loading account"} />;
  }

  if (!sessions.student && !sessions.parent) {
    return (
      <div className={styles.guestActions}>
        <Link className={styles.guestStudent} href="/login">
          {lang === "zh" ? "学生登录" : "Student"}
        </Link>
        <Link className={styles.guestParent} href="/parent/login">
          <span>{lang === "zh" ? "家长中心" : "Parent"}</span>
          <small>{lang === "zh" ? "微信扫码" : "WeChat"}</small>
        </Link>
      </div>
    );
  }

  const useParent = Boolean(sessions.parent && (pathname.startsWith("/parent") || !sessions.student));
  const active = useParent ? sessions.parent! : sessions.student!;
  const role = useParent ? "parent" : active.role === "admin" ? "admin" : "student";
  const roleLabel =
    role === "parent"
      ? (lang === "zh" ? "家长账号" : "Parent")
      : role === "admin"
        ? (lang === "zh" ? "管理员" : "Admin")
        : (lang === "zh" ? "学生账号" : "Student");

  const avatar =
    role === "parent" ? "家" :
    role === "admin" ? "管" :
    studentAvatarEmoji((active as StudentUser).avatarKey);

  const detail =
    role === "parent"
      ? ((active as ParentUser).email || ((active as ParentUser).wechatId ? (lang === "zh" ? "微信已连接" : "WeChat connected") : roleLabel))
      : role === "admin"
        ? roleLabel
        : ((active as StudentUser).candidateNo || roleLabel);

  const avatarClass = styles.accountAvatar + " " + styles["avatar_" + role];
  const avatarLargeClass = styles.accountAvatarLarge + " " + styles["avatar_" + role];
  const chevronClass = styles.chevron + (open ? " " + styles.chevronOpen : "");

  async function logout() {
    const endpoint = role === "parent" ? "/api/auth/parent/logout" : "/api/auth/logout";
    await fetch(endpoint, { method: "POST" }).catch(() => {});
    setOpen(false);
    await reloadSessions();
    router.push(role === "parent" ? "/parent/login" : "/login");
    router.refresh();
  }

  const close = () => setOpen(false);

  return (
    <div className={styles.accountRoot} ref={rootRef}>
      <button
        type="button"
        className={styles.accountTrigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={avatarClass}>{avatar}</span>
        <span className={styles.accountIdentity}>
          <strong>{active.name}</strong>
          <small>{roleLabel}</small>
        </span>
        <span className={chevronClass}><Chevron /></span>
      </button>

      {open && (
        <div className={styles.accountMenu} role="menu">
          <div className={styles.accountSummary}>
            <span className={avatarLargeClass}>{avatar}</span>
            <div>
              <strong>{active.name}</strong>
              <span>{detail}</span>
            </div>
          </div>

          <div className={styles.accountMenuLinks}>
            {role === "parent" && (
              <Link href="/parent" onClick={close} role="menuitem">
                <span><b>{lang === "zh" ? "家长中心" : "Parent center"}</b><small>{lang === "zh" ? "管理孩子账号与学习报告" : "Children and reports"}</small></span>
                <MenuArrow />
              </Link>
            )}

            {role === "student" && (
              <>
                <Link href="/student" onClick={close} role="menuitem">
                  <span><b>{lang === "zh" ? "学习报告" : "Learning report"}</b><small>{lang === "zh" ? "查看能力画像与训练建议" : "Progress and recommendations"}</small></span>
                  <MenuArrow />
                </Link>
                <Link href="/student/calendar" onClick={close} role="menuitem">
                  <span><b>{lang === "zh" ? "学习日历" : "Learning calendar"}</b><small>{lang === "zh" ? "赛事与学习安排" : "Schedule and competitions"}</small></span>
                  <MenuArrow />
                </Link>
                <Link href="/student/settings" onClick={close} role="menuitem">
                  <span><b>{lang === "zh" ? "账号与资料" : "Profile & account"}</b><small>{lang === "zh" ? "头像、姓名、学校与 PIN" : "Profile and PIN"}</small></span>
                  <MenuArrow />
                </Link>
              </>
            )}

            <Link href={role === "parent" ? "/membership?identity=parent" : "/membership"} onClick={close} role="menuitem">
              <span><b>{lang === "zh" ? "会员权益与权限" : "Membership access"}</b>
              <small>{lang === "zh" ? "了解免费功能与高级服务" : "Free and advanced features"}</small></span>
              <MenuArrow />
            </Link>

            {role === "admin" && (
              <>
                <Link href="/admin/students" onClick={close} role="menuitem">
                  <span><b>{lang === "zh" ? "学生管理" : "Student admin"}</b><small>{lang === "zh" ? "账号与学习数据" : "Accounts and learning data"}</small></span>
                  <MenuArrow />
                </Link>
                <Link href="/admin/questions" onClick={close} role="menuitem">
                  <span><b>{lang === "zh" ? "题库审核" : "Question review"}</b><small>{lang === "zh" ? "题目与内容质量" : "Question quality"}</small></span>
                  <MenuArrow />
                </Link>
              </>
            )}
          </div>

          <div className={styles.accountSwitch}>
            {role !== "parent" && (
              <Link href="/parent" onClick={close}>
                {sessions.parent
                  ? (lang === "zh" ? "切换到家长中心" : "Switch to parent center")
                  : (lang === "zh" ? "家长登录" : "Parent login")}
              </Link>
            )}
            {role === "parent" && (
              <Link href={sessions.student ? "/student" : "/login"} onClick={close}>
                {sessions.student
                  ? (lang === "zh" ? "切换到学生端" : "Switch to student")
                  : (lang === "zh" ? "学生登录" : "Student login")}
              </Link>
            )}
            <button type="button" onClick={logout}>
              {lang === "zh" ? "退出当前账号" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
