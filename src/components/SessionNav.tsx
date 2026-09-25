"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type U = {
  name: string;
  candidateNo: string;
  role?: "student" | "admin";
};

export default function SessionNav() {
  const router = useRouter();
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
  if (!user) return <Link href="/login">考生登录</Link>;

  return (
    <>
      {user.role === "admin" ? (
        <>
          <Link href="/admin/students">学生管理</Link>
          <Link href="/admin/questions">题库审核</Link>
        </>
      ) : (
        <>
          <Link href="/student">学习报告</Link>
          <Link href="/student/settings">我的资料</Link>
        </>
      )}
      <span className="nav-candidate">{user.name}</span>
      <button className="nav-logout" onClick={logout}>退出</button>
    </>
  );
}
