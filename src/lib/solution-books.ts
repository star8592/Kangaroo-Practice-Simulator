export type SolutionBook = {
  id: string;
  labelZh: string;
  labelEn: string;
  pageBaseUrl: string;
  totalPages: number;
  year?: number;
  questionPages?: Record<number, number[]>;
  noteZh?: string;
  noteEn?: string;
};

const BOOKS: Record<string, SolutionBook> = {
  "maa-amc8-2024-user-owned": {
    id: "amc8-2024-zh",
    labelZh: "2024 AMC8 中文解析",
    labelEn: "2024 AMC 8 Chinese Solutions",
    pageBaseUrl: "/local-assets/maa-amc/solutions/amc8-2024-zh/page-",
    totalPages: 22,
    year: 2024,
    questionPages: {
      1:[1], 2:[1], 3:[2], 4:[3], 5:[3], 6:[4], 7:[5], 8:[6], 9:[6],
      10:[7], 11:[7], 12:[8], 13:[9], 14:[10], 15:[11], 16:[12], 17:[13],
      18:[14], 19:[15], 20:[16], 21:[17], 22:[18], 23:[19], 24:[20], 25:[21,22]
    },
    noteZh: "原始扫描解析已接入，并完成 Q1–Q25 逐题页码校验。",
    noteEn: "Original scanned solutions are available with verified Q1–Q25 page mapping."
  }
};

const HISTORICAL_PAGE_COUNTS: Record<number, number> = {
  2000:12, 2001:8, 2002:9, 2003:10, 2004:9, 2005:10, 2006:8, 2007:9,
  2008:9, 2009:9, 2010:9, 2011:10, 2012:9, 2013:10, 2014:9, 2015:11,
  2016:10, 2017:11, 2018:9, 2019:11, 2020:12, 2022:13
};

for (const entry of Object.entries(HISTORICAL_PAGE_COUNTS)) {
  const year = Number(entry[0]);
  const totalPages = entry[1];
  BOOKS["maa-amc8-" + year + "-user-owned"] = {
    id: "amc8-" + year + "-zh",
    labelZh: year + " AMC8 中文解析",
    labelEn: year + " AMC 8 Chinese Solutions",
    pageBaseUrl: "/local-assets/maa-amc/solutions/amc8-history-zh/" + year + "/page-",
    totalPages,
    year,
    noteZh: "本年份原始扫描解析已完成分册校验；逐题页码尚未达到可靠阈值，因此只提供整年解析册，不猜题号。",
    noteEn: "This year's original scanned solutions are verified as a complete section. Per-question pages are hidden until mapping reaches the verification threshold."
  };
}

export function solutionBookForExam(examId?: string): SolutionBook | undefined {
  return examId ? BOOKS[examId] : undefined;
}
export function solutionBookPageUrl(book: SolutionBook, page: number) {
  const safe = Math.max(1, Math.min(book.totalPages, Math.trunc(page) || 1));
  return book.pageBaseUrl + String(safe).padStart(2, "0") + ".jpg";
}
export function verifiedPagesForQuestion(book: SolutionBook, questionNo: number) {
  return book.questionPages?.[questionNo] ?? [];
}
export function hasExactQuestionMapping(book: SolutionBook) {
  return !!book.questionPages && Object.keys(book.questionPages).length === 25;
}
