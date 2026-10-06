"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { studentAvatarEmoji } from "@/lib/student-avatar";
import { useSiteLanguage } from "@/lib/site-language";

type U = {
  name: string;
  candidateNo: string;
  avatarKey?: string;
  role?: "student" | "admin";
};

export default function SessionNav() {
  const router = useRouter();
  const lang = useSiteLanguage();
  const [user, setUser] = useState<U | null | undefined>(undefined);

  const reloadUser = useCallback(() => {
    fetch("/api/auth/me")
      .then(async (response) => (response.ok ? (await response.json()).user : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    reloadUser();
    window.addEventListener("student-profile-updated", reloadUser);
    return () => window.removeEventListener("student-profile-updated", reloadUser);
  }, [reloadUser]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  if (user === undefined) return <span className="nav-session">…</span>;
  if (!user) return (
    <>
      <Link className="nav-parent-login" href="/parent/login">{lang==="zh"?"家长登录":"Parent login"}</Link>
      <Link className="nav-student-login" href="/login">{lang==="zh"?"学生登录":"Student login"}</Link>
    </>
  );

  return (
    <>
      {user.role === "admin" ? (
        <>
          <Link href="/admin/students">{lang==="zh"?"学生管理":"Students"}</Link>
          <Link href="/admin/questions">{lang==="zh"?"题库审核":"Question review"}</Link>
        </>
      ) : (
        <>
          <a href="/student">{lang==="zh"?"学习报告":"Learning report"}</a>
          <Link href="/student/settings">{lang==="zh"?"我的资料":"Profile"}</Link>
        </>
      )}
      <span className="nav-candidate">
        {user.role === "student" ? `${studentAvatarEmoji(user.avatarKey)} ` : ""}
        {user.name}
      </span>
      <button className="nav-logout" onClick={logout}>{lang==="zh"?"退出":"Sign out"}</button>
    </>
  );
}
