/** Practice time is anchored to the server session start, never a locally reset timer. */
export function seamoRemainingSeconds(startedAt: number, durationSeconds: number, serverNow: number): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(durationSeconds) || !Number.isFinite(serverNow) || startedAt <= 0 || durationSeconds <= 0) return 0;
  return Math.max(0, Math.ceil((startedAt + durationSeconds * 1000 - serverNow) / 1000));
}
export function seamoClockLabel(seconds: number): string {
  const remaining = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${String(Math.floor(remaining / 60)).padStart(2,'0')}:${String(remaining % 60).padStart(2,'0')}`;
}
