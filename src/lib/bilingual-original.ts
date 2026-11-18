/** Only a deliberately opted-in historical paper uses simultaneous
 * Chinese translation + original English source. No effect on other exams.
 */
export function isStackedBilingualExam(
  profile?: { language?: string; paperType?: string } | null,
): boolean {
  return profile?.language === "zh-en-stacked" && profile.paperType === "past";
}

export function questionsPerDiagnosticPage(
  profile?: { language?: string; paperType?: string } | null,
): number {
  return isStackedBilingualExam(profile) ? 1 : 3;
}
