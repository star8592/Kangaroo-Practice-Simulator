import { atomicWriteJson, readJsonArray, userDataPath } from "./user-data-store";
import { WORLD_COMPETITIONS } from "./world-competitions";

/** An interest is not an enrollment in a particular region or season. */
export type WorldCompetitionFollow = {
  userId: string;
  eventId: string;
  followedAt: number;
};
const FILE = userDataPath("world-competition-follows.json");
const known = new Set(WORLD_COMPETITIONS.map(x => x.id));

export function canFollowWorldCompetitions(user: {id:string;role:string}|null|undefined) {
  // Guest sessions look like student users internally; never persist their temporary IDs.
  return !!user && user.role === "student" && !user.id.startsWith("guest_");
}
export function getWorldCompetitionFollows(userId: string): WorldCompetitionFollow[] {
  return readJsonArray<WorldCompetitionFollow>(FILE)
    .filter(x => x.userId === userId && known.has(x.eventId));
}
export function setWorldCompetitionFollow(userId: string,eventId: string,following: boolean) {
  if(!known.has(eventId)) throw new Error("unknown world competition");
  const rows=readJsonArray<WorldCompetitionFollow>(FILE);
  const i=rows.findIndex(x=>x.userId===userId&&x.eventId===eventId);
  if(following && i<0) rows.push({userId,eventId,followedAt:Date.now()});
  if(!following && i>=0) rows.splice(i,1);
  // Idempotent changes preserve the first follow timestamp.
  if((following&&i<0)||(!following&&i>=0)) atomicWriteJson(FILE,rows);
  return {following,followedEventIds:rows.filter(x=>x.userId===userId&&known.has(x.eventId)).map(x=>x.eventId)};
}
