/** A conservative mid-round signal. It does not assert long-term mastery. */
export type CheckedCalculation = { skillId: string; correct: boolean; reason: string };
export function canEndAdaptiveRound(
  checked: CheckedCalculation[],
  focusSkills: string[],
): boolean {
  if (checked.length < 8) return false;
  if (checked.slice(-6).some(x => !x.correct || x.reason !== 'correct')) return false;
  if (new Set(checked.map(x => x.skillId)).size < 2) return false;
  const risk = new Set([...focusSkills, ...checked.filter(x => !x.correct || x.reason !== 'correct').map(x => x.skillId)]);
  for (const id of risk) {
    const last = checked.filter(x => x.skillId === id).slice(-2);
    if (last.length < 2 || last.some(x => !x.correct || x.reason !== 'correct')) return false;
  }
  return true;
}
