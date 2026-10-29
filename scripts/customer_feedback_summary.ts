import fs from "node:fs";
import path from "node:path";
import { userDataPath } from "../src/lib/user-data-store";
type FeedbackRow = { createdAt: string; category: string; rating?: number; examId: string; status: string };
const root = userDataPath("customer-feedback");
const days = Number(process.argv[2] || 14);
if (!Number.isInteger(days) || days < 1 || days > 365) throw Error("days must be 1..365");
const since = Date.now()-days*86400e3;
const result = {days,total:0,open:0,categories:{} as Record<string,number>,
  ratings:{} as Record<string,number>,exams:{} as Record<string,number>,malformed:0};
if (fs.existsSync(root)) {
  for (const u of fs.readdirSync(root)) {
    const p=path.join(root,u);
    if (!fs.statSync(p).isDirectory()) continue;
    for (const date of fs.readdirSync(p)) {
      if (Date.parse(date)+86400e3 < since) continue;
      const folder=path.join(p,date);
      for (const file of fs.readdirSync(folder)) {
        if (!file.endsWith(".json")) continue;
        try {
          const f=JSON.parse(fs.readFileSync(path.join(folder,file),"utf8")) as FeedbackRow;
          if (Date.parse(f.createdAt)<since) continue;
          result.total++;
          if (f.status==="open") result.open++;
          result.categories[f.category]=(result.categories[f.category]||0)+1;
          if (f.rating) result.ratings[f.rating]=(result.ratings[f.rating]||0)+1;
          result.exams[f.examId]=(result.exams[f.examId]||0)+1;
        } catch { result.malformed++; }
      }
    }
  }
}
console.log(JSON.stringify(result,null,2));
