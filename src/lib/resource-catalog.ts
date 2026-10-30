import type { ExamProfile } from "./types";

/**
 * Searchable metadata for existing training-ready exam bundles.
 *
 * This is not a sale catalogue. Passing the training-ready gate means the
 * paper can be attempted; it does not grant reproduction, commercial-use,
 * download or third-party redistribution rights.
 */
export type ResourceListing = Readonly<{
  id: string;
  titleZh: string;
  titleEn: string;
  competition: string;
  competitionZh: string;
  year: number | null;
  gradeBand: string | null;
  gradeZh: string;
  gradeEn: string;
  paperType: "past" | "sample" | "smart" | "practice" | "unspecified";
  questionCount: number;
  durationMinutes: number | null;
  examUrl: string;
}>;

const COMPETITIONS: Readonly<Record<string, string>> = {
  kangaroo: "袋鼠数学",
  "australian-amc": "澳洲 AMC",
  "maa-amc": "美国 AMC",
  cemc: "加拿大 CEMC",
  seamo: "SEAMO 新加坡数学",
};

const FORMATS = new Set(["past", "sample", "smart", "practice"]);

/** Only feed this function profiles returned by listTrainingExamProfiles(). */
export function buildTrainingResourceCatalog(profiles: readonly ExamProfile[]): ResourceListing[] {
  const seen = new Set<string>();
  const rows: ResourceListing[] = [];
  for (const p of profiles) {
    const id = p.id?.trim();
    if (!id || seen.has(id) || !Number.isSafeInteger(p.questionCount) || p.questionCount <= 0) continue;
    seen.add(id);
    rows.push({
      id,
      titleZh: p.nameZh?.trim() || p.name.trim(),
      titleEn: p.nameEn?.trim() || p.name.trim(),
      competition: p.competitionId || "other",
      competitionZh: COMPETITIONS[p.competitionId || ""] || "其他数学训练",
      year: Number.isSafeInteger(p.year) && (p.year || 0) > 1900 ? p.year! : null,
      gradeBand: p.gradeBand || null,
      gradeZh: p.gradesZh?.trim() || p.grades,
      gradeEn: p.gradesEn?.trim() || p.grades,
      paperType: FORMATS.has(p.paperType || "") ? p.paperType! : "unspecified",
      questionCount: p.questionCount,
      durationMinutes: Number.isFinite(p.durationSeconds) && p.durationSeconds > 0
        ? Math.ceil(p.durationSeconds / 60) : null,
      examUrl: `/exam/${encodeURIComponent(id)}`,
    });
  }
  return rows.sort((a, b) =>
    (b.year || 0) - (a.year || 0) ||
    a.competition.localeCompare(b.competition) ||
    a.id.localeCompare(b.id));
}

export type ResourceFilters = Readonly<{
  query?: string;
  competition?: string;
  gradeBand?: string;
  paperType?: ResourceListing["paperType"] | "";
}>;

export function filterTrainingResources(
  rows: readonly ResourceListing[],
  filters: ResourceFilters,
): ResourceListing[] {
  const query = (filters.query || "").trim().toLocaleLowerCase();
  return rows.filter(row => {
    if (filters.competition && row.competition !== filters.competition) return false;
    if (filters.gradeBand && row.gradeBand !== filters.gradeBand) return false;
    if (filters.paperType && row.paperType !== filters.paperType) return false;
    if (!query) return true;
    const haystack = [
      row.titleZh, row.titleEn, row.competitionZh,
      row.competition, row.gradeZh, row.gradeEn,
      row.year === null ? "" : String(row.year),
      row.id,
    ].join(" ").toLocaleLowerCase();
    return haystack.includes(query);
  });
}
