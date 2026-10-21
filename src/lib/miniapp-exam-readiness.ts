import type { ExamProfile, PublicQuestion } from './types';
import {statSync} from 'node:fs';
import path from 'node:path';

/** SEAMO is released to native WeChat only when the entire revised bilingual audio corpus is available. */
export function seamoTrackAvailable(url: string): boolean {
  if (!/^\/exam-read-aloud\/v1\/(zh|en)-[a-f0-9]{64}\.mp3$/.test(url)) return false;
  try { return statSync(path.join(process.cwd(), 'public', url)).size > 1024; }
  catch { return false; }
}

export function canOpenSeamoNative(profile: Pick<ExamProfile,'id'|'competitionId'|'paperType'|'durationSeconds'|'questionCount'|'timingSections'>, questions: Pick<PublicQuestion,'readingAudioZh'|'readingAudioEn'>[], trackAvailable: (url: string)=>boolean = seamoTrackAvailable): boolean {
  if (profile.competitionId !== 'seamo' || profile.paperType !== 'practice') return false;
  const grade = /^seamo-original-g([12])-revised-1$/.exec(profile.id)?.[1];
  if (!grade) return false;
  if (profile.timingSections?.length) return false;
  if (profile.durationSeconds !== (grade === '1' ? 2400 : 5400) || profile.questionCount !== (grade === '1' ? 15 : 25)) return false;
  return questions.length === profile.questionCount && questions.every(q =>
    /^\/exam-read-aloud\/v1\/zh-[a-f0-9]{64}\.mp3$/.test(q.readingAudioZh || '') &&
    /^\/exam-read-aloud\/v1\/en-[a-f0-9]{64}\.mp3$/.test(q.readingAudioEn || '') &&
    trackAvailable(q.readingAudioZh || '') && trackAvailable(q.readingAudioEn || '')
  );
}
