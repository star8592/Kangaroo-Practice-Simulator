import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] ?? "questions";

interface ReportItem {
  file: string;
  hasEn: boolean;
  hasZh: boolean;
  hasSolution: boolean;
}

const result: ReportItem[] = [];

function walk(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".json")) scan(full);
  }
}

function scan(file: string) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    result.push({
      file,
      hasEn: Boolean(data?.localized?.en || data?.language?.en || data?.question?.en),
      hasZh: Boolean(data?.localized?.zh || data?.language?.zh || data?.question?.zh),
      hasSolution: Boolean(data?.solution || data?.localized?.zh?.solution),
    });
  } catch {
    // Ignore non-question JSON files
  }
}

walk(ROOT);

const report = {
  generatedAt: new Date().toISOString(),
  total: result.length,
  missingChinese: result.filter((x) => !x.hasZh).length,
  items: result,
};

fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/language-status.json", JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
