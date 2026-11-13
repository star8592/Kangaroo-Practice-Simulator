"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./AdminOperations.module.css";

type AdminLink = { href: string; label: string; glyph: string };
type AdminGroup = { title: string; links: AdminLink[] };
const groups: AdminGroup[] = [
  { title: "总览", links: [{ href: "/admin", label: "经营驾驶舱", glyph: "◫" }] },
  { title: "用户与教学", links: [
    { href: "/admin/families", label: "微信用户与家庭", glyph: "♧" },
    { href: "/admin/students", label: "学生与学习画像", glyph: "▤" },
    { href: "/admin/classroom", label: "英语课堂与教师", glyph: "▣" },
  ]},
  { title: "内容与服务", links: [
    { href: "/admin/questions", label: "题库检查", glyph: "▦" },
    { href: "/admin/competition-source-watch", label: "赛事来源审核", glyph: "◎" },
    { href: "/admin/feedback", label: "客户反馈", glyph: "◇" },
  ]},
  { title: "增长分析", links: [{ href: "/admin/seo", label: "搜索增长与收录", glyph: "⌕" }] },
];

export default function AdminOperationsNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = groups.flatMap(group => group.links).find(
    link => pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href + "/"))
  );
  return <aside className={styles.sidebar} data-admin-navigation aria-label="运营后台导航">
    <div className={styles.sidebarHead}>
      <span className={styles.sidebarBrand}>S</span>
      <div className={styles.sidebarIdentity}>
        <strong>SOC THINK</strong>
        <small>网站运营管理</small>
      </div>
      <button type="button" className={styles.navToggle} aria-expanded={open}
        aria-controls="admin-navigation-groups"
        onClick={() => setOpen(previous => !previous)}>
        {open ? "收起" : "菜单"} <span aria-hidden="true">{open ? "×" : "☰"}</span>
      </button>
    </div>
    <div className={styles.navGroups + (open ? " " + styles.navGroupsOpen : "")} id="admin-navigation-groups">
      <nav className={styles.nav} aria-label="后台功能模块">
        {groups.map(group => <div key={group.title} className={styles.navGroup}>
          <span className={styles.navGroupTitle}>{group.title}</span>
          {group.links.map(link => {
            const active = pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href + "/"));
            return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
              className={active ? styles.navActive : undefined} onClick={() => setOpen(false)}>
              <span className={styles.navGlyph} aria-hidden="true">{link.glyph}</span>
              <span>{link.label}</span>
              {active && <span className={styles.navCurrent} aria-hidden="true"/>}
            </Link>;
          })}
        </div>)}
      </nav>
      <div className={styles.sidebarFoot}>
        <span>当前位置</span><strong>{current?.label ?? "站点后台"}</strong>
        <Link href="/" onClick={() => setOpen(false)}>返回 SOC THINK 网站</Link>
      </div>
    </div>
  </aside>;
}
