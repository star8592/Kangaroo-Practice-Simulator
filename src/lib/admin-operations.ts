import { loadUsers } from "@/lib/auth";
import type { ParentUser } from "@/lib/parent-auth";
import { readJsonArray, userDataPath } from "@/lib/user-data-store";

type Household = { parentId: string; studentIds: string[] };
export type AdminFamilyRow = {
  id: string;
  name: string;
  maskedEmail: string | null;
  signIn: "微信" | "邮箱";
  createdAt: number;
  lastLoginAt: number | null;
  linkedChildren: number;
  active: boolean;
};

export type AdminOperationsSnapshot = {
  totalFamilies: number;
  createdToday: number;
  loggedInLast7Days: number;
  neverLoggedInCount: number;
  studentProfiles: number;
  linkedChildren: number;
  families: AdminFamilyRow[];
  asOf: number;
};

const DAY_MS = 86_400_000;
const chinaDay = (at: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(at);

function validTime(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function maskAdminEmail(value: string | undefined): string | null {
  if (!value) return null;
  const [local, domain] = value.split("@");
  if (!local || !domain || !/^[A-Za-z0-9.-]+$/.test(domain)) return null;
  return local.slice(0, 1) + "***@" + domain;
}

/** Safe, read-only aggregate. Never returns passwords, raw WeChat IDs or tokens. */
export function adminOperationsSnapshot(now = Date.now()): AdminOperationsSnapshot {
  const parents = readJsonArray<ParentUser>(userDataPath("parents.json"));
  const households = readJsonArray<Household>(userDataPath("families.json"));
  const users = loadUsers().filter((u) => u.role === "student");
  const knownStudents = new Set(users.map((u) => u.id));
  const byParent = new Map<string, Set<string>>();
  for (const household of households) {
    if (!household?.parentId || !Array.isArray(household.studentIds)) continue;
    const existing = byParent.get(household.parentId) || new Set<string>();
    for (const id of household.studentIds) if (knownStudents.has(id)) existing.add(id);
    byParent.set(household.parentId, existing);
  }

  const families = parents.map((u): AdminFamilyRow => ({
    id: u.id,
    name: (u.name || "微信家长").slice(0, 60),
    maskedEmail: maskAdminEmail(u.email),
    signIn: u.wechatId || u.wechatOpenId ? "微信" : "邮箱",
    createdAt: validTime(u.createdAt) || 0,
    lastLoginAt: validTime(u.lastLoginAt),
    linkedChildren: byParent.get(u.id)?.size || 0,
    active: u.active !== false,
  })).sort((a, b) =>
    (b.lastLoginAt || b.createdAt) - (a.lastLoginAt || a.createdAt));

  const today = chinaDay(now);
  return {
    totalFamilies: families.length,
    createdToday: families.filter((u) => u.createdAt > 0 && chinaDay(u.createdAt) === today).length,
    // "7-day sign-ins" is NOT an online-user or all-activity count.
    loggedInLast7Days: families.filter((u) =>
      u.lastLoginAt !== null && u.lastLoginAt <= now && u.lastLoginAt >= now - 7 * DAY_MS).length,
    neverLoggedInCount: families.filter((u) => u.lastLoginAt === null).length,
    studentProfiles: users.length,
    linkedChildren: new Set([...byParent.values()].flatMap((s) => [...s])).size,
    families,
    asOf: now,
  };
}

export function filterAdminFamilies(rows: AdminFamilyRow[], query: string, page = 1, pageSize = 30) {
  const normalized = query.trim().toLowerCase().slice(0, 80);
  const matched = normalized ? rows.filter((r) =>
    [r.name, r.id, r.maskedEmail || ""].some((v) => v.toLowerCase().includes(normalized))) : rows;
  const currentPage = Math.max(1, Math.min(100_000, Math.floor(page) || 1));
  return {
    rows: matched.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    total: matched.length,
    page: currentPage,
    pages: Math.max(1, Math.ceil(matched.length / pageSize)),
  };
}
