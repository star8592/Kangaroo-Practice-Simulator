import fs from "node:fs";
import path from "node:path";
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from "@/lib/customer-feedback";
import { userDataPath } from "@/lib/user-data-store";

export type FeedbackQueueItem = {
  id: string;
  createdAt: string;
  examId: string;
  questionId?: string;
  category: FeedbackCategory;
  rating?: number;
  message: string;
  source: "result" | "review";
};

export type CustomerFeedbackOverview = {
  total: number;
  unreadable: number;
  highPriority: number;
  categories: Record<FeedbackCategory, number>;
  items: FeedbackQueueItem[];
  days: number;
  truncated: boolean;
};
const ROOT_USER = /^[0-9a-f]{32}$/;
const ROOT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ROOT_FILE = /^[0-9a-f]{32}\.json$/;
const priority = (category: FeedbackCategory) =>
  category === "question_error" ? 0 : category === "report_inaccurate" ? 1 :
  category === "solution_unclear" ? 2 : category === "usability" ? 3 : 4;

function maskSensitiveText(message: string): string {
  return message
    .replace(/\b1[3-9]\d{9}\b/g, "[手机号已隐藏]")
    .replace(/\b\d{17}[\dXx]\b/g, "[证件号码已隐藏]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g, "[电子邮箱已隐藏]")
    .slice(0, 400);
}

// Admin-only. Never send names, user IDs, login tokens or raw identifiers to a public endpoint.
export function readCustomerFeedbackOverview(options: {
  root?: string;
  days?: number;
  limit?: number;
  now?: number;
} = {}): CustomerFeedbackOverview {
  const root = options.root ?? userDataPath("customer-feedback");
  const days = options.days ?? 30;
  const limit = options.limit ?? 100;
  if (!Number.isInteger(days) || days < 1 || days > 365 ||
      !Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("Invalid feedback overview range");
  }
  const cutoff = (options.now ?? Date.now()) - days * 86400_000;
  const categories = Object.fromEntries(FEEDBACK_CATEGORIES.map(c => [c, 0])) as Record<FeedbackCategory, number>;
  const result: CustomerFeedbackOverview = {
    total: 0, unreadable: 0, highPriority: 0, categories, items: [], days, truncated: false,
  };
  if (!fs.existsSync(root)) return result;
  const queue: FeedbackQueueItem[] = [];
  for (const userDir of fs.readdirSync(root).filter(x => ROOT_USER.test(x))) {
    const userPath = path.join(root, userDir);
    if (!fs.lstatSync(userPath).isDirectory() || fs.lstatSync(userPath).isSymbolicLink()) continue;
    for (const day of fs.readdirSync(userPath).filter(x => ROOT_DATE.test(x))) {
      if (Date.parse(day) + 86400_000 <= cutoff) continue;
      const dayPath = path.join(userPath, day);
      if (!fs.lstatSync(dayPath).isDirectory() || fs.lstatSync(dayPath).isSymbolicLink()) continue;
      for (const file of fs.readdirSync(dayPath).filter(x => ROOT_FILE.test(x))) {
        try {
          const filePath = path.join(dayPath, file);
          const stat = fs.lstatSync(filePath);
          if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) {
            result.unreadable++;
            continue;
          }
          const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
          if (raw.schemaVersion !== 1 || typeof raw.createdAt !== "string" ||
              !Number.isFinite(Date.parse(raw.createdAt)) || Date.parse(raw.createdAt) <= cutoff ||
              raw.id !== file.slice(0, 32) || typeof raw.examId !== "string" ||
              !/^[A-Za-z0-9_:./-]{1,150}$/.test(raw.examId) ||
              !(FEEDBACK_CATEGORIES as readonly string[]).includes(String(raw.category))) {
            result.unreadable++;
            continue;
          }
          const category = raw.category as FeedbackCategory;
          const item: FeedbackQueueItem = {
            id: file.slice(0, 32),
            createdAt: raw.createdAt,
            examId: raw.examId,
            category,
            ...(typeof raw.questionId === "string" ? { questionId: raw.questionId.slice(0, 150) } : {}),
            ...(typeof raw.rating === "number" && raw.rating >= 1 && raw.rating <= 5
              ? { rating: raw.rating } : {}),
            message: maskSensitiveText(typeof raw.message === "string" ? raw.message : ""),
            source: raw.source === "review" ? "review" : "result",
          };
          result.total++;
          categories[category]++;
          if (category === "question_error" || category === "report_inaccurate") result.highPriority++;
          queue.push(item);
        } catch {
          result.unreadable++;
        }
      }
    }
  }
  queue.sort((a, b) => priority(a.category) - priority(b.category) ||
    b.createdAt.localeCompare(a.createdAt));
  result.truncated = queue.length > limit;
  result.items = queue.slice(0, limit);
  return result;
}
