import assert from "node:assert/strict";
import { listExamProfiles, loadExamBundle, isExamBundleStudentReady } from "../src/lib/question-bank";
import { listTrainingExamProfiles, loadTrainingExamBundle, trainingQuestions } from "../src/lib/training-question-bank";
import { gradeExam } from "../src/lib/grading";

const publicProfiles = listExamProfiles();
const trainingProfiles = listTrainingExamProfiles();
for (const [grade, count, minutes] of [[1, 15, 40], [2, 25, 90]]) {
  const id = `seamo-original-g${grade}-revised-1`;
  const legacyId = `seamo-original-g${grade}-mock-1`;
  assert(!publicProfiles.some(p => p.id === legacyId), "superseded paper should not be in new-user catalog");
  assert(!trainingProfiles.some(p => p.id === legacyId), "superseded paper should not be in training catalog");
  assert.equal(loadTrainingExamBundle(legacyId).profile.id, legacyId, "historical attempts must remain readable");
  assert(publicProfiles.some(p => p.id === id));
  assert(trainingProfiles.some(p => p.id === id));
  const b = loadTrainingExamBundle(id);
  assert.equal(loadExamBundle(id).profile.competitionId, "seamo");
  assert(isExamBundleStudentReady(b));
  assert.equal(b.profile.paperType, "practice");
  assert.equal(b.profile.questionCount, count);
  assert.equal(b.profile.durationSeconds, minutes * 60);
  assert.equal(b.questions.length, count);
  assert.equal(new Set(b.questions.map(q => q.stem)).size, count, "revised paper must have unique questions");
  assert.equal(new Set(b.questions.map(q => q.stemEn)).size, count, "revised English questions must be unique");
  const visible = trainingQuestions(b.questions);
  assert.equal(visible.length, count);
  assert(visible.every(q => !("answer" in q) && !("solution" in q)));
  const numeric = b.questions.find(q => q.answerMode === "integer");
  if (numeric) {
    const withAudio = trainingQuestions([{...numeric, readingAudioEn: "/exam-read-aloud/v1/test-english.mp3"}]);
    assert.equal(withAudio[0].readingAudioEn, "/exam-read-aloud/v1/test-english.mp3", "integer-entry English audio must survive public delivery");
  }
  const correct = Object.fromEntries(b.questions.map(q => [q.id, q.answer]));
  const perfect = gradeExam(b.questions, correct, b.profile);
  assert.equal(perfect.score, count);
  assert.equal(perfect.maxScore, count);
  const empty = gradeExam(b.questions, {}, b.profile);
  assert.equal(empty.score, 0);
  const incorrect = Object.fromEntries(b.questions.map(q => [q.id, q.answerMode === "integer" ? "999" : q.answer === "A" ? "B" : "A"]));
  const wrong = gradeExam(b.questions, incorrect, b.profile);
  assert.equal(wrong.score, 0);
  console.log(`SEAMO_INTEGRATION_G${grade}=PASS questions=${count} full=${perfect.score} blank=${empty.score} wrong=${wrong.score}`);
}
console.log("SEAMO_INTEGRATION=PASS");
