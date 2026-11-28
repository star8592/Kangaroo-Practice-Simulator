import assert from "node:assert/strict";
import {parseScoringSubmission} from "../src/lib/wuhan-scoring-submit";
const id="a".repeat(32),input={paper:"WH01",noticeVersion:"wuhan-recording-v1",guardianConfirmed:true,choices:[{task:"scene-museum-meeting",selected:1}],recordings:[{task:"answer-gift-budget",mime:"audio/wav",audioBase64:"YWJj"}]};
assert.equal(Buffer.from(parseScoringSubmission(id,input).recordings[0]!.audio).toString(),"abc");
for(const x of [{...input,guardianConfirmed:false},{...input,owner_id:"other"},{...input,score:100},{...input,choices:[{task:"scene-museum-meeting",selected:4}]},{...input,recordings:[{...input.recordings[0],audioBase64:"!!!!"}]},{...input,recordings:[...input.recordings,...input.recordings]}])assert.throws(()=>parseScoringSubmission(id,x));
console.log("R92_SUBMISSION_PARSER_PASS");
