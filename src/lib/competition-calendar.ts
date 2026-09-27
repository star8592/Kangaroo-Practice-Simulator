export type CalendarLang = "zh" | "en";
export type CalendarCompetitionId = "kangaroo" | "australian-amc" | "maa-amc" | "cemc";
export type CalendarGradeBand = "1-2" | "3-4" | "5-6" | "7-8" | "9-10" | "11+";

export type CompetitionCalendarEvent = {
  id: string;
  competitionId: CalendarCompetitionId;
  stageIds?: string[];
  gradeBands?: CalendarGradeBand[];
  titleZh: string;
  titleEn: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  scopeZh?: string;
  scopeEn?: string;
  sourceUrl: string;
  verifiedOn: string;
};

// Keep this deliberately small: only dates confirmed by an organizer are listed.
// Regional competitions are omitted until the relevant region/date is unambiguous.
export const COMPETITION_CALENDAR: CompetitionCalendarEvent[] = [
  {
    id: "maa-amc-10-12-a-2026",
    competitionId: "maa-amc",
    stageIds: ["maa-amc10", "maa-amc12"],
    titleZh: "AMC 10 / 12 A",
    titleEn: "AMC 10 / 12 A",
    startDate: "2026-11-05",
    sourceUrl: "https://maa.org/amcreg/",
    verifiedOn: "2026-09-27",
  },
  {
    id: "maa-amc-10-12-b-2026",
    competitionId: "maa-amc",
    stageIds: ["maa-amc10", "maa-amc12"],
    titleZh: "AMC 10 / 12 B",
    titleEn: "AMC 10 / 12 B",
    startDate: "2026-11-13",
    sourceUrl: "https://maa.org/amcreg/",
    verifiedOn: "2026-09-27",
  },
  {
    id: "maa-amc8-2027",
    competitionId: "maa-amc",
    stageIds: ["maa-amc8"],
    titleZh: "AMC 8",
    titleEn: "AMC 8",
    startDate: "2027-01-21",
    endDate: "2027-01-27",
    sourceUrl: "https://maa.org/amcreg/",
    verifiedOn: "2026-09-27",
  },
  {
    id: "maa-aime-2027",
    competitionId: "maa-amc",
    stageIds: ["maa-aime"],
    titleZh: "AIME",
    titleEn: "AIME",
    startDate: "2027-02-05",
    endDate: "2027-02-06",
    sourceUrl: "https://maa.org/amcreg/",
    verifiedOn: "2026-09-27",
  },
  {
    id: "cemc-pcf-2027-onsa",
    competitionId: "cemc",
    gradeBands: ["9-10", "11+"],
    titleZh: "Pascal / Cayley / Fermat",
    titleEn: "Pascal / Cayley / Fermat",
    startDate: "2027-02-24",
    endDate: "2027-02-25",
    scopeZh: "北美、南美以外赛区",
    scopeEn: "Outside North & South America",
    sourceUrl: "https://cemc.uwaterloo.ca/contests/pcf",
    verifiedOn: "2026-09-27",
  },
  {
    id: "cemc-euclid-2027-onsa",
    competitionId: "cemc",
    gradeBands: ["11+"],
    titleZh: "Euclid",
    titleEn: "Euclid",
    startDate: "2027-04-07",
    scopeZh: "北美、南美以外赛区",
    scopeEn: "Outside North & South America",
    sourceUrl: "https://cemc.uwaterloo.ca/contests/euclid",
    verifiedOn: "2026-09-27",
  },
  {
    id: "cemc-gauss-2027-onsa",
    competitionId: "cemc",
    gradeBands: ["7-8"],
    titleZh: "Gauss",
    titleEn: "Gauss",
    startDate: "2027-05-10",
    endDate: "2027-05-21",
    scopeZh: "北美、南美以外赛区",
    scopeEn: "Outside North & South America",
    sourceUrl: "https://cemc.uwaterloo.ca/contests",
    verifiedOn: "2026-09-27",
  },
];

function dateNumber(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function localDateKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function calendarDaysUntil(startDate: string, today: string) {
  return Math.max(0, dateNumber(startDate) - dateNumber(today));
}

export function nextCompetitionEvent(input: {
  competitionId: CalendarCompetitionId;
  today: string;
  stageId?: string;
  gradeBand?: CalendarGradeBand;
}) {
  return COMPETITION_CALENDAR
    .filter((event) => event.competitionId === input.competitionId)
    .filter((event) => !input.stageId || !event.stageIds || event.stageIds.includes(input.stageId))
    .filter((event) => !input.gradeBand || !event.gradeBands || event.gradeBands.includes(input.gradeBand))
    .filter((event) => (event.endDate || event.startDate) >= input.today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] || null;
}

export function competitionEventDateLabel(event: CompetitionCalendarEvent, lang: CalendarLang) {
  const format = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    return lang === "zh" ? `${y}年${m}月${d}日` : `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };
  return event.endDate && event.endDate !== event.startDate
    ? `${format(event.startDate)}–${format(event.endDate).replace(/^\d{4}年/, "")}`
    : format(event.startDate);
}
