import { atomicWriteJson, readJsonArray, userDataPath } from "./user-data-store";

export type CompetitionCompanionProgress = {
  userId: string;
  companionId: string;
  completedTaskIds: string[];
  updatedAt: number;
};

const FILE = userDataPath("competition-companion-progress.json");

export function getCompetitionCompanionProgress(userId: string, companionId: string) {
  return readJsonArray<CompetitionCompanionProgress>(FILE)
    .find((x) => x.userId === userId && x.companionId === companionId)
    || { userId, companionId, completedTaskIds: [], updatedAt: 0 };
}

export function setCompetitionCompanionTask(
  userId: string,
  companionId: string,
  taskId: string,
  completed: boolean,
) {
  const rows = readJsonArray<CompetitionCompanionProgress>(FILE);
  const index = rows.findIndex((x) => x.userId === userId && x.companionId === companionId);
  const current = index >= 0
    ? rows[index]
    : { userId, companionId, completedTaskIds: [], updatedAt: 0 };

  const completedTaskIds = new Set(current.completedTaskIds);
  if (completed) completedTaskIds.add(taskId);
  else completedTaskIds.delete(taskId);

  const next: CompetitionCompanionProgress = {
    userId,
    companionId,
    completedTaskIds: [...completedTaskIds],
    updatedAt: Date.now(),
  };

  if (index >= 0) rows[index] = next;
  else rows.push(next);

  atomicWriteJson(FILE, rows);
  return next;
}
